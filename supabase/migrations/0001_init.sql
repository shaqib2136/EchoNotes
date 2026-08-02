-- Migration: 0001_init.sql
-- Description: Creates the notes table with full-text search and Row Level Security.

-- Enable the UUID extension if not already enabled (Supabase usually has this by default, but safe to include)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    raw_transcript TEXT,
    structured_notes JSONB,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only select, insert, update, and delete their own notes
CREATE POLICY "Users can view their own notes" 
    ON notes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" 
    ON notes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
    ON notes FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
    ON notes FOR DELETE 
    USING (auth.uid() = user_id);

-- Create a function to update the search_vector automatically
-- We use a trigger instead of a generated column to dynamically select the language config
-- and to safely extract the 'summary' from the JSONB column.
CREATE OR REPLACE FUNCTION update_notes_search_vector()
RETURNS trigger AS $$
DECLARE
    search_config regconfig;
    summary_text text;
BEGIN
    -- Dynamically set the text search configuration based on the note's language
    CASE NEW.language
        WHEN 'en' THEN search_config := 'english'::regconfig;
        WHEN 'es' THEN search_config := 'spanish'::regconfig;
        WHEN 'hi' THEN search_config := 'simple'::regconfig; -- Hindi stemmer not built-in by default, fallback to simple
        ELSE search_config := 'simple'::regconfig;
    END CASE;

    -- Extract the summary string from the structured_notes JSONB, if it exists
    summary_text := coalesce(NEW.structured_notes->>'summary', '');

    -- Build the tsvector with weights: 
    -- Title (A: highest), Summary (B), Raw Transcript (C: lowest)
    NEW.search_vector :=
        setweight(to_tsvector(search_config, coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector(search_config, coalesce(summary_text, '')), 'B') ||
        setweight(to_tsvector(search_config, coalesce(NEW.raw_transcript, '')), 'C');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the notes table
CREATE TRIGGER trigger_update_notes_search_vector
    BEFORE INSERT OR UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_notes_search_vector();

-- Create a GIN index on the search_vector for fast full-text search queries
CREATE INDEX IF NOT EXISTS notes_search_vector_idx ON notes USING GIN (search_vector);
