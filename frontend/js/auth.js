import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authForm = document.getElementById('auth-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submit-btn');
  const toggleModeBtn = document.getElementById('toggle-mode-btn');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const toggleText = document.getElementById('toggle-text');
  const authError = document.getElementById('auth-error');

  let isLoginMode = true;

  // Check if user is already logged in, redirect to dashboard if so
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      window.location.href = 'dashboard.html';
      return;
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }

  // Function to update UI mode
  function updateModeUI(toLogin) {
    isLoginMode = toLogin;
    if (isLoginMode) {
      authTitle.textContent = 'Welcome back';
      authSubtitle.textContent = 'Log in to access your notes';
      submitBtn.textContent = 'Log in';
      toggleText.textContent = "Don't have an account?";
      toggleModeBtn.textContent = 'Sign up free';
      passwordInput.autocomplete = 'current-password';
    } else {
      authTitle.textContent = 'Create an account';
      authSubtitle.textContent = 'Start taking accessible notes today';
      submitBtn.textContent = 'Sign up free';
      toggleText.textContent = 'Already have an account?';
      toggleModeBtn.textContent = 'Log in';
      passwordInput.autocomplete = 'new-password';
    }
  }

  // Check URL for mode parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'signup') {
    updateModeUI(false);
  }

  // Toggle between Login and Sign Up modes
  toggleModeBtn.addEventListener('click', () => {
    authError.textContent = ''; // Clear errors on toggle
    updateModeUI(!isLoginMode);
    
    // Update URL without reloading
    const newUrl = new URL(window.location);
    if (isLoginMode) {
      newUrl.searchParams.delete('mode');
    } else {
      newUrl.searchParams.set('mode', 'signup');
    }
    window.history.replaceState({}, '', newUrl);
  });

  // Handle form submission
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      authError.textContent = 'Please enter both email and password.';
      return;
    }

    // Disable form while submitting
    submitBtn.disabled = true;
    submitBtn.textContent = 'Please wait...';
    authError.textContent = '';

    try {
      if (isLoginMode) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        // Success! Redirect to dashboard
        window.location.href = 'dashboard.html';
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });
        
        if (error) throw error;
        
        if (data.user && data.session === null) {
          // Email confirmation required scenario
          authError.style.color = 'var(--lime)'; // Make it look like a success message
          authError.style.background = 'rgba(198,241,53,0.1)';
          authError.style.borderColor = 'rgba(198,241,53,0.3)';
          authError.textContent = 'Success! Please check your email for a confirmation link.';
        } else {
          // Success! Redirect to dashboard
          window.location.href = 'dashboard.html';
        }
      }
    } catch (err) {
      // Reset success styling just in case
      authError.style.color = 'var(--coral)';
      authError.style.background = 'rgba(255, 111, 145, 0.1)';
      authError.style.borderColor = 'rgba(255, 111, 145, 0.3)';
      authError.textContent = err.message || 'An error occurred during authentication.';
    } finally {
      // Re-enable form
      submitBtn.disabled = false;
      submitBtn.textContent = isLoginMode ? 'Log in' : 'Sign up free';
    }
  });
});
