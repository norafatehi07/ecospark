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

// ─── ORACLE AI (live web grounding) ─────────────────────────────────────────
//
// Markets and settlements are grounded in the LIVE web — never invented from
// the model's stale memory, never random. Two layers:
//
//  1. REST calls to Gemini with the `google_search` tool (search grounding).
//     The JS SDK does not expose grounding, so these go through fetch
//     directly. Models are tried in order; older models silently ignore the
//     grounding tool, so only the listed modern models are used here.
//  2. Pure API facts (CoinGecko crypto prices) bypass AI entirely — see
//     oracleService.settleCryptoMarket.

function geminiEndpoint(modelName) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
}

const GROUNDED_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

/** Extract readable source citations from a grounded Gemini response. */
function extractGroundingSources(data) {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  const sources = [];
  for (const c of chunks) {
    const url = c?.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: (c.web.title || url).slice(0, 120), url: url.slice(0, 500) });
    if (sources.length >= 4) break;
  }
  return sources;
}

/**
 * Call Gemini with Google Search grounding. Returns { text, sources }.
 * Throws if no model succeeds (caller decides fallback behaviour).
 */
export async function geminiSearchGenerate(prompt) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('Gemini key missing');

  let lastErr = null;
  for (const model of GROUNDED_MODELS) {
    try {
      const res = await fetch(geminiEndpoint(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
        }),
      });
      if (!res.ok) {
        lastErr = new Error(`${model} HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('') || '';
      if (!text.trim()) {
        lastErr = new Error(`${model} returned no text`);
        continue;
      }
      return { text, sources: extractGroundingSources(data) };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('grounded generation failed');
}

function stripJson(str) {
  return String(str).replace(/```json?\n?/g, '').replace(/```/g, '').trim();
}

/**
 * Generate REAL, currently-live prediction markets.
 *
 * Gemini sees the live web (search grounding), so the topics it proposes are
 * events actually happening right now — not training-data memories. Markets
 * that still fail strict objectivity checks are dropped by the caller; the
 * caller always mixes in price-verified crypto markets so the board is never
 * fake even if generation degrades.
 *
 * @param {Array<string>} avoidTitles - existing market titles to skip
 */
export async function generateOracleMarkets(avoidTitles = []) {
  const today = new Date().toISOString().slice(0, 10);
  const avoid = avoidTitles.length
    ? `Already-live markets you must NOT duplicate (by idea):\n${avoidTitles.map((t) => `- ${t}`).join('\n')}\n\n`
    : '';

  const prompt = `You power a real prediction market platform (Polymarket-style). Today is ${today}. You have live Google Search results — use ONLY facts and events that are currently happening.

${avoid}Propose 6 REAL event markets with these hard rules:
- Every event must be CURRENT and time-bound, settling within 2–10 days of today.
- Every question must be objectively checkable against public records at the deadline: an official announcement, an official statistic release, a government report, a public filing, or a verifiable milestone. No subjective or popularity questions.
- Prefer sustainability, climate, energy, EV, and green-economy events; green tech/finance allowed.
- NEVER propose crypto or stock price markets — those are generated separately from live price feeds.
- Each needs a "resolutionQuery": the exact factual question the settlement oracle must verify at expiry, including the date and the official source to check.

Examples of the right SHAPE (do not reuse these exact events):
- "Will the IEA publish its updated global solar capacity forecast by Aug 22, 2026?"
- "Will India's Ministry of New and Renewable Energy announce new tender awards before Aug 25, 2026?"
- "Will the EU approve the pending nature-restoration funding package before Aug 28, 2026?"

Return ONLY a JSON array (no markdown), each item:
{"title":"short yes/no question with the exact date","description":"1-2 sentences of current real context","category":"Renewable Energy","resolutionQuery":"exact factual question to verify at expiry, with date and official source","endTime":"ISO 8601, 2-10 days from today"}`;

  const { text, sources } = await geminiSearchGenerate(prompt);
  const parsed = JSON.parse(stripJson(text));
  if (!Array.isArray(parsed)) throw new Error('grounded generation returned non-array');

  const now = Date.now();
  const valid = parsed
    .filter((m) => m && typeof m.title === 'string' && typeof m.resolutionQuery === 'string')
    .filter((m) => {
      const t = new Date(m.endTime).getTime();
      return Number.isFinite(t) && t > now + 24 * 3600 * 1000 && t < now + 14 * 86400 * 1000;
    })
    .slice(0, 6)
    .map((m, i) => ({
      id: `ai${i + 1}`,
      kind: 'event',
      title: m.title.slice(0, 200),
      description: (m.description || '').slice(0, 300),
      category: (m.category || 'Climate & Policy').slice(0, 40),
      resolutionQuery: m.resolutionQuery.slice(0, 400),
      endTime: new Date(m.endTime).toISOString(),
      sources,
    }));

  return valid;
}

/**
 * Settle a real-world event market by re-searching the live web at expiry.
 *
 * The model must ground its answer in current sources and declare confidence.
 * Only "decided" verdicts settle the market; anything less returns
 * { result: 'undecided' } and the caller voids + refunds — a market is never
 * paid out on a guess.
 *
 * @param {{resolutionQuery?: string, title: string, endTime: string}} market
 */
export async function settleOracleMarket(market) {
  const endedOn = new Date(market.endTime).toISOString().slice(0, 10);
  const prompt = `You are the settlement oracle for a real prediction market. Today's date is ${new Date().toISOString().slice(0, 10)}. The market expired on ${endedOn}. Use your LIVE Google Search results to establish what actually happened.

Market: "${market.title}"
Exact question to verify: ${market.resolutionQuery || market.title}

Rules:
- Determine the real-world outcome from CURRENT, dated sources. Prefer official sources (government, regulator, agency, exchange, organizer).
- Answer only about what actually happened by the deadline — never guess, predict, or assume.
- If sources conflict, are missing, or the event simply hasn't happened yet, you MUST answer "undecided".

Return ONLY JSON (no markdown):
{"result":"yes"|"no"|"undecided","confidence":0.0-1.0,"reason":"one factual sentence citing what the sources establish","sources":["up to 3 source URLs"]}`;

  const { text, sources: groundingSources } = await geminiSearchGenerate(prompt);
  const parsed = JSON.parse(stripJson(text));

  if (!parsed || typeof parsed !== 'object') {
    return { result: 'undecided', confidence: 0, reason: 'Unreadable settlement response', sources: [] };
  }

  const result = ['yes', 'no', 'undecided'].includes(parsed.result) ? parsed.result : 'undecided';
  const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));
  const rawSources = Array.isArray(parsed.sources) ? parsed.sources : [];
  const sources = [...rawSources, ...groundingSources.map((s) => s.url)]
    .filter((u) => typeof u === 'string' && u.startsWith('http'))
    .slice(0, 4);

  if (result === 'undecided' || confidence < 0.75) {
    return {
      result: 'undecided',
      confidence,
      reason: (parsed.reason || 'Insufficient live evidence at expiry').slice(0, 300),
      sources,
    };
  }

  return { result, confidence, reason: (parsed.reason || '').slice(0, 300), sources };
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
