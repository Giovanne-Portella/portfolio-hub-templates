window._openPubModal = _openPubModal;
/* === ADMIN/PUBLICATIONS-MANAGER.JS — Publicações (Acadêmicos) === */

let adminPublications = [];

async function loadPublicationsPage() {
  if (!currentPortfolio) return;
  await _fetchPublications();
  renderPublicationsList();
}

async function _fetchPublications() {
  const { data } = await supabase
    .from('publications')
    .select('*')
    .eq('portfolio_id', currentPortfolio.id)
    .order('published_at', { ascending: false });

  adminPublications = data || [];
}

function renderPublicationsList() {
  const container = document.getElementById('publicationsContainer');
  if (!container) return;

  if (!adminPublications.length) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-file-lines"></i><h3>Nenhuma publicação</h3><p>Adicione artigos, teses, livros</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>Título</th><th>Tipo</th><th>Veículo</th><th>Ano</th><th>Ações</th>
        </tr></thead>
        <tbody>
          ${adminPublications.map(pub => {
            const year   = pub.published_at ? new Date(pub.published_at).getFullYear() : '—';
            const typeLabel = { article: 'Artigo', book: 'Livro', thesis: 'Tese', conference: 'Conferência', other: 'Outro' }[pub.pub_type] || pub.pub_type;
            return `
            <tr>
              <td><strong>${escapeHtml(pub.title)}</strong>${pub.doi ? `<br><small class="text-muted">DOI: ${escapeHtml(pub.doi)}</small>` : ''}</td>
              <td><span class="badge badge-secondary">${typeLabel}</span></td>
              <td>${escapeHtml(pub.journal || '—')}</td>
              <td>${year}</td>
              <td>
                <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${escapeAttr(pub.id)}"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-ghost btn-sm text-danger" data-action="delete" data-id="${escapeAttr(pub.id)}"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const id     = btn.dataset.id;
      if (action === 'edit')   _openPubModal(id);
      if (action === 'delete') _deletePub(id);
    });
  });
}

async function _deletePub(id) {
  confirmDialog('Excluir esta publicação?', async () => {
    await supabase.from('publications').delete().eq('id', id);
    adminPublications = adminPublications.filter(p => p.id !== id);
    renderPublicationsList();
    showToast('Publicação excluída', 'info');
  });
}

function _openPubModal(editId = null) {
  const pub  = editId ? adminPublications.find(p => p.id === editId) : null;
  const body = document.getElementById('pubModalBody');
  if (!body) return;

  const dateVal = pub?.published_at || '';

  body.innerHTML = `
    <div class="form">
      <div class="form-group">
        <label class="form-label" for="pubTitle">Título *</label>
        <input type="text" class="form-input" id="pubTitle" value="${pub ? escapeAttr(pub.title) : ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="pubType">Tipo</label>
          <select class="form-input form-select" id="pubType">
            <option value="article" ${pub?.pub_type === 'article' ? 'selected' : ''}>Artigo</option>
            <option value="book" ${pub?.pub_type === 'book' ? 'selected' : ''}>Livro</option>
            <option value="thesis" ${pub?.pub_type === 'thesis' ? 'selected' : ''}>Tese / Dissertação</option>
            <option value="conference" ${pub?.pub_type === 'conference' ? 'selected' : ''}>Conferência</option>
            <option value="other" ${pub?.pub_type === 'other' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="pubDate">Data de publicação</label>
          <input type="date" class="form-input" id="pubDate" value="${dateVal}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="pubAuthors">Autores</label>
        <input type="text" class="form-input" id="pubAuthors" value="${pub ? escapeAttr(pub.authors || '') : ''}" placeholder="Nome, Nome, ...">
      </div>
      <div class="form-group">
        <label class="form-label" for="pubJournal">Revista / Editora / Conferência</label>
        <input type="text" class="form-input" id="pubJournal" value="${pub ? escapeAttr(pub.journal || '') : ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="pubDoi">DOI</label>
          <input type="text" class="form-input" id="pubDoi" value="${pub ? escapeAttr(pub.doi || '') : ''}" placeholder="10.xxxx/...">
        </div>
        <div class="form-group">
          <label class="form-label" for="pubUrl">URL</label>
          <input type="url" class="form-input" id="pubUrl" value="${pub ? escapeAttr(pub.url || '') : ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="pubAbstract">Resumo</label>
        <textarea class="form-input form-textarea" id="pubAbstract" rows="4" placeholder="Abstract / Resumo">${pub ? escapeHtml(pub.abstract || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="pubPdf">PDF</label>
        <div style="display:flex;gap:.5rem;align-items:center">
          <input type="text" class="form-input" id="pubPdf" value="${pub ? escapeAttr(pub.pdf_url || '') : ''}" placeholder="URL do PDF">
          <button type="button" class="btn btn-secondary btn-sm" id="pubPickPdf">
            <i class="fa-solid fa-file-pdf"></i>
          </button>
        </div>
      </div>
    </div>`;

  document.getElementById('pubPickPdf').addEventListener('click', () => {
    pickMedia('document', (media) => {
      document.getElementById('pubPdf').value = media.file_url;
    });
  });

  document.getElementById('pubModalTitle').textContent = pub ? 'Editar Publicação' : 'Nova Publicação';

  document.getElementById('pubModalSave').onclick = async () => {
    const title    = document.getElementById('pubTitle').value.trim();
    if (!title) { showToast('Título obrigatório', 'error'); return; }

    const payload = {
      title,
      pub_type    : document.getElementById('pubType').value,
      published_at: document.getElementById('pubDate').value || null,
      authors     : document.getElementById('pubAuthors').value.trim(),
      journal     : document.getElementById('pubJournal').value.trim(),
      doi         : document.getElementById('pubDoi').value.trim(),
      url         : document.getElementById('pubUrl').value.trim(),
      abstract    : document.getElementById('pubAbstract').value.trim(),
      pdf_url     : document.getElementById('pubPdf').value.trim(),
    };

    if (pub) {
      const { data, error } = await supabase.from('publications').update(payload).eq('id', pub.id).select().single();
      if (!error) Object.assign(pub, data);
    } else {
      const { data, error } = await supabase.from('publications').insert({
        portfolio_id: currentPortfolio.id, ...payload
      }).select().single();
      if (!error) adminPublications.unshift(data);
    }

    closeModal('pubModal');
    renderPublicationsList();
    showToast(pub ? 'Publicação atualizada' : 'Publicação criada', 'success');
  };

  openModal('pubModal');
}
