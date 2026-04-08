/* === ADMIN/THEME-EDITOR.JS — Editor de tema com color mixer === */

const TEMPLATE_PRESETS = {
  musician: {
    name: 'Músico / Artista', emoji: '🎵',
    desc: 'Rádio, discografia, eventos, galeria',
    // Roxo neon + rosa choque + laranja — vibe show/festival
    theme: { colors: ['#a855f7','#ec4899','#f97316'], colorMode: 'gradient', gradientDirection: '135deg', fontFamily: 'Space Grotesk', borderRadius: 'rounded', animations: 'full', musicReactor: true, reactorIntensity: 'high' },
    features: { radio: true, gallery: true, events: true, musicReactor: true, splash: false },
    sections: ['hero','bio','music','gallery','events','contact'],
  },
  band: {
    name: 'Banda', emoji: '🎸',
    desc: 'Para grupos musicais com discografia',
    // Preto + vermelho sangue + branco — vibe rock/metal
    theme: { colors: ['#dc2626','#f59e0b'], colorMode: 'gradient', gradientDirection: '135deg', fontFamily: 'Space Grotesk', borderRadius: 'sharp', animations: 'full', musicReactor: true, reactorIntensity: 'high' },
    features: { radio: true, gallery: true, events: true, musicReactor: true, splash: false },
    sections: ['hero','bio','discography','gallery','events','contact'],
  },
  academic: {
    name: 'Acadêmico', emoji: '🎓',
    desc: 'Publicações, pesquisa, currículo',
    // Azul profundo + ciano — sóbrio e profissional
    theme: { colors: ['#2563eb','#06b6d4'], colorMode: 'gradient', gradientDirection: '135deg', fontFamily: 'Inter', borderRadius: 'sharp', animations: 'subtle', musicReactor: false, reactorIntensity: 'low' },
    features: { radio: false, gallery: true, publications: true, musicReactor: false, splash: false },
    sections: ['hero','bio','publications','gallery','contact'],
  },
  business: {
    name: 'Negócios', emoji: '💼',
    desc: 'Serviços, equipe, portfólio',
    // Verde esmeralda + azul slate — confiança e modernidade
    theme: { colors: ['#10b981','#3b82f6'], colorMode: 'gradient', gradientDirection: '135deg', fontFamily: 'Inter', borderRadius: 'rounded', animations: 'subtle', musicReactor: false, reactorIntensity: 'low' },
    features: { radio: false, gallery: true, services: true, events: true, musicReactor: false, splash: false },
    sections: ['hero','bio','services','gallery','events','contact'],
  },
  logistics: {
    name: 'Logística', emoji: '📦',
    desc: 'Operações, serviços, projetos',
    // Laranja + cinza — energia e eficiência
    theme: { colors: ['#f97316','#64748b'], colorMode: 'gradient', gradientDirection: '90deg', fontFamily: 'Roboto', borderRadius: 'sharp', animations: 'subtle', musicReactor: false, reactorIntensity: 'low' },
    features: { radio: false, gallery: true, services: true, events: true, musicReactor: false, splash: false },
    sections: ['hero','bio','services','gallery','events','contact'],
  },
  creative: {
    name: 'Criativo / Arte', emoji: '🎨',
    desc: 'Galeria visual, projetos, rádio opcional',
    // Amarelo ouro + rosa + violeta — criatividade e arte
    theme: { colors: ['#eab308','#e879f9','#6366f1'], colorMode: 'gradient', gradientDirection: '135deg', fontFamily: 'Playfair Display', borderRadius: 'pill', animations: 'full', musicReactor: true, reactorIntensity: 'medium' },
    features: { radio: true, gallery: true, musicReactor: true, splash: false },
    sections: ['hero','bio','gallery','contact'],
  },
  custom: {
    name: 'Personalizado', emoji: '⚡',
    desc: 'Configure tudo do zero',
    theme: { colors: ['#6366f1','#8b5cf6'], colorMode: 'gradient', gradientDirection: '135deg', fontFamily: 'Inter', borderRadius: 'rounded', animations: 'full', musicReactor: false, reactorIntensity: 'medium' },
    features: { splash: false },
    sections: [],
  },
};

const GRADIENT_DIRECTIONS = [
  { label: '↗', value: '45deg' }, { label: '→', value: '90deg' },
  { label: '↘', value: '135deg' }, { label: '↓', value: '180deg' },
  { label: '↙', value: '225deg' }, { label: '←', value: '270deg' },
  { label: '↖', value: '315deg' }, { label: '↑', value: '0deg' },
];

let currentThemeConfig = {};
let currentColors      = ['#7c3aed', '#db2777'];

async function loadThemePage() {
  if (!currentPortfolio) return;
  currentThemeConfig = { ...currentPortfolio.theme_config };
  currentColors      = [...(currentThemeConfig.colors || ['#7c3aed','#db2777'])];

  _renderTemplateCards();
  _renderColorSlots();
  _renderGradientOptions();
  _renderStyleOptions();
  _updatePreview();
}

function _renderTemplateCards() {
  const grid = document.getElementById('templateGrid');
  if (!grid) return;
  grid.innerHTML = Object.entries(TEMPLATE_PRESETS).map(([key, t]) => `
    <div class="template-card ${currentPortfolio.template_type === key ? 'selected' : ''}"
         data-template="${escapeAttr(key)}">
      <div class="template-card-emoji">${t.emoji}</div>
      <div class="template-card-name">${escapeHtml(t.name)}</div>
      <div class="template-card-desc">${escapeHtml(t.desc)}</div>
    </div>`).join('');

  grid.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => _selectTemplate(card.dataset.template));
  });
}

async function _selectTemplate(key) {
  const preset = TEMPLATE_PRESETS[key];
  if (!preset) return;

  // confirmDialog é síncrono com callback — não retorna Promise.
  // Usamos o callback diretamente para executar a aplicação do preset.
  confirmDialog(
    `Aplicar preset "${preset.name}"? O tema e as configurações serão atualizados.`,
    async () => {
      showLoading('Aplicando template...');
      try {
        const { error } = await supabase.from('portfolios').update({
          template_type: key,
          theme_config:  preset.theme,
          feature_flags: { ...(currentPortfolio.feature_flags || {}), ...preset.features },
        }).eq('id', currentPortfolio.id);

        if (error) throw error;

        // Atualiza estado local
        currentPortfolio.template_type = key;
        currentPortfolio.theme_config  = preset.theme;
        currentThemeConfig = { ...preset.theme };
        currentColors      = [...(preset.theme.colors || ['#7c3aed', '#db2777'])];

        // Re-renderiza todos os componentes do editor de tema
        _renderTemplateCards();
        _renderColorSlots();
        _renderGradientOptions();
        _renderStyleOptions();
        _updatePreview();

        // Re-renderiza setup page se estiver visível
        if (typeof _loadSetupPage === 'function') _loadSetupPage();

        showToast(`Template "${preset.name}" aplicado!`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Erro ao aplicar template', 'error');
      } finally {
        hideLoading();
      }
    }
  );
}

function _renderColorSlots() {
  const slots = document.getElementById('colorSlots');
  if (!slots) return;

  slots.innerHTML = currentColors.map((c, i) => `
    <div class="color-slot" data-slot="${i}">
      <div class="color-slot-swatch" style="background:${escapeAttr(c)}">
        <input type="color" value="${escapeAttr(c)}" data-slot="${i}">
        <span class="color-slot-remove" data-slot="${i}">✕</span>
      </div>
      <span class="color-slot-label">${escapeHtml(c)}</span>
    </div>
  `).join('');

  // Add button
  if (currentColors.length < 5) {
    slots.innerHTML += `<button class="color-add-btn" id="addColorBtn"><i class="fa-solid fa-plus"></i></button>`;
    document.getElementById('addColorBtn')?.addEventListener('click', () => {
      currentColors.push('#58a6ff');
      _renderColorSlots();
      _updatePreview();
    });
  }

  // Color pickers
  slots.querySelectorAll('input[type="color"]').forEach(inp => {
    inp.addEventListener('input', () => {
      const i = parseInt(inp.dataset.slot);
      currentColors[i] = inp.value;
      const swatch = inp.closest('.color-slot-swatch');
      swatch.style.background = inp.value;
      swatch.nextElementSibling.textContent = inp.value;
      _updatePreview();
    });
  });

  // Remove buttons
  slots.querySelectorAll('.color-slot-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.slot);
      if (currentColors.length > 1) {
        currentColors.splice(i, 1);
        _renderColorSlots();
        _updatePreview();
      }
    });
  });
}

function _renderGradientOptions() {
  const modeWrap = document.getElementById('gradientModes');
  const dirWrap  = document.getElementById('gradientDirections');
  if (!modeWrap || !dirWrap) return;

  const modes = [
    { key: 'gradient', label: 'Gradiente' },
    { key: 'solid',    label: 'Sólido' },
    { key: 'animated', label: 'Animado' },
  ];

  modeWrap.innerHTML = modes.map(m => `
    <button class="gradient-mode-btn ${currentThemeConfig.colorMode === m.key ? 'active' : ''}" data-mode="${escapeAttr(m.key)}">${escapeHtml(m.label)}</button>
  `).join('');

  modeWrap.querySelectorAll('.gradient-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentThemeConfig.colorMode = btn.dataset.mode;
      modeWrap.querySelectorAll('.gradient-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _updatePreview();
    });
  });

  dirWrap.innerHTML = GRADIENT_DIRECTIONS.map(d => `
    <button class="direction-btn ${currentThemeConfig.gradientDirection === d.value ? 'active' : ''}" data-dir="${escapeAttr(d.value)}">${d.label}</button>
  `).join('');

  dirWrap.querySelectorAll('.direction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentThemeConfig.gradientDirection = btn.dataset.dir;
      dirWrap.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _updatePreview();
    });
  });
}

function _renderStyleOptions() {
  const fonts = ['Inter', 'Space Grotesk', 'Playfair Display', 'Roboto'];
  const fontList = document.getElementById('fontOptions');
  if (fontList) {
    fontList.innerHTML = fonts.map(f => `
      <div class="font-option ${currentThemeConfig.fontFamily === f ? 'selected' : ''}" data-font="${escapeAttr(f)}" style="font-family:'${f}'">
        <span class="font-option-preview">Aa</span>
        <span class="font-option-label">${escapeHtml(f)}</span>
      </div>`).join('');
    fontList.querySelectorAll('.font-option').forEach(opt => {
      opt.addEventListener('click', () => {
        currentThemeConfig.fontFamily = opt.dataset.font;
        fontList.querySelectorAll('.font-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        _updatePreview();
      });
    });
  }

  _renderToggleGroup('radiusOptions', ['sharp','rounded','pill'], ['Reto','Arredondado','Pill'], 'borderRadius');
  _renderToggleGroup('animOptions',   ['none','subtle','full'],   ['Sem','Suave','Full'],        'animations');

  // Music reactor toggle
  const reactorTrack = document.getElementById('reactorToggleTrack');
  const reactorInput = document.getElementById('reactorToggleInput');
  if (reactorTrack && reactorInput) {
    reactorInput.checked = !!currentThemeConfig.musicReactor;
    reactorTrack.classList.toggle('on', reactorInput.checked);
    setupToggle(reactorTrack, reactorInput);
    reactorInput.addEventListener('change', () => {
      currentThemeConfig.musicReactor = reactorInput.checked;
      _updatePreview();
    });
  }

  _renderToggleGroup('reactorIntensity', ['low','medium','high'], ['Baixa','Média','Alta'], 'reactorIntensity');
}

function _renderToggleGroup(containerId, values, labels, configKey) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = values.map((v, i) => `
    <button class="style-toggle-btn ${currentThemeConfig[configKey] === v ? 'active' : ''}" data-val="${escapeAttr(v)}">${escapeHtml(labels[i])}</button>
  `).join('');
  wrap.querySelectorAll('.style-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentThemeConfig[configKey] = btn.dataset.val;
      wrap.querySelectorAll('.style-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _updatePreview();
    });
  });
}

function _updatePreview() {
  const gradient = buildGradient(currentColors, currentThemeConfig.gradientDirection || '135deg', currentThemeConfig.colorMode || 'gradient');

  // Mini hero
  const miniHero = document.getElementById('miniHeroBg');
  if (miniHero) miniHero.style.background = gradient;

  // Mini cards
  document.querySelectorAll('.mini-card').forEach((c, i) => {
    c.style.borderTop = `2px solid ${currentColors[i % currentColors.length]}`;
  });

  // Preview gradient bar
  const bar = document.getElementById('gradientPreviewBar');
  if (bar) bar.style.background = gradient;
}

async function saveTheme() {
  if (!currentPortfolio) return;
  const themeConfig = {
    ...currentThemeConfig,
    colors: currentColors,
  };

  const { error } = await supabase.from('portfolios').update({ theme_config: themeConfig }).eq('id', currentPortfolio.id);
  if (error) { showToast('Erro ao salvar tema', 'error'); return; }

  currentPortfolio.theme_config = themeConfig;
  showToast('Tema salvo com sucesso!', 'success');
}
