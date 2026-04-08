/* === ADMIN/SPLASH-MANAGER.JS — Configuração do Modal de Boas-vindas === */

async function loadSplashPage() {
  if (!currentPortfolio) return;

  const flags  = currentPortfolio.feature_flags || {};
  const splash = currentPortfolio.splash_config  || {};

  // Preenche campos
  const enabledInput = document.getElementById('splashEnabled');
  const enabledTrack = document.getElementById('splashEnabledTrack');
  const titleInput   = document.getElementById('splashTerminalTitle');
  const linesInput   = document.getElementById('splashBootLines');
  const btnInput     = document.getElementById('splashBtnLabel');

  if (enabledInput) {
    enabledInput.checked = !!flags.splash;
    if (enabledTrack) {
      enabledTrack.classList.toggle('on', !!flags.splash);
      setupToggle(enabledTrack, enabledInput);
      enabledInput.addEventListener('change', _updatePreview);
    }
  }

  if (titleInput) {
    titleInput.value = splash.terminal_title || 'portfolio — bash';
    titleInput.addEventListener('input', _updatePreview);
  }

  if (linesInput) {
    const defaultLines = [
      '[ OK ] Iniciando sistema...',
      '[ OK ] Carregando módulos CSS',
      '[ OK ] Conectando ao Supabase',
      '[INFO] Buscando configurações',
      '[ OK ] Aplicando tema',
      '[ OK ] Sistema pronto',
    ];
    linesInput.value = (splash.boot_lines || defaultLines).join('\n');
    linesInput.addEventListener('input', _updatePreview);
  }

  if (btnInput) {
    btnInput.value = splash.btn_label || '[ Pressione Enter ]';
    btnInput.addEventListener('input', _updatePreview);
  }

  // Salvar
  const saveBtn = document.getElementById('saveSplashBtn');
  if (saveBtn) {
    saveBtn.onclick = _saveSplash;
  }

  _updatePreview();
}

function _updatePreview() {
  const titleEl = document.getElementById('splashPreviewTitle');
  const bodyEl  = document.getElementById('splashPreviewBody');
  if (!titleEl || !bodyEl) return;

  const title = document.getElementById('splashTerminalTitle')?.value || 'portfolio — bash';
  const lines = (document.getElementById('splashBootLines')?.value || '').split('\n').filter(Boolean);

  titleEl.textContent = title;
  bodyEl.innerHTML = lines.map(line => {
    const isOk   = line.startsWith('[ OK ]') || line.startsWith('[OK]');
    const isInfo = line.startsWith('[INFO]');
    const color  = isOk ? '#3fb950' : isInfo ? '#58a6ff' : '#8b949e';
    const text   = line.replace(/^\[.*?\]\s*/, '');
    const prefix = isOk ? '[ OK ]' : isInfo ? '[INFO]' : '     ';
    return `<div style="display:flex;gap:.5rem;margin-bottom:.15rem">
      <span style="color:${color};font-weight:700;min-width:42px">${prefix}</span>
      <span style="color:#c9d1d9">${escapeHtml(text)}</span>
    </div>`;
  }).join('');
}

async function _saveSplash() {
  if (!currentPortfolio) return;

  const enabled = document.getElementById('splashEnabled')?.checked || false;
  const title   = document.getElementById('splashTerminalTitle')?.value.trim() || 'portfolio — bash';
  const lines   = (document.getElementById('splashBootLines')?.value || '')
    .split('\n').map(l => l.trim()).filter(Boolean);
  const btnLabel = document.getElementById('splashBtnLabel')?.value.trim() || '[ Pressione Enter ]';

  const newFlags = {
    ...(currentPortfolio.feature_flags || {}),
    splash: enabled,
  };

  const splashConfig = { terminal_title: title, boot_lines: lines, btn_label: btnLabel };

  showLoading('Salvando...');
  try {
    const { error } = await supabase.from('portfolios').update({
      feature_flags: newFlags,
      splash_config: splashConfig,
    }).eq('id', currentPortfolio.id);

    if (error) throw error;

    currentPortfolio.feature_flags = newFlags;
    currentPortfolio.splash_config = splashConfig;
    showToast('Configurações do splash salvas!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar splash', 'error');
  } finally {
    hideLoading();
  }
}
