// State variables
let isRecording = false;
let fullTranscript = [];
let speechEngine = null;
let useFallback = false;

// DOM Elements
const micBtn = document.getElementById('mic-btn');
const finishBtn = document.getElementById('finish-btn');
const feed = document.getElementById('transcript-feed');
const engineBadge = document.getElementById('engine-badge');
const alertMessage = document.getElementById('alert-message');
const loadingOverlay = document.getElementById('loading-overlay');

// Ensure user is authenticated
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/login.html';
  }
}
checkAuth();

// Keyboard shortcut (Space to toggle)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.activeElement.tagName !== 'BUTTON') {
    e.preventDefault();
    toggleRecording();
  }
});

micBtn.addEventListener('click', toggleRecording);

async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function updateBadge(engineName, isActive) {
  engineBadge.textContent = `Engine: ${engineName}`;
  if (isActive) {
    engineBadge.classList.add('active');
  } else {
    engineBadge.classList.remove('active');
  }
}

function appendTranscriptLine(text) {
  if (feed.querySelector('div[style]')) feed.innerHTML = ''; // Clear default message

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const line = document.createElement('div');
  line.className = 't-line';
  line.innerHTML = `<div class="t-time">[${timeString}]</div><div class="t-text">${text}</div>`;
  
  feed.appendChild(line);
  feed.scrollTop = feed.scrollHeight;
  fullTranscript.push(text);
  
  // Enable finish button if we have data
  if (fullTranscript.length > 0) {
    finishBtn.disabled = false;
  }
}

function startRecording() {
  isRecording = true;
  micBtn.setAttribute('aria-pressed', 'true');
  micBtn.setAttribute('aria-label', 'Stop recording');
  alertMessage.style.display = 'none';

  // Primary: Attempt AssemblyAI WebSocket via Edge Function (Assumption: wss endpoint will be provided by backend)
  // For now, if the primary fails or isn't hooked up yet, gracefully fallback to Web Speech API.
  try {
    startWebSpeechFallback();
  } catch (err) {
    alertMessage.textContent = "Audio capture failed. Please check microphone permissions.";
    alertMessage.className = "alert error";
    stopRecording();
  }
}

function stopRecording() {
  isRecording = false;
  micBtn.setAttribute('aria-pressed', 'false');
  micBtn.setAttribute('aria-label', 'Start recording');
  updateBadge('Offline', false);

  if (speechEngine) {
    speechEngine.stop();
  }
}

// Fallback Engine: Web Speech API
function startWebSpeechFallback() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alertMessage.textContent = "Your browser does not support live transcription. Please use Chrome or Edge.";
    alertMessage.className = "alert error";
    stopRecording();
    return;
  }

  speechEngine = new SpeechRecognition();
  speechEngine.continuous = true;
  speechEngine.interimResults = false; // Only get finalized sentences for cleaner feed

  speechEngine.onstart = () => {
    updateBadge('WebSpeech API', true);
  };

  speechEngine.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    if (transcript) {
      appendTranscriptLine(transcript);
    }
  };

  speechEngine.onerror = (event) => {
    if (event.error === 'not-allowed') {
      alertMessage.textContent = "Microphone access denied.";
      alertMessage.className = "alert error";
      stopRecording();
    }
  };

  speechEngine.onend = () => {
    // Web Speech API silently times out after ~60s of silence. 
    // If we are still supposed to be recording, automatically restart it.
    if (isRecording) {
      try {
        speechEngine.start();
      } catch (e) {
        // Handle edge cases where it might already be started
      }
    }
  };

  speechEngine.start();
}

// Finish & Generate Logic
finishBtn.addEventListener('click', async () => {
  if (isRecording) stopRecording();
  if (fullTranscript.length === 0) return;

  loadingOverlay.classList.add('active');
  loadingOverlay.setAttribute('aria-hidden', 'false');

  const combinedText = fullTranscript.join(' ');
  const title = "Lecture - " + new Date().toLocaleDateString();

  try {
    // Call our structure-notes Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    
    // NOTE: This uses Supabase Edge Functions. We will deploy this in the final step.
    const { data, error } = await supabase.functions.invoke('structure-notes', {
      body: { transcript: combinedText, title: title }
    });

    if (error) throw error;

    // The edge function will insert the note into the DB and return the note ID.
    // Redirect to the newly created note.
    window.location.href = `/note.html?id=${data.note_id}`;

  } catch (err) {
    loadingOverlay.classList.remove('active');
    loadingOverlay.setAttribute('aria-hidden', 'true');
    alertMessage.textContent = "Failed to generate notes. " + err.message;
    alertMessage.className = "alert error";
  }
});