// Theme Manager - Shared across all pages
(function() {
    function applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            document.querySelector('.dashboard-container')?.classList.add('dark-mode');
            document.querySelector('.sidebar')?.classList.add('dark-mode');
            document.querySelector('.main-content')?.classList.add('dark-mode');
            const logo = document.getElementById('dashboardLogo') || document.querySelector('.logo-img');
            if (logo) logo.src = '../assets/logos/logo.png.png';
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyTheme);
    } else {
        applyTheme();
    }
})();
