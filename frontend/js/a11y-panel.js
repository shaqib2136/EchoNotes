// frontend/js/a11y-panel.js

const styles = `
  .a11y-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    transition: all 0.2s;
  }
  .a11y-fab:hover, .a11y-fab:focus-visible {
    background: var(--card-hover);
    border-color: var(--border-strong);
    outline: 3px solid var(--lime);
    outline-offset: 3px;
  }

  .a11y-panel {
    position: fixed;
    bottom: 84px;
    right: 24px;
    z-index: 9998;
    background: var(--bg-2);
    border: 1px solid var(--border-strong);
    border-radius: 16px;
    padding: 20px;
    width: 280px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.8);
    display: none;
    flex-direction: column;
    gap: 16px;
  }
  .a11y-panel.open {
    display: flex;
  }

  .a11y-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .a11y-panel-header h3 {
    font-size: 16px;
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
  }
  .a11y-close-btn {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
    padding: 4px;
  }
  .a11y-close-btn:hover {
    color: var(--text);
  }

  .a11y-control-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .a11y-toggle-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14.5px;
    color: var(--text);
    cursor: pointer;
    font-family: 'Inter', sans-serif;
  }
  .a11y-toggle-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--lime);
    cursor: pointer;
  }

  .a11y-font-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }
  .a11y-font-btn {
    flex: 1;
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
  }
  .a11y-font-btn:hover {
    background: var(--card-hover);
    border-color: var(--border-strong);
  }
  .a11y-font-btn.active {
    background: var(--lime);
    color: var(--bg);
    border-color: var(--lime);
  }

  /* --- Overrides --- */

  /* High Contrast */
  body.a11y-high-contrast {
    --bg: #000000;
    --bg-2: #000000;
    --card: #000000;
    --card-hover: #000000;
    --border: #FFFFFF;
    --border-strong: #FFFFFF;
    --text: #FFFFFF;
    --muted: #E0E0E0;
    --violet: #FFFF00;
    --violet-deep: #FFFF00;
    --lime: #00FF00;
    --lime-dark: #00CC00;
    --amber: #FF9900;
    --cyan: #00FFFF;
  }
  body.a11y-high-contrast * {
    text-shadow: none !important;
    box-shadow: none !important;
  }

  /* Reduce Motion */
  body.a11y-reduce-motion * {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }

  /* Font Scaling */
  body.a11y-font-large {
    font-size: 112.5%;
  }
  body.a11y-font-xl {
    font-size: 125%;
  }
`;

function injectA11yPanel() {
  // Inject Styles
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // Inject HTML
  const container = document.createElement('div');
  container.innerHTML = `
    <button class="a11y-fab" id="a11y-fab" aria-label="Accessibility Settings" aria-expanded="false" aria-controls="a11y-panel">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
      </svg>
    </button>

    <div class="a11y-panel" id="a11y-panel" role="region" aria-label="Accessibility Controls">
      <div class="a11y-panel-header">
        <h3>Accessibility</h3>
        <button class="a11y-close-btn" id="a11y-close" aria-label="Close panel">×</button>
      </div>
      
      <div class="a11y-control-group">
        <label class="a11y-toggle-label">
          High Contrast
          <input type="checkbox" id="a11y-hc-toggle">
        </label>
        
        <label class="a11y-toggle-label">
          Disable Animations
          <input type="checkbox" id="a11y-anim-toggle">
        </label>
      </div>
      
      <div class="a11y-control-group" style="margin-top: 8px;">
        <span style="font-size: 14.5px;">Text Size</span>
        <div class="a11y-font-controls">
          <button class="a11y-font-btn" id="a11y-font-normal" aria-label="Normal text size">A</button>
          <button class="a11y-font-btn" id="a11y-font-large" aria-label="Large text size" style="font-size: 16px;">A</button>
          <button class="a11y-font-btn" id="a11y-font-xl" aria-label="Extra large text size" style="font-size: 18px;">A</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  bindA11yEvents();
}

function bindA11yEvents() {
  const fab = document.getElementById('a11y-fab');
  const panel = document.getElementById('a11y-panel');
  const closeBtn = document.getElementById('a11y-close');
  
  const hcToggle = document.getElementById('a11y-hc-toggle');
  const animToggle = document.getElementById('a11y-anim-toggle');
  
  const fontNormal = document.getElementById('a11y-font-normal');
  const fontLarge = document.getElementById('a11y-font-large');
  const fontXl = document.getElementById('a11y-font-xl');

  // Toggle Panel
  function togglePanel() {
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      fab.focus();
    } else {
      panel.classList.add('open');
      fab.setAttribute('aria-expanded', 'true');
      hcToggle.focus();
    }
  }

  fab.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  // Load Saved Preferences
  const prefs = JSON.parse(localStorage.getItem('echonotes_a11y')) || {
    highContrast: false,
    reduceMotion: false,
    fontSize: 'normal'
  };

  function applyPreferences() {
    // High Contrast
    if (prefs.highContrast) {
      document.body.classList.add('a11y-high-contrast');
      hcToggle.checked = true;
    } else {
      document.body.classList.remove('a11y-high-contrast');
      hcToggle.checked = false;
    }

    // Reduce Motion
    if (prefs.reduceMotion) {
      document.body.classList.add('a11y-reduce-motion');
      animToggle.checked = true;
    } else {
      document.body.classList.remove('a11y-reduce-motion');
      animToggle.checked = false;
    }

    // Font Size
    document.body.classList.remove('a11y-font-large', 'a11y-font-xl');
    fontNormal.classList.remove('active');
    fontLarge.classList.remove('active');
    fontXl.classList.remove('active');
    
    if (prefs.fontSize === 'large') {
      document.body.classList.add('a11y-font-large');
      fontLarge.classList.add('active');
    } else if (prefs.fontSize === 'xl') {
      document.body.classList.add('a11y-font-xl');
      fontXl.classList.add('active');
    } else {
      fontNormal.classList.add('active');
    }

    // Save
    localStorage.setItem('echonotes_a11y', JSON.stringify(prefs));
  }

  // Event Listeners for Toggles
  hcToggle.addEventListener('change', (e) => {
    prefs.highContrast = e.target.checked;
    applyPreferences();
  });

  animToggle.addEventListener('change', (e) => {
    prefs.reduceMotion = e.target.checked;
    applyPreferences();
  });

  fontNormal.addEventListener('click', () => { prefs.fontSize = 'normal'; applyPreferences(); });
  fontLarge.addEventListener('click', () => { prefs.fontSize = 'large'; applyPreferences(); });
  fontXl.addEventListener('click', () => { prefs.fontSize = 'xl'; applyPreferences(); });

  // Initial Apply
  applyPreferences();
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectA11yPanel);
} else {
  injectA11yPanel();
}
