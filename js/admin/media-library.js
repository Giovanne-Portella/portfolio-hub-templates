/* === ADMIN/MEDIA-LIBRARY.JS — Gerenciador de Mídia === */

let mediaFiles       = [];
let mediaFilter      = 'all';
let mediaSearchQuery = '';
let mediaSelectMode  = false;
let onMediaSelect    = null;

async function loadMediaPage() {
  if (!currentPortfolio) return;
  await _fetchMedia();
  renderMediaGrid();
  _setupUploadZone();
}

async function _fetchMedia() {
  const { data, error } = await supabase
    .from('media_files')
    .select('*')
    .eq('portfolio_id', currentPortfolio.id)
    .order('created_at', { ascending: false });

  mediaFiles = error ? [] : (data || []);
}

function renderMediaGrid(selectMode = false, selectCallback = null) {
  mediaSelectMode = selectMode;
  onMediaSelect   = selectCallback;

  const container = document.getElementById('mediaGrid');
  if (!container) return;

  const filtered = mediaFiles.filter(m => {
    const typeMatch = mediaFilter === 'all' || m.file_type === mediaFilter;
    const searchMatch = !mediaSearchQuery || m.file_name.toLowerCase().includes(mediaSearchQuery.toLowerCase());
    return typeMatch && searchMatch;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-images"></i><h3>Nenhum arquivo</h3><p>Arraste arquivos ou clique em "Enviar"</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(m => {
    const thumb = m.thumbnail_url || m.file_url;
    const isImage = m.file_type === 'image';
    const isAudio = m.file_type === 'audio';
    const isVideo = m.file_type === 'video';

    let preview;
    if (isImage) {
      preview = `<img src="${escapeAttr(thumb)}" alt="${escapeAttr(m.file_name)}" class="media-thumb" loading="lazy">`;
    } else if (isVideo) {
      // Preview real do vídeo com thumbnail gerada pelo browser
      preview = `<video src="${escapeAttr(m.file_url)}" class="media-thumb" muted preload="metadata"
                   style="object-fit:cover" onloadedmetadata="this.currentTime=1"></video>`;
    } else if (isAudio) {
      preview = `<div class="media-thumb-placeholder"><i class="fa-solid fa-music"></i></div>`;
    } else {
      preview = `<div class="media-thumb-placeholder"><i class="fa-solid fa-file"></i></div>`;
    }

    return `
    <div class="media-item" data-id="${escapeAttr(m.id)}" title="${escapeAttr(m.file_name)}">
      ${preview}
      <div class="media-item-info">
        <div class="media-item-name">${escapeHtml(m.file_name)}</div>
        <div class="media-item-type">${escapeHtml(m.file_type)} · ${formatBytes(m.file_size)}</div>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.media-item').forEach(item => {
    item.addEventListener('click', () => _handleMediaClick(item.dataset.id));
  });
}

function _handleMediaClick(id) {
  const media = mediaFiles.find(m => m.id === id);
  if (!media) return;

  if (mediaSelectMode && typeof onMediaSelect === 'function') {
    onMediaSelect(media);
    return;
  }

  // Abre modal de detalhes
  _openMediaDetail(media);
}

function _openMediaDetail(media) {
  const body = document.getElementById('mediaDetailBody');
  if (!body) return;

  const isImage = media.file_type === 'image';
  const isAudio = media.file_type === 'audio';
  const isVideo = media.file_type === 'video';

  body.innerHTML = `
    <div style="margin-bottom:1rem">
      ${isImage ? `<img src="${escapeAttr(media.file_url)}" alt="${escapeAttr(media.file_name)}" style="max-height:240px;border-radius:8px;margin:0 auto;display:block">` : ''}
      ${isAudio ? `<audio controls src="${escapeAttr(media.file_url)}" style="width:100%"></audio>` : ''}
      ${isVideo ? `<video controls src="${escapeAttr(media.file_url)}" style="max-height:240px;border-radius:8px;width:100%"></video>` : ''}
    </div>
    <div class="form">
      <div class="form-group">
        <label class="form-label">Nome do arquivo</label>
        <input type="text" class="form-input" value="${escapeAttr(media.file_name)}" readonly>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <input type="text" class="form-input" value="${escapeAttr(media.file_type)}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Tamanho</label>
          <input type="text" class="form-input" value="${escapeAttr(formatBytes(media.file_size))}" readonly>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">URL pública</label>
        <div style="display:flex;gap:.5rem">
          <input type="text" class="form-input" value="${escapeAttr(media.file_url)}" readonly id="mediaUrlInput">
          <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('mediaUrlInput').value);showToast('URL copiada','success')">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      </div>
    </div>
    <div style="margin-top:1rem;display:flex;gap:.5rem;justify-content:flex-end">
      <a href="${escapeAttr(media.file_url)}" target="_blank" class="btn btn-secondary btn-sm">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir
      </a>
      <button class="btn btn-danger btn-sm" id="deleteMediaBtn" data-id="${escapeAttr(media.id)}">
        <i class="fa-solid fa-trash"></i> Excluir
      </button>
    </div>`;

  document.getElementById('deleteMediaBtn')?.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id;
    confirmDialog('Excluir este arquivo permanentemente?', async () => {
      await _deleteMedia(id);
      closeModal('mediaDetailModal');
    });
  });

  openModal('mediaDetailModal');
}

async function _deleteMedia(id) {
  const media = mediaFiles.find(m => m.id === id);
  if (!media) return;

  // Remove do storage do Supabase
  // A URL pública tem formato: .../storage/v1/object/public/{bucket}/{path}
  // Precisamos extrair o path dentro do bucket para chamar storage.remove()
  try {
    const storagePrefix = '/storage/v1/object/public/media/';
    const urlPath = new URL(media.file_url).pathname;
    const bucketPath = urlPath.includes(storagePrefix)
      ? urlPath.slice(urlPath.indexOf(storagePrefix) + storagePrefix.length)
      : null;

    if (bucketPath) {
      const { error: storageErr } = await supabase.storage.from('media').remove([bucketPath]);
      if (storageErr) console.warn('[Media] Aviso ao remover do storage:', storageErr.message);
    }
  } catch (err) {
    // URL inválida ou formato inesperado — loga mas continua para remover do banco
    console.warn('[Media] Não foi possível extrair path do storage:', err);
  }

  // Remove do banco de dados
  const { error } = await supabase.from('media_files').delete().eq('id', id);
  if (error) { showToast('Erro ao excluir arquivo', 'error'); return; }

  mediaFiles = mediaFiles.filter(m => m.id !== id);
  renderMediaGrid();
  showToast('Arquivo excluído', 'info');
}

function _setupUploadZone() {
  const dropZone  = document.getElementById('mediaDropZone');
  const fileInput = document.getElementById('mediaFileInput');
  const uploadBtn = document.getElementById('mediaUploadBtn');

  if (!dropZone || !fileInput) return;

  uploadBtn?.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) _processFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) _processFiles(fileInput.files);
  });

  // Filter tabs
  document.querySelectorAll('[data-media-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      mediaFilter = btn.dataset.mediaFilter;
      document.querySelectorAll('[data-media-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMediaGrid();
    });
  });

  // Search
  const search = document.getElementById('mediaSearch');
  if (search) {
    search.addEventListener('input', () => {
      mediaSearchQuery = search.value;
      renderMediaGrid();
    });
  }
}

async function _processFiles(files) {
  if (!currentPortfolio) return;
  const progressContainer = document.getElementById('uploadProgress');

  showLoading('Enviando arquivos...');

  for (const file of files) {
    try {
      const progressId = `uprog-${Date.now()}`;
      if (progressContainer) {
        progressContainer.innerHTML += `
          <div class="upload-progress-item" id="${progressId}">
            <div class="upload-progress-info">
              <div class="upload-progress-name">${escapeHtml(file.name)}</div>
              <div class="upload-progress-bar-wrap"><div class="upload-progress-bar" style="width:0%"></div></div>
            </div>
            <span class="upload-progress-pct">0%</span>
          </div>`;
        progressContainer.style.display = 'block';
      }

      const media = await uploadToMediaLibrary(file, currentPortfolio.id);
      mediaFiles.unshift(media);

      const item = document.getElementById(progressId);
      if (item) {
        item.querySelector('.upload-progress-bar').style.width = '100%';
        item.querySelector('.upload-progress-pct').textContent = '100%';
        setTimeout(() => item?.remove(), 1500);
      }
    } catch (err) {
      showToast(`Erro ao enviar ${file.name}`, 'error');
      console.error(err);
    }
  }

  hideLoading();
  renderMediaGrid();
  showToast(`${files.length} arquivo(s) enviado(s)!`, 'success');
}

// Abre media picker para selecionar arquivo em outro módulo
function pickMedia(filterType = null, callback = null) {
  mediaSelectMode = true;
  onMediaSelect   = (media) => {
    closeModal('mediaPickerModal');
    if (typeof callback === 'function') callback(media);
    mediaSelectMode = false;
  };

  if (filterType) mediaFilter = filterType;

  const container = document.getElementById('mediaPickerGrid');
  if (container) {
    const filtered = mediaFiles.filter(m => !filterType || m.file_type === filterType);
    const gridEl   = document.createElement('div');
    gridEl.className = 'media-grid';
    gridEl.innerHTML = filtered.map(m => {
      let thumb;
      if (m.file_type === 'image') {
        thumb = `<img src="${escapeAttr(m.thumbnail_url || m.file_url)}" class="media-thumb" loading="lazy">`;
      } else if (m.file_type === 'video') {
        thumb = `<video src="${escapeAttr(m.file_url)}" class="media-thumb" muted preload="metadata" style="object-fit:cover" onloadedmetadata="this.currentTime=1"></video>`;
      } else if (m.file_type === 'audio') {
        thumb = `<div class="media-thumb-placeholder"><i class="fa-solid fa-music"></i></div>`;
      } else {
        thumb = `<div class="media-thumb-placeholder"><i class="fa-solid fa-file"></i></div>`;
      }
      return `
        <div class="media-item" data-id="${escapeAttr(m.id)}" style="cursor:pointer">
          ${thumb}
          <div class="media-item-info"><div class="media-item-name">${escapeHtml(m.file_name)}</div></div>
        </div>`;
    }).join('');

    container.innerHTML = '';
    container.appendChild(gridEl);

    gridEl.querySelectorAll('.media-item').forEach(item => {
      item.addEventListener('click', () => {
        const media = mediaFiles.find(m => m.id === item.dataset.id);
        if (media && typeof onMediaSelect === 'function') onMediaSelect(media);
      });
    });
  }

  openModal('mediaPickerModal');
}
