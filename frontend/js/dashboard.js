// DOM Elements
const notesGrid = document.getElementById('notes-grid');
const logoutBtn = document.getElementById('logout-btn');
const alertMessage = document.getElementById('alert-message');

// Authentication Check
async function checkAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    window.location.href = '/login.html';
    return null;
  }
  return session.user;
}

// Show Alert
function showMessage(msg, type = 'error') {
  alertMessage.textContent = msg;
  alertMessage.className = 'alert ' + type;
}

// Fetch and Render Notes
async function loadNotes() {
  const user = await checkAuth();
  if (!user) return;

  // Fetch notes from Supabase belonging to this user
  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, title, created_at, structured_notes')
    .order('created_at', { ascending: false });

  if (error) {
    showMessage('Failed to load notes. ' + error.message, 'error');
    return;
  }

  renderNotes(notes);
}

// Generate the HTML for the grid
function renderNotes(notes) {
  if (!notes || notes.length === 0) {
    notesGrid.innerHTML = `
      <div class="empty-state">
        <h3>No notes yet</h3>
        <p>Your recorded lectures will appear here.</p>
        <a href="transcribe.html" class="btn btn-lime">Record your first lecture</a>
      </div>
    `;
    return;
  }

  notesGrid.innerHTML = notes.map(note => {
    const date = new Date(note.created_at).toLocaleDateString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
    
    // Extract a snippet safely from the JSON structure
    // Assumption: structured_notes contains { sections: [{ heading, bullets: [] }] }
    let snippet = "No content available.";
    if (note.structured_notes && note.structured_notes.sections && note.structured_notes.sections.length > 0) {
      if (note.structured_notes.sections[0].bullets && note.structured_notes.sections[0].bullets.length > 0) {
        snippet = note.structured_notes.sections[0].bullets[0];
      }
    }

    return `
      <article class="note-card">
        <span class="note-date">${date}</span>
        <h2 class="note-title">${escapeHTML(note.title)}</h2>
        <p class="note-snippet">${escapeHTML(snippet)}</p>
        <div class="note-actions">
          <a href="note.html?id=${note.id}" class="btn btn-ghost" aria-label="View ${escapeHTML(note.title)}">View</a>
          <button onclick="triggerExport('${note.id}')" class="btn btn-lime" aria-label="Export ${escapeHTML(note.title)}">Export</button>
        </div>
      </article>
    `;
  }).join('');
}

// Simple HTML escaping to prevent XSS
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Logout Handler
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
  });
}

// Handle quick export from dashboard
function triggerExport(noteId) {
  // Redirect to the note view with a URL parameter telling it to auto-open the export modal
  window.location.href = `note.html?id=${noteId}&export=true`;
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', loadNotes);