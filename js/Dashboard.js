document.addEventListener('DOMContentLoaded', () => {
    // Prevent back button navigation after logout
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            // Page was loaded from cache, check if user is still logged in
            checkAuthentication();
        }
    });
    
    // Check for URL parameter to auto-switch to My Application section
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    
    if (section === 'application') {
        // Switch to My Application section
        const navItems = document.querySelectorAll('.admin_section_navigations li');
        const sections = document.querySelectorAll('.content-section');
        
        // Remove active class from all nav items and sections
        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active'));
        
        // Activate My Application section
        const applicationNav = document.querySelector('[data-section="application"]');
        const applicationSection = document.getElementById('application');
        
        if (applicationNav && applicationSection) {
            applicationNav.classList.add('active');
            applicationSection.classList.add('active');
            
            // Refresh applications data when switching to My Application section
            refreshApplications();
        }
    }

    // Hamburger Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu-container');

    hamburger.addEventListener('click', () => {
        const isOpen = hamburger.getAttribute('data-menu-open') === 'true';
        hamburger.setAttribute('data-menu-open', !isOpen);
        hamburger.classList.toggle('open');
        navMenu.classList.toggle('open');
    });

    // Close menu when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && !hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            hamburger.setAttribute('data-menu-open', 'false');
            hamburger.classList.remove('open');
            navMenu.classList.remove('open');
        }
    });

    // Navigation Switching
    const navItems = document.querySelectorAll('.admin_section_navigations li');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            sections.forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(item.getAttribute('data-section'));
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            if (window.innerWidth <= 768) {
                hamburger.setAttribute('data-menu-open', 'false');
                hamburger.classList.remove('open');
                navMenu.classList.remove('open');
            }
        });
    });

    // Form Functionality for Housing Application
    const appType = document.getElementById('appType');
    const genderField = document.getElementById('genderField');
    const applicationForm = document.getElementById('applicationForm');

    // Check existing applications on page load
    checkExistingApplications();

    appType.addEventListener('change', () => {
        if (appType.value === 'on') {
            genderField.classList.remove('hidden');
        } else {
            genderField.classList.add('hidden');
        }
        
        // Check if user can apply to this type
        checkApplicationLimits();
    });

    // Add form submission validation
    applicationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        checkApplicationLimits().then(canApply => {
            if (canApply) {
                // Proceed with form submission
                applicationForm.submit();
            }
        });
    });

    // Form Submission - This will now be handled by the form action
    // The JavaScript is kept for UI validation

    // Start Application Button in My Application Section
    document.querySelector('.middle_information button')?.addEventListener('click', () => {
        sections.forEach(section => section.classList.remove('active'));
        document.getElementById('dashboard').classList.add('active');
        navItems.forEach(nav => nav.classList.remove('active'));
        document.querySelector('[data-section="dashboard"]').classList.add('active');
        if (window.innerWidth <= 768) {
            hamburger.setAttribute('data-menu-open', 'false');
            hamburger.classList.remove('open');
            navMenu.classList.remove('open');
        }
    });
    // Load my applications
    refreshApplications();
});

// Function to check existing applications
async function checkExistingApplications() {
    try {
        const response = await fetch('/api/applications/me', {
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const applications = await response.json();
            console.log('Existing applications:', applications);
            window.existingApplications = applications || [];
            updateApplicationFormUI();
        }
    } catch (error) {
        console.error('Error fetching existing applications:', error);
        window.existingApplications = [];
    }
}

// Function to check application limits
async function checkApplicationLimits() {
    const appType = document.getElementById('appType').value;
    const existingApps = window.existingApplications || [];
    
    console.log('Checking limits for appType:', appType);
    console.log('Existing apps:', existingApps);
    
    if (!appType) {
        showNotification('Please select an application type first.', 'warning');
        return false;
    }
    
    // Count existing applications by type
    const onCampusCount = existingApps.filter(app => app.on_campus == 1 || app.on_campus === 1).length;
    const offCampusCount = existingApps.filter(app => app.on_campus == 0 || app.on_campus === 0).length;
    const totalCount = existingApps.length;
    
    console.log('Counts - On-campus:', onCampusCount, 'Off-campus:', offCampusCount, 'Total:', totalCount);
    
    // Check limits - only check on-campus limits, off-campus has no limits
    if (appType === 'on' && onCampusCount >= 2) {
        console.log('Blocking: On-campus count >= 2');
        showNotification('You have already applied to the maximum number of on-campus residences (2). Please select "Off-Campus" or check your applications in the "My Application" section.', 'error');
        return false;
    }
    
    // Off-campus has no limits - always allow
    
    console.log('Allowing application to proceed');
    
    return true;
}

// Function to update form UI based on existing applications
function updateApplicationFormUI() {
    const appType = document.getElementById('appType');
    const existingApps = window.existingApplications || [];
    
    const onCampusCount = existingApps.filter(app => app.on_campus == 1 || app.on_campus === 1).length;
    const offCampusCount = existingApps.filter(app => app.on_campus == 0 || app.on_campus === 0).length;
    const totalCount = existingApps.length;
    
    // Disable options based on limits
    const onCampusOption = appType.querySelector('option[value="on"]');
    const offCampusOption = appType.querySelector('option[value="off"]');
    
    if (onCampusCount >= 2) {
        onCampusOption.disabled = true;
        onCampusOption.textContent = 'On-Campus (Limit Reached)';
        onCampusOption.style.color = '#6c757d';
    } else {
        onCampusOption.disabled = false;
        onCampusOption.textContent = 'On-Campus';
        onCampusOption.style.color = '';
    }
    
    // Off-campus has no limits - always enabled
    offCampusOption.disabled = false;
    offCampusOption.textContent = 'Off-Campus';
    offCampusOption.style.color = '';
    
    // Info box removed as requested
}

// Function removed - no longer needed

// Function to check authentication
async function checkAuthentication() {
    try {
        const response = await fetch('/api/applications/me', {
            credentials: 'same-origin'
        });
        
        if (!response.ok || response.status === 401) {
            // User is not authenticated, redirect to login
            window.location.href = '/login';
            return;
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        // On error, redirect to login for security
        window.location.href = '/login';
    }
}

// Function to show notifications
function showNotification(message, type) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Set background color based on type
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = '#212529';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        default:
            notification.style.backgroundColor = '#17a2b8';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Function to refresh applications data
function refreshApplications() {
    // Fetch fresh application data without reloading the page
    fetch('/api/applications/me')
        .then(response => response.json())
        .then(applications => {
            if (Array.isArray(applications) && applications.length > 0) {
                updateApplicationsTable(applications);
            }
        })
        .catch(error => {
            console.error('Error fetching applications:', error);
        });
}

// Function to update the applications table with fresh data
function updateApplicationsTable(applications) {
    const container = document.getElementById('application-content');
    if (!container) return;
    
    let rows = applications.map(app => {
        const canAct = app.status === 'Approved';
        const actions = canAct ? `<button class="adminbtn" data-app-accept="${app.id}">Accept Offer</button> <button class="adminbtn" data-app-reject="${app.id}">Reject Offer</button>` : '';
        return `<tr><td>${app.residence_name}${app.block ? ` - ${app.block}` : ''}</td><td><span class="status-${(app.status || '').toLowerCase()}">${app.status}</span></td><td>${app.applied_date || app.apply_date || ''}</td></tr>${actions ? `<tr><td colspan=3>${actions}</td></tr>` : ''}`;
    }).join('');
    
    container.innerHTML = `
        <table class="application-table">
            <thead><tr><th>Residence</th><th>Status</th><th>Applied Date</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;

    // Re-attach event listeners for action buttons
    container.querySelectorAll('[data-app-accept]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-app-accept');
            const res = await fetch(`/api/applications/${id}/accept`, { method: 'POST' });
            if (res.ok) { 
                refreshApplications(); // Refresh data after action
            } else { 
                alert('Failed to accept'); 
            }
        });
    });
    
    container.querySelectorAll('[data-app-reject]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-app-reject');
            const res = await fetch(`/api/applications/${id}/reject_offer`, { method: 'POST' });
            if (res.ok) { 
                refreshApplications(); // Refresh data after action
            } else { 
                alert('Failed to reject'); 
            }
        });
    });
}

// Function to show dashboard section
function showDashboard() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('dashboard').classList.add('active');
    
    document.querySelectorAll('.navigators').forEach(nav => {
        nav.classList.remove('active');
    });
    document.querySelector('[data-section="dashboard"]').classList.add('active');
}