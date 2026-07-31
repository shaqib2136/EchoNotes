// Grab the forms and the alert message container from the DOM
const loginForm = document.getElementById('form-login');
const signupForm = document.getElementById('form-signup');
const alertMessage = document.getElementById('alert-message');

// Helper function to display success or error messages to the user
function showMessage(msg, type = 'error') {
  alertMessage.textContent = msg;
  alertMessage.className = 'alert ' + type;
}

// Handle the Sign Up process
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    // Call Supabase to create a new user
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      showMessage(error.message, 'error');
    } else {
      showMessage('Account created! You can now log in.', 'success');
      // Automatically switch the UI back to the login tab
      if (typeof switchTab === 'function') {
        switchTab('login');
      }
    }
  });
}

// Handle the Log In process
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Call Supabase to verify credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      showMessage(error.message, 'error');
    } else {
      // On success, redirect the user to the dashboard
      window.location.href = '/dashboard.html';
    }
  });
}