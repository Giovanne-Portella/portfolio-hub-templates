window._openServiceModal = _openServiceModal;
/* === ADMIN/SERVICES-MANAGER.JS — Gerenciamento de Serviços === */

let adminServices = [];

async function loadServicesPage() {
  if (!currentPortfolio) return;
  await _fetchServices();
  renderServicesList();
}

async function _fetchServices() {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('portfolio_id', currentPortfolio.id)
    .order('display_order');

  adminServices = data || [];
}

function renderServicesList() {
  const container = document.getElementById('servicesContainer');
  if (!container) return;

  if (!adminServices.length) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-briefcase"></i><h3>Nenhum serviço</h3><p>Adicione os serviços ou produtos que você oferece</p></div>`;
    return;
  }

  container.innerHTML = adminServices.map((svc, i) => `
    <div class="service-card-admin" data-id="${escapeAttr(svc.id)}">
      <div class="service-card-admin-header">
        <div class="service-icon-preview">
          ${svc.icon ? `<i class="${escapeAttr(svc.icon)}"></i>` : '<i class="fa-solid fa-box"></i>'}
        </div>
        <div class="service-card-info">
          <div class="service-card-name">${escapeHtml(svc.title)}</div>
          ${svc.price ? `<div class="service-card-price">${escapeHtml(svc.price)}</div>` : ''}
        </div>
        <div class="service-card-actions">
          ${svc.is_featured ? '<span class="badge badge-accent">Destaque</span>' : ''}
          <button class="btn btn-ghost btn-sm" data-action="move-up" data-idx="${i}" title="Subir">
            <i class="fa-solid fa-chevron-up"></i>
          </button>
          <button class="btn btn-ghost btn-sm" data-action="move-down" data-idx="${i}" title="Descer">
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${escapeAttr(svc.id)}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-ghost btn-sm text-danger" data-action="delete" data-id="${escapeAttr(svc.id)}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>`).join('');

  container.querySelectorAll('[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    btn.addEventListener('click', async () => {
      if (action === 'edit')       _openServiceModal(btn.dataset.id);
      if (action === 'delete')     _deleteService(btn.dataset.id);
      if (action === 'move-up')    await _moveService(parseInt(btn.dataset.idx), -1);
      if (action === 'move-down')  await _moveService(parseInt(btn.dataset.idx), 1);
    });
  });
}

async function _moveService(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= adminServices.length) return;

  [adminServices[idx], adminServices[target]] = [adminServices[target], adminServices[idx]];

  for (let i = 0; i < adminServices.length; i++) {
    await supabase.from('services').update({ display_order: i }).eq('id', adminServices[i].id);
    adminServices[i].display_order = i;
  }

  renderServicesList();
}

async function _deleteService(id) {
  confirmDialog('Excluir este serviço?', async () => {
    await supabase.from('services').delete().eq('id', id);
    adminServices = adminServices.filter(s => s.id !== id);
    renderServicesList();
    showToast('Serviço excluído', 'info');
  });
}

function _openServiceModal(editId = null) {
  const svc  = editId ? adminServices.find(s => s.id === editId) : null;
  const body = document.getElementById('serviceModalBody');
  if (!body) return;

  const features = svc?.features || [];

  body.innerHTML = `
    <div class="form">
      <div class="form-row">
        <div class="form-group" style="flex:0 0 80px">
          <label class="form-label" for="svcIcon">Ícone FA</label>
          <input type="text" class="form-input" id="svcIcon" value="${svc ? escapeAttr(svc.icon || '') : ''}" placeholder="fa-solid fa-star">
        </div>
        <div class="form-group">
          <label class="form-label" for="svcTitle">Título *</label>
          <input type="text" class="form-input" id="svcTitle" value="${svc ? escapeAttr(svc.title) : ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="svcPrice">Preço / Valor</label>
          <input type="text" class="form-input" id="svcPrice" value="${svc ? escapeAttr(svc.price || '') : ''}" placeholder="R$ 500 / mês">
        </div>
        <div class="form-group">
          <label class="toggle-wrap">
            <input type="checkbox" class="toggle-input" id="svcFeatured" ${svc?.is_featured ? 'checked' : ''}>
            <span class="toggle-track"></span>
            <span class="toggle-label">Destaque</span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="svcDesc">Descrição</label>
        <textarea class="form-input form-textarea" id="svcDesc" rows="3">${svc ? escapeHtml(svc.description || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="svcImage">Imagem</label>
        <div style="display:flex;gap:.5rem;align-items:center">
          <input type="text" class="form-input" id="svcImage" value="${svc ? escapeAttr(svc.image_url || '') : ''}">
          <button type="button" class="btn btn-secondary btn-sm" id="svcPickImg"><i class="fa-solid fa-images"></i></button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Recursos (features)</label>
        <div id="svcFeaturesWrap"></div>
        <button type="button" class="btn btn-ghost btn-sm" id="addFeatureBtn" style="margin-top:.5rem">
          <i class="fa-solid fa-plus"></i> Adicionar recurso
        </button>
      </div>
    </div>`;

  // Features editor
  let featuresList = [...features];
  const featurWrap = document.getElementById('svcFeaturesWrap');

  const renderFeatures = () => {
    featurWrap.innerHTML = featuresList.map((f, i) => `
      <div style="display:flex;gap:.5rem;margin-bottom:.25rem">
        <input type="text" class="form-input form-input-sm" value="${escapeAttr(f)}" data-feat-idx="${i}">
        <button type="button" class="btn btn-ghost btn-xs text-danger" data-rm-feat="${i}"><i class="fa-solid fa-xmark"></i></button>
      </div>`).join('');

    featurWrap.querySelectorAll('[data-feat-idx]').forEach(input => {
      input.addEventListener('input', () => { featuresList[parseInt(input.dataset.featIdx)] = input.value; });
    });
    featurWrap.querySelectorAll('[data-rm-feat]').forEach(btn => {
      btn.addEventListener('click', () => { featuresList.splice(parseInt(btn.dataset.rmFeat), 1); renderFeatures(); });
    });
  };

  document.getElementById('addFeatureBtn').addEventListener('click', () => { featuresList.push(''); renderFeatures(); });
  renderFeatures();

  document.getElementById('svcPickImg').addEventListener('click', () => {
    pickMedia('image', (media) => { document.getElementById('svcImage').value = media.file_url; });
  });

  document.getElementById('serviceModalTitle').textContent = svc ? 'Editar Serviço' : 'Novo Serviço';

  document.getElementById('serviceModalSave').onclick = async () => {
    const title = document.getElementById('svcTitle').value.trim();
    if (!title) { showToast('Título obrigatório', 'error'); return; }

    const payload = {
      title,
      icon        : document.getElementById('svcIcon').value.trim(),
      price       : document.getElementById('svcPrice').value.trim(),
      description : document.getElementById('svcDesc').value.trim(),
      image_url   : document.getElementById('svcImage').value.trim(),
      is_featured : document.getElementById('svcFeatured').checked,
      features    : featuresList.filter(f => f.trim()),
    };

    if (svc) {
      const { data, error } = await supabase.from('services').update(payload).eq('id', svc.id).select().single();
      if (!error) Object.assign(svc, data);
    } else {
      const { data, error } = await supabase.from('services').insert({
        portfolio_id: currentPortfolio.id, display_order: adminServices.length, ...payload
      }).select().single();
      if (!error) adminServices.push(data);
    }

    closeModal('serviceModal');
    renderServicesList();
    showToast(svc ? 'Serviço atualizado' : 'Serviço criado', 'success');
  };

  openModal('serviceModal');
}
