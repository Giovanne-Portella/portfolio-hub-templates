window._openGalleryModal = _openGalleryModal;
/* === ADMIN/GALLERY-MANAGER.JS — Gerenciamento de Galerias === */

let galleries    = [];
let galleryItems = {};

async function loadGalleryPage() {
  if (!currentPortfolio) return;
  await _fetchGalleries();
  renderGalleryList();
}

async function _fetchGalleries() {
  const { data: gals } = await supabase
    .from('galleries')
    .select('*')
    .eq('portfolio_id', currentPortfolio.id)
    .order('display_order');

  galleries = gals || [];

  const ids = galleries.map(g => g.id);
  if (ids.length) {
    const { data: items } = await supabase
      .from('gallery_items')
      .select('*, media_files(id, file_url, thumbnail_url, file_name, file_type)')
      .in('gallery_id', ids)
      .order('display_order');

    galleryItems = {};
    (items || []).forEach(item => {
      if (!galleryItems[item.gallery_id]) galleryItems[item.gallery_id] = [];
      galleryItems[item.gallery_id].push(item);
    });
  }
}

function renderGalleryList() {
  const container = document.getElementById('galleriesContainer');
  if (!container) return;

  if (!galleries.length) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-images"></i><h3>Nenhuma galeria</h3><p>Crie sua primeira galeria</p></div>`;
    return;
  }

  container.innerHTML = galleries.map(g => {
    const items = galleryItems[g.id] || [];
    const thumbs = items.slice(0, 4).map(item => {
      const url = item.media_files?.thumbnail_url || item.media_files?.file_url;
      return url ? `<img src="${escapeAttr(url)}" class="gallery-mini-thumb" alt="">` : '';
    }).join('');

    return `
    <div class="gallery-card" data-gallery-id="${escapeAttr(g.id)}">
      <div class="gallery-card-header">
        <div class="gallery-card-info">
          <div class="gallery-card-name">${escapeHtml(g.name)}</div>
          <div class="gallery-card-meta">
            <span class="badge badge-secondary">${_layoutLabel(g.layout)}</span>
            <span>${items.length} item${items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="gallery-card-actions">
          <button class="btn btn-primary btn-sm" data-action="manage-items" data-id="${escapeAttr(g.id)}">
            <i class="fa-solid fa-images"></i> Gerenciar
          </button>
          <button class="btn btn-ghost btn-sm" data-action="edit-gallery" data-id="${escapeAttr(g.id)}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-ghost btn-sm text-danger" data-action="delete-gallery" data-id="${escapeAttr(g.id)}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      ${thumbs ? `<div class="gallery-mini-thumbs">${thumbs}</div>` : ''}
    </div>`;
  }).join('');

  container.querySelectorAll('[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    const id     = btn.dataset.id;
    btn.addEventListener('click', () => {
      if (action === 'manage-items')  _openItemsManager(id);
      if (action === 'edit-gallery')  _openGalleryModal(id);
      if (action === 'delete-gallery') _deleteGallery(id);
    });
  });
}

function _layoutLabel(layout) {
  return { grid: 'Grade', masonry: 'Mosaico', carousel: 'Carrossel', list: 'Lista' }[layout] || layout;
}

async function _openGalleryModal(editId = null) {
  const gallery = editId ? galleries.find(g => g.id === editId) : null;
  const body    = document.getElementById('galleryModalBody');
  if (!body) return;

  body.innerHTML = `
    <div class="form">
      <div class="form-group">
        <label class="form-label" for="galName">Nome da galeria *</label>
        <input type="text" class="form-input" id="galName" value="${gallery ? escapeAttr(gallery.name) : ''}" placeholder="Ex.: Ensaio 2024">
      </div>
      <div class="form-group">
        <label class="form-label" for="galLayout">Layout</label>
        <select class="form-input form-select" id="galLayout">
          <option value="grid" ${gallery?.layout === 'grid' ? 'selected' : ''}>Grade</option>
          <option value="masonry" ${gallery?.layout === 'masonry' ? 'selected' : ''}>Mosaico</option>
          <option value="carousel" ${gallery?.layout === 'carousel' ? 'selected' : ''}>Carrossel</option>
          <option value="list" ${gallery?.layout === 'list' ? 'selected' : ''}>Lista</option>
        </select>
      </div>
    </div>`;

  document.getElementById('galleryModalTitle').textContent = gallery ? 'Editar Galeria' : 'Nova Galeria';

  document.getElementById('galleryModalSave').onclick = async () => {
    const name   = document.getElementById('galName').value.trim();
    const layout = document.getElementById('galLayout').value;
    if (!name) { showToast('Nome obrigatório', 'error'); return; }

    if (gallery) {
      const { data, error } = await supabase.from('galleries').update({ name, layout }).eq('id', gallery.id).select().single();
      if (!error) Object.assign(gallery, data);
    } else {
      const { data, error } = await supabase.from('galleries').insert({
        portfolio_id: currentPortfolio.id, name, layout
      }).select().single();
      if (!error) { galleries.push(data); galleryItems[data.id] = []; }
    }

    closeModal('galleryModal');
    renderGalleryList();
    showToast(gallery ? 'Galeria atualizada' : 'Galeria criada', 'success');
  };

  openModal('galleryModal');
}

async function _deleteGallery(id) {
  confirmDialog('Excluir esta galeria e todos os seus itens?', async () => {
    await supabase.from('galleries').delete().eq('id', id);
    galleries = galleries.filter(g => g.id !== id);
    delete galleryItems[id];
    renderGalleryList();
    showToast('Galeria excluída', 'info');
  });
}

function _openItemsManager(galleryId) {
  const gallery = galleries.find(g => g.id === galleryId);
  if (!gallery) return;

  document.getElementById('itemsManagerTitle').textContent = `Itens — ${gallery.name}`;

  const body = document.getElementById('itemsManagerBody');
  if (!body) return;

  const render = () => {
    const items = galleryItems[galleryId] || [];
    body.innerHTML = items.length ? items.map((item, i) => {
      const mf = item.media_files;
      const isVideo = mf?.file_type === 'video';
      const thumbUrl = mf?.thumbnail_url || mf?.file_url;
      const thumbHtml = isVideo
        ? `<video src="${escapeAttr(mf.file_url)}" class="gallery-thumb-sm" muted preload="metadata" style="object-fit:cover" onloadedmetadata="this.currentTime=1"></video>`
        : thumbUrl
          ? `<img src="${escapeAttr(thumbUrl)}" class="gallery-thumb-sm" alt="">`
          : `<div class="gallery-thumb-sm-placeholder"><i class="fa-solid fa-file"></i></div>`;
      return `
      <div class="gallery-item-row" data-item-id="${escapeAttr(item.id)}">
        ${thumbHtml}
        <div class="gallery-item-name">${escapeHtml(item.media_files?.file_name || 'Arquivo')}</div>
        <input type="text" class="form-input form-input-sm" placeholder="Legenda..." value="${escapeAttr(item.caption || '')}">
        <div class="gallery-item-actions">
          ${i > 0 ? `<button class="btn btn-ghost btn-xs" data-move-up="${escapeAttr(item.id)}" data-gallery="${escapeAttr(galleryId)}"><i class="fa-solid fa-chevron-up"></i></button>` : ''}
          ${i < items.length - 1 ? `<button class="btn btn-ghost btn-xs" data-move-down="${escapeAttr(item.id)}" data-gallery="${escapeAttr(galleryId)}"><i class="fa-solid fa-chevron-down"></i></button>` : ''}
          <button class="btn btn-ghost btn-xs text-danger" data-remove-item="${escapeAttr(item.id)}" data-gallery="${escapeAttr(galleryId)}"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>`;
    }).join('') : '<div class="track-empty">Nenhum item. Adicione da biblioteca de mídia.</div>';

    // Bind caption save
    body.querySelectorAll('.gallery-item-row input').forEach((input, i) => {
      input.addEventListener('change', async () => {
        const items = galleryItems[galleryId] || [];
        if (items[i]) {
          await supabase.from('gallery_items').update({ caption: input.value }).eq('id', items[i].id);
          items[i].caption = input.value;
        }
      });
    });

    // Remove item
    body.querySelectorAll('[data-remove-item]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await supabase.from('gallery_items').delete().eq('id', btn.dataset.removeItem);
        galleryItems[galleryId] = (galleryItems[galleryId] || []).filter(i => i.id !== btn.dataset.removeItem);
        render();
      });
    });

    // Move up/down reorder
    const moveItem = async (itemId, direction) => {
      const items = galleryItems[galleryId] || [];
      const idx   = items.findIndex(i => i.id === itemId);
      const target = idx + direction;
      if (target < 0 || target >= items.length) return;

      [items[idx], items[target]] = [items[target], items[idx]];
      for (let j = 0; j < items.length; j++) {
        await supabase.from('gallery_items').update({ display_order: j }).eq('id', items[j].id);
        items[j].display_order = j;
      }
      render();
    };

    body.querySelectorAll('[data-move-up]').forEach(btn => btn.addEventListener('click', () => moveItem(btn.dataset.moveUp, -1)));
    body.querySelectorAll('[data-move-down]').forEach(btn => btn.addEventListener('click', () => moveItem(btn.dataset.moveDown, 1)));
  };

  render();

  // Add from Library button — aceita imagens e vídeos
  document.getElementById('addFromLibraryBtn').onclick = () => {
    pickMedia(null, async (media) => {
      const items = galleryItems[galleryId] || [];
      const { data, error } = await supabase.from('gallery_items').insert({
        gallery_id: galleryId,
        media_id: media.id,
        display_order: items.length
      }).select('*, media_files(id, file_url, thumbnail_url, file_name, file_type)').single();

      if (!error) {
        galleryItems[galleryId] = [...items, data];
        render();
        showToast('Item adicionado', 'success');
      }
    });
  };

  openModal('itemsManagerModal');
}
