// Vercel serverless function: AI tutor proxy. The API key stays on the server.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function (req, res) {
  const key = process.env.GEMINI_API_KEY;
  const models = [process.env.GEMINI_MODEL || 'gemini-3.8-flash', process.env.GEMINI_FALLBACK_MODEL].filter(Boolean);

  // Tries each model; retries up to 3 times on temporary errors (429 / 500 / 503).
  async function ask(prompt) {
    let lastErr = 'unknown error';
    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const body = { contents: [{ parts: [{ text: prompt }] }] };
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(body),
          }
        );
        const d = await r.json();
        if (r.ok) {
          const parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
          const text = parts ? parts.map((p) => p.text || '').join('') : '';
          if (text) return text;
          lastErr = 'Gemini returned no text';
          break;
        }
        lastErr = `Gemini ${r.status} (${model}): ${(d.error && d.error.message) || 'error'}`;
        if (![429, 500, 503].includes(r.status)) break; // permanent error: try next model
        await sleep(1500 * (attempt + 1));
      }
    }
    throw new Error(lastErr);
  }

  // Open /api/chat in a browser to check setup; /api/chat?test=1 makes a real test call.
  if (req.method === 'GET') {
    if (!key) return res.status(200).json({ hasKey: false, models, hint: 'Set GEMINI_API_KEY in Vercel, then Redeploy' });
    if (req.query.test) {
      try {
        return res.status(200).json({ hasKey: true, models, reply: await ask('Say hello in one short sentence.') });
      } catch (e) {
        return res.status(200).json({ hasKey: true, models, error: e.message });
      }
    }
    return res.status(200).json({ hasKey: true, models });
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
