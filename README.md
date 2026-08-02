# EchoNotes

EchoNotes is a voice-activated, multilingual, accessible lecture note-taking web app.

## Database & Backend Setup (Supabase)

The backend is powered by Supabase (Auth, Postgres Database, and Edge Functions). 

### 1. Create a Supabase Project
1. Go to [database.new](https://database.new/) or [supabase.com](https://supabase.com) and sign in.
2. Create a new project (the free tier is perfect for this). You do not need a credit card.
3. Wait for the database provisioning to complete.

### 2. Run the Database Migration
1. In your Supabase dashboard, navigate to the **SQL Editor** (left sidebar).
2. Click **New query**.
3. Copy the entire contents of `/supabase/migrations/0001_init.sql` from this repository.
4. Paste it into the editor and click **Run**.
5. This will create the `notes` table, set up Row Level Security (RLS), and configure the automated full-text search triggers.

### 3. Save your API Keys (For Later)
We will need your project's URL and anonymous API key for the frontend later.
1. In the Supabase dashboard, go to **Project Settings** -> **API**.
2. Note down the **Project URL**.
3. Note down the **Project API Key (anon, public)**.
*(Do not add them to the codebase yet; we will set these up in the static frontend in a future step).*

### 4. Edge Functions & Secrets (Upcoming)
In later steps, we will create Supabase Edge Functions. You will need to add the following secrets to your Supabase project (Settings -> Edge Functions -> Secrets):
*   `ASSEMBLYAI_API_KEY`: For real-time streaming speech-to-text.
*   `GEMINI_API_KEY`: For structuring the raw transcript into headings, bullets, and summaries.
*(These API keys will never be exposed to the client browser).*
