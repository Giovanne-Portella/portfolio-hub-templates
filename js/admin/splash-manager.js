/* === ADMIN/SPLASH-MANAGER.JS — Configuração do Modal de Boas-vindas === */

const SPLASH_STYLES = [
  { key: 'elegant',   label: 'Elegante',   emoji: '✨', desc: 'Fade suave com nome e tagline — músicos, fotógrafos' },
  { key: 'glitch',    label: 'Glitch',     emoji: '⚡', desc: 'Efeito digital glitch — bandas, DJs, criativo' },
  { key: 'cinematic', label: 'Cinemático', emoji: '🎬', desc: 'Letras surgindo uma a uma — universal' },
  { key: 'particles', label: 'Partículas', emoji: '🌟', desc: 'Partículas flutuantes coloridas — criativo, negócios' },
  { key: 'minimal',   label: 'Minimal',    emoji: '▸',  desc: 'Uma linha de texto que some — rápido e limpo' },
  { key: 'terminal',  label: 'Terminal',   emoji: '💻', desc: 'Terminal Linux/dev — acadêmico, developer' },
];

async function loadSplashPage() {
  if (!currentPortfolio) return;

  const flags  = currentPortfolio.feature_flags || {};
  const cfg    = currentPortfolio.splash_config  || {};

  // Toggle ativo
  const enabledInput = document.getElementById('splashEnabled');
  const enabledTrack = document.getElementById('splashEnabledTrack');
  if (enabledInput && enabledTrack) {
    enabledInput.checked = !!flags.splash;
    enabledTrack.classList.toggle('on', !!flags.splash);
    setupToggle(enabledTrack, enabledInput);
  }

  // Renderiza seletor de estilo
  _renderStylePicker(cfg.style || 'elegant');

  // Preenche campos comuns
  _setVal('splashSiteName',  cfg.site_name       || '');
  _setVal('splashTagline',   cfg.tagline         || '');
  _setVal('splashBtnLabel',  cfg.btn_label       || 'Entrar');
  _setVal('splashTerminalTitle', cfg.terminal_title || 'portfolio — bash');
  _setVal('splashBootLines', (cfg.boot_lines || [
    '[ OK ] Iniciando sistema...',
    '[ OK ] Carregando módulos CSS',
    '[ OK ] Conectando ao Supabase',
    '[INFO] Buscando configurações',
    '[ OK ] Aplicando tema',
    '[ OK ] Sistema pronto',
  ]).join('\n'));

  // Mostra/esconde campos conforme estilo
  _toggleStyleFields(cfg.style || 'elegant');

  // Live preview
  document.querySelectorAll('#splashSiteName,#splashTagline,#splashBtnLabel,#splashTerminalTitle,#splashBootLines')
    .forEach(el => el?.addEventListener('input', _updatePreview));

  // Salvar
  document.getElementById('saveSplashBtn').onclick = _saveSplash;

  _updatePreview();
}

function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function _renderStylePicker(currentStyle) {
  const grid = document.getElementById('splashStyleGrid');
  if (!grid) return;

  grid.innerHTML = SPLASH_STYLES.map(s => `
    <div class="splash-style-card ${s.key === currentStyle ? 'selected' : ''}" data-style="${escapeAttr(s.key)}"
         style="cursor:pointer;padding:1rem;border:2px solid ${s.key === currentStyle ? 'var(--admin-primary)' : 'var(--admin-border)'};border-radius:10px;transition:all .15s">
      <div style="font-size:1.5rem;margin-bottom:.4rem">${s.emoji}</div>
      <div style="font-weight:600;font-size:.875rem;color:var(--admin-text)">${escapeHtml(s.label)}</div>
      <div style="font-size:.72rem;color:var(--admin-text-2);margin-top:.2rem;line-height:1.4">${escapeHtml(s.desc)}</div>
    </div>`).join('');

  grid.querySelectorAll('.splash-style-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.splash-style-card').forEach(c => {
        c.style.borderColor = 'var(--admin-border)';
        c.classList.remove('selected');
      });
      card.style.borderColor = 'var(--admin-primary)';
      card.classList.add('selected');
      _toggleStyleFields(card.dataset.style);
      _updatePreview();
    });
  });
}

function _getCurrentStyle() {
  return document.querySelector('.splash-style-card.selected')?.dataset?.style || 'elegant';
}

function _toggleStyleFields(style) {
  const terminalFields = document.getElementById('terminalFields');
  const commonFields   = document.getElementById('splashCommonFields');
  if (terminalFields) terminalFields.style.display = style === 'terminal' ? '' : 'none';
  if (commonFields)   commonFields.style.display   = style === 'minimal'  ? 'none' : '';
}

function _updatePreview() {
  const previewEl = document.getElementById('splashPreviewBody');
  if (!previewEl) return;

  const style    = _getCurrentStyle();
  const name     = document.getElementById('splashSiteName')?.value   || 'Seu Nome';
  const tagline  = document.getElementById('splashTagline')?.value    || '';
  const btnLabel = document.getElementById('splashBtnLabel')?.value   || 'Entrar';
  const termTitle = document.getElementById('splashTerminalTitle')?.value || 'portfolio — bash';
  const lines    = (document.getElementById('splashBootLines')?.value || '').split('\n').filter(Boolean);

  let html = '';

  if (style === 'terminal') {
    document.getElementById('splashPreviewTitle').textContent = termTitle;
    html = lines.map(line => {
      const isOk   = line.startsWith('[ OK ]');
      const isInfo = line.startsWith('[INFO]');
      const color  = isOk ? '#3fb950' : isInfo ? '#58a6ff' : '#8b949e';
      const prefix = isOk ? '[ OK ]' : isInfo ? '[INFO]' : '     ';
      const text   = line.replace(/^\[.*?\]\s*/, '');
      return `<div style="display:flex;gap:.5rem;margin-bottom:.1rem"><span style="color:${color};font-weight:700;min-width:42px">${prefix}</span><span style="color:#c9d1d9">${escapeHtml(text)}</span></div>`;
    }).join('');
  } else if (style === 'minimal') {
    document.getElementById('splashPreviewTitle').textContent = 'Minimal';
    html = `<div style="text-align:center;padding:1rem 0;font-size:1.1rem;font-weight:300;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.8)">${escapeHtml(name)}</div>`;
  } else if (style === 'elegant') {
    document.getElementById('splashPreviewTitle').textContent = 'Elegante';
    html = `<div style="text-align:center;padding:.5rem 0">
      <div style="font-size:1.4rem;font-weight:700;color:#fff">${escapeHtml(name)}</div>
      <div style="width:40px;height:2px;background:linear-gradient(135deg,#a855f7,#ec4899);margin:.6rem auto;border-radius:2px"></div>
      ${tagline ? `<div style="font-size:.8rem;color:rgba(255,255,255,.5);margin-bottom:.75rem">${escapeHtml(tagline)}</div>` : ''}
      <button style="background:none;border:1px solid rgba(255,255,255,.25);color:#fff;padding:.4rem 1.5rem;border-radius:99px;font-size:.75rem;cursor:default">${escapeHtml(btnLabel)}</button>
    </div>`;
  } else if (style === 'glitch') {
    document.getElementById('splashPreviewTitle').textContent = 'Glitch';
    html = `<div style="text-align:center;padding:.5rem 0">
      <div style="font-size:2rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:.05em">${escapeHtml(name)}</div>
      <div style="font-size:.65rem;letter-spacing:.25em;color:rgba(255,255,255,.35);text-transform:uppercase;margin:.4rem 0 .8rem">— portfolio —</div>
      <button style="background:none;border:1px solid rgba(255,255,255,.25);color:rgba(255,255,255,.7);padding:.35rem 1.25rem;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;border-radius:2px;cursor:default;font-family:monospace">${escapeHtml(btnLabel)}</button>
    </div>`;
  } else if (style === 'cinematic') {
    document.getElementById('splashPreviewTitle').textContent = 'Cinemático';
    html = `<div style="text-align:center;padding:.5rem 0">
      <div style="font-size:1.8rem;font-weight:900;color:#fff;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(name)}</div>
      <div style="width:100px;height:2px;background:linear-gradient(90deg,#a855f7,#ec4899);margin:.6rem auto;border-radius:2px"></div>
      ${tagline ? `<div style="font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:.75rem">${escapeHtml(tagline)}</div>` : ''}
      <button style="background:none;border:1px solid rgba(255,255,255,.2);color:#fff;padding:.4rem 1.5rem;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;border-radius:99px;cursor:default">${escapeHtml(btnLabel)}</button>
    </div>`;
  } else if (style === 'particles') {
    document.getElementById('splashPreviewTitle').textContent = 'Partículas';
    html = `<div style="text-align:center;padding:.5rem 0">
      <div style="font-size:1.5rem;font-weight:800;color:#fff">${escapeHtml(name)}</div>
      <div style="width:30px;height:3px;background:linear-gradient(135deg,#a855f7,#ec4899);margin:.5rem auto;border-radius:2px"></div>
      <button style="background:linear-gradient(135deg,#a855f7,#ec4899);border:none;color:#fff;padding:.4rem 1.5rem;border-radius:99px;font-size:.75rem;font-weight:600;cursor:default;margin-top:.5rem">${escapeHtml(btnLabel)}</button>
    </div>`;
  }

  previewEl.innerHTML = html;
}

async function _saveSplash() {
  if (!currentPortfolio) return;

  const enabled  = document.getElementById('splashEnabled')?.checked || false;
  const style    = _getCurrentStyle();
  const siteName = document.getElementById('splashSiteName')?.value.trim()   || '';
  const tagline  = document.getElementById('splashTagline')?.value.trim()    || '';
  const btnLabel = document.getElementById('splashBtnLabel')?.value.trim()   || 'Entrar';
  const termTitle = document.getElementById('splashTerminalTitle')?.value.trim() || 'portfolio — bash';
  const lines    = (document.getElementById('splashBootLines')?.value || '')
    .split('\n').map(l => l.trim()).filter(Boolean);

  const newFlags = { ...(currentPortfolio.feature_flags || {}), splash: enabled };
  const splashConfig = { style, site_name: siteName, tagline, btn_label: btnLabel, terminal_title: termTitle, boot_lines: lines };

  showLoading('Salvando...');
  try {
    const { error } = await supabase.from('portfolios').update({
      feature_flags: newFlags,
      splash_config: splashConfig,
    }).eq('id', currentPortfolio.id);

    if (error) throw error;
    currentPortfolio.feature_flags = newFlags;
    currentPortfolio.splash_config = splashConfig;
    showToast('Modal de boas-vindas salvo!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar', 'error');
  } finally {
    hideLoading();
  }
}
