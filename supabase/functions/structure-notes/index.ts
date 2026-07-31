import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const { transcript, title } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      throw new Error("Transcript is required.");
    }

    // Environment variables
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!geminiKey) {
      throw new Error("Missing GEMINI_API_KEY.");
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are missing.");
    }

    // Authentication
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      throw new Error("Missing Authorization header.");
    }

    // Create authenticated Supabase client
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized user.");
    }

    // Gemini prompt
    const geminiPrompt = `
You are an expert academic note taker.

Convert the following lecture transcript into well-structured study notes.

Return ONLY valid JSON.

Do NOT include markdown.
Do NOT include backticks.
Do NOT explain anything.
The response must begin with { and end with }.

JSON schema:

{
  "title": "A short descriptive title",
  "sections": [
    {
      "heading": "Section Heading",
      "bullets": [
        "Point 1",
        "Point 2"
      ]
    }
  ],
  "glossary": [
    {
      "term": "Word",
      "definition": "Meaning"
    }
  ]
}

Transcript:

${transcript}
`;

    // Call Gemini
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: geminiPrompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(await geminiResponse.text());
    }

    const geminiData = await geminiResponse.json();

    if (
      !geminiData.candidates ||
      geminiData.candidates.length === 0
    ) {
      throw new Error("Gemini returned no response.");
    }

    let jsonText =
      geminiData.candidates[0].content.parts[0].text;

    // Remove accidental markdown if Gemini adds it
    jsonText = jsonText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let structuredNotes;

    try {
      structuredNotes = JSON.parse(jsonText);
    } catch {
      throw new Error("Gemini returned invalid JSON.");
    }

    // Save note
    const { data: insertedNote, error: insertError } =
      await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title:
            title ||
            structuredNotes.title ||
            "Untitled Lecture",
          raw_transcript: transcript,
          structured_notes: structuredNotes,
        })
        .select()
        .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        note_id: insertedNote.id,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error.";

    console.error(message);

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});