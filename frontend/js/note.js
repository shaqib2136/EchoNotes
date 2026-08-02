import { supabase } from './supabaseClient.js';
import { exportToPDF, exportToDOCX, exportToTXT } from './export.js';

document.addEventListener('DOMContentLoaded', async () => {
  const loader = document.getElementById('loader');
  const errorState = document.getElementById('error-state');
  const noteHeader = document.getElementById('note-header');
  const noteContentWrapper = document.getElementById('note-content');
  
  const titleEl = document.getElementById('note-title');
  const dateEl = document.getElementById('note-date');
  const summaryEl = document.getElementById('note-summary');
  const summarySection = document.getElementById('summary-section');
  const sectionsContainer = document.getElementById('sections-container');
  const glossarySection = document.getElementById('glossary-section');
  const glossaryGrid = document.getElementById('glossary-grid');
  const rawTranscriptSection = document.getElementById('raw-transcript-section');
  const rawTranscriptContent = document.getElementById('raw-transcript-content');

  const btnPdf = document.getElementById('export-pdf');
  const btnDocx = document.getElementById('export-docx');
  const btnTxt = document.getElementById('export-txt');

  let currentNote = null;

  // 1. Get Note ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const noteId = urlParams.get('id');

  if (!noteId) {
    showError("No note ID provided.");
    return;
  }

  // 2. Fetch Note
  try {
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (error) throw error;
    if (!note) throw new Error("Note not found.");
    
    currentNote = note;
    renderNote(note);

  } catch (err) {
    console.error("Failed to load note:", err);
    showError(err.message || "Failed to load note.");
  }

  function showError(msg) {
    loader.style.display = 'none';
    errorState.style.display = 'block';
    errorState.textContent = msg;
  }

  function renderNote(note) {
    const struct = note.structured_notes || {};
    
    // Header
    titleEl.textContent = note.title || struct.title || 'Untitled Lecture';
    const d = new Date(note.created_at);
    dateEl.textContent = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Summary
    if (struct.summary) {
      summaryEl.textContent = struct.summary;
      summarySection.style.display = 'block';
    } else {
      summarySection.style.display = 'none';
    }

    // Sections
    sectionsContainer.innerHTML = '';
    if (struct.sections && Array.isArray(struct.sections)) {
      struct.sections.forEach(section => {
        const sectionBlock = document.createElement('div');
        sectionBlock.className = 'section-block';
        
        const h3 = document.createElement('h3');
        h3.textContent = section.heading || 'Section';
        sectionBlock.appendChild(h3);
        
        if (section.bullets && Array.isArray(section.bullets)) {
          const ul = document.createElement('ul');
          section.bullets.forEach(bullet => {
            const li = document.createElement('li');
            li.textContent = bullet;
            ul.appendChild(li);
          });
          sectionBlock.appendChild(ul);
        }
        
        sectionsContainer.appendChild(sectionBlock);
      });
    }

    // Glossary
    glossaryGrid.innerHTML = '';
    if (struct.glossary && Array.isArray(struct.glossary) && struct.glossary.length > 0) {
      struct.glossary.forEach(item => {
        const gItem = document.createElement('div');
        gItem.className = 'glossary-item';
        
        const term = document.createElement('div');
        term.className = 'glossary-term';
        term.textContent = item.term;
        
        const def = document.createElement('div');
        def.className = 'glossary-def';
        def.textContent = item.definition;
        
        gItem.appendChild(term);
        gItem.appendChild(def);
        glossaryGrid.appendChild(gItem);
      });
      glossarySection.style.display = 'block';
    } else {
      glossarySection.style.display = 'none';
    }

    // Fallback logic for raw transcript
    const hasSummary = !!struct.summary;
    const hasSections = struct.sections && Array.isArray(struct.sections) && struct.sections.length > 0;
    const hasGlossary = struct.glossary && Array.isArray(struct.glossary) && struct.glossary.length > 0;
    
    if (!hasSummary && !hasSections && !hasGlossary && note.raw_transcript) {
      rawTranscriptContent.textContent = note.raw_transcript;
      rawTranscriptSection.style.display = 'block';
    } else {
      rawTranscriptSection.style.display = 'none';
    }

    // Show content
    loader.style.display = 'none';
    noteHeader.style.display = 'block';
    noteContentWrapper.style.display = 'flex';
  }

  // Export Listeners
  btnPdf.addEventListener('click', () => exportToPDF(currentNote));
  btnDocx.addEventListener('click', () => exportToDOCX(currentNote));
  btnTxt.addEventListener('click', () => exportToTXT(currentNote));
});
