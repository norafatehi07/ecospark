// api/coach.js — Groq streaming AI coach (Server-Sent Events)
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are EcoSpark Coach — a friendly, knowledgeable sustainability mentor for students.
Your role:
- Motivate users to complete their daily eco-tasks and maintain their streak
- Explain the environmental impact of their actions in clear, compelling terms
- Give practical, actionable advice appropriate for a student's life
- Celebrate wins and gently encourage after setbacks
- Keep responses concise (2-4 sentences usually), warm, and emoji-friendly 🌱

You know about: composting, water conservation, energy efficiency, sustainable transport, 
plant-based eating, waste reduction, recycling, biodiversity, and climate action.

Never make up statistics. If unsure, say so and suggest they check reputable sources.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Trim to last 10 messages to stay within token limits
  const trimmedMessages = messages.slice(-10);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...trimmedMessages,
      ],
      stream: true,
      max_tokens: 400,
      temperature: 0.75,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[coach] Groq error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI coach unavailable', detail: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}
