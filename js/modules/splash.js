/* === SPLASH.JS === */

function setupSplash(onEnter, splashConfig) {
  // Suporta tanto função direta quanto objeto { onComplete: fn }
  if (onEnter && typeof onEnter === 'object' && typeof onEnter.onComplete === 'function') {
    onEnter = onEnter.onComplete;
  }
  const splash = document.getElementById('splashScreen');
  if (!splash) {
    if (typeof onEnter === 'function') onEnter();
    return;
  }

  const cfg      = splashConfig || {};
  const isReturn = !!localStorage.getItem('pt_visited');
  const isMobile = window.matchMedia('(max-width: 480px)').matches;

  if (isReturn) {
    _showReturnSplash(splash, onEnter);
  } else {
    _showFullSplash(splash, onEnter, isMobile, cfg);
  }
}

function _enterSite(splash, onEnter) {
  localStorage.setItem('pt_visited', '1');
  splash.classList.add('hidden');
  setTimeout(() => {
    splash.style.display = 'none';
    document.body.classList.remove('site-loading');
    document.body.classList.add('site-loaded');
    if (typeof onEnter === 'function') onEnter();
  }, 500);
}

function _showReturnSplash(splash, onEnter) {
  splash.innerHTML = `
    <div class="splash-return">
      <div class="splash-terminal" style="max-width:380px">
        <div class="splash-terminal-bar">
          <span class="splash-dot splash-dot-red"></span>
          <span class="splash-dot splash-dot-yellow"></span>
          <span class="splash-dot splash-dot-green"></span>
          <span class="splash-terminal-title">terminal</span>
        </div>
        <div class="splash-body" id="splashReturnBody"></div>
      </div>
    </div>`;

  const body   = document.getElementById('splashReturnBody');
  const lines  = ['[ OK ] Carregando perfil...', '[ OK ] Bem-vindo de volta! 👋'];
  let   idx    = 0;

  function addLine() {
    if (idx >= lines.length) {
      setTimeout(() => _enterSite(splash, onEnter), 800);
      return;
    }
    const div = document.createElement('div');
    div.className = 'splash-line visible';
    const isOk = lines[idx].startsWith('[ OK ]');
    div.innerHTML = `<span class="${isOk ? 'splash-ok' : 'splash-info'}">${isOk ? '[ OK ]' : '[INFO]'}</span><span class="splash-text">${escapeHtml(lines[idx].replace(/^\[.*?\]\s+/, ''))}</span>`;
    body.appendChild(div);
    idx++;
    setTimeout(addLine, 400);
  }

  addLine();
}

function _showFullSplash(splash, onEnter, isMobile, cfg) {
  // Usa linhas customizadas do admin, ou padrão
  const rawLines = cfg.boot_lines || [
    '[ OK ] Iniciando sistema...',
    '[ OK ] Carregando módulos CSS',
    '[ OK ] Conectando ao Supabase',
    '[INFO] Buscando configurações do portfolio',
    '[ OK ] Aplicando tema personalizado',
    '[ OK ] Carregando seções',
    '[ OK ] Sistema pronto',
  ];

  const BOOT_LINES = rawLines.map(line => {
    const isOk   = line.startsWith('[ OK ]') || line.startsWith('[OK]');
    const isInfo = line.startsWith('[INFO]');
    return {
      type: isOk ? 'ok' : isInfo ? 'info' : 'ok',
      text: line.replace(/^\[.*?\]\s*/, ''),
    };
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
        <div class="splash-progress-bar">
          <div class="splash-progress-fill" id="splashProgressFill"></div>
        </div>
      </div>
      <div class="splash-btn-wrap" id="splashBtnWrap">
        <button class="splash-enter-btn" id="splashEnterBtn">
          ${escapeHtml(btnLabel)}
        </button>
      </div>
    </div>`;

  const body       = document.getElementById('splashBody');
  const progWrap   = document.getElementById('splashProgressWrap');
  const progFill   = document.getElementById('splashProgressFill');
  const progPct    = document.getElementById('splashProgressPct');
  const btnWrap    = document.getElementById('splashBtnWrap');
  const enterBtn   = document.getElementById('splashEnterBtn');

  let lineIdx = 0;

  function addNextLine() {
    if (lineIdx >= BOOT_LINES.length) {
      _showProgress();
      return;
    }
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
        setTimeout(() => {
          btnWrap.classList.add('visible');
          enterBtn.focus();
        }, 300);
      }
    }, 60);
  }

  enterBtn.addEventListener('click', () => _enterSite(splash, onEnter));

  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Enter' && btnWrap.classList.contains('visible')) {
      document.removeEventListener('keydown', handler);
      _enterSite(splash, onEnter);
    }
  });

  setTimeout(addNextLine, 400);
}
