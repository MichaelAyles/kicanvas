/**
 * KiCanvas Theme Demo - Interactive theme switching
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Get theme selectors
    const pageThemeSelector = document.getElementById('page-theme-selector');
    const kicanvasThemeSelector = document.getElementById('kicanvas-theme-selector');

    // Get the viewer
    const dynamicViewer = document.getElementById('dynamic-viewer');

    // Store current theme state
    let currentPageTheme = 'light';
    let currentKiCanvasMode = 'kicad';

    // Detect system preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    /**
     * Apply page theme
     */
    function applyPageTheme(theme) {
        currentPageTheme = theme;

        if (theme === 'auto') {
            // Use system preference
            const isDark = darkModeQuery.matches;
            document.body.className = isDark ? 'theme-dark' : 'theme-light';
        } else {
            // Use explicit theme
            document.body.className = `theme-${theme}`;
        }

        // Update KiCanvas viewers if they're following page theme
        if (currentKiCanvasMode === 'page') {
            updateKiCanvasTheme();
        }
    }

    /**
     * Get the effective theme for KiCanvas based on current settings
     */
    function getEffectiveKiCanvasTheme() {
        if (currentKiCanvasMode === 'page') {
            // Follow page theme
            const effectivePageTheme = currentPageTheme === 'auto'
                ? (darkModeQuery.matches ? 'dark' : 'light')
                : currentPageTheme;

            // Map page theme to KiCanvas theme
            return effectivePageTheme === 'dark' ? 'witchhazel' : 'kicad';
        } else {
            // Use explicit KiCanvas theme
            return currentKiCanvasMode;
        }
    }

    /**
     * Update KiCanvas viewer theme
     */
    function updateKiCanvasTheme() {
        const theme = getEffectiveKiCanvasTheme();

        if (dynamicViewer) {
            console.log('Setting viewer theme to:', theme);
            dynamicViewer.theme = theme;
        }

        console.log(`KiCanvas theme updated to: ${theme}`);
    }

    /**
     * Handle page theme selector change
     */
    pageThemeSelector.addEventListener('change', (e) => {
        applyPageTheme(e.target.value);
        console.log(`Page theme changed to: ${e.target.value}`);
    });

    /**
     * Handle KiCanvas theme selector change
     */
    kicanvasThemeSelector.addEventListener('change', (e) => {
        currentKiCanvasMode = e.target.value;
        updateKiCanvasTheme();
        console.log(`KiCanvas mode changed to: ${e.target.value}`);
    });

    /**
     * Listen for system theme changes (when in auto mode)
     */
    darkModeQuery.addEventListener('change', (e) => {
        console.log(`System theme changed to: ${e.matches ? 'dark' : 'light'}`);

        // Update page if in auto mode
        if (currentPageTheme === 'auto') {
            applyPageTheme('auto');
        }

        // Update KiCanvas if following page theme
        if (currentKiCanvasMode === 'page') {
            updateKiCanvasTheme();
        }
    });

    /**
     * Initialize themes from localStorage or defaults
     */
    function initializeThemes() {
        // Try to restore from localStorage
        const savedPageTheme = localStorage.getItem('kicanvas-demo-page-theme') || 'light';
        const savedKiCanvasMode = localStorage.getItem('kicanvas-demo-kicanvas-mode') || 'kicad';

        // Set selectors
        pageThemeSelector.value = savedPageTheme;
        kicanvasThemeSelector.value = savedKiCanvasMode;

        // Apply themes
        currentKiCanvasMode = savedKiCanvasMode;
        applyPageTheme(savedPageTheme);

        // Wait for viewers to load before setting theme
        waitForViewersToLoad().then(() => {
            updateKiCanvasTheme();
        });
    }

    /**
     * Wait for viewer to be loaded
     */
    async function waitForViewersToLoad() {
        if (!dynamicViewer) return;

        console.log('Waiting for viewer to load...');

        if (!dynamicViewer.loaded) {
            console.log('Waiting for load event...');
            await new Promise((resolve) => {
                dynamicViewer.addEventListener('kicanvas:load', () => {
                    console.log('Load event received');
                    resolve();
                }, { once: true });
            });
        }

        console.log('Viewer loaded and ready for theme changes');

        // Add a small delay to ensure internal state is ready
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Save theme preferences to localStorage
     */
    function saveThemePreferences() {
        localStorage.setItem('kicanvas-demo-page-theme', pageThemeSelector.value);
        localStorage.setItem('kicanvas-demo-kicanvas-mode', kicanvasThemeSelector.value);
    }

    // Save preferences when changed
    pageThemeSelector.addEventListener('change', saveThemePreferences);
    kicanvasThemeSelector.addEventListener('change', saveThemePreferences);

    // Initialize on load
    initializeThemes();

    /**
     * Log box selection events for debugging
     */
    document.addEventListener('kicanvas:select', (e) => {
        if (e.detail.item) {
            console.log('Item selected:', e.detail.item);
        } else {
            console.log('Selection cleared');
        }
    });

    /**
     * Add keyboard shortcut info
     */
    console.log('%cKiCanvas Theme Demo', 'font-size: 16px; font-weight: bold;');
    console.log('Box Selection Features:');
    console.log('  • Click and drag to select multiple items');
    console.log('  • Ctrl+C (Cmd+C on Mac) to copy selected items');
    console.log('  • Escape to clear selection');
    console.log('  • Single click to select one item');
    console.log('\nTheme Controls:');
    console.log('  • Use the dropdowns in the header to change themes');
    console.log('  • Your preferences are saved in localStorage');
});

/**
 * Export for programmatic access
 */
window.KiCanvasThemeDemo = {
    setPageTheme: (theme) => {
        const selector = document.getElementById('page-theme-selector');
        if (selector) {
            selector.value = theme;
            selector.dispatchEvent(new Event('change'));
        }
    },
    setKiCanvasTheme: (theme) => {
        const selector = document.getElementById('kicanvas-theme-selector');
        if (selector) {
            selector.value = theme;
            selector.dispatchEvent(new Event('change'));
        }
    },
    getCurrentThemes: () => ({
        page: document.getElementById('page-theme-selector')?.value,
        kicanvas: document.getElementById('kicanvas-theme-selector')?.value,
    }),
};
