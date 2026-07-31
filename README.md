# EchoNotes

Voice-Activated Accessible Lecture Note Taker. Built for students with visual, hearing, or motor impairments.

## Architecture
- **Frontend:** Vanilla HTML/CSS/JS (Hosted on Cloudflare Pages)
- **Backend:** Supabase (Auth, Postgres DB, Edge Functions)
- **AI & STT:** Google Gemini Flash & AssemblyAI

## Setup Instructions

### 1. Supabase Setup
1. Create a free account at [Supabase](https://supabase.com) and start a new project.
2. Go to the **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql`, and click **Run** to set up the database and security rules.
3. Go to **Project Settings -> API**. Find your `Project URL` and `anon public` key.
4. Open `frontend/js/supabaseClient.js` in your code and replace `'YOUR_SUPABASE_URL'` and `'YOUR_SUPABASE_ANON_KEY'` with those actual values.

### 2. Edge Functions & API Keys
You need two free API keys to make the AI work:
- [AssemblyAI](https://www.assemblyai.com/) for real-time speech-to-text.
- [Google Gemini](https://aistudio.google.com/) for structuring the raw notes.

Install the Supabase CLI on your computer, log in, and deploy your two Edge Functions:
```bash
supabase functions deploy transcribe-stream
supabase functions deploy structure-notes