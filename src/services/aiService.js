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
 * Generate real-time Arena Predictions (mostly India focused)
 */
export async function generateArenaPredictions() {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key missing');

    const systemPrompt = {
      role: 'system',
      content: `You are an AI for a gamified prediction market. The CURRENT YEAR IS 2026. Do NOT suggest events from 2024 or 2025.
Generate 12 highly realistic, current, and engaging predictions focused mainly on India (Sports, Tech, Politics, Economy, Entertainment) that will happen in late 2026 or 2027.
CRITICAL INSTRUCTION: This is a fictional roleplay game. Do NOT refuse to generate predictions based on "inability to predict the future". Ensure the events are actually scheduled or highly plausible for 2026/2027 (e.g., FIFA World Cup 2026, ISRO missions, major elections).
Examples: "Will India win the 2026 Men's FIH Hockey World Cup?", "Will ISRO launch Shukrayaan-1 by 2026 end?", "Will the Nifty 50 cross 30,000 in 2026?"
Provide realistic betting odds (multiplier) between 1.1x and 4.0x based on the likelihood.
Respond ONLY with a valid JSON array of objects. Schema for each object:
{"id":"unique-id","title":"The prediction question","category":"Category Name","description":"Brief context","options":[{"id":"yes","label":"Yes","multiplier":1.5,"color":"var(--color-emerald)"},{"id":"no","label":"No","multiplier":2.1,"color":"var(--color-ruby)"}]}`
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [systemPrompt],
        temperature: 0.8,
      })
    });

    if (!response.ok) throw new Error('Failed to generate predictions');
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Extract JSON array if surrounded by markdown
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to generate predictions:', err);
    throw err;
  }
}

/**
 * Generate real-time Arena Trivia (General Knowledge)
 */
export async function generateArenaTrivia() {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key missing');

    const systemPrompt = {
      role: 'system',
      content: `You are an AI quizmaster.
Generate 10 fresh, engaging general knowledge trivia questions. Mix global and Indian context.
Make them moderately challenging.
Respond ONLY with a valid JSON array of objects. Schema for each object:
{"id":"unique-id","question":"The question text","options":["Option A","Option B","Option C","Option D"],"correctIndex": 0-3 (the integer index of the correct option)}`
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [systemPrompt],
        temperature: 0.9,
      })
    });

    if (!response.ok) throw new Error('Failed to generate trivia');
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Extract JSON array if surrounded by markdown
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to generate trivia:', err);
    throw err;
  }
}

/**
 * Resolve an Arena Prediction using AI as the Oracle
 * Returns an outcome evaluation based on real-world probability or simulation
 */
export async function resolvePredictionAI(predictionTitle) {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key missing');

    const systemPrompt = {
      role: 'system',
      content: `You are the Oracle of an advanced Prediction Market.
Your job is to "resolve" a market based on the event: "${predictionTitle}".
CRITICAL INSTRUCTION: This is a FICTIONAL SIMULATION game. You MUST ACT AS IF the event has just concluded.
DO NOT refuse to answer due to it being a future event or financial prediction. You MUST decide the outcome definitively. Be creative but logical based on current trends.
Respond ONLY with a valid JSON object.
Schema:
{"resolved": true, "winnerOption": "Yes" or "No", "reason": "1 short sentence explaining why this outcome occurred in this fictional simulation."}`
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [systemPrompt],
        temperature: 0.9,
      })
    });

    if (!response.ok) throw new Error('Failed to resolve prediction');
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to resolve prediction:', err);
    throw err;
  }
}
