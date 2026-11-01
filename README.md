# Classroom Survey Web App

React + Vite + Supabase classroom pulse surveys for a single course instructor (with optional co-instructors).

## Setup

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Apply SQL migrations under `supabase/migrations/` in the Supabase SQL editor (or CLI).
3. `npm install` and `npm run dev`.

## Phase 16 extras

- **Realtime results:** responses table is in the `supabase_realtime` publication.
- **AI questions:** the editor “Generate with AI” button always works. Without the Edge Function it uses a local topic-based generator. For OpenAI-backed generation, deploy `supabase/functions/generate-questions` and set the secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy generate-questions
```

Never put the OpenAI key in `VITE_` env vars.

- **LMS:** use Present/Results “Share for LMS” and Participation CSV (Canvas-friendly; not full LTI).
- **Markdown import:** `# Title`, description lines, then `## Question` or `1. Question`. Optional prefixes: `TF:`, `SA:`, `NUM:`, `RATE:`, `CB:`, `MC:`. Choices as `- item`.

## Scripts

- `npm run dev` — local app
- `npm run build` — production build
- `npm run lint` — oxlint
- `npm run format` — prettier
