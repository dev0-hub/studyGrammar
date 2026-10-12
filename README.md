# Grammar Quest

Static site (index.html) + two Vercel serverless functions (api/chat.js, api/progress.js).

## Environment variables (Vercel > Project > Settings > Environment Variables)
- GEMINI_API_KEY      - key from Google AI Studio (free tier)
- GEMINI_MODEL        - optional, default gemini-2.5-flash (check the current free model name in AI Studio)
- SUPABASE_URL        - https://xxxx.supabase.co
- SUPABASE_SERVICE_KEY - Supabase service_role key (server only, never put it in index.html)

## Supabase SQL (SQL Editor)
create table progress (
  learner_id text primary key,
  stats jsonb default '{}',
  points int default 0,
  updated_at timestamptz default now()
);
alter table progress enable row level security; -- no policies: only the server key can read/write
