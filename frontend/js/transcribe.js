import { supabase, SUPABASE_URL } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
  const micToggle = document.getElementById('mic-toggle');
  const micStatus = document.getElementById('mic-status');
  const finishBtn = document.getElementById('finish-btn');
  const languageSelect = document.getElementById('language-select');
  const transcriptContent = document.getElementById('transcript-content');
  const engineDot = document.getElementById('engine-dot');
  const engineLabel = document.getElementById('engine-label');

  let isRecording = false;
  let isFallback = false;
  let socket = null;
  let audioContext = null;
  let processor = null;
  let source = null;
  let recognition = null;
  let localStream = null;

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function appendTranscriptLine(text, isInterim = false) {
    const lineId = isInterim ? 'interim-line' : `line-${Date.now()}`;
    
    // Remove existing interim line if present
    const existingInterim = document.getElementById('interim-line');
    if (existingInterim) {
      existingInterim.remove();
    }

    const div = document.createElement('div');
    div.className = `transcript-line ${isInterim ? 'interim' : ''}`;
    div.id = lineId;
    
    const time = document.createElement('span');
    time.className = 'time-tag';
    time.textContent = `[${formatTime(new Date())}]`;
    
    const content = document.createElement('span');
    content.className = 'text-content';
    content.textContent = text;
    
    div.appendChild(time);
    div.appendChild(content);
    
    transcriptContent.appendChild(div);
    transcriptContent.scrollTop = transcriptContent.scrollHeight;
  }

  function stopAudio() {
    if (processor) { processor.disconnect(); processor = null; }
    if (source) { source.disconnect(); source = null; }
    if (audioContext) { audioContext.close(); audioContext = null; }
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  }

  function toggleRecording() {
    isRecording = !isRecording;
    
    micToggle.setAttribute('aria-pressed', isRecording);
    micToggle.setAttribute('aria-label', isRecording ? 'Stop recording' : 'Start recording');
    
    if (isRecording) {
      transcriptContent.innerHTML = '';
      micStatus.textContent = 'Connecting...';
      engineDot.style.background = 'var(--amber)';
      engineLabel.textContent = 'Engine: Connecting';
      finishBtn.disabled = false;
      finishBtn.setAttribute('aria-disabled', 'false');
      languageSelect.disabled = true; 
      isFallback = false;
      
      startAssemblyAI();
    } else {
      micStatus.textContent = 'Paused';
      engineDot.style.background = 'var(--amber)';
      engineLabel.textContent = 'Engine: Standby';
      languageSelect.disabled = false;
      
      const existingInterim = document.getElementById('interim-line');
      if (existingInterim) existingInterim.remove();
      
      if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ terminate_session: true }));
          socket.close();
      }
      if (recognition) {
          recognition.stop();
      }
      stopAudio();
    }
  }

  async function startAssemblyAI() {
    try {
        const langMap = { en: 'en', es: 'es', fr: 'fr', hi: 'hi' };
        const lang = langMap[languageSelect.value] || 'en';
        
        // Connect to the Supabase Edge Function which proxies the AssemblyAI WS connection
        const baseWsUrl = SUPABASE_URL.replace(/^http/, 'ws');
        const wsUrl = `${baseWsUrl}/functions/v1/transcribe-stream?lang=${lang}`;
        
        socket = new WebSocket(wsUrl);
        
        socket.onopen = async () => {
            micStatus.textContent = 'Listening...';
            engineDot.style.background = 'var(--lime)';
            engineLabel.textContent = 'Engine: AssemblyAI (Real-time)';
            
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                source = audioContext.createMediaStreamSource(localStream);
                processor = audioContext.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (e) => {
                    if (!socket || socket.readyState !== WebSocket.OPEN) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.min(1, Math.max(-1, inputData[i])) * 0x7FFF;
                    }
                    const buffer = new ArrayBuffer(pcmData.length * 2);
                    const view = new DataView(buffer);
                    for (let i = 0; i < pcmData.length; i++) {
                        view.setInt16(i * 2, pcmData[i], true);
                    }
                    let binary = '';
                    const bytes = new Uint8Array(buffer);
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = window.btoa(binary);
                    socket.send(JSON.stringify({ audio_data: base64 }));
                };
                
                source.connect(processor);
                processor.connect(audioContext.destination);
            } catch (mediaErr) {
                console.error("Microphone access denied or error:", mediaErr);
                appendTranscriptLine("Error: Microphone access denied.", false);
                toggleRecording();
            }
        };
        
        socket.onmessage = (event) => {
            const res = JSON.parse(event.data);
            if (res.message_type === 'PartialTranscript' && res.text) {
                appendTranscriptLine(res.text, true);
            } else if (res.message_type === 'FinalTranscript' && res.text) {
                appendTranscriptLine(res.text, false);
            } else if (res.error) {
                console.error('AssemblyAI Error:', res.error);
                fallbackToWebSpeech();
            }
        };
        
        socket.onerror = (err) => {
            console.error("WebSocket Proxy Error", err);
            fallbackToWebSpeech();
        };
        
        socket.onclose = () => {
            if (isRecording && !isFallback) fallbackToWebSpeech();
        };
        
    } catch (err) {
        console.error("Init Error", err);
        fallbackToWebSpeech();
    }
  }

  function fallbackToWebSpeech() {
    if (!isRecording || isFallback) return;
    isFallback = true;
    
    stopAudio();
    
    engineDot.style.background = 'var(--cyan)';
    engineLabel.textContent = 'Engine: Web Speech (Fallback)';
    micStatus.textContent = 'Listening (Fallback)...';
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        appendTranscriptLine("Error: Your browser does not support speech recognition. Please try Chrome or Edge.", false);
        toggleRecording(); 
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    const langMap = { en: 'en-US', hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR' };
    recognition.lang = langMap[languageSelect.value] || 'en-US';
    
    recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
            } else {
                interim += event.results[i][0].transcript;
            }
        }
        if (final) appendTranscriptLine(final, false);
        if (interim) appendTranscriptLine(interim, true);
    };
    
    recognition.onerror = (event) => {
        console.error('Web Speech Error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'audio-capture' || event.error === 'network') {
            appendTranscriptLine(`Error: Web Speech API failed (${event.error}).`, false);
            if (isRecording) {
                toggleRecording();
            }
        }
    };
    
    recognition.onend = () => {
        // Auto-restart if still recording (handles the ~60s idle cutoff)
        if (isRecording && isFallback) {
            try { recognition.start(); } catch(e){}
        }
    };
    
    try { recognition.start(); } catch(e){}
  }

  micToggle.addEventListener('click', toggleRecording);
  
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target !== micToggle) {
      e.preventDefault();
      toggleRecording();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyE') {
      e.preventDefault();
      if (!finishBtn.disabled) finishBtn.click();
    }
  });

  finishBtn.addEventListener('click', async () => {
    if (isRecording) {
      toggleRecording();
    }
    
    const finalLines = Array.from(document.querySelectorAll('.transcript-line:not(.interim) .text-content'))
                            .map(el => el.textContent)
                            .join(' ');
    
    if (!finalLines.trim()) {
      alert("No transcript to process.");
      return;
    }
    
    micStatus.textContent = 'Generating notes...';
    finishBtn.disabled = true;
    finishBtn.textContent = 'Processing...';
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to save notes.");
      }

      // Call Supabase Edge Function to process transcript with Gemini
      let structuredNotes = {};
      try {
        const { data, error: fnError } = await supabase.functions.invoke('structure-notes', {
          body: { raw_transcript: finalLines, language: languageSelect.value }
        });

        if (fnError) throw fnError;
        if (data.error) throw new Error(data.error);
        structuredNotes = data;
      } catch (structErr) {
        console.error("Structuring failed, saving raw transcript only:", structErr);
        if (structErr.message && structErr.message.includes('Failed to send a request')) {
            alert("Could not reach the Edge Function for structuring. Ensure it is deployed to Supabase. Saving raw transcript instead.");
        }
        // Fallback to empty structure, raw transcript will still be saved
      }

      // Save to database
      const { data: note, error: dbError } = await supabase.from('notes').insert({
        user_id: user.id,
        title: structuredNotes.title || 'Untitled Lecture',
        language: structuredNotes.language || languageSelect.value,
        raw_transcript: finalLines,
        structured_notes: structuredNotes
      }).select('id').single();

      if (dbError) throw dbError;

      // Redirect to the newly created note page (to be built in next step)
      window.location.href = `/frontend/note.html?id=${note.id}`;

    } catch (err) {
      console.error("Note generation error:", err);
      alert(`Error generating notes: ${err.message}`);
      finishBtn.textContent = 'Finish & Generate Notes';
      finishBtn.disabled = false;
      micStatus.textContent = 'Ready to record';
    }
  });
});
