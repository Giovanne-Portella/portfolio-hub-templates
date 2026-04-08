/* === ADMIN/CORE.JS — Núcleo do painel admin === */


// === TOAST ===
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warn: 'fa-triangle-exclamation' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// === LOADING ===
// Usa style.display diretamente pois o HTML declara style="display:none"
// (o atributo inline tem prioridade sobre classes CSS)
function showLoading(text = 'Carregando...') {
  const lo       = document.getElementById('loadingOverlay');
  const textEl   = document.getElementById('loadingText');
  if (!lo) return;
  if (textEl) textEl.textContent = text;
  lo.style.display = 'flex';
}

function hideLoading() {
  const lo = document.getElementById('loadingOverlay');
  if (lo) lo.style.display = 'none';
}

// === NAVIGAÇÃO ===


const _pageTitles = {
  dashboard:    'Dashboard',
  sections:     'Construtor de Seções',
  theme:        'Editor de Tema',
  profile:      'Perfil',
  media:        'Biblioteca de Mídia',
  radio:        'Rádio & Playlists',
  gallery:      'Galerias',
  events:       'Eventos',
  publications: 'Publicações',
  services:     'Serviços',
  settings:     'Configurações',
};

// === MODAL ===
function openModal(id) {
  const backdrop = document.getElementById(id);
  if (backdrop) { backdrop.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const backdrop = document.getElementById(id);
  if (backdrop) { backdrop.classList.remove('open'); document.body.style.overflow = ''; }
}

// Fechar ao clicar no backdrop (fora do modal)
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop') && e.target.classList.contains('open')) {
    closeModal(e.target.id);
  }
});

// === FILE UPLOAD ===
async function uploadFile(file, bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

async function uploadToMediaLibrary(file, portfolioId) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${portfolioId}/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
  const url  = await uploadFile(file, 'media', path);

  const fileType = _detectFileType(file.type, ext);

  // Gera thumbnail para imagens
  let thumbnailUrl = null;
  if (fileType === 'image') {
    thumbnailUrl = url; // usa a própria imagem como thumb
  }

  const { data, error } = await supabase.from('media_files').insert({
    portfolio_id:  portfolioId,
    file_name:     file.name,
    file_url:      url,
    file_type:     fileType,
    mime_type:     file.type,
    file_size:     file.size,
    thumbnail_url: thumbnailUrl,
  }).select().single();

  if (error) throw error;
  return data;
}

function _detectFileType(mimeType, ext) {
  if (mimeType.startsWith('image/'))  return 'image';
  if (mimeType.startsWith('audio/'))  return 'audio';
  if (mimeType.startsWith('video/'))  return 'video';
  const docExts = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt'];
  if (docExts.includes(ext))          return 'document';
  return 'other';
}

// === GET / CREATE PORTFOLIO ===
async function ensurePortfolio(userId) {
  // Busca portfolio existente
  const { data } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data;

  // Cria novo portfolio com valores padrão
  const { data: created, error: createError } = await supabase
    .from('portfolios')
    .insert({
      user_id:       userId,
      name:          'Meu Portfólio',
      template_type: 'custom',
      theme_config:  { colors: ['#7c3aed','#db2777'], colorMode: 'gradient', gradientDirection: '135deg', fontFamily: 'Inter', borderRadius: 'rounded', animations: 'full', musicReactor: false, reactorIntensity: 'medium' },
      feature_flags: {},
      is_published:  false,
    })
    .select()
    .single();

  if (createError) throw createError;

  // Cria perfil vazio para o novo portfolio
  await supabase.from('profiles').insert({
    portfolio_id: created.id,
    full_name:    '',
    bio:          '',
    social_links: [],
  });

  return created;
}

// === CONFIRM DIALOG ===
// Usa o modal #confirmModal com mensagem em #confirmMessage (IDs corretos do HTML)
function confirmDialog(message, onConfirm) {
  const modal  = document.getElementById('confirmModal');
  const textEl = document.getElementById('confirmMessage');
  const okBtn  = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  // Fallback para confirm nativo se o modal não existir
  if (!modal || !textEl || !okBtn) {
    if (window.confirm(message)) onConfirm();
    return;
  }

  textEl.textContent = message;

  // Remove listeners anteriores (evita acúmulo ao chamar confirmDialog várias vezes)
  const newOk     = okBtn.cloneNode(true);
  const newCancel = cancelBtn?.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  if (cancelBtn && newCancel) cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

  newOk.addEventListener('click', () => {
    closeModal('confirmModal');
    onConfirm();
  });
  newCancel?.addEventListener('click', () => closeModal('confirmModal'));

  openModal('confirmModal');
}

// === TOGGLE SWITCH ===
function setupToggle(trackEl, inputEl) {
  if (!trackEl || !inputEl) return;
  trackEl.classList.toggle('on', inputEl.checked);
  trackEl.addEventListener('click', () => {
    inputEl.checked = !inputEl.checked;
    trackEl.classList.toggle('on', inputEl.checked);
    inputEl.dispatchEvent(new Event('change'));
  });
}

// === TAGS INPUT ===
function setupTagsInput(wrapEl, hiddenInput, initial = []) {
  if (!wrapEl || !hiddenInput) return;
  let tags = [...initial];

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'tags-input';
  input.placeholder = 'Adicionar tag...';
  wrapEl.appendChild(input);

  function render() {
    wrapEl.querySelectorAll('.tag-item').forEach(t => t.remove());
    tags.forEach((tag, i) => {
      const span = document.createElement('span');
      span.className = 'tag-item';
      span.innerHTML = `${escapeHtml(tag)}<span class="tag-remove" data-i="${i}">&times;</span>`;
      wrapEl.insertBefore(span, input);
    });
    hiddenInput.value = JSON.stringify(tags);
  }

  wrapEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('tag-remove')) {
      tags.splice(parseInt(e.target.dataset.i), 1);
      render();
    } else {
      input.focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
      e.preventDefault();
      tags.push(input.value.trim());
      input.value = '';
      render();
    }
    if (e.key === 'Backspace' && !input.value && tags.length) {
      tags.pop();
      render();
    }
  });

  render();
  return { getTags: () => tags };
}
