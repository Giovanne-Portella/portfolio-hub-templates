/* === ADMIN/EVENTS-MANAGER.JS — Gerenciamento de Eventos === */
window._openEventModal = _openEventModal;

// Converte ISO string para formato local compatível com datetime-local input
function _toLocalDatetimeInput(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let adminEvents = [];

async function loadEventsPage() {
  if (!currentPortfolio) return;
  await _fetchEvents();
  renderEventsList();
}

async function _fetchEvents() {
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('portfolio_id', currentPortfolio.id)
    .order('event_date', { ascending: false });

  adminEvents = data || [];
}

function renderEventsList() {
  const container = document.getElementById('eventsContainer');
  if (!container) return;

  if (!adminEvents.length) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-calendar-days"></i><h3>Nenhum evento</h3><p>Adicione shows, apresentações ou eventos</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>Evento</th><th>Data</th><th>Local</th><th>Destaque</th><th>Ações</th>
        </tr></thead>
        <tbody>
          ${adminEvents.map(ev => {
            const date = ev.event_date ? new Date(ev.event_date).toLocaleDateString('pt-BR') : '—';
            return `
            <tr>
              <td><strong>${escapeHtml(ev.title)}</strong></td>
              <td>${date}</td>
              <td>${escapeHtml(ev.location || '—')}</td>
              <td>${ev.is_featured ? '<span class="badge badge-accent">Sim</span>' : '<span class="badge badge-secondary">Não</span>'}</td>
              <td>
                <button class="btn btn-ghost btn-sm" data-action="edit-event" data-id="${escapeAttr(ev.id)}">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-ghost btn-sm text-danger" data-action="delete-event" data-id="${escapeAttr(ev.id)}">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  container.querySelectorAll('[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    const id     = btn.dataset.id;
    btn.addEventListener('click', () => {
      if (action === 'edit-event')   _openEventModal(id);
      if (action === 'delete-event') _deleteEvent(id);
    });
  });
}

async function _deleteEvent(id) {
  confirmDialog('Excluir este evento?', async () => {
    await supabase.from('events').delete().eq('id', id);
    adminEvents = adminEvents.filter(e => e.id !== id);
    renderEventsList();
    showToast('Evento excluído', 'info');
  });
}

function _openEventModal(editId = null) {
  const ev   = editId ? adminEvents.find(e => e.id === editId) : null;
  const body = document.getElementById('eventModalBody');
  if (!body) return;

  // datetime-local precisa do formato "YYYY-MM-DDTHH:MM" no fuso local (não UTC)
  const dateVal = ev?.event_date ? _toLocalDatetimeInput(ev.event_date) : '';



  body.innerHTML = `
    <div class="form">
      <div class="form-group">
        <label class="form-label" for="evTitle">Título *</label>
        <input type="text" class="form-input" id="evTitle" value="${ev ? escapeAttr(ev.title) : ''}" placeholder="Nome do evento">
      </div>
      <div class="form-group">
        <label class="form-label" for="evDesc">Descrição</label>
        <textarea class="form-input form-textarea" id="evDesc" rows="3" placeholder="Sobre o evento">${ev ? escapeHtml(ev.description || '') : ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="evDate">Data e hora</label>
          <input type="datetime-local" class="form-input" id="evDate" value="${dateVal}">
        </div>
        <div class="form-group">
          <label class="form-label" for="evLocation">Local</label>
          <input type="text" class="form-input" id="evLocation" value="${ev ? escapeAttr(ev.location || '') : ''}" placeholder="Cidade, Local">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="evTickets">Link de ingressos</label>
        <input type="url" class="form-input" id="evTickets" value="${ev ? escapeAttr(ev.ticket_url || '') : ''}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label class="form-label" for="evImage">Imagem de capa</label>
        <div style="display:flex;gap:.5rem;align-items:center">
          <input type="text" class="form-input" id="evImage" value="${ev ? escapeAttr(ev.image_url || '') : ''}" placeholder="URL da imagem">
          <button type="button" class="btn btn-secondary btn-sm" id="evPickImage">
            <i class="fa-solid fa-images"></i>
          </button>
        </div>
      </div>
      <div class="form-group">
        <div class="form-toggle">
          <input type="checkbox" id="evFeatured" ${ev?.is_featured ? 'checked' : ''} style="display:none">
          <div class="toggle-track ${ev?.is_featured ? 'on' : ''}" id="evFeaturedTrack">
            <div class="toggle-thumb"></div>
          </div>
          <label class="toggle-label" for="evFeatured">Evento em destaque</label>
        </div>
      </div>
    </div>`;

  // Setup toggle para "Evento em destaque"
  const featTrack = document.getElementById('evFeaturedTrack');
  const featInput = document.getElementById('evFeatured');
  if (featTrack && featInput) setupToggle(featTrack, featInput);

  document.getElementById('evPickImage').addEventListener('click', () => {
    pickMedia('image', (media) => {
      document.getElementById('evImage').value = media.file_url;
    });
  });

  document.getElementById('eventModalTitle').textContent = ev ? 'Editar Evento' : 'Novo Evento';

  document.getElementById('eventModalSave').onclick = async () => {
    const title     = document.getElementById('evTitle').value.trim();
    const desc      = document.getElementById('evDesc').value.trim();
    const dateStr   = document.getElementById('evDate').value;
    const location  = document.getElementById('evLocation').value.trim();
    const ticketUrl = document.getElementById('evTickets').value.trim();
    const imageUrl  = document.getElementById('evImage').value.trim();
    const featured  = document.getElementById('evFeatured').checked;

    if (!title) { showToast('Título obrigatório', 'error'); return; }

    // Converte datetime-local (YYYY-MM-DDTHH:MM) para ISO string
    // new Date(dateStr) interpreta o valor como horário local (sem timezone suffix)
    let eventDateISO = null;
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        eventDateISO = parsed.toISOString();
      } else {
        showToast('Data inválida', 'error');
        return;
      }
    }

    const payload = {
      title, description: desc,
      event_date: eventDateISO,
      location, ticket_url: ticketUrl || null, image_url: imageUrl || null,
      is_featured: featured,
    };

    if (ev) {
      const { data, error } = await supabase.from('events').update(payload).eq('id', ev.id).select().single();
      if (error) { showToast('Erro ao atualizar evento', 'error'); console.error(error); return; }
      Object.assign(ev, data);
    } else {
      const { data, error } = await supabase.from('events').insert({
        portfolio_id: currentPortfolio.id, ...payload
      }).select().single();
      if (error) { showToast('Erro ao criar evento', 'error'); console.error(error); return; }
      adminEvents.unshift(data);
    }

    closeModal('eventModal');
    renderEventsList();
    showToast(ev ? 'Evento atualizado' : 'Evento criado', 'success');
  };

  openModal('eventModal');
}
