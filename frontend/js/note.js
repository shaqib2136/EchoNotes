// State
let currentNoteData = null;

// DOM
const noteContainer = document.getElementById('note-container');
const alertMessage = document.getElementById('alert-message');

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) window.location.href = '/login.html';
}

function showMessage(msg, type = 'error') {
  alertMessage.textContent = msg;
  alertMessage.className = 'alert ' + type;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadNote() {
  await checkAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const noteId = urlParams.get('id');

  if (!noteId) {
    showMessage("No note ID provided.", "error");
    noteContainer.innerHTML = '';
    return;
  }

  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (error || !note) {
    showMessage("Failed to load note. It may not exist or you don't have permission.", "error");
    noteContainer.innerHTML = '';
    return;
  }

  currentNoteData = note;
  renderNote(note);
}

function renderNote(note) {
  const date = new Date(note.created_at).toLocaleDateString(undefined, { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const struct = note.structured_notes || { sections: [], glossary: [] };
  
  // Build sections HTML
  let sectionsHTML = '';
  if (struct.sections && struct.sections.length > 0) {
    sectionsHTML = struct.sections.map(sec => `
      <h2 class="section-heading">${escapeHTML(sec.heading)}</h2>
      <ul class="bullet-list">
        ${sec.bullets.map(b => `<li>${escapeHTML(b)}</li>`).join('')}
      </ul>
    `).join('');
  }

  // Build glossary HTML
  let glossaryHTML = '';
  if (struct.glossary && struct.glossary.length > 0) {
    glossaryHTML = `
      <div class="glossary-card">
        <h3 class="glossary-title">Key Terms Glossary</h3>
        ${struct.glossary.map(g => `
          <div class="glossary-item">
            <span class="glossary-term">${escapeHTML(g.term)}</span>
            <span>${escapeHTML(g.definition)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  noteContainer.innerHTML = `
    <div class="note-header-area">
      <div>
        <h1 class="note-title-display" id="display-title">${escapeHTML(note.title)}</h1>
        <div class="note-meta">Recorded on ${date}</div>
      </div>
      <div class="export-group" role="group" aria-label="Export options">
        <button class="export-btn" onclick="exportPDF()" aria-label="Export as PDF">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </button>
        <button class="export-btn" onclick="exportDOCX()" aria-label="Export as Word Document">
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </button>
        <button class="export-btn" onclick="exportTXT()" aria-label="Export as Plain Text">
          <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        </button>
      </div>
    </div>
    
    <div class="note-content">
      ${sectionsHTML}
    </div>
    
    ${glossaryHTML}

    <div class="raw-transcript-toggle">
      <button class="btn btn-ghost" onclick="document.getElementById('raw-box').classList.toggle('open')" aria-expanded="false">Toggle Raw Transcript</button>
      <div id="raw-box" class="raw-transcript-box">${escapeHTML(note.raw_transcript || "No raw transcript available.")}</div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', loadNote);