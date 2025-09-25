
let applications = [];
let submittedApplications = []; // Local cache for UI
const MAX_SELECTIONS = 2;
const MAX_ON_CAMPUS = 2;
const MAX_OFF_CAMPUS = 2;
let isSubmitting = false; // Lock to prevent multiple submissions

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
  try {
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
      if (!select) {
        showNotification("Block selection element not found.", 'error');
        return;
      }
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
  } catch (error) {
    showNotification("An error occurred while applying. Please try again.", 'error');
    console.error("Apply error:", error);
  }
}

// Remove application
function removeApplication(index) {
  try {
    if (index >= 0 && index < applications.length) {
      applications.splice(index, 1);
      updateUI();
      showNotification("Application removed. You can select another residence.", 'info');
    } else {
      showNotification("Invalid application index.", 'error');
    }
  } catch (error) {
    showNotification("An error occurred while removing the application.", 'error');
    console.error("Remove application error:", error);
  }
}

// Update UI selections
function updateUI() {
  try {
    const applicationsList = document.getElementById('applications');
    const submitBtn = document.getElementById('submitBtn');
    const applicationCount = document.getElementById('applicationCount');
    const progressBar = document.getElementById('progressBar');

    if (!applicationsList || !submitBtn || !applicationCount || !progressBar) {
      console.error("One or more UI elements not found:", {
        applicationsList: !!applicationsList,
        submitBtn: !!submitBtn,
        applicationCount: !!applicationCount,
        progressBar: !!progressBar
      });
      showNotification("UI initialization error. Please check the page setup.", 'error');
      return;
    }

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

    const percent = (applications.length / MAX_SELECTIONS) * 100;
    progressBar.style.width = percent + "%";
    progressBar.textContent = `${applications.length}/${MAX_SELECTIONS}`;

    submitBtn.disabled = applications.length !== MAX_SELECTIONS || isSubmitting;
    
    // Update residence cards visual state
    updateResidenceCards();
  } catch (error) {
    showNotification("An error occurred while updating the UI.", 'error');
    console.error("Update UI error:", error);
  }
}

// Update residence cards to show selected state
function updateResidenceCards() {
  try {
    // Get all residence cards
    const residenceCards = document.querySelectorAll('.residence-card');
    console.log('Found residence cards:', residenceCards.length);
    console.log('Current applications:', applications);
    
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
  } catch (error) {
    console.error("Error updating residence cards:", error);
  }
}

// Get student details from localStorage or form
function getStudentDetails() {
  const studentNumber = localStorage.getItem('student_number') || '';
  const studentName = localStorage.getItem('student_name') || 'Student';
  const studentGender = localStorage.getItem('student_gender') || '';
  return { studentNumber, studentName, studentGender };
}

// Classify residence as on-campus or off-campus
function classifyResidenceType(residence) {
  const onCampusKeywords = ['DBSA', 'New', 'Main', 'Campus'];
  const isOnCampus = onCampusKeywords.some(keyword => residence.toLowerCase().includes(keyword.toLowerCase()));
  return isOnCampus ? 'On Campus' : 'Off Campus';
}

// Determine residence gender
function classifyResidenceGender(residence, block, studentGender) {
  if (residence.toLowerCase().includes('male') || block.toLowerCase().includes('male')) return 'Male';
  if (residence.toLowerCase().includes('female') || block.toLowerCase().includes('female')) return 'Female';
  return studentGender || 'Unknown';
}

// Submit applications and store in database
async function submitApplications() {
  if (isSubmitting) {
    showNotification("Submission in progress. Please wait.", 'warning');
    return;
  }

  try {
    if (applications.length !== MAX_SELECTIONS) {
      showNotification(`You must select exactly ${MAX_SELECTIONS} residences to submit.`, 'warning');
      return;
    }

    isSubmitting = true;
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = true;

    const { studentNumber, studentName, studentGender } = getStudentDetails();

    // Prepare application data
    const applicationData = applications.map(app => ({
      residence_name: app.residence,
      block: app.block || ''
    }));

    // Send to backend
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ residences: applicationData })
    });

    const text = await response.text();
    let result; try { result = JSON.parse(text); } catch { result = { raw: text }; }
    if (!response.ok) {
      if (result.error && String(result.error).toLowerCase().includes("limit")) {
        showNotification("You have already submitted the maximum number of applications.", 'error');
        const existingApps = result.applications || [];
        if (existingApps.length > 0) {
          submittedApplications = [{
            student: studentName,
            studentNumber,
            residences: existingApps.map(app => app.block ? `${app.residence_name} - ${app.block}` : app.residence_name),
            status: existingApps[0].status
          }];
          renderMyApplications();
        }
      } else {
        showNotification((result && (result.error || result.message)) || "Failed to submit applications.", 'error');
      }
      // new Error(result.error || `HTTP error! status: ${response.status}`);
    }

    // Update local cache
    submittedApplications.push({
      student: studentName,
      studentNumber,
      residences: applications.map(app => app.choice),
      status: 'Pending'
    });

    // Detailed notification
    showNotification(`Application submitted successfully! Your choices: ${applications.map(app => app.choice).join(", ")} (Student Number: ${studentNumber}). Redirecting to My Applications in 3 seconds...`, 'success');

    // Reset form
    applications = [];
    updateUI();
    document.querySelectorAll('select').forEach(select => {
      if (select) select.selectedIndex = 0;
    });

    // Render local table
    renderMyApplications();

    // Auto-scroll to "My Applications" section
    const myApplicationsSection = document.getElementById('myApplicationsSection');
    if (myApplicationsSection) {
      myApplicationsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.warn("My Applications section not found for scrolling.");
    }

    // Auto-redirect to dashboard after 3 seconds
    setTimeout(() => {
      window.location.href = '/dashboard?section=application';
    }, 3000);
  } catch (error) {
    showNotification(`Submit error: ${error.message}`, 'error');
    console.error("Submit applications error:", error);
  } finally {
    isSubmitting = false;
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = applications.length !== MAX_SELECTIONS;
  }
}

// Render My Applications Table
function renderMyApplications() {
    try {
      const myAppTable = document.getElementById('myApplicationsTable');
      if (!myAppTable) return;
  
      if (submittedApplications.length === 0) {
        myAppTable.innerHTML = `<tr><td colspan="4">No applications submitted yet</td></tr>`;
        return;
      }
  
      let rows = '';
      submittedApplications.forEach(app => {
        const residenceCount = app.residences.length;
  
        // Determine status class for badge
        let statusClass = 'status-default';
        switch ((app.status || '').toLowerCase()) {
          case 'pending': statusClass = 'status-pending'; break;
          case 'approved': statusClass = 'status-approved'; break;
          case 'rejected': statusClass = 'status-rejected'; break;
        }
  
        app.residences.forEach((residence, index) => {
          const rowColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
  
          rows += `
            <tr style="background-color: ${rowColor};">
              ${index === 0 ? `<td rowspan="${residenceCount}" data-label="Student">${app.student}</td>` : ''}
              ${index === 0 ? `<td rowspan="${residenceCount}" data-label="Student Number">${app.studentNumber}</td>` : ''}
              <td data-label="Residence">${residence}</td>
              ${index === 0 ? `<td rowspan="${residenceCount}" data-label="Status"><span class="status-badge ${statusClass}">${app.status}</span></td>` : ''}
            </tr>
          `;
        });
      });
  
      myAppTable.innerHTML = rows;
    } catch (error) {
      console.error("Render applications error:", error);
    }
  }
  

// Show notifications
function showNotification(message, type) {
  try {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '5px';
    notification.style.color = 'white';
    notification.style.fontWeight = '500';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

    switch (type) {
      case 'success': notification.style.background = 'var(--success, #28a745)'; break;
      case 'warning':
        notification.style.background = 'var(--warning, #ffc107)';
        notification.style.color = 'var(--dark, #343a40)';
        break;
      case 'error': notification.style.background = 'var(--danger, #dc3545)'; break;
      default: notification.style.background = 'var(--secondary, #6c757d)';
    }

    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 5000); // Increased duration for visibility
  } catch (error) {
    console.error("Notification error:", error);
  }
}

// Load existing applications on page load
async function loadApplications() {
  try {
    const studentNumber = localStorage.getItem('student_number') || document.getElementById('studentNumberInput')?.value || '';
    if (!studentNumber) return;

    const response = await fetch(`/api/applications/me`);
    const result = await response.json();
    if (Array.isArray(result) && result.length > 0) {
      submittedApplications = [{
        student: localStorage.getItem('student_name') || 'Anonymous Student',
        studentNumber,
        residences: result.map(app => app.block ? `${app.residence_name} - ${app.block}` : app.residence_name),
        status: result[0].status
      }];
      renderMyApplications();
    }
  } catch (error) {
    console.error("Error loading applications:", error);
    // Don't show notification for this, as it's a non-critical error
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    updateUI();
    renderMyApplications();
    loadApplications();
  } catch (error) {
    showNotification("Initialization failed. Please reload the page.", 'error');
    console.error("Initialization error:", error);
  }
});