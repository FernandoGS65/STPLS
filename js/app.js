// Theme toggle
(function() {

const STORAGE_KEY = 'stpls-theme';

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.classList.add('light-mode');
    } else {
        document.documentElement.classList.remove('light-mode');
    }
}

function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme:light)').matches ? 'light' : 'dark';
}

applyTheme(getPreferredTheme());

document.addEventListener('click', function(e) {
    const btn = e.target.closest('#themeToggle');
    if (!btn) return;

    const isLight = document.documentElement.classList.toggle('light-mode');
    localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
});

})();
