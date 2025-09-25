lucide.createIcons();

let activeTab = 'student';
let email = ''; // Store email for both student and admin
let verificationCode = '';
let otpTimer; // Store the timer interval

const tabStudent = document.getElementById('tab-student');
const tabAdmin = document.getElementById('tab-admin');
const studentContent = document.getElementById('student-content');
const adminContent = document.getElementById('admin-content');
const studentInput = document.getElementById('reset-student-number');
const adminInput = document.getElementById('reset-admin-email');
const studentEmailSpan = document.getElementById('student-email');
const errorDiv = document.getElementById('error');
const timerDiv = document.getElementById('timer') || document.createElement('div'); // Create or get timer display

// Append timerDiv if it doesn't exist
if (!document.getElementById('timer')) {
  timerDiv.id = 'timer';
  timerDiv.style.color = 'red';
  timerDiv.style.margin = '10px 0';
  document.getElementById('email-verification').appendChild(timerDiv);
}

const emailEntry = document.getElementById('email-entry');
const emailVerification = document.getElementById('email-verification');
const resetCard = document.getElementById('reset-card');

const verifyForm = document.getElementById('verify-form');
const verifyError = document.getElementById('verify-error');
const verifyInput = document.getElementById('verification-code');

const resetForm = document.getElementById('reset-form');
const resetError = document.getElementById('reset-error');

// Tab switching
tabStudent.addEventListener('click', () => {
  activeTab = 'student';
  tabStudent.classList.add('active');
  tabAdmin.classList.remove('active');
  studentContent.classList.remove('hidden');
  adminContent.classList.add('hidden');
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';
});

tabAdmin.addEventListener('click', () => {
  activeTab = 'admin';
  tabAdmin.classList.add('active');
  tabStudent.classList.remove('active');
  adminContent.classList.remove('hidden');
  studentContent.classList.add('hidden');
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';
});

// Update student email display
studentInput.addEventListener('input', e => {
  const studentNumber = e.target.value.trim();
  const emailAddress = studentNumber ? `${studentNumber}@mvula.univen.ac.za` : '';
  studentEmailSpan.textContent = emailAddress;
  if (studentEmailSpan.parentElement) {
    studentEmailSpan.parentElement.style.display = 'block'; // Ensure parent is visible
  }
});

// Student form submission - Request OTP
document.getElementById('student-form').addEventListener('submit', async e => {
  e.preventDefault();
  const studentNumber = studentInput.value.trim();

  if (!studentNumber || studentNumber.length > 50) {
    errorDiv.textContent = 'Please enter a valid student number (max 50 characters).';
    errorDiv.style.display = 'block';
    return;
  }

  // First, get the actual email from the backend
  try {
    const response = await fetch('http://127.0.0.1:5000/api/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${studentNumber}@mvula.univen.ac.za` }),
    });

    const result = await response.json();

    if (response.ok) {
      // Update the email display with the actual email that will receive the OTP
      studentEmailSpan.textContent = result.actual_email || `${studentNumber}@mvula.univen.ac.za`;
      if (studentEmailSpan.parentElement) {
        studentEmailSpan.parentElement.style.display = 'block';
      }
      
      showSuccess('OTP sent to your email. Please check your inbox.');
      emailEntry.classList.add('hidden');
      emailVerification.classList.remove('hidden');
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';

      // Start 2-minute countdown timer
      let timeLeft = 120;
      timerDiv.style.display = 'block';
      clearInterval(otpTimer);
      otpTimer = setInterval(() => {
        if (timeLeft > 0) {
          const minutes = Math.floor(timeLeft / 60);
          const seconds = timeLeft % 60;
          timerDiv.textContent = `OTP expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
          timeLeft--;
        } else {
          clearInterval(otpTimer);
          timerDiv.textContent = 'OTP has expired. Requesting new OTP...';
          verifyInput.value = '';
          requestOtp(email);
        }
      }, 1000);
    } else {
      errorDiv.textContent = result.error || 'Failed to send OTP.';
      errorDiv.style.display = 'block';
    }
  } catch (err) {
    console.error('OTP request error:', err);
    errorDiv.textContent = 'Server error. Please try again later.';
    errorDiv.style.display = 'block';
  }
});

// Admin form submission - Request OTP
document.getElementById('admin-form').addEventListener('submit', async e => {
  e.preventDefault();
  email = adminInput.value.trim();

  if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    errorDiv.textContent = 'Please enter a valid admin email.';
    errorDiv.style.display = 'block';
    return;
  }

  if (email.length > 100) {
    errorDiv.textContent = 'Email length exceeds allowed limit (100 characters).';
    errorDiv.style.display = 'block';
    return;
  }

  await requestOtp(email);
});

// OTP verification form submission
verifyForm.addEventListener('submit', async e => {
  e.preventDefault();
  verificationCode = verifyInput.value.trim();

  if (verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
    verifyError.textContent = 'Code must be a 6-digit number.';
    verifyError.style.display = 'block';
    return;
  }

  verifyError.style.display = 'none';
  verifyError.textContent = '';

  try {
    const response = await fetch('http://127.0.0.1:5000/api/password-reset/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: verificationCode, new_password: '' }), // Verify OTP only
    });

    const result = await response.json();

    if (response.ok) {
      // OTP verified successfully, redirect to change password section
      clearInterval(otpTimer); // Stop the timer
      timerDiv.style.display = 'none'; // Hide timer
      showSuccess('OTP verification accepted');
      emailVerification.classList.add('hidden');
      resetCard.classList.remove('hidden');
    } else {
      verifyError.textContent = result.error || 'Failed to verify OTP.';
      verifyError.style.display = 'block';
    }
  } catch (err) {
    console.error('OTP verification error:', err);
    verifyError.textContent = 'Server error. Please try again later.';
    verifyError.style.display = 'block';
  }
});

// Password reset form submission
resetForm.addEventListener('submit', async e => {
  e.preventDefault();
  const newPass = document.getElementById('new-password').value.trim();
  const confirmPass = document.getElementById('confirm-password').value.trim();

  resetError.style.display = 'none';
  resetError.textContent = '';

  if (newPass.length < 8) {
    resetError.textContent = 'Password must be at least 8 characters.';
    resetError.style.display = 'block';
    return;
  }

  if (newPass !== confirmPass) {
    resetError.textContent = 'Passwords do not match.';
    resetError.style.display = 'block';
    return;
  }

  if (newPass.length > 255) {
    resetError.textContent = 'Password length exceeds allowed limit (255 characters).';
    resetError.style.display = 'block';
    return;
  }

  try {
    const response = await fetch('http://127.0.0.1:5000/api/password-reset/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: verificationCode, new_password: newPass }),
    });

    const result = await response.json();

    if (response.ok) {
      // Password updated successfully
      clearInterval(otpTimer); // Stop the timer
      timerDiv.style.display = 'none'; // Hide timer
      showSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      resetError.textContent = result.error || 'Failed to reset password.';
      resetError.style.display = 'block';
      // Go back to verification step
      resetCard.classList.add('hidden');
      emailVerification.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Password reset error:', err);
    resetError.textContent = 'Server error. Please try again later.';
    resetError.style.display = 'block';
  }
});

// Change email link
document.getElementById('change-email').addEventListener('click', () => {
  emailVerification.classList.add('hidden');
  emailEntry.classList.remove('hidden');
  verifyError.style.display = 'none';
  verifyError.textContent = '';
  resetError.style.display = 'none';
  resetError.textContent = '';
  verifyInput.value = '';
  clearInterval(otpTimer); // Stop the timer
  timerDiv.style.display = 'none'; // Hide timer
});

// Helper function to request OTP
async function requestOtp(email) {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (response.ok) {
      showSuccess('OTP sent to your email. Please check your inbox.');
      emailEntry.classList.add('hidden');
      emailVerification.classList.remove('hidden');
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';

      // Start 2-minute countdown timer with auto-retry
      let timeLeft = 120; // 2 minutes in seconds
      timerDiv.style.display = 'block';
      clearInterval(otpTimer); // Clear any existing timer
      otpTimer = setInterval(() => {
        if (timeLeft > 0) {
          const minutes = Math.floor(timeLeft / 60);
          const seconds = timeLeft % 60;
          timerDiv.textContent = `OTP expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
          timeLeft--;
        } else {
          clearInterval(otpTimer);
          timerDiv.textContent = 'OTP has expired. Requesting new OTP...';
          verifyInput.value = ''; // Clear the input
          requestOtp(email); // Auto-retry with the same email
        }
      }, 1000);
    } else {
      errorDiv.textContent = result.error || 'Failed to send OTP.';
      errorDiv.style.display = 'block';
    }
  } catch (err) {
    console.error('OTP request error:', err);
    errorDiv.textContent = 'Server error. Please try again later.';
    errorDiv.style.display = 'block';
  }
}

// Helper function for success messages
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.style.color = 'green';
  successDiv.style.margin = '10px 0';
  successDiv.style.padding = '10px';
  successDiv.style.background = '#e6ffed';
  successDiv.style.borderRadius = '4px';
  successDiv.textContent = message;
  document.getElementById('email-entry').parentElement.prepend(successDiv);
  setTimeout(() => successDiv.remove(), 3000);
}