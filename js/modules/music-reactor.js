/* === MUSIC-REACTOR.JS — Ambient glow reativo à música === */

const MusicReactor = (() => {
  let bassEl   = null;
  let midEl    = null;
  let trebleEl = null;
  let enabled  = false;
  let intensity = 1.0; // 0.5 = baixo, 1.0 = médio, 1.5 = alto

  function init(config = {}) {
    enabled = config.enabled !== false;
    if (!enabled) return;

    const INTENSITY_MAP = { low: 0.5, medium: 1.0, high: 1.5 };
    intensity = INTENSITY_MAP[config.intensity || 'medium'] || 1.0;

    const reactor = document.createElement('div');
    reactor.className = 'music-reactor';
    reactor.innerHTML = `
      <div class="reactor-layer reactor-bass"></div>
      <div class="reactor-layer reactor-mid"></div>
      <div class="reactor-layer reactor-treble"></div>`;
    document.body.insertBefore(reactor, document.body.firstChild);

    bassEl   = reactor.querySelector('.reactor-bass');
    midEl    = reactor.querySelector('.reactor-mid');
    trebleEl = reactor.querySelector('.reactor-treble');
  }

  function update(bass, mid, treble) {
    if (!enabled || !bassEl) return;

    const b = Math.min(bass   * intensity, 1);
    const m = Math.min(mid    * intensity, 1);
    const t = Math.min(treble * intensity * 0.8, 1);

    bassEl.style.opacity   = b * 0.35;
    midEl.style.opacity    = m * 0.28;
    trebleEl.style.opacity = t * 0.22;

    bassEl.style.transform   = `scale(${1 + b * 0.15})`;
    midEl.style.transform    = `scale(${1 + m * 0.1})`;
    trebleEl.style.transform = `scale(${1 + t * 0.08})`;
  }

  function disable() {
    enabled = false;
    if (bassEl)   bassEl.style.opacity   = '0';
    if (midEl)    midEl.style.opacity    = '0';
    if (trebleEl) trebleEl.style.opacity = '0';
  }

  function enable() { enabled = true; }

  return { init, update, disable, enable };
})();
