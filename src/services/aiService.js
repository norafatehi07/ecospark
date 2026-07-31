// src/services/aiService.js
// Central abstraction for all AI calls.
// Swapping providers = one-file change, never touching components.

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

/**
 * Stream AI coach reply via Server-Sent Events.
 * @param {Array} messages - Chat history [{role, content}, ...]
 * @param {function} onToken - Called with each text token as it streams
 * @param {function} onDone - Called when stream completes
 * @param {function} onError - Called on error
 * @returns {AbortController} - Call .abort() to cancel
 */
export function streamCoachReply(messages, onToken, onDone, onError) {
  const controller = new AbortController();

  (async () => {
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error('Groq API key missing');

      const systemPrompt = {
        role: 'system',
        content: `You are EcoSpark Coach, a friendly, encouraging environmental expert guiding students... (Keep responses under 3 short sentences, use emojis!)`
      };

      // Strip out internal UI fields like 'streaming' before sending to API
      const cleanMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [systemPrompt, ...cleanMessages],
          stream: true,
          temperature: 0.7,
          max_tokens: 200,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Coach API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              onDone?.();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) onToken(token);
            } catch {
              // not JSON
            }
          }
        }
      }
      onDone?.();
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[aiService] Coach stream error:', err);
      onError?.(err);
    }
  })();

  return controller;
}

/**
 * Trigger async photo verification.
 * The serverless function writes status → Firestore.
 * The caller should listen via onSnapshot on the submission doc.
 * @param {string} submissionId
 * @param {string} imageUrl - Firebase Storage URL
 * @param {string} taskPrompt - Human-readable description of what to verify
 */
export async function verifyTaskPhoto(submissionId, imageUrl, taskPrompt) {
  // We completely bypass the Vercel backend for AI verification to avoid the 10-second timeout limit.
  // Verification runs entirely in the user's browser, which has no strict timeout.
  await performClientSideVerification(submissionId, imageUrl, taskPrompt);
}

// Client-side AI verification
async function performClientSideVerification(submissionId, imageUrl, taskPrompt) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error('VITE_GEMINI_API_KEY missing for client-side fallback');
    const { updateSubmissionStatus } = await import('./firestoreService');
    await updateSubmissionStatus(submissionId, 'flagged', {
      reason: 'AI Verification failed: API key missing on Vercel.',
    });
    return;
  }

  try {
    let imagePart;
    if (imageUrl.startsWith('data:image/')) {
      const matches = imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      imagePart = { inlineData: { data: matches[2], mimeType: matches[1] } };
    } else {
      const resp = await fetch(imageUrl);
      const buffer = await resp.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      imagePart = { inlineData: { data: base64, mimeType: resp.headers.get('content-type') || 'image/jpeg' } };
    }

    const verificationPrompt = `You are verifying a student's eco-action photo submission for a sustainability app.
The student claims they completed this action: "${taskPrompt}"
Please evaluate whether the photo shows reasonable evidence of this eco-friendly action being performed or completed.

Be LENIENT. Give the student the maximum benefit of the doubt.
- Accept poor lighting, blur, weird angles, or partial framing.
- Accept indirect evidence (e.g. holding a reusable bottle, standing near a bin, turning off a light switch).
- Do not expect a perfect, staged photo. Real-world photos are messy.
- Only reject if it is a completely unrelated image (like a screenshot, a meme, or a completely unrelated object like a car).

Respond with a confidence score where:
- 0.7-1.0 = clearly shows the action or reasonable evidence
- 0.4-0.69 = somewhat related, plausible but not definitive
- 0.0-0.39 = unrelated or clearly not the claimed action

Respond ONLY with a JSON object like this (no markdown, no extra text):
{"approved": true/false, "confidence": 0.0-1.0, "reason": "one sentence explanation"}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const FALLBACK_MODELS = [
      'gemini-2.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite'
    ];

    let result;
    let success = false;
    let lastError = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([{ text: verificationPrompt }, imagePart]);
        success = true;
        break; // Success!
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} failed (${err.status || err.message}). Trying next model...`);
        await new Promise(r => setTimeout(r, 1500)); // wait briefly before trying next
      }
    }

    if (!success) {
      throw lastError || new Error("All fallback models failed.");
    }

    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const aiResult = JSON.parse(jsonStr);

    const confidence = aiResult.confidence ?? 0.5;
    const status = confidence >= 0.4 ? 'approved' : 'flagged';

    const { updateSubmissionStatus } = await import('./firestoreService');
    await updateSubmissionStatus(submissionId, status, {
      aiVerdict: confidence >= 0.7,
      confidence,
      reason: aiResult.reason || 'Client-side verification completed',
    });
  } catch (err) {
    console.error('Client-side AI verification failed:', err);

    // If it STILL fails after 3 retries (or due to invalid API key/internet issues),
    // we flag it for manual teacher review. No fake auto-approvals!
    try {
      const { updateSubmissionStatus } = await import('./firestoreService');
      await updateSubmissionStatus(submissionId, 'flagged', {
        reason: 'AI Verification failed after retries: ' + err.message,
      });
    } catch (finalErr) {
      console.error('Failed to flag submission:', finalErr);
    }
  }
}

/**
 * Autonomously generate a new task using AI.
 * @param {string} completedTaskContext - Context about the just completed task
 * @returns {Promise<Object>} - The generated task object
 */
export async function generateTaskAI(completedTaskContext, existingTaskTitles = [], attempt = 1) {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key missing');

    const avoidList = existingTaskTitles.length > 0
      ? `\n\nCRITICAL: You MUST NOT generate any task similar to these existing tasks on the board:\n${existingTaskTitles.map(t => `- "${t}"`).join('\n')}\nIf you repeat any of these ideas, you fail.`
      : '';

    const systemPrompt = {
      role: 'system',
      content: `You are an AI that generates eco-friendly sustainability tasks for a gamified app.
The user just completed a task. You must generate 1 NEW, COMPLETELY UNIQUE, and HIGHLY SPECIFIC task.
CRITICAL RULE: The new task MUST BE ENTIRELY DIFFERENT from the recently completed task. Pick a completely different topic (e.g., if they did lighting, do NOT suggest bulbs; suggest composting, vegan meals, biking, planting, etc.). Be highly creative.${avoidList}

Respond ONLY with a valid JSON object matching exactly this schema:
{"title":"Short catchy title","description":"1-2 sentences explaining what to do","category":"energy","difficulty":"easy","points":70,"co2":50,"water":0,"verificationPrompt":"Instructions for what photo to take"}

Rules for fields:
- category: energy, water, waste, food, transport, nature, community.
- difficulty: easy, medium, or hard.
- points: ~70 for easy, ~150 for medium, 200-250 for hard.
Do NOT include any extra text, only the JSON object.`
    };

    const userPrompt = {
      role: 'user',
      content: `The user just completed: "${completedTaskContext || 'a task'}". Generate a completely DIFFERENT and unique task that they have not done yet.`
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // using stable, high quality model
        messages: [systemPrompt, userPrompt],
        temperature: 0.95,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Task generation API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content from AI');

    // Parse to ensure it's valid JSON
    const parsed = JSON.parse(content);
    if (!parsed.title || !parsed.description) {
      throw new Error('Invalid task schema returned');
    }
    return parsed;
  } catch (err) {
    if (attempt < 3) {
      console.warn(`[aiService] Task generation failed (attempt ${attempt}). Retrying in 3s...`, err);
      await new Promise(r => setTimeout(r, 3000));
      return generateTaskAI(completedTaskContext, existingTaskTitles, attempt + 1);
    }
    throw err;
  }
}

/**
 * Generate real-time Oracle Prediction Markets — eco/sustainability focused.
 * Uses Gemini Flash for current eco news awareness.
 * Returns 8–12 markets. 70% sustainability/ESG, 30% green-adjacent.
 */
export async function generateOracleMarkets() {
  const today = new Date().toISOString().slice(0, 10);
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // Try Gemini Flash first (better eco news awareness)
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Today is ${today}. You are the AI engine for EcoSpark, a sustainability prediction market platform similar to Polymarket.

Generate exactly 10 prediction markets. Rules:
- 7 must be about sustainability, climate, green energy, ESG stocks, or eco policy
- 3 can be about EV companies, carbon markets, renewable energy stocks, or green tech
- All must be binary YES/NO questions that can be objectively settled
- Markets should resolve within 2–14 days from today
- Use REAL, CURRENT eco topics from 2026 — e.g. Tesla stock levels, solar capacity targets, carbon credit prices, UN climate pledges, EV adoption rates, green energy milestones
- Odds must reflect realistic probability (popular outcome = lower multiplier, unlikely = higher multiplier)
- Include the endTime as ISO 8601 string (2 to 14 days from today)

Examples of GOOD markets:
- "Will Tesla (TSLA) stock close above $250 by Aug 15, 2026?"
- "Will India's renewable energy capacity exceed 220 GW by end of August 2026?"
- "Will the EU carbon credit price stay above €60 per tonne this week?"
- "Will global EV sales exceed 1.2 million units in July 2026?"
- "Will Adani Green Energy hit its 10 GW solar milestone by Q3 2026?"

Return ONLY a valid JSON array. No markdown, no explanation. Schema:
[
  {
    "id": "mkt1",
    "title": "Will Tesla (TSLA) stock close above $250 by Aug 10, 2026?",
    "description": "Tesla shares have been volatile amid EV demand news. Analysts are split on near-term direction.",
    "category": "Green Stocks",
    "emoji": "📈",
    "tags": ["tesla", "ev", "stocks"],
    "endTime": "2026-08-10T00:00:00.000Z",
    "options": [
      { "id": "yes", "label": "YES", "multiplier": 1.7 },
      { "id": "no", "label": "NO", "multiplier": 2.1 }
    ]
  }
]`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length >= 5) return parsed;
    } catch (geminiErr) {
      console.warn('[Oracle] Gemini market gen failed, falling back to Groq:', geminiErr.message);
    }
  }

  // Fallback: Groq
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('No AI API key available');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'system',
        content: `Today is ${today}. Generate 10 eco sustainability prediction market questions for EcoSpark.
Focus: green stocks (Tesla, BYD, Vestas), renewable energy targets, carbon markets, EV adoption, climate policy.
All must be binary YES/NO, resolve in 2-14 days. Include realistic multipliers (1.1x–4.0x).
Return ONLY a valid JSON array. Schema per item:
{"id":"mkt1","title":"...","description":"...","category":"Green Stocks","emoji":"📈","tags":[],"endTime":"ISO date","options":[{"id":"yes","label":"YES","multiplier":1.8},{"id":"no","label":"NO","multiplier":2.0}]}`
      }],
      temperature: 0.9,
    })
  });

  if (!response.ok) throw new Error('Failed to generate oracle markets');
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

/**
 * Generate real-time Arena Trivia (General Knowledge)
 */
export async function generateArenaTrivia() {
  // Try Gemini Flash first for eco-focused questions
  try {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiKey) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Use a time-based seed phrase to ensure fresh questions every time
      const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ecoTopics = [
        'renewable energy breakthroughs', 'ocean plastic pollution', 'climate change science',
        'electric vehicles adoption', 'sustainable agriculture', 'biodiversity and ecosystems',
        'carbon capture technology', 'solar and wind power', 'deforestation and reforestation',
        'green building materials', 'food waste reduction', 'water conservation',
        'air quality and pollution', 'India environmental initiatives', 'UN climate summits'
      ];
      // Pick 3 random topics for variety
      const pickedTopics = ecoTopics
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .join(', ');

      const prompt = `[Session: ${seed}]
You are an eco-education quizmaster for a sustainability platform called EcoSpark.
Generate exactly 10 FRESH and UNIQUE quiz questions focused on: ${pickedTopics}.
Topics must be about real environmental news, science, and eco facts.
Questions must be interesting and educational, not repetitive.
Vary difficulty: 3 easy, 4 medium, 3 hard.

Return ONLY a valid JSON array. No markdown, no explanation, just the array.
Each item:
{"id":"q1","question":"...","options":["A","B","C","D"],"correctIndex":0,"topic":"...","fact":"1 short interesting eco fact related to this answer"}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length >= 5) return parsed;
    }
  } catch (geminiErr) {
    console.warn('Gemini trivia failed, falling back to Groq:', geminiErr.message);
  }

  // Fallback: Groq with eco focus
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('No AI API key available');

  const seed = Math.random().toString(36).slice(2, 10);
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'system',
        content: `[Seed:${seed}] You are an eco-education quizmaster for a sustainability platform.
Generate 10 UNIQUE trivia questions about environment, ecology, climate change, renewable energy, and sustainability.
Include real facts, recent news events, and Indian environmental context.
Never repeat questions from previous sessions.
Respond ONLY with a valid JSON array. Schema:
[{"id":"q1","question":"...","options":["A","B","C","D"],"correctIndex":0,"topic":"climate","fact":"Short fun eco fact"}]`
      }],
      temperature: 1.0,
    })
  });

  if (!response.ok) throw new Error('Failed to generate trivia');
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

/**
 * Settle an Oracle market using Gemini AI.
 * @param {string} title - Market title
 * @param {string} category - Market category 
 * @param {Array} options - [{id, label}, ...]
 * @returns {{ winnerId: string, reason: string }}
 */
export async function settleOracleMarket(title, category, options) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const optionList = options.map(o => `{"id":"${o.id}","label":"${o.label}"}`).join(', ');
  const prompt = `You are settling a prediction market on EcoSpark, a sustainability platform.

Market: "${title}"
Category: ${category}
Options: [${optionList}]

Based on the most likely real-world outcome as of today, determine which option wins.
Consider: current market data, news, historical trends, and scientific consensus for eco/sustainability topics.
This is a game platform — you MUST pick a definitive winner.

Respond ONLY with valid JSON:
{"winnerId": "<option id like 'yes' or 'no'>", "reason": "<1 concise sentence explaining the outcome based on real-world context>"}`;

  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (err) {
      console.warn('[Oracle] Gemini settlement failed, trying Groq:', err.message);
    }
  }

  // Fallback: Groq
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('No AI API key for settlement');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.7,
    })
  });

  if (!response.ok) throw new Error('Oracle settlement API error');
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}
