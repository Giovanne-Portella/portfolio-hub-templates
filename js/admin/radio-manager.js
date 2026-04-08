window._openPlaylistModal = _openPlaylistModal;
/* === ADMIN/RADIO-MANAGER.JS — Gerenciador de Rádio === */

let playlists         = [];
let playlistTracks    = {};
let activePlaylistId  = null;

async function loadRadioPage() {
  if (!currentPortfolio) return;
  await _fetchPlaylists();
  renderPlaylistList();
}

async function _fetchPlaylists() {
  const { data: pls } = await supabase
    .from('playlists')
    .select('*')
    .eq('portfolio_id', currentPortfolio.id)
    .order('created_at', { ascending: false });

  playlists = pls || [];

  // Fetch tracks for all playlists
  const ids = playlists.map(p => p.id);
  if (ids.length) {
    const { data: tracks } = await supabase
      .from('playlist_tracks')
      .select('*, media_files(file_name, file_url, duration)')
      .in('playlist_id', ids)
      .order('track_order');
    // Nota: track_type e youtube_id também vêm na resposta automaticamente

    playlistTracks = {};
    (tracks || []).forEach(t => {
      if (!playlistTracks[t.playlist_id]) playlistTracks[t.playlist_id] = [];
      playlistTracks[t.playlist_id].push(t);
    });
  }
}

function renderPlaylistList() {
  const container = document.getElementById('playlistsContainer');
  if (!container) return;

  if (!playlists.length) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-radio"></i><h3>Nenhuma playlist</h3><p>Crie sua primeira playlist para a rádio</p></div>`;
    return;
  }

  container.innerHTML = playlists.map(pl => {
    const tracks = playlistTracks[pl.id] || [];
    return `
    <div class="playlist-card${pl.is_active ? ' active' : ''}" data-id="${escapeAttr(pl.id)}">
      <div class="playlist-card-header">
        <div class="playlist-card-info">
          <div class="playlist-card-name">${escapeHtml(pl.name)}</div>
          <div class="playlist-card-meta">${tracks.length} faixa${tracks.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="playlist-card-actions">
          ${pl.is_active ? '<span class="badge badge-accent" style="margin-right:.5rem">Ativa</span>' : ''}
          <button class="btn btn-ghost btn-sm" data-action="set-active" data-id="${escapeAttr(pl.id)}" title="Ativar playlist">
            <i class="fa-solid fa-circle-play"></i>
          </button>
          <button class="btn btn-ghost btn-sm" data-action="edit-playlist" data-id="${escapeAttr(pl.id)}" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-ghost btn-sm text-danger" data-action="delete-playlist" data-id="${escapeAttr(pl.id)}" title="Excluir">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="playlist-tracks" id="tracks-${escapeAttr(pl.id)}">
        ${_renderTrackList(pl.id)}
      </div>
      <div class="playlist-card-footer">
        <button class="btn btn-ghost btn-sm" data-action="add-track" data-playlist-id="${escapeAttr(pl.id)}">
          <i class="fa-solid fa-plus"></i> Adicionar faixa
        </button>
        <label class="toggle-wrap" title="Modo aleatório">
          <input type="checkbox" class="toggle-input" data-action="shuffle" data-id="${escapeAttr(pl.id)}" ${pl.shuffle ? 'checked' : ''}>
          <span class="toggle-track"></span>
          <span class="toggle-label">Aleatório</span>
        </label>
      </div>
    </div>`;
  }).join('');

  // Bind actions
  container.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = el.dataset.action;
      const id     = el.dataset.id;

      if (action === 'set-active')       _setActivePlaylist(id);
      if (action === 'edit-playlist')    _openPlaylistModal(id);
      if (action === 'delete-playlist')  _deletePlaylist(id);
      if (action === 'add-track')        _openTrackPicker(el.dataset.playlistId);
    });
    if (el.dataset.action === 'shuffle') {
      el.addEventListener('change', () => _toggleShuffle(el.dataset.id, el.checked));
    }
  });

  // Make tracks sortable
  playlists.forEach(pl => _setupTrackDrag(pl.id));
}

function _renderTrackList(playlistId) {
  const tracks = playlistTracks[playlistId] || [];
  if (!tracks.length) {
    return `<div class="track-empty">Nenhuma faixa. Clique em "+ Adicionar faixa"</div>`;
  }

  return tracks.map((t, i) => {
    const name = t.title || t.media_files?.file_name || 'Sem título';
    const dur  = t.media_files?.duration ? formatDuration(t.media_files.duration) : '--';
    const isYT = t.track_type === 'youtube';
    const typeIcon = isYT
      ? `<span class="track-icon track-icon-yt"><i class="fa-brands fa-youtube"></i></span>`
      : `<span class="track-icon"><i class="fa-solid fa-music"></i></span>`;
    const ytLink = isYT && t.youtube_id
      ? `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(t.youtube_id)}" target="_blank" class="btn btn-ghost btn-sm" title="Abrir no YouTube" style="color:#ff0000"><i class="fa-brands fa-youtube"></i></a>`
      : '';

    return `
    <div class="track-item" data-track-id="${escapeAttr(t.id)}" data-order="${i}" draggable="true">
      <span class="track-drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>
      <span class="track-num">${i + 1}</span>
      ${typeIcon}
      <div class="track-info">
        <div class="track-name">${escapeHtml(name)}</div>
        ${t.artist ? `<div class="track-artist">${escapeHtml(t.artist)}</div>` : ''}
        ${isYT ? `<div class="track-artist" style="font-size:.7rem;opacity:.5">YouTube: ${escapeHtml(t.youtube_id || '')}</div>` : ''}
      </div>
      ${isYT ? '' : `<span class="track-duration">${dur}</span>`}
      ${ytLink}
      <button class="btn btn-ghost btn-sm text-danger" data-remove-track="${escapeAttr(t.id)}" data-playlist="${escapeAttr(playlistId)}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>`;
  }).join('');
}

function _setupTrackDrag(playlistId) {
  const container = document.getElementById(`tracks-${playlistId}`);
  if (!container) return;

  let dragSrc = null;

  container.querySelectorAll('.track-item').forEach(item => {
    item.addEventListener('dragstart', () => { dragSrc = item; item.classList.add('dragging'); });
    item.addEventListener('dragend', () => { item.classList.remove('dragging'); });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const after = _getDragAfterElement(container, e.clientY);
      if (after === null) container.appendChild(dragSrc);
      else container.insertBefore(dragSrc, after);
    });

    item.querySelector('[data-remove-track]')?.addEventListener('click', async (e) => {
      const trackId    = e.currentTarget.dataset.removeTrack;
      await supabase.from('playlist_tracks').delete().eq('id', trackId);
      playlistTracks[playlistId] = (playlistTracks[playlistId] || []).filter(t => t.id !== trackId);
      document.getElementById(`tracks-${playlistId}`).innerHTML = _renderTrackList(playlistId);
      _setupTrackDrag(playlistId);
    });
  });

  container.addEventListener('drop', async () => {
    const items = [...container.querySelectorAll('.track-item')];
    const updates = items.map((el, i) => ({ id: el.dataset.trackId, track_order: i }));

    for (const u of updates) {
      await supabase.from('playlist_tracks').update({ track_order: u.track_order }).eq('id', u.id);
    }

    // Reorder local array
    if (playlistTracks[playlistId]) {
      const reordered = [];
      items.forEach(el => {
        const t = playlistTracks[playlistId].find(t => t.id === el.dataset.trackId);
        if (t) reordered.push(t);
      });
      playlistTracks[playlistId] = reordered;
    }
  });
}

function _getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll('.track-item:not(.dragging)')];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element || null;
}

async function _setActivePlaylist(id) {
  // Desativa todas
  await supabase.from('playlists').update({ is_active: false }).eq('portfolio_id', currentPortfolio.id);
  await supabase.from('playlists').update({ is_active: true }).eq('id', id);

  playlists.forEach(p => { p.is_active = p.id === id; });
  activePlaylistId = id;
  renderPlaylistList();
  showToast('Playlist ativada', 'success');
}

async function _deletePlaylist(id) {
  confirmDialog('Excluir esta playlist?', async () => {
    await supabase.from('playlists').delete().eq('id', id);
    playlists = playlists.filter(p => p.id !== id);
    delete playlistTracks[id];
    renderPlaylistList();
    showToast('Playlist excluída', 'info');
  });
}

async function _toggleShuffle(id, value) {
  await supabase.from('playlists').update({ shuffle: value }).eq('id', id);
  const pl = playlists.find(p => p.id === id);
  if (pl) pl.shuffle = value;
}

function _openPlaylistModal(editId = null) {
  const pl = editId ? playlists.find(p => p.id === editId) : null;
  const title = pl ? 'Editar Playlist' : 'Nova Playlist';

  const body = document.getElementById('playlistModalBody');
  if (!body) return;

  body.innerHTML = `
    <div class="form">
      <div class="form-group">
        <label class="form-label" for="plName">Nome da playlist *</label>
        <input type="text" class="form-input" id="plName" value="${pl ? escapeAttr(pl.name) : ''}" placeholder="Ex.: Pop Rock Anos 80">
      </div>
      <div class="form-group">
        <label class="form-label" for="plDesc">Descrição</label>
        <textarea class="form-input form-textarea" id="plDesc" rows="2" placeholder="Descreva a playlist">${pl ? escapeHtml(pl.description || '') : ''}</textarea>
      </div>
    </div>`;

  document.getElementById('playlistModalTitle').textContent = title;

  document.getElementById('playlistModalSave').onclick = async () => {
    const name = document.getElementById('plName').value.trim();
    const desc = document.getElementById('plDesc').value.trim();
    if (!name) { showToast('Nome é obrigatório', 'error'); return; }

    if (pl) {
      const { data, error } = await supabase.from('playlists').update({ name, description: desc }).eq('id', pl.id).select().single();
      if (!error) { Object.assign(pl, data); }
    } else {
      const { data, error } = await supabase.from('playlists').insert({
        portfolio_id: currentPortfolio.id, name, description: desc
      }).select().single();
      if (!error) { playlists.unshift(data); playlistTracks[data.id] = []; }
    }

    closeModal('playlistModal');
    renderPlaylistList();
    showToast(pl ? 'Playlist atualizada' : 'Playlist criada', 'success');
  };

  openModal('playlistModal');
}

async function _openTrackPicker(playlistId) {
  const body = document.getElementById('trackPickerBody');
  if (!body) return;

  // Busca arquivos de áudio da biblioteca em paralelo
  const { data: audios } = await supabase
    .from('media_files')
    .select('*')
    .eq('portfolio_id', currentPortfolio.id)
    .eq('file_type', 'audio')
    .order('created_at', { ascending: false });

  const list = audios || [];

  // Renderiza duas abas: Arquivo e YouTube
  body.innerHTML = `
    <div style="display:flex;gap:.5rem;margin-bottom:1rem;border-bottom:1px solid var(--admin-border);padding-bottom:.75rem">
      <button class="btn btn-primary btn-sm" id="tabFile" style="flex:1">
        <i class="fa-solid fa-file-audio"></i> Da biblioteca
      </button>
      <button class="btn btn-ghost btn-sm" id="tabYoutube" style="flex:1">
        <i class="fa-brands fa-youtube" style="color:#ff0000"></i> YouTube
      </button>
    </div>

    <!-- Aba: Biblioteca de arquivos -->
    <div id="pickerFileTab">
      ${list.length ? list.map(m => `
        <div class="track-pick-item">
          <i class="fa-solid fa-music"></i>
          <div class="track-pick-info">
            <div class="track-pick-name">${escapeHtml(m.file_name)}</div>
            <div class="track-pick-size">${formatBytes(m.file_size)}</div>
          </div>
          <button class="btn btn-accent btn-sm" data-add-file="${escapeAttr(m.id)}" data-name="${escapeAttr(m.file_name)}">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>`).join('')
      : `<div class="empty-state"><i class="fa-solid fa-music"></i><h3>Nenhum áudio</h3><p>Envie arquivos MP3 na Biblioteca de Mídia primeiro</p></div>`}
    </div>

    <!-- Aba: YouTube (oculta inicialmente) -->
    <div id="pickerYoutubeTab" style="display:none">
      <p style="color:var(--admin-text-2);font-size:.85rem;margin-bottom:1rem">
        Cole o link do YouTube ou apenas o ID do vídeo (ex: <code>dQw4w9WgXcQ</code>)
      </p>
      <div class="form-group">
        <label class="form-label" for="ytUrlInput">URL ou ID do YouTube</label>
        <input type="text" class="form-input" id="ytUrlInput" placeholder="https://youtube.com/watch?v=... ou ID">
      </div>
      <div class="form-group">
        <label class="form-label" for="ytTitleInput">Título da faixa *</label>
        <input type="text" class="form-input" id="ytTitleInput" placeholder="Nome da música">
      </div>
      <div class="form-group">
        <label class="form-label" for="ytArtistInput">Artista</label>
        <input type="text" class="form-input" id="ytArtistInput" placeholder="Nome do artista">
      </div>
      <button class="btn btn-primary" id="addYoutubeBtn" style="width:100%;margin-top:.5rem">
        <i class="fa-solid fa-plus"></i> Adicionar faixa do YouTube
      </button>
    </div>`;

  // Tabs toggle
  document.getElementById('tabFile').addEventListener('click', () => {
    document.getElementById('pickerFileTab').style.display = '';
    document.getElementById('pickerYoutubeTab').style.display = 'none';
    document.getElementById('tabFile').className = 'btn btn-primary btn-sm';
    document.getElementById('tabYoutube').className = 'btn btn-ghost btn-sm';
  });
  document.getElementById('tabYoutube').addEventListener('click', () => {
    document.getElementById('pickerFileTab').style.display = 'none';
    document.getElementById('pickerYoutubeTab').style.display = '';
    document.getElementById('tabFile').className = 'btn btn-ghost btn-sm';
    document.getElementById('tabYoutube').className = 'btn btn-primary btn-sm';
  });

  // Adicionar faixa do arquivo
  body.querySelectorAll('[data-add-file]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mediaId = btn.dataset.addFile;
      const fileName = btn.dataset.name || '';
      const order = (playlistTracks[playlistId] || []).length;

      const { data: track, error } = await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        media_id:    mediaId,
        track_type:  'file',
        title:       fileName.replace(/\.[^.]+$/, ''),
        track_order: order,
      }).select('*, media_files(file_name, file_url, duration)').single();

      if (!error) {
        if (!playlistTracks[playlistId]) playlistTracks[playlistId] = [];
        playlistTracks[playlistId].push(track);
        document.getElementById(`tracks-${playlistId}`).innerHTML = _renderTrackList(playlistId);
        _setupTrackDrag(playlistId);
        showToast('Faixa adicionada', 'success');
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        btn.disabled = true;
      } else {
        showToast('Erro ao adicionar faixa', 'error');
      }
    });
  });

  // Adicionar faixa do YouTube
  document.getElementById('addYoutubeBtn').addEventListener('click', async () => {
    const raw    = document.getElementById('ytUrlInput').value.trim();
    const title  = document.getElementById('ytTitleInput').value.trim();
    const artist = document.getElementById('ytArtistInput').value.trim();

    if (!raw || !title) {
      showToast('Preencha URL/ID e o título', 'error');
      return;
    }

    // Extrai o ID do YouTube da URL ou usa direto se for só o ID
    const ytId = _extractYouTubeId(raw);
    if (!ytId) {
      showToast('URL ou ID do YouTube inválido', 'error');
      return;
    }

    const order = (playlistTracks[playlistId] || []).length;
    const { data: track, error } = await supabase.from('playlist_tracks').insert({
      playlist_id: playlistId,
      track_type:  'youtube',
      youtube_id:  ytId,
      title,
      artist,
      track_order: order,
    }).select('*').single();

    if (!error) {
      if (!playlistTracks[playlistId]) playlistTracks[playlistId] = [];
      playlistTracks[playlistId].push(track);
      document.getElementById(`tracks-${playlistId}`).innerHTML = _renderTrackList(playlistId);
      _setupTrackDrag(playlistId);
      showToast('Faixa do YouTube adicionada!', 'success');
      document.getElementById('ytUrlInput').value = '';
      document.getElementById('ytTitleInput').value = '';
      document.getElementById('ytArtistInput').value = '';
    } else {
      showToast('Erro ao adicionar: ' + (error.message || ''), 'error');
    }
  });

  document.getElementById('trackPickerPlaylistId').value = playlistId;
  openModal('trackPickerModal');
}

/**
 * Extrai o ID de um vídeo do YouTube a partir de uma URL ou retorna o ID direto.
 * Suporta: watch?v=ID, youtu.be/ID, /shorts/ID, embed/ID, e IDs puros (11 chars).
 */
function _extractYouTubeId(input) {
  // Tenta extrair de URL
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  // Se for só um ID puro (11 caracteres alfanuméricos)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  return null;
}
