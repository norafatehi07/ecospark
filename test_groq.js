import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const apiKey = process.env.VITE_GROQ_API_KEY;
  console.log("Key exists:", !!apiKey);
  
  // Tiny 1x1 pixel base64 image
  const dummyImage = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Respond with exactly {"approved": true, "confidence": 0.9, "reason": "test"}' },
            { type: 'image_url', image_url: { url: dummyImage } }
          ]
        }
      ],
      temperature: 0.1
    })
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
