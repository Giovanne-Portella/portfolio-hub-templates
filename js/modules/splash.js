/* === SPLASH.JS — Múltiplos estilos de boas-vindas ===
 *
 * Estilos disponíveis:
 *   elegant   — fade suave com nome centralizado (músicos, artistas)
 *   glitch    — efeito glitch digital (bandas, DJ, creative)
 *   cinematic — lettering tipo cinema com barra de loading (todos)
 *   particles — partículas flutuantes com logo (criativo, negócios)
 *   terminal  — terminal Linux clássico (dev, acadêmico)
 *   minimal   — só uma linha de texto que some (qualquer nicho)
 */

function setupSplash(onEnter, splashConfig) {
  if (onEnter && typeof onEnter === 'object' && typeof onEnter.onComplete === 'function') {
    onEnter = onEnter.onComplete;
  }
  const splash = document.getElementById('splashScreen');
  if (!splash) {
    if (typeof onEnter === 'function') onEnter();
    return;
  }

  const cfg    = splashConfig || {};
  const style  = cfg.style || 'elegant';
  const isReturn = !!localStorage.getItem('pt_visited');
  const isMobile = window.matchMedia('(max-width: 480px)').matches;

  // Visita de retorno: só um fade rápido, qualquer estilo
  if (isReturn) {
    _showReturnFade(splash, onEnter, cfg);
    return;
  }

  switch (style) {
    case 'glitch':    _showGlitch(splash, onEnter, cfg, isMobile);    break;
    case 'cinematic': _showCinematic(splash, onEnter, cfg);            break;
    case 'particles': _showParticles(splash, onEnter, cfg);            break;
    case 'terminal':  _showTerminal(splash, onEnter, cfg, isMobile);   break;
    case 'minimal':   _showMinimal(splash, onEnter, cfg);              break;
    default:          _showElegant(splash, onEnter, cfg);              break;
  }
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function _enterSite(splash, onEnter) {
  localStorage.setItem('pt_visited', '1');
  splash.classList.add('hidden');
  setTimeout(() => {
    splash.style.display = 'none';
    // site-loaded é adicionado dentro de _afterSplash (onEnter) após render completo
    if (typeof onEnter === 'function') onEnter();
  }, 600);
}

// ============================================================
// RETORNO — fade rápido
// ============================================================
function _showReturnFade(splash, onEnter, cfg) {
  const name = cfg.site_name || '';
  splash.innerHTML = `
    <div style="text-align:center;opacity:0;animation:splashFadeIn .4s ease forwards">
      ${name ? `<div style="font-size:1.5rem;font-weight:700;color:#fff;font-family:var(--font-display,sans-serif);margin-bottom:.5rem">${escapeHtml(name)}</div>` : ''}
      <div style="width:32px;height:2px;background:var(--primary,#a855f7);margin:.75rem auto;border-radius:2px"></div>
    </div>`;
  setTimeout(() => _enterSite(splash, onEnter), 900);
}

// ============================================================
// ELEGANT — fade suave, nome centrado, linha de cor
// ============================================================
function _showElegant(splash, onEnter, cfg) {
  const name    = cfg.site_name    || 'Bem-vindo';
  const tagline = cfg.tagline      || '';
  const btnLabel = cfg.btn_label   || 'Entrar';

  splash.innerHTML = `
    <style>
      @keyframes splashFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      @keyframes splashLineIn{from{width:0}to{width:60px}}
      .spl-elegant{text-align:center;max-width:500px}
      .spl-elegant-name{font-size:clamp(2rem,6vw,3.5rem);font-weight:700;color:#fff;font-family:var(--font-display,sans-serif);opacity:0;animation:splashFadeIn .8s ease .3s forwards;letter-spacing:-.02em}
      .spl-elegant-line{height:3px;background:var(--gradient,linear-gradient(135deg,#a855f7,#ec4899));border-radius:9px;width:0;animation:splashLineIn .6s ease 1.1s forwards;margin:.9rem auto}
      .spl-elegant-tagline{font-size:.95rem;color:rgba(255,255,255,.6);opacity:0;animation:splashFadeIn .6s ease 1.4s forwards;margin-bottom:2.5rem}
      .spl-elegant-btn{opacity:0;animation:splashFadeIn .5s ease 2s forwards;background:transparent;border:1px solid rgba(255,255,255,.25);color:#fff;padding:.6rem 2rem;border-radius:99px;font-size:.875rem;cursor:pointer;letter-spacing:.08em;transition:all .2s}
      .spl-elegant-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.5)}
    </style>
    <div class="spl-elegant">
      <div class="spl-elegant-name">${escapeHtml(name)}</div>
      <div class="spl-elegant-line"></div>
      ${tagline ? `<div class="spl-elegant-tagline">${escapeHtml(tagline)}</div>` : '<div style="margin-bottom:2.5rem"></div>'}
      <button class="spl-elegant-btn" id="splashEnterBtn">${escapeHtml(btnLabel)}</button>
    </div>`;

  document.getElementById('splashEnterBtn')?.addEventListener('click', () => _enterSite(splash, onEnter));
  document.addEventListener('keydown', function h(e) {
    if (e.key === 'Enter') { document.removeEventListener('keydown', h); _enterSite(splash, onEnter); }
  });
}

// ============================================================
// GLITCH — nome com efeito glitch digital
// ============================================================
function _showGlitch(splash, onEnter, cfg, isMobile) {
  const name    = cfg.site_name  || 'ARTIST';
  const btnLabel = cfg.btn_label || (isMobile ? 'ENTRAR' : 'PRESSIONE ENTER');

  splash.innerHTML = `
    <style>
      @keyframes glitch1{0%,100%{clip-path:inset(0 0 90% 0);transform:translate(-4px,0)}50%{clip-path:inset(40% 0 40% 0);transform:translate(4px,0)}}
      @keyframes glitch2{0%,100%{clip-path:inset(70% 0 10% 0);transform:translate(4px,0)}50%{clip-path:inset(10% 0 70% 0);transform:translate(-4px,0)}}
      @keyframes splashFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      .spl-glitch-wrap{text-align:center;position:relative}
      .spl-glitch-name{font-size:clamp(3rem,12vw,7rem);font-weight:900;color:#fff;font-family:var(--font-display,sans-serif);letter-spacing:.05em;position:relative;display:inline-block;text-transform:uppercase}
      .spl-glitch-name::before,.spl-glitch-name::after{content:attr(data-text);position:absolute;inset:0;color:#fff}
      .spl-glitch-name::before{color:var(--color-1,#a855f7);animation:glitch1 .8s infinite linear}
      .spl-glitch-name::after{color:var(--color-2,#ec4899);animation:glitch2 .9s infinite linear}
      .spl-glitch-sub{font-size:.75rem;letter-spacing:.3em;color:rgba(255,255,255,.4);text-transform:uppercase;margin-top:.75rem;animation:splashFadeIn 1s ease 1.5s both}
      .spl-glitch-btn{margin-top:2.5rem;opacity:0;animation:splashFadeIn .5s ease 2.2s forwards;background:none;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.7);padding:.5rem 1.75rem;font-size:.75rem;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;border-radius:2px;transition:all .2s;font-family:monospace}
      .spl-glitch-btn:hover{border-color:#fff;color:#fff}
    </style>
    <div class="spl-glitch-wrap">
      <div class="spl-glitch-name" data-text="${escapeAttr(name)}">${escapeHtml(name)}</div>
      <div class="spl-glitch-sub">— portfolio —</div>
      <br>
      <button class="spl-glitch-btn" id="splashEnterBtn">${escapeHtml(btnLabel)}</button>
    </div>`;

  document.getElementById('splashEnterBtn')?.addEventListener('click', () => _enterSite(splash, onEnter));
  document.addEventListener('keydown', function h(e) {
    if (e.key === 'Enter') { document.removeEventListener('keydown', h); _enterSite(splash, onEnter); }
  });
}

// ============================================================
// CINEMATIC — letras surgem, barra de loading, botão
// ============================================================
function _showCinematic(splash, onEnter, cfg) {
  const name    = cfg.site_name  || 'Portfolio';
  const tagline = cfg.tagline    || '';
  const btnLabel = cfg.btn_label || 'Entrar';

  splash.innerHTML = `
    <style>
      @keyframes cinLetterIn{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
      @keyframes cinBarGrow{from{width:0}to{width:100%}}
      @keyframes cinFadeIn{from{opacity:0}to{opacity:1}}
      .spl-cin{text-align:center;max-width:600px}
      .spl-cin-letters{display:flex;justify-content:center;gap:.05em;flex-wrap:wrap;margin-bottom:1.25rem}
      .spl-cin-letter{font-size:clamp(2.5rem,8vw,5rem);font-weight:900;color:#fff;font-family:var(--font-display,sans-serif);opacity:0;display:inline-block;text-transform:uppercase;letter-spacing:.02em}
      .spl-cin-bar-wrap{width:200px;height:2px;background:rgba(255,255,255,.12);margin:0 auto 1.5rem;border-radius:2px;overflow:hidden}
      .spl-cin-bar{height:100%;background:var(--gradient,linear-gradient(90deg,#a855f7,#ec4899));width:0}
      .spl-cin-tagline{font-size:.85rem;color:rgba(255,255,255,.5);letter-spacing:.12em;text-transform:uppercase;opacity:0}
      .spl-cin-btn{margin-top:2rem;opacity:0;background:transparent;border:1px solid rgba(255,255,255,.2);color:#fff;padding:.55rem 2rem;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;border-radius:99px;transition:all .2s}
      .spl-cin-btn:hover{background:rgba(255,255,255,.08)}
    </style>
    <div class="spl-cin">
      <div class="spl-cin-letters" id="cinLetters"></div>
      <div class="spl-cin-bar-wrap"><div class="spl-cin-bar" id="cinBar"></div></div>
      ${tagline ? `<div class="spl-cin-tagline" id="cinTagline">${escapeHtml(tagline)}</div>` : ''}
      <button class="spl-cin-btn" id="splashEnterBtn">${escapeHtml(btnLabel)}</button>
    </div>`;

  // Anima letras individualmente
  const lettersEl = document.getElementById('cinLetters');
  [...name.toUpperCase()].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'spl-cin-letter';
    span.textContent = ch === ' ' ? '\u00a0' : ch;
    span.style.animation = `cinLetterIn .5s ease ${0.1 + i * 0.07}s forwards`;
    lettersEl.appendChild(span);
  });

  const totalLetterTime = 0.1 + name.length * 0.07 + 0.5;

  // Barra após letras
  setTimeout(() => {
    const bar = document.getElementById('cinBar');
    if (bar) { bar.style.transition = 'width .8s ease'; bar.style.width = '100%'; }
  }, totalLetterTime * 1000 + 200);

  // Tagline
  setTimeout(() => {
    const tg = document.getElementById('cinTagline');
    if (tg) { tg.style.transition = 'opacity .5s ease'; tg.style.opacity = '1'; }
  }, (totalLetterTime + 1) * 1000 + 100);

  // Botão
  setTimeout(() => {
    const btn = document.getElementById('splashEnterBtn');
    if (btn) { btn.style.transition = 'opacity .5s ease, background .2s'; btn.style.opacity = '1'; btn.focus(); }
  }, (totalLetterTime + 1.4) * 1000);

  document.getElementById('splashEnterBtn')?.addEventListener('click', () => _enterSite(splash, onEnter));
  document.addEventListener('keydown', function h(e) {
    if (e.key === 'Enter') { document.removeEventListener('keydown', h); _enterSite(splash, onEnter); }
  });
}

// ============================================================
// PARTICLES — partículas flutuantes + nome centralizado
// ============================================================
function _showParticles(splash, onEnter, cfg) {
  const name    = cfg.site_name  || 'Portfolio';
  const btnLabel = cfg.btn_label || 'Entrar';

  splash.innerHTML = `
    <style>
      @keyframes splashFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      @keyframes floatUp{0%{opacity:0;transform:translateY(0)}20%{opacity:.7}80%{opacity:.4}100%{opacity:0;transform:translateY(-180px)}}
      .spl-particles-canvas{position:absolute;inset:0;overflow:hidden;pointer-events:none}
      .spl-particle{position:absolute;border-radius:50%;animation:floatUp linear infinite}
      .spl-particles-content{text-align:center;position:relative;z-index:1}
      .spl-particles-name{font-size:clamp(2rem,7vw,4rem);font-weight:800;color:#fff;font-family:var(--font-display,sans-serif);letter-spacing:-.02em;opacity:0;animation:splashFadeIn .9s ease .4s forwards}
      .spl-particles-divider{width:40px;height:3px;background:var(--gradient,linear-gradient(135deg,#a855f7,#ec4899));border-radius:2px;margin:1rem auto;opacity:0;animation:splashFadeIn .5s ease 1.2s forwards}
      .spl-particles-btn{margin-top:1.5rem;opacity:0;animation:splashFadeIn .5s ease 1.8s forwards;background:var(--gradient,linear-gradient(135deg,#a855f7,#ec4899));border:none;color:#fff;padding:.65rem 2rem;font-size:.875rem;cursor:pointer;border-radius:99px;font-weight:600;transition:opacity .2s}
      .spl-particles-btn:hover{opacity:.85}
    </style>
    <div class="spl-particles-canvas" id="particlesCanvas"></div>
    <div class="spl-particles-content">
      <div class="spl-particles-name">${escapeHtml(name)}</div>
      <div class="spl-particles-divider"></div>
      <button class="spl-particles-btn" id="splashEnterBtn">${escapeHtml(btnLabel)}</button>
    </div>`;

  // Gera partículas
  const canvas = document.getElementById('particlesCanvas');
  const colors = ['#a855f7','#ec4899','#6366f1','#f97316','#3b82f6'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'spl-particle';
    const size = 4 + Math.random() * 8;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:${Math.random() * 100}%;
      bottom:${-size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      opacity:${0.2 + Math.random() * 0.5};
      animation-duration:${4 + Math.random() * 6}s;
      animation-delay:${Math.random() * 4}s;
    `;
    canvas.appendChild(p);
  }

  document.getElementById('splashEnterBtn')?.addEventListener('click', () => _enterSite(splash, onEnter));
  document.addEventListener('keydown', function h(e) {
    if (e.key === 'Enter') { document.removeEventListener('keydown', h); _enterSite(splash, onEnter); }
  });
}

// ============================================================
// TERMINAL — clássico Linux/dev (renomeado, não é default)
// ============================================================
function _showTerminal(splash, onEnter, cfg, isMobile) {
  const rawLines = cfg.boot_lines || [
    '[ OK ] Iniciando sistema...',
    '[ OK ] Carregando módulos CSS',
    '[ OK ] Conectando ao Supabase',
    '[INFO] Buscando configurações',
    '[ OK ] Aplicando tema',
    '[ OK ] Sistema pronto',
  ];
  const BOOT_LINES = rawLines.map(line => {
    const isOk   = line.startsWith('[ OK ]') || line.startsWith('[OK]');
    const isInfo = line.startsWith('[INFO]');
    return { type: isOk ? 'ok' : isInfo ? 'info' : 'ok', text: line.replace(/^\[.*?\]\s*/, '') };
  });
  const terminalTitle = cfg.terminal_title || 'portfolio — bash';
  const btnLabel = cfg.btn_label || (isMobile ? '[ Toque para entrar ]' : '[ Pressione Enter ]');

  splash.innerHTML = `
    <div class="splash-terminal">
      <div class="splash-terminal-bar">
        <span class="splash-dot splash-dot-red"></span>
        <span class="splash-dot splash-dot-yellow"></span>
        <span class="splash-dot splash-dot-green"></span>
        <span class="splash-terminal-title">${escapeHtml(terminalTitle)}</span>
      </div>
      <div class="splash-body" id="splashBody">
        <div class="splash-line visible">
          <span class="splash-prompt">~$</span>
          <span class="splash-text">./start-portfolio.sh</span>
        </div>
      </div>
      <div class="splash-progress-wrap" id="splashProgressWrap">
        <div class="splash-progress-label">
          <span id="splashProgressLabel">Carregando...</span>
          <span id="splashProgressPct">0%</span>
        </div>
        <div class="splash-progress-bar"><div class="splash-progress-fill" id="splashProgressFill"></div></div>
      </div>
      <div class="splash-btn-wrap" id="splashBtnWrap">
        <button class="splash-enter-btn" id="splashEnterBtn">${escapeHtml(btnLabel)}</button>
      </div>
    </div>`;

  const body     = document.getElementById('splashBody');
  const progWrap = document.getElementById('splashProgressWrap');
  const progFill = document.getElementById('splashProgressFill');
  const progPct  = document.getElementById('splashProgressPct');
  const btnWrap  = document.getElementById('splashBtnWrap');
  const enterBtn = document.getElementById('splashEnterBtn');
  let lineIdx = 0;

  function addNextLine() {
    if (lineIdx >= BOOT_LINES.length) { _showProgress(); return; }
    const line = BOOT_LINES[lineIdx];
    const div  = document.createElement('div');
    div.className = 'splash-line';
    div.innerHTML = `<span class="splash-${line.type}">[${line.type === 'ok' ? ' OK ' : 'INFO'}]</span><span class="splash-text">${escapeHtml(line.text)}</span>`;
    body.appendChild(div);
    requestAnimationFrame(() => div.classList.add('visible'));
    lineIdx++;
    setTimeout(addNextLine, 160 + Math.random() * 80);
  }

  function _showProgress() {
    progWrap.classList.add('visible');
    let pct = 0;
    const iv = setInterval(() => {
      pct = Math.min(pct + Math.random() * 8, 100);
      progFill.style.width = pct + '%';
      progPct.textContent  = Math.floor(pct) + '%';
      if (pct >= 100) {
        clearInterval(iv);
        progPct.textContent = '100%';
        setTimeout(() => { btnWrap.classList.add('visible'); enterBtn.focus(); }, 300);
      }
    }, 60);
  }

  enterBtn.addEventListener('click', () => _enterSite(splash, onEnter));
  document.addEventListener('keydown', function h(e) {
    if (e.key === 'Enter' && btnWrap.classList.contains('visible')) {
      document.removeEventListener('keydown', h);
      _enterSite(splash, onEnter);
    }
  });
  setTimeout(addNextLine, 400);
}

// ============================================================
// MINIMAL — uma linha de texto que some automaticamente
// ============================================================
function _showMinimal(splash, onEnter, cfg) {
  const name = cfg.site_name || 'Portfolio';

  splash.innerHTML = `
    <style>
      @keyframes minIn{from{opacity:0;letter-spacing:.5em}to{opacity:1;letter-spacing:.15em}}
      @keyframes minOut{from{opacity:1}to{opacity:0}}
      .spl-minimal{font-size:clamp(1rem,4vw,1.75rem);font-weight:300;color:rgba(255,255,255,.9);letter-spacing:.5em;text-transform:uppercase;font-family:var(--font-display,sans-serif);animation:minIn .9s ease forwards}
      .spl-minimal.out{animation:minOut .5s ease forwards}
    </style>
    <div class="spl-minimal" id="splMinimal">${escapeHtml(name)}</div>`;

  setTimeout(() => {
    document.getElementById('splMinimal')?.classList.add('out');
    setTimeout(() => _enterSite(splash, onEnter), 600);
  }, 1800);
}
