/* === ADMIN.JS — Entry point do painel de administração ===
 *
 * Responsabilidades:
 *  1. Verificar sessão e redirecionar para login se não autenticado
 *  2. Carregar/criar o portfolio do usuário (ensurePortfolio)
 *  3. Gerenciar navegação entre páginas via hash (#dashboard, #sections, etc.)
 *  4. Conectar botões globais (logout, sidebar mobile, botões de ação por página)
 *  5. Popular o dashboard com estatísticas reais do banco
 *  6. Carregar a página de configurações e gerenciar o formulário
 */

// === ESTADO GLOBAL ===
// currentPortfolio é lido por TODOS os módulos admin (section-builder, theme-editor, etc.)
let currentPortfolio = null;

// === BOOT ===
document.addEventListener('DOMContentLoaded', async () => {
  showLoading('Iniciando painel...');
  try {
    // 1. Verifica sessão ativa
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/admin/login.html';
      return;
    }

    const user = session.user;

    // 2. Exibe info do usuário na sidebar
    const userNameEl  = document.querySelector('.admin-user-name');
    const userEmailEl = document.querySelector('.admin-user-email');
    if (userNameEl)  userNameEl.textContent  = user.email?.split('@')[0] || 'Admin';
    if (userEmailEl) userEmailEl.textContent = user.email || '';

    // 3. Garante que o portfolio existe (cria automaticamente se for novo usuário)
    currentPortfolio = await ensurePortfolio(user.id);

    // 4. Conecta todos os botões globais
    _setupHeaderButtons();

    // 5. Configura o sistema de navegação por hash
    _setupNavigation();

    // 6. Navega para a página inicial (hash atual ou dashboard)
    const initialPage = window.location.hash.slice(1) || 'dashboard';
    await _navigateTo(initialPage);

  } catch (err) {
    console.error('[Admin] Erro na inicialização:', err);
    showToast('Erro ao iniciar painel. Recarregue a página.', 'error');
  } finally {
    hideLoading();
  }
});

// ============================================================
// NAVEGAÇÃO
// ============================================================

/**
 * Configura os listeners de clique nos itens do menu lateral
 * e o evento hashchange do navegador.
 */
function _setupNavigation() {
  // Itens do menu lateral
  document.querySelectorAll('.admin-nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = item.dataset.page;
    });
  });

  // Botões de ação no dashboard que navegam para outras páginas
  document.querySelectorAll('.dashboard-actions [data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.page) window.location.hash = el.dataset.page;
    });
  });

  // Reage a mudanças de hash (voltar/avançar no browser também funciona)
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1) || 'dashboard';
    _navigateTo(page);
  });
}

/**
 * Ativa a página correspondente ao hash e dispara o carregamento do módulo.
 * @param {string} page - identificador da página (ex: 'dashboard', 'sections')
 */
async function _navigateTo(page) {
  const validPages = [
    'dashboard', 'setup', 'sections', 'theme', 'profile',
    'media', 'radio', 'gallery', 'events', 'publications', 'services', 'splash', 'settings',
  ];
  if (!validPages.includes(page)) page = 'dashboard';

  // Atualiza estado ativo no menu lateral
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Mostra a página correta, esconde as demais
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  // Atualiza o breadcrumb do header
  const breadcrumbTitles = {
    dashboard: 'Dashboard',       setup: 'Template',
    sections: 'Mapa de Seções',   theme: 'Tema e Cores',
    profile: 'Perfil / Bio',      media: 'Biblioteca de Mídia',
    radio: 'Rádio / Músicas',     gallery: 'Galerias',
    events: 'Eventos',            publications: 'Publicações',
    services: 'Serviços',         splash: 'Modal de Boas-vindas',
    settings: 'Configurações',
  };
  const breadcrumb = document.getElementById('adminBreadcrumb');
  if (breadcrumb) breadcrumb.textContent = breadcrumbTitles[page] || page;

  // Fecha sidebar em mobile ao navegar
  document.getElementById('adminSidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');

  // Carrega o módulo da página
  showLoading('Carregando...');
  try {
    await _loadPageModule(page);
  } finally {
    hideLoading();
  }
}

/**
 * Mapeia cada página ao seu módulo de carregamento.
 * Cada módulo expõe uma função loadXxxPage() definida em seu arquivo .js.
 */
async function _loadPageModule(page) {
  if (!currentPortfolio) return;

  switch (page) {
    case 'dashboard':
      await _loadDashboard();
      break;

    case 'setup':
      _loadSetupPage();
      break;

    case 'sections':
      // section-builder.js
      await loadSectionsPage();
      break;

    case 'theme':
      // theme-editor.js
      await loadThemePage();
      break;

    case 'profile':
      // profile.js — carrega dados e inicializa formulário
      await loadProfilePage();
      setupProfileForm();
      break;

    case 'media':
      // media-library.js
      await loadMediaPage();
      break;

    case 'radio':
      // radio-manager.js
      await loadRadioPage();
      break;

    case 'gallery':
      // gallery-manager.js
      await loadGalleryPage();
      break;

    case 'events':
      // events-manager.js
      await loadEventsPage();
      break;

    case 'publications':
      // publications-manager.js
      await loadPublicationsPage();
      break;

    case 'services':
      // services-manager.js
      await loadServicesPage();
      break;

    case 'splash':
      await loadSplashPage();
      break;

    case 'settings':
      _loadSettingsPage();
      break;
  }
}

// ============================================================
// DASHBOARD
// ============================================================

/**
 * Busca contagens reais do banco e popula os cards de estatística.
 * Também popula as informações de template, slug e status de publicação.
 */
async function _loadDashboard() {
  if (!currentPortfolio) return;

  // Busca três contagens em paralelo para melhor performance
  const [mediaRes, sectionsRes, galleriesRes] = await Promise.all([
    supabase.from('media_files').select('id', { count: 'exact', head: true }).eq('portfolio_id', currentPortfolio.id),
    supabase.from('sections').select('id', { count: 'exact', head: true }).eq('portfolio_id', currentPortfolio.id).eq('is_visible', true),
    supabase.from('galleries').select('id', { count: 'exact', head: true }).eq('portfolio_id', currentPortfolio.id),
  ]);

  // Popula cards de estatística
  const el = (id) => document.getElementById(id);
  if (el('statMedia'))     el('statMedia').textContent     = mediaRes.count     ?? 0;
  if (el('statSections'))  el('statSections').textContent  = sectionsRes.count  ?? 0;
  if (el('statGalleries')) el('statGalleries').textContent = galleriesRes.count ?? 0;

  // Label do template ativo
  const templateLabels = {
    musician: '🎵 Músico', band: '🎸 Banda', academic: '🎓 Acadêmico',
    business: '💼 Negócios', logistics: '📦 Logística',
    creative: '🎨 Criativo', custom: '⚡ Custom',
  };
  if (el('dashTemplateLabel')) {
    el('dashTemplateLabel').textContent = templateLabels[currentPortfolio.template_type] || currentPortfolio.template_type;
  }

  // Status publicado/rascunho
  if (el('dashPublishStatus')) {
    el('dashPublishStatus').textContent = currentPortfolio.is_published ? 'Publicado' : 'Rascunho';
    el('dashPublishStatus').className   = `badge ${currentPortfolio.is_published ? 'badge-green' : 'badge-gray'}`;
  }

  // URL pública
  if (el('dashPublicUrl')) {
    if (currentPortfolio.slug) {
      const url = `${window.location.origin}/?slug=${currentPortfolio.slug}`;
      el('dashPublicUrl').href        = url;
      el('dashPublicUrl').textContent = url;
    } else {
      el('dashPublicUrl').textContent = 'Configure um slug em Configurações para obter a URL pública';
      el('dashPublicUrl').href        = '#settings';
      el('dashPublicUrl').onclick     = (e) => { e.preventDefault(); window.location.hash = 'settings'; };
    }
  }
}

// ============================================================
// SETUP / SELEÇÃO DE TEMPLATE
// ============================================================

/**
 * Renderiza os cards de template disponíveis.
 * TEMPLATE_PRESETS é definido em theme-editor.js.
 */
function _loadSetupPage() {
  const container = document.getElementById('templateCardsContainer');
  if (!container) return;

  if (typeof TEMPLATE_PRESETS === 'undefined') {
    container.innerHTML = '<p style="color:var(--admin-text-2)">Carregando templates...</p>';
    return;
  }

  container.innerHTML = `
    <p style="color:var(--admin-text-2);margin-bottom:1.5rem;font-size:.875rem">
      Template atual: <strong style="color:var(--admin-text)">${templateLabels()[currentPortfolio?.template_type] || currentPortfolio?.template_type}</strong>.
      Selecionar um novo template atualiza o tema e as funcionalidades ativas.
    </p>
    <div class="template-cards-grid">
      ${Object.entries(TEMPLATE_PRESETS).map(([key, t]) => `
        <div class="template-card ${currentPortfolio?.template_type === key ? 'selected' : ''}" data-template="${escapeAttr(key)}">
          <div class="template-card-emoji">${t.emoji}</div>
          <div class="template-card-name">${escapeHtml(t.name)}</div>
          <div class="template-card-desc">${escapeHtml(t.desc)}</div>
          ${currentPortfolio?.template_type === key ? '<div class="template-card-active">✓ Ativo</div>' : ''}
        </div>`).join('')}
    </div>`;

  container.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      if (typeof _selectTemplate === 'function') _selectTemplate(card.dataset.template);
    });
  });
}

/** Labels dos templates para exibição */
function templateLabels() {
  return {
    musician: '🎵 Músico', band: '🎸 Banda', academic: '🎓 Acadêmico',
    business: '💼 Negócios', logistics: '📦 Logística',
    creative: '🎨 Criativo', custom: '⚡ Custom',
  };
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================

/**
 * Popula e inicializa o formulário de configurações do portfolio.
 * Usa cloneNode para evitar duplicar event listeners ao navegar várias vezes.
 */
function _loadSettingsPage() {
  if (!currentPortfolio) return;

  // Preenche campos
  const nameEl    = document.getElementById('settingsName');
  const slugEl    = document.getElementById('settingsSlug');
  const publishEl = document.getElementById('settingsPublish');
  const previewEl = document.getElementById('slugPreview');

  if (nameEl)    nameEl.value       = currentPortfolio.name    || '';
  if (slugEl)    slugEl.value       = currentPortfolio.slug    || '';
  if (publishEl) publishEl.checked  = !!currentPortfolio.is_published;
  if (previewEl) previewEl.textContent = currentPortfolio.slug || '...';

  // Preview ao digitar slug
  slugEl?.addEventListener('input', () => {
    // Normaliza: só letras minúsculas, números e hífens
    slugEl.value = slugEl.value.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (previewEl) previewEl.textContent = slugEl.value || '...';
  });

  // Gerar slug automaticamente a partir do nome
  document.getElementById('generateSlugBtn')?.addEventListener('click', () => {
    const name = nameEl?.value.trim() || 'meu-portfolio';
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (slugEl)    slugEl.value          = slug;
    if (previewEl) previewEl.textContent = slug;
  });

  // Submit
  const form = document.getElementById('settingsForm');
  if (!form) return;

  // Clona o form para remover listeners antigos (evita duplicação ao navegar)
  const freshForm = form.cloneNode(true);
  form.parentNode.replaceChild(freshForm, form);

  // Rebind dos campos após clonagem
  const newSlugEl    = freshForm.querySelector('#settingsSlug');
  const newNameEl    = freshForm.querySelector('#settingsName');
  const newPreviewEl = document.getElementById('slugPreview');

  newSlugEl?.addEventListener('input', () => {
    newSlugEl.value = newSlugEl.value.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (newPreviewEl) newPreviewEl.textContent = newSlugEl.value || '...';
  });

  freshForm.querySelector('#generateSlugBtn')?.addEventListener('click', () => {
    const name = newNameEl?.value.trim() || 'meu-portfolio';
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (newSlugEl)    newSlugEl.value          = slug;
    if (newPreviewEl) newPreviewEl.textContent = slug;
  });

  freshForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = freshForm.querySelector('#settingsName')?.value.trim()  || 'Meu Portfólio';
    const slug  = freshForm.querySelector('#settingsSlug')?.value.trim()  || null;
    const pub   = freshForm.querySelector('#settingsPublish')?.checked     ?? false;

    showLoading('Salvando...');
    try {
      const { error } = await supabase.from('portfolios')
        .update({ name, slug, is_published: pub })
        .eq('id', currentPortfolio.id);

      if (error) throw error;

      Object.assign(currentPortfolio, { name, slug, is_published: pub });
      _updateViewSiteLink();
      showToast('Configurações salvas!', 'success');
    } catch (err) {
      console.error(err);
      const msg = err.message?.includes('unique') || err.message?.includes('duplicate')
        ? 'Esse slug já está em uso. Escolha outro.'
        : 'Erro ao salvar configurações.';
      showToast(msg, 'error');
    } finally {
      hideLoading();
    }
  });
}

// ============================================================
// BOTÕES GLOBAIS DO HEADER
// ============================================================

function _setupHeaderButtons() {
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/admin/login.html';
  });

  // Toggle sidebar mobile
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('adminSidebar')?.classList.toggle('open');
    document.getElementById('sidebarOverlay')?.classList.toggle('active');
  });

  // Clicar no overlay fecha a sidebar
  document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
    document.getElementById('adminSidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
  });

  // Botão "Nova playlist" (página radio)
  document.getElementById('newPlaylistBtn')?.addEventListener('click', () => {
    if (typeof _openPlaylistModal === 'function') _openPlaylistModal();
  });

  // Botão "Nova galeria"
  document.getElementById('newGalleryBtn')?.addEventListener('click', () => {
    if (typeof _openGalleryModal === 'function') _openGalleryModal();
  });

  // Botão "Novo evento"
  document.getElementById('newEventBtn')?.addEventListener('click', () => {
    if (typeof _openEventModal === 'function') _openEventModal();
  });

  // Botão "Nova publicação"
  document.getElementById('newPubBtn')?.addEventListener('click', () => {
    if (typeof _openPubModal === 'function') _openPubModal();
  });

  // Botão "Novo serviço"
  document.getElementById('newServiceBtn')?.addEventListener('click', () => {
    if (typeof _openServiceModal === 'function') _openServiceModal();
  });

  // Botão "Salvar tema" no theme editor
  document.getElementById('saveThemeBtn')?.addEventListener('click', () => {
    if (typeof saveTheme === 'function') saveTheme();
  });

  // Atualiza link "Ver site" com a URL real
  _updateViewSiteLink();
}

/**
 * Atualiza o link "Ver site" no header com a URL pública do portfolio.
 * Chamado após salvar configurações ou ao inicializar.
 */
function _updateViewSiteLink() {
  const link = document.querySelector('.admin-header-actions a[target="_blank"]');
  if (!link) return;
  if (currentPortfolio?.slug) {
    link.href = `${window.location.origin}/?slug=${currentPortfolio.slug}`;
  } else {
    link.href = window.location.origin;
  }
}
