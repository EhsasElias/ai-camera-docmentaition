const root = document.documentElement;
const themeToggleButton = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-label');
const copyButtons = Array.from(document.querySelectorAll('.copy-btn'));
const docTabs = Array.from(document.querySelectorAll('[data-doc-tab]'));
const docPanels = Array.from(document.querySelectorAll('[data-doc-panel]'));
const tocGroups = Array.from(document.querySelectorAll('[data-toc]'));

const THEME_KEY = 'docs-theme';
let activeDoc = 'backend';
let sectionObserver = null;

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

function activeTocGroup() {
    return document.querySelector(`[data-toc="${activeDoc}"]`);
}

function visiblePanel() {
    return document.querySelector(`[data-doc-panel="${activeDoc}"]`);
}

function clearActiveLinks() {
    tocGroups.forEach((group) => {
        group.querySelectorAll('a').forEach((link) => link.classList.remove('active'));
    });
}

function setActiveLinkById(id) {
    const group = activeTocGroup();
    if (!group) return;

    group.querySelectorAll('a').forEach((link) => {
        const isActive = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('active', isActive);
    });
}

function switchDoc(doc) {
    activeDoc = doc;

    docTabs.forEach((tab) => {
        const isActive = tab.getAttribute('data-doc-tab') === doc;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
    });

    docPanels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.getAttribute('data-doc-panel') === doc);
    });

    tocGroups.forEach((group) => {
        group.classList.toggle('is-active', group.getAttribute('data-toc') === doc);
    });

    clearActiveLinks();
    observeSections();

    const firstLink = activeTocGroup()?.querySelector('a');
    if (firstLink) {
        const href = firstLink.getAttribute('href');
        if (href && href.startsWith('#')) {
            setActiveLinkById(href.slice(1));
        }
    }
}

function observeSections() {
    if (sectionObserver) {
        sectionObserver.disconnect();
    }

    const panel = visiblePanel();
    if (!panel) return;

    const sections = Array.from(panel.querySelectorAll('article[id]'));
    if (!sections.length) return;

    sectionObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveLinkById(entry.target.id);
                }
            });
        },
        {
            rootMargin: '-28% 0px -54% 0px',
            threshold: 0.12,
        },
    );

    sections.forEach((section) => sectionObserver.observe(section));
}

function bindTocLinks() {
    tocGroups.forEach((group) => {
        group.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();

                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#')) return;

                const target = document.querySelector(href);
                if (!target) return;

                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveLinkById(target.id);
            });
        });
    });
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

        button.addEventListener('click', () => {
            copyTextByElementId(targetId, button);
        });
    });
}

function bindDocTabs() {
    docTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const targetDoc = tab.getAttribute('data-doc-tab');
            if (!targetDoc) return;

            switchDoc(targetDoc);
        });
    });
}

function init() {
    applyTheme(readPreferredTheme());
    bindDocTabs();
    bindTocLinks();
    bindCopyButtons();
    switchDoc(activeDoc);

    themeToggleButton?.addEventListener('click', toggleTheme);
}

init();
