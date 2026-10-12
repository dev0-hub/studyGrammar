// Vercel serverless function: save/load learner progress in Supabase.
const U = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };

module.exports = async function (req, res) {
  try {
    if (req.method === 'GET') {
      const id = String(req.query.id || '').slice(0, 64);
      const r = await fetch(`${U}/rest/v1/progress?learner_id=eq.${encodeURIComponent(id)}&select=stats,points`, { headers: H });
      const a = await r.json();
      return res.status(200).json(a[0] || {});
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const id = String(b.id || '').slice(0, 64);
      if (!id || JSON.stringify(b.stats || {}).length > 20000) return res.status(400).json({ error: 'bad request' });
      const r = await fetch(`${U}/rest/v1/progress`, {
        method: 'POST',
        headers: { ...H, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ learner_id: id, stats: b.stats || {}, points: Number(b.points) || 0, updated_at: new Date().toISOString() }),
      });
      return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
    }
    res.status(405).json({ error: 'method' });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
};
