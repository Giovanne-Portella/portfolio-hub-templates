/* === THEME-ENGINE.JS — Motor de temas dinâmicos === */

const ThemeEngine = (() => {
  const STORAGE_KEY = 'pt_theme';
  const FONT_MAP = {
    'Inter':           "'Inter', 'Segoe UI', system-ui, sans-serif",
    'Space Grotesk':   "'Space Grotesk', system-ui, sans-serif",
    'Playfair Display':"'Playfair Display', Georgia, serif",
    'Roboto':          "'Roboto', system-ui, sans-serif",
  };

  let currentTheme = null;

  function applyTheme(config) {
    if (!config) return;
    currentTheme = config;

    const root = document.documentElement;
    const colors = config.colors || ['#7c3aed', '#db2777'];

    // Apply individual colors
    colors.forEach((c, i) => {
      root.style.setProperty(`--color-${i + 1}`, c);
    });
    // Clear extra slots
    for (let i = colors.length + 1; i <= 5; i++) {
      root.style.removeProperty(`--color-${i}`);
    }

    // Build gradient / set primary
    const gradient = buildGradient(colors, config.gradientDirection || '135deg', config.colorMode || 'gradient');
    root.style.setProperty('--gradient', gradient);
    root.style.setProperty('--gradient-text', gradient);
    root.style.setProperty('--primary', colors[0]);
    root.style.setProperty('--accent', colors[1] || colors[0]);

    // Shadow glow uses first color
    const { r, g, b } = hexToRgb(colors[0]);
    root.style.setProperty('--shadow-glow', `0 0 24px rgba(${r},${g},${b},0.4)`);

    // Font
    const fontFamily = FONT_MAP[config.fontFamily] || FONT_MAP['Inter'];
    root.style.setProperty('--font-family', fontFamily);
    root.style.setProperty('--font-display', fontFamily);

    // Border radius mode
    root.dataset.radius = config.borderRadius || 'rounded';

    // Background overlay alpha
    if (config.bgOverlay !== undefined) {
      root.style.setProperty('--bg-overlay', `rgba(13,17,23,${config.bgOverlay})`);
    }

    // Sync admin primary if in admin context
    if (document.documentElement.classList.contains('admin')) {
      root.style.setProperty('--admin-primary', colors[0]);
      root.style.setProperty('--admin-accent', colors[1] || colors[0]);
      root.style.setProperty('--admin-gradient', gradient);
    }

    _loadGoogleFont(config.fontFamily);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function getTheme() {
    return currentTheme;
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) applyTheme(JSON.parse(stored));
    } catch (e) { /* ignore */ }
  }

  function _loadGoogleFont(fontName) {
    if (!fontName || fontName === 'Inter') return; // already loaded in CSS
    const existing = document.querySelector(`link[data-gfont="${fontName}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.gfont = fontName;
    const encoded = encodeURIComponent(fontName);
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700;800&display=swap`;
    document.head.appendChild(link);
  }

  return { applyTheme, getTheme, loadFromStorage };
})();
