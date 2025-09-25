document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle functionality
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navList = document.querySelector('.nav-list');
    
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            navList.classList.toggle('active');
            
            // Change icon based on menu state
            if (navList.classList.contains('active')) {
                menuToggle.textContent = '✕';
            } else {
                menuToggle.textContent = '☰';
            }
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (navList.classList.contains('active') && 
            !event.target.closest('.main-nav')) {
            navList.classList.remove('active');
            menuToggle.textContent = '☰';
        }
    });
    
    // Prevent menu from closing when clicking inside it
    if (navList) {
        navList.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }
});