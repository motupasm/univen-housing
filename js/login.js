// Switch between Student/Admin tabs
function switchTab(role) {
    let tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    if (role === 'student') {
        tabs[0].classList.add('active');
        document.getElementById("user-label").textContent = "Student Number";
        document.getElementById("username").placeholder = "e.g., 11234567";
    } else {
        tabs[1].classList.add('active');
        document.getElementById("user-label").textContent = "Email Address";
        document.getElementById("username").placeholder = "e.g., admin@demo.com";
    }
}

// Toggle password visibility
function togglePassword() {
    const password = document.getElementById("password");
    const eyeIcon = document.getElementById("eyeIcon");

    if (password.type === "password") {
        password.type = "text";
        eyeIcon.classList.remove("fa-eye");
        eyeIcon.classList.add("fa-eye-slash");
    } else {
        password.type = "password";
        eyeIcon.classList.remove("fa-eye-slash");
        eyeIcon.classList.add("fa-eye");
    }
}

// Handle login form submission
document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault(); // prevent page reload

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const activeTab = document.querySelector('.tab.active').textContent.toLowerCase();
    const userType = activeTab === 'student' ? 'student' : 'admin';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                user_type: userType
            })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = data.redirect;
        } else {
            alert(data.message || "Invalid credentials. Please try again.");
        }
    } catch (error) {
        console.error('Login error:', error);
        alert("An error occurred during login. Please try again.");
    }
});