document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-switcher');
    const stylesheet = document.getElementById('main-stylesheet');

    const savedTheme = localStorage.getItem('theme') || 'dark';

    function setTheme(theme) {
        if (theme === 'light') {
            stylesheet.setAttribute('href', '/css/light-theme.css');
        } else if (theme === 'modern') {
            stylesheet.setAttribute('href', '/css/modern-theme.css');
        } else {
            stylesheet.setAttribute('href', '/css/style.css');
        }
        localStorage.setItem('theme', theme);
        themeSwitcher.value = theme;
    }

    themeSwitcher.addEventListener('change', (event) => {
        setTheme(event.target.value);
    });

    setTheme(savedTheme);
});
