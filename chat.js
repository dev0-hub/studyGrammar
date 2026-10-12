// Vercel serverless function: AI tutor proxy. The API key stays on the server.
module.exports = async function (req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const prompt = String((req.body && req.body.prompt) || '').slice(0, 4000);
  if (!prompt) return res.status(400).json({ error: 'empty' });
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const d = await r.json();
    const parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
    const text = parts ? parts.map((p) => p.text || '').join('') : '';
    if (!text) return res.status(502).json({ error: 'no answer' });
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
};
