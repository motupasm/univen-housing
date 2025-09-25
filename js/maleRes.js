// Unified JavaScript for all residence selection pages
let applications = [];
let submittedApplications = [];
const MAX_SELECTIONS = 2;
const MAX_ON_CAMPUS = 2;
const MAX_OFF_CAMPUS = 2;

// Prevent back button navigation after logout
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // Page was loaded from cache, check if user is still logged in
        checkAuthentication();
    }
});

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

// Check if residence is on-campus or off-campus
function isOnCampusResidence(residence) {
    const onCampusResidences = [
        'DBSA Female', 'New Female', 'Lost City Girls', 'F2', 'F3', 'F4', 'F5', 'F6',
        'DBSA Male', 'New Male', 'Lost City Boys', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'
    ];
    return onCampusResidences.includes(residence);
}

// Apply for a residence
function apply(residence, selectId) {
    // Note: Removed total limit check - only individual type limits apply

    // Check if this is an on-campus residence
    const isOnCampus = isOnCampusResidence(residence);
    
    // Count current applications by type
    const onCampusCount = applications.filter(app => isOnCampusResidence(app.residence)).length;
    const offCampusCount = applications.filter(app => !isOnCampusResidence(app.residence)).length;

    // Check on-campus limit
    if (isOnCampus && onCampusCount >= MAX_ON_CAMPUS) {
        showNotification(`You have reached the maximum on-campus applications (${MAX_ON_CAMPUS}). You can still apply to off-campus residences.`, 'warning');
        return;
    }

    // Off-campus has no limits - always allow

    let block = "";
    if (selectId) {
        const select = document.getElementById(selectId);
        block = select.value;
        if (!block) {
            showNotification("Please select a block first.", 'warning');
            return;
        }
    }

    const choice = block ? `${residence} - ${block}` : residence;
    if (applications.some(app => app.choice === choice)) {
        showNotification("You have already selected this option.", 'warning');
        return;
    }

    applications.push({ residence, block, choice });
    updateUI();

    if (isOnCampus && onCampusCount >= MAX_ON_CAMPUS) {
        showNotification("You've reached the maximum on-campus applications. You can still apply to off-campus residences.", 'info');
    }
    // Off-campus has no limits - no notification needed
}

// Remove application
function removeApplication(index) {
    applications.splice(index, 1);
    updateUI();
    showNotification("Application removed. You can select another residence.", 'info');
}

// Update UI selections
function updateUI() {
    const applicationsList = document.getElementById('applications');
    const submitBtn = document.getElementById('submitBtn');
    const applicationCount = document.getElementById('applicationCount');
    const progressBar = document.getElementById('progressBar');

    applicationsList.innerHTML = applications.length > 0
        ? applications.map((app, index) => `
            <li class="application-item">
                <span>${app.choice}</span>
                <button class="remove-btn" onclick="removeApplication(${index})">
                    <i class="fas fa-times"></i> Remove
                </button>
            </li>
        `).join('')
        : '<li class="application-item">No residences selected yet</li>';

    applicationCount.textContent = `${applications.length}/${MAX_SELECTIONS} Selected`;

    // Progress bar update
    const percent = (applications.length / MAX_SELECTIONS) * 100;
    progressBar.style.width = percent + "%";
    progressBar.textContent = `${applications.length}/${MAX_SELECTIONS}`;

    submitBtn.disabled = applications.length !== MAX_SELECTIONS;
    
    // Update residence cards visual state
    updateResidenceCards();
}

// Update residence cards to show selected state
function updateResidenceCards() {
    // Get all residence cards
    const residenceCards = document.querySelectorAll('.residence-card');
    
    residenceCards.forEach(card => {
        // Look for h2 or h3 elements (depending on the page)
        const titleElement = card.querySelector('h2') || card.querySelector('h3');
        if (!titleElement) {
            console.warn("No title element found in residence card");
            return;
        }
        
        const residenceName = titleElement.textContent.trim();
        const applyBtn = card.querySelector('.apply-btn');
        const selectElement = card.querySelector('select');
        
        // Check if this residence is selected
        const isSelected = applications.some(app => app.residence === residenceName);
        
        if (isSelected) {
            // Mark as selected - dim the card and disable interactions
            card.style.opacity = '0.6';
            card.style.filter = 'grayscale(50%)';
            card.style.pointerEvents = 'none';
            card.style.border = '2px solid #28a745';
            
            if (applyBtn) {
                applyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Selected';
                applyBtn.style.backgroundColor = '#28a745';
                applyBtn.disabled = true;
            }
            
            if (selectElement) {
                selectElement.disabled = true;
                selectElement.style.opacity = '0.5';
            }
        } else {
            // Reset to normal state
            card.style.opacity = '1';
            card.style.filter = 'none';
            card.style.pointerEvents = 'auto';
            card.style.border = '';
            
            // Check if this residence should be disabled based on type limits
            const isOnCampus = isOnCampusResidence(residenceName);
            const onCampusCount = applications.filter(app => isOnCampusResidence(app.residence)).length;
            const offCampusCount = applications.filter(app => !isOnCampusResidence(app.residence)).length;
            
            let shouldDisable = false;
            let disableReason = '';
            
            if (isOnCampus && onCampusCount >= MAX_ON_CAMPUS) {
                shouldDisable = true;
                disableReason = 'On-campus limit reached';
            }
            // Off-campus has no limits - never disable
            
            if (applyBtn) {
                applyBtn.innerHTML = shouldDisable ? 
                    `<i class="fas fa-ban"></i> ${disableReason}` : 
                    '<i class="fas fa-check-circle"></i> Select Residence';
                applyBtn.style.backgroundColor = shouldDisable ? '#6c757d' : '';
                applyBtn.disabled = shouldDisable;
                applyBtn.title = shouldDisable ? disableReason : '';
            }
            
            if (selectElement) {
                selectElement.disabled = shouldDisable;
                selectElement.style.opacity = shouldDisable ? '0.5' : '1';
            }
        }
    });
}

// Submit applications to backend
function submitApplications() {
    if (applications.length !== MAX_SELECTIONS) {
        showNotification(`You must select exactly ${MAX_SELECTIONS} residences to submit.`, 'warning');
        return;
    }

    // Prepare data for backend
    const applicationData = {}; // unused now

    // Send to backend
    fetch('/api/applications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            residences: applications.map(app => ({ residence_name: app.residence, block: app.block || '' }))
        })
    })
    .then(async response => {
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
        if (!response.ok) {
            const msg = (data && (data.error || data.message)) || 'Submit failed';
            throw new Error(msg);
        }
        return data;
    })
    .then(data => {
        if (data.success) {
            showNotification("Application submitted successfully! Redirecting to My Applications in 2 seconds...", 'success');
            
            // Store in local submitted applications
            submittedApplications.push({
                residences: applications.map(app => app.choice),
                status: "Pending",
                submissionDate: new Date().toLocaleDateString()
            });
            
            // Reset current applications
            applications = [];
            updateUI();
            document.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = '/dashboard?section=application';
            }, 2000);
        } else {
            showNotification(data.message || "Error submitting application", 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification(`Submit error: ${error.message}`, 'error');
    });
}

// Show notifications
function showNotification(message, type) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'custom-notification';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '5px';
    notification.style.color = 'white';
    notification.style.fontWeight = '500';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

    switch(type) {
        case 'success': 
            notification.style.background = 'var(--success)'; 
            break;
        case 'warning': 
            notification.style.background = 'var(--warning)'; 
            notification.style.color = 'var(--dark)'; 
            break;
        case 'error': 
            notification.style.background = 'var(--danger)'; 
            break;
        default: 
            notification.style.background = 'var(--secondary)';
    }

    document.body.appendChild(notification);
    setTimeout(() => { 
        if (document.body.contains(notification)) {
            document.body.removeChild(notification); 
        }
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateUI();
    
    // Display gender information if available in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const gender = urlParams.get('gender');
    if (gender) {
        const genderInfoElement = document.getElementById('genderInfo');
        if (genderInfoElement) {
            genderInfoElement.textContent = `Applying as: ${gender.charAt(0).toUpperCase() + gender.slice(1)}`;
        }
    }
});