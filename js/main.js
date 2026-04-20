const root = document.documentElement;
const themeToggleButton = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-label');
const navLinks = Array.from(document.querySelectorAll('.toc a'));
const copyButtons = Array.from(document.querySelectorAll('.copy-btn'));
const roleTabs = Array.from(document.querySelectorAll('[data-role-tab]'));
const rolePanels = Array.from(document.querySelectorAll('[data-role-panel]'));

const THEME_KEY = 'docs-theme';

function readPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
        return saved;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

function updateThemeLabel(theme) {
    themeLabel.textContent = theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن';
}

function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeLabel(theme);
}

function toggleTheme() {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
}

function setActiveLink(id) {
    navLinks.forEach((link) => {
        const isActive = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('active', isActive);
    });
}

function observeSections() {
    const sections = Array.from(document.querySelectorAll('.content article'));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveLink(entry.target.id);
                }
            });
        },
        {
            rootMargin: '-30% 0px -55% 0px',
            threshold: 0.1,
        },
    );

    sections.forEach((section) => observer.observe(section));
}

async function copyTextByElementId(elementId, button) {
    const codeElement = document.querySelector(`#${elementId} code`);
    if (!codeElement) return;

    const originalLabel = button.textContent;
    try {
        await navigator.clipboard.writeText(codeElement.innerText.trim());
        button.textContent = 'تم النسخ';
    } catch {
        button.textContent = 'فشل النسخ';
    }

    setTimeout(() => {
        button.textContent = originalLabel;
    }, 1400);
}

function bindCopyButtons() {
    copyButtons.forEach((button) => {
        const targetId = button.getAttribute('data-copy-target');
        if (!targetId) return;

        button.addEventListener('click', () =>
            copyTextByElementId(targetId, button),
        );
    });
}

function activateRoleTab(roleName) {
    roleTabs.forEach((tab) => {
        const active = tab.getAttribute('data-role-tab') === roleName;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
    });

    rolePanels.forEach((panel) => {
        const active = panel.getAttribute('data-role-panel') === roleName;
        panel.classList.toggle('is-active', active);
    });
}

function bindRoleTabs() {
    if (!roleTabs.length || !rolePanels.length) return;

    roleTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const roleName = tab.getAttribute('data-role-tab');
            if (!roleName) return;

            activateRoleTab(roleName);
        });
    });
}

function init() {
    applyTheme(readPreferredTheme());
    observeSections();
    bindCopyButtons();
    bindRoleTabs();

    themeToggleButton?.addEventListener('click', toggleTheme);
}

init();
