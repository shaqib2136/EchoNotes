import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  const notesGrid = document.getElementById('notes-grid');
  const searchInput = document.getElementById('search-input');
  const logoutBtn = document.getElementById('logout-btn');
  const loader = document.getElementById('loader');

  let currentSearchTimer = null;

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    window.location.href = 'login.html';
    return;
  }

  // Handle Logout
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '../index.html';
  });

  // Format Date
  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Render a single note card
  function createNoteCard(note) {
    const summary = note.structured_notes?.summary || note.raw_transcript?.substring(0, 150) + '...' || 'No summary available.';
    
    const div = document.createElement('div');
    div.className = 'note-card';
    div.innerHTML = `
      <div class="note-date">${formatDate(note.created_at)}</div>
      <h3 class="note-title">${note.title || 'Untitled Lecture'}</h3>
      <p class="note-summary">${summary}</p>
      <div class="note-actions">
        <a href="note.html?id=${note.id}" class="btn btn-ghost">View</a>
        <button class="btn btn-ghost export-btn" data-id="${note.id}" aria-label="Export ${note.title || 'Untitled Lecture'}">Export</button>
      </div>
    `;

    // Handle Export logic
    const exportBtn = div.querySelector('.export-btn');
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Redirect to the note view to perform exports
      window.location.href = `note.html?id=${note.id}`;
    });

    return div;
  }

  // Render empty state
  function showEmptyState(isSearch = false) {
    notesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>${isSearch ? 'No notes found' : 'No notes yet'}</h3>
        <p>${isSearch ? 'Try a different search term or clear the search bar.' : 'Start recording your first lecture to see it here.'}</p>
        ${!isSearch ? '<a href="transcribe.html" class="btn btn-lime">New Lecture</a>' : ''}
      </div>
    `;
  }

  // Load notes from Supabase
  async function loadNotes(searchQuery = '') {
    notesGrid.innerHTML = '';
    loader.style.display = 'block';

    try {
      let query = supabase
        .from('notes')
        .select('id, title, created_at, structured_notes, raw_transcript')
        .order('created_at', { ascending: false });

      if (searchQuery.trim() !== '') {
        // Query Postgres full-text search vector via the search_vector column
        // We use plainto_tsquery under the hood in Supabase
        query = query.textSearch('search_vector', searchQuery.trim(), {
          type: 'websearch',
          config: 'english' // Using english as default for websearch textSearch
        });
      }

      const { data, error } = await query;

      if (error) throw error;

      loader.style.display = 'none';

      if (data.length === 0) {
        showEmptyState(searchQuery.trim() !== '');
      } else {
        data.forEach(note => {
          notesGrid.appendChild(createNoteCard(note));
        });
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
      loader.style.display = 'none';
      notesGrid.innerHTML = `
        <div class="empty-state">
          <h3 style="color: var(--coral)">Error loading notes</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  // Handle Search with debounce
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    
    if (currentSearchTimer) {
      clearTimeout(currentSearchTimer);
    }
    
    currentSearchTimer = setTimeout(() => {
      loadNotes(query);
    }, 400); // 400ms debounce
  });
  
  // Also handle keyboard shortcut Ctrl+K to focus search (from homepage accessibility)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Initial load
  loadNotes();
});
