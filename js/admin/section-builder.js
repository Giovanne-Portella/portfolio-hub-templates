/* === ADMIN/SECTION-BUILDER.JS — Mapa visual de seções === */

const SECTION_TYPES = [
  { type: 'hero',         name: 'Hero',           icon: 'fa-solid fa-house',           desc: 'Capa principal com nome e CTA',       all: true },
  { type: 'bio',          name: 'Bio / Sobre',     icon: 'fa-solid fa-user',             desc: 'Apresentação pessoal',                all: true },
  { type: 'gallery',      name: 'Galeria',         icon: 'fa-solid fa-images',           desc: 'Fotos e vídeos',                      all: true },
  { type: 'contact',      name: 'Contato',         icon: 'fa-solid fa-envelope',         desc: 'Formulário e informações de contato', all: true },
  { type: 'music',        name: 'Música',          icon: 'fa-solid fa-music',            desc: 'Faixas e discografia',                templates: ['musician','band','creative'] },
  { type: 'discography',  name: 'Discografia',     icon: 'fa-solid fa-record-vinyl',     desc: 'Álbuns e releases',                   templates: ['musician','band'] },
  { type: 'events',       name: 'Eventos',         icon: 'fa-solid fa-calendar-days',    desc: 'Shows, palestras, datas',             templates: ['musician','band','business','logistics','academic'] },
  { type: 'publications', name: 'Publicações',     icon: 'fa-solid fa-file-lines',       desc: 'Artigos, teses, livros',              templates: ['academic'] },
  { type: 'courses',      name: 'Cursos',          icon: 'fa-solid fa-graduation-cap',   desc: 'Cursos e certificados',               templates: ['academic','creative'] },
  { type: 'services',     name: 'Serviços',        icon: 'fa-solid fa-briefcase',        desc: 'Serviços oferecidos',                 templates: ['business','logistics','creative'] },
  { type: 'team',         name: 'Equipe',          icon: 'fa-solid fa-people-group',     desc: 'Membros da equipe',                   templates: ['business','logistics','band'] },
  { type: 'projects',     name: 'Projetos',        icon: 'fa-solid fa-folder-open',      desc: 'Portfolio de projetos',               templates: ['business','logistics','creative','academic'] },
  { type: 'custom',       name: 'Seção Livre',     icon: 'fa-solid fa-pen-nib',          desc: 'Conteúdo personalizado',              all: true },
];

let sectionsList = [];  // seções ativas do portfolio
let dragSrcEl    = null;

async function loadSectionsPage() {
  if (!currentPortfolio) return;

  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('portfolio_id', currentPortfolio.id)
    .order('display_order');

  sectionsList = error ? [] : (data || []);
  renderSectionBuilder();
}

function renderSectionBuilder() {
  const template = currentPortfolio?.template_type || 'custom';

  // Renderiza paleta de tipos disponíveis
  const palette = document.getElementById('sectionPalette');
  if (palette) {
    const available = SECTION_TYPES.filter(s =>
      s.all || (s.templates && (s.templates.includes(template) || template === 'custom'))
    );
    palette.innerHTML = available.map(s => {
      const inUse = sectionsList.some(sl => sl.section_type === s.type);
      return `
      <div class="palette-item ${inUse ? 'in-use' : ''}" draggable="${!inUse}"
           data-type="${escapeAttr(s.type)}" title="${escapeAttr(s.desc)}">
        <div class="palette-item-icon"><i class="${escapeAttr(s.icon)}"></i></div>
        <div class="palette-item-info">
          <div class="palette-item-name">${escapeHtml(s.name)}</div>
          <div class="palette-item-desc">${escapeHtml(s.desc)}</div>
        </div>
        <i class="palette-item-add fa-solid ${inUse ? 'fa-check' : 'fa-plus'}"></i>
      </div>`;
    }).join('');

    // Drag from palette
    palette.querySelectorAll('.palette-item:not(.in-use)').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        dragSrcEl = null;
        e.dataTransfer.setData('text/plain', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
      item.addEventListener('click', () => _addSection(item.dataset.type));
    });
  }

  // Renderiza canvas (layout atual)
  renderSectionCanvas();
}

function renderSectionCanvas() {
  const canvas = document.getElementById('sectionCanvas');
  if (!canvas) return;

  if (!sectionsList.length) {
    canvas.innerHTML = `
      <div class="section-canvas-empty">
        <i class="fa-solid fa-layer-group"></i>
        <p>Arraste seções da paleta ou clique no + para adicionar</p>
      </div>`;
  } else {
    canvas.innerHTML = sectionsList.map((s, idx) => {
      const def = SECTION_TYPES.find(t => t.type === s.section_type) || { icon: 'fa-solid fa-section', name: s.section_type };
      return `
      <div class="section-item ${s.is_visible ? '' : 'hidden-section'}" draggable="true"
           data-id="${escapeAttr(s.id)}" data-idx="${idx}">
        <span class="section-drag-handle" title="Arrastar para reordenar">
          <i class="fa-solid fa-grip-vertical"></i>
        </span>
        <div class="section-item-icon"><i class="${escapeAttr(def.icon)}"></i></div>
        <div class="section-item-info">
          <div class="section-item-name">${escapeHtml(s.title || def.name)}</div>
          <div class="section-item-type">${escapeHtml(s.section_type)}</div>
        </div>
        <div class="section-item-actions">
          <button class="section-action-btn ${s.is_visible ? 'active' : ''}" title="${s.is_visible ? 'Ocultar' : 'Mostrar'}" data-action="toggle" data-id="${escapeAttr(s.id)}">
            <i class="fa-solid ${s.is_visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
          </button>
          <button class="section-action-btn" title="Configurar" data-action="config" data-id="${escapeAttr(s.id)}">
            <i class="fa-solid fa-gear"></i>
          </button>
          <button class="section-action-btn danger" title="Remover" data-action="remove" data-id="${escapeAttr(s.id)}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`;
    }).join('');
  }

  _setupCanvasDragDrop(canvas);
  _setupCanvasActions(canvas);
}

function _setupCanvasDragDrop(canvas) {
  // Drag entre itens
  canvas.querySelectorAll('.section-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragSrcEl = item;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.idx);
      setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      canvas.querySelectorAll('.section-item').forEach(i => i.classList.remove('dragging-over'));
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (dragSrcEl && dragSrcEl !== item) {
        canvas.querySelectorAll('.section-item').forEach(i => i.classList.remove('dragging-over'));
        item.classList.add('dragging-over');
      }
    });
    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation(); // evita que o drop do canvas pai também dispare
      item.classList.remove('dragging-over');
      if (!dragSrcEl || dragSrcEl === item) return;
      const fromIdx = parseInt(dragSrcEl.dataset.idx);
      const toIdx   = parseInt(item.dataset.idx);
      if (fromIdx === toIdx) return;
      showToast('Salvando ordem...', 'info');
      await _reorderSections(fromIdx, toIdx);
      showToast('Ordem salva!', 'success');
    });
  });

  // Drop da paleta → canvas (só quando não há dragSrcEl — ou seja, veio da paleta)
  canvas.addEventListener('dragover', (e) => {
    if (!dragSrcEl) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!dragSrcEl && type) _addSection(type);
  });
}

function _setupCanvasActions(canvas) {
  canvas.addEventListener('click', async (e) => {
    const btn    = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'toggle') await _toggleVisibility(id);
    if (action === 'remove') confirmDialog('Remover esta seção?', () => _removeSection(id));
    if (action === 'config') _openSectionConfig(id);
  });
}

async function _addSection(type) {
  if (!currentPortfolio) return;
  const def   = SECTION_TYPES.find(t => t.type === type) || {};
  const order = sectionsList.length;

  const { data, error } = await supabase.from('sections').insert({
    portfolio_id:  currentPortfolio.id,
    section_type:  type,
    title:         def.name || type,
    display_order: order,
    is_visible:    true,
  }).select().single();

  if (error) { showToast('Erro ao adicionar seção', 'error'); return; }
  sectionsList.push(data);
  renderSectionBuilder();
  showToast(`Seção "${def.name}" adicionada`, 'success');
}

async function _toggleVisibility(id) {
  const sec   = sectionsList.find(s => s.id === id);
  if (!sec) return;
  const newVal = !sec.is_visible;
  const { error } = await supabase.from('sections').update({ is_visible: newVal }).eq('id', id);
  if (error) { showToast('Erro ao atualizar', 'error'); return; }
  sec.is_visible = newVal;
  renderSectionCanvas();
}

async function _removeSection(id) {
  const { error } = await supabase.from('sections').delete().eq('id', id);
  if (error) { showToast('Erro ao remover', 'error'); return; }
  sectionsList = sectionsList.filter(s => s.id !== id);
  renderSectionBuilder();
  showToast('Seção removida', 'info');
}

async function _reorderSections(fromIdx, toIdx) {
  const moved = sectionsList.splice(fromIdx, 1)[0];
  sectionsList.splice(toIdx, 0, moved);

  // Atualiza display_order no banco em batch
  const updates = sectionsList.map((s, i) => supabase.from('sections').update({ display_order: i }).eq('id', s.id));
  await Promise.all(updates);

  renderSectionCanvas();
}

function _openSectionConfig(id) {
  const sec = sectionsList.find(s => s.id === id);
  if (!sec) return;
  const def = SECTION_TYPES.find(t => t.type === sec.section_type) || {};

  const body = document.getElementById('sectionConfigBody');
  if (!body) return;

  const config = sec.config || {};

  body.innerHTML = `
    <div class="section-config-preview">
      <div class="section-item-icon"><i class="${escapeAttr(def.icon || 'fa-solid fa-section')}"></i></div>
      <div>
        <div class="section-item-name">${escapeHtml(def.name || sec.section_type)}</div>
        <div class="section-item-type">${escapeHtml(sec.section_type)}</div>
      </div>
    </div>
    <div class="form">
      <div class="form-group">
        <label class="form-label" for="cfgTitle">Título da seção</label>
        <input type="text" class="form-input" id="cfgTitle" value="${escapeAttr(sec.title || def.name || '')}">
      </div>
      <div class="form-group">
        <label class="form-label" for="cfgSubtitle">Subtítulo / Descrição</label>
        <input type="text" class="form-input" id="cfgSubtitle" value="${escapeAttr(sec.subtitle || '')}">
      </div>
      <div class="form-group">
        <label class="form-label" for="cfgHeading">Heading exibido</label>
        <input type="text" class="form-input" id="cfgHeading" value="${escapeAttr(config.heading || '')}" placeholder="Ex: Sobre Mim">
      </div>
      ${sec.section_type === 'hero' ? `
      <div class="form-group">
        <label class="form-label" for="cfgTag">Label da tag</label>
        <input type="text" class="form-input" id="cfgTag" value="${escapeAttr(config.tag || '')}" placeholder="Ex: Músico">
      </div>
      <div class="form-group">
        <label class="form-label" for="cfgCtaLabel">CTA — texto do botão</label>
        <input type="text" class="form-input" id="cfgCtaLabel" value="${escapeAttr(config.cta_label || '')}" placeholder="Ex: Ver Projetos">
      </div>
      <div class="form-group">
        <label class="form-label" for="cfgCtaUrl">CTA — URL</label>
        <input type="text" class="form-input" id="cfgCtaUrl" value="${escapeAttr(config.cta_url || '#')}">
      </div>` : ''}
      ${sec.section_type === 'contact' ? `
      <div class="form-group">
        <label class="form-label" for="cfgContactText">Texto de boas-vindas</label>
        <textarea class="form-textarea" id="cfgContactText">${escapeHtml(config.text || '')}</textarea>
      </div>
      <div class="form-toggle">
        <input type="checkbox" id="cfgShowForm" ${config.show_form !== false ? 'checked' : ''} style="display:none">
        <div class="toggle-track ${config.show_form !== false ? 'on' : ''}" id="cfgShowFormTrack">
          <div class="toggle-thumb"></div>
        </div>
        <label class="toggle-label" for="cfgShowForm">Exibir formulário de contato</label>
      </div>` : ''}
    </div>`;

  // Setup toggles
  const showFormTrack = body.querySelector('#cfgShowFormTrack');
  const showFormInput = body.querySelector('#cfgShowForm');
  if (showFormTrack && showFormInput) setupToggle(showFormTrack, showFormInput);

  // Save button
  const saveBtn = document.getElementById('sectionConfigSave');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const newTitle    = document.getElementById('cfgTitle')?.value.trim() || sec.title;
      const newSubtitle = document.getElementById('cfgSubtitle')?.value.trim() || '';
      const newConfig   = { ...config,
        heading:    document.getElementById('cfgHeading')?.value.trim(),
        tag:        document.getElementById('cfgTag')?.value.trim(),
        cta_label:  document.getElementById('cfgCtaLabel')?.value.trim(),
        cta_url:    document.getElementById('cfgCtaUrl')?.value.trim(),
        text:       document.getElementById('cfgContactText')?.value.trim(),
        show_form:  document.getElementById('cfgShowForm')?.checked ?? true,
      };

      const { error } = await supabase.from('sections').update({
        title: newTitle, subtitle: newSubtitle, config: newConfig,
      }).eq('id', sec.id);

      if (error) { showToast('Erro ao salvar', 'error'); return; }
      sec.title    = newTitle;
      sec.subtitle = newSubtitle;
      sec.config   = newConfig;
      closeModal('sectionConfigModal');
      renderSectionCanvas();
      showToast('Seção atualizada!', 'success');
    };
  }

  openModal('sectionConfigModal');
}
