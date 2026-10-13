// Vercel serverless function: AI tutor proxy. The API key stays on the server.
module.exports = async function (req, res) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  async function ask(prompt) {
    const body = { contents: [{ parts: [{ text: prompt }] }] };
    if (/2\.5-flash$/.test(model)) body.generationConfig = { thinkingConfig: { thinkingBudget: 0 } };
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      }
    );
    const d = await r.json();
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(d.error && d.error.message) || 'error'}`);
    const parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
    const text = parts ? parts.map((p) => p.text || '').join('') : '';
    if (!text) throw new Error('Gemini returned no text');
    return text;
  }

  // Open /api/chat in a browser to check setup; /api/chat?test=1 makes a real test call.
  if (req.method === 'GET') {
    if (!key) return res.status(200).json({ hasKey: false, model, hint: 'Set GEMINI_API_KEY in Vercel, then Redeploy' });
    if (req.query.test) {
      try {
        return res.status(200).json({ hasKey: true, model, reply: await ask('Say hello in one short sentence.') });
      } catch (e) {
        return res.status(200).json({ hasKey: true, model, error: e.message });
      }
    }
    return res.status(200).json({ hasKey: true, model });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
  const prompt = String((req.body && req.body.prompt) || '').slice(0, 4000);
  if (!prompt) return res.status(400).json({ error: 'empty' });
  try {
    res.status(200).json({ text: await ask(prompt) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
