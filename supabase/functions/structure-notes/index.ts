const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }
    const { raw_transcript, language } = await req.json();
    if (!raw_transcript || raw_transcript.trim() === '') {
      return new Response(JSON.stringify({ error: 'Missing raw_transcript' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    const prompt = `You are an expert academic assistant that organizes raw lecture transcripts into clean, study-ready notes.
Please structure the following transcript. Detect and preserve the primary language of the spoken text.
Return ONLY valid JSON matching this exact schema:
{
  "title": "A short, descriptive title for the lecture",
  "language": "The detected language code (e.g., 'en', 'hi', 'es', 'fr')",
  "summary": "A brief 2-3 sentence summary of the entire lecture",
  "sections": [
    {
      "heading": "Clear section heading",
      "bullets": ["Key point 1", "Key point 2"]
    }
  ],
  "glossary": [
    {
      "term": "Important Term",
      "definition": "Definition of the term based on the context"
    }
  ]
}
Context Language Preference: ${language || 'en'}
Transcript:
${raw_transcript}`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });
    const data = await response.json();
    
    if (!response.ok) {
       throw new Error(data.error?.message || 'Failed to generate content from Gemini');
    }
    const jsonText = data.candidates[0].content.parts[0].text;
    const parsedJson = JSON.parse(jsonText);
    
    return new Response(JSON.stringify(parsedJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});