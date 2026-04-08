/* === PORTFOLIO.JS — Entry Point da Página Pública === */

document.addEventListener('DOMContentLoaded', async () => {
  const slug = _getSlug();
  const portfolio = await _loadPortfolio(slug);

  if (!portfolio) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;
                  font-family:Inter,sans-serif;background:#0d1117;color:#e6edf3;gap:1rem;">
        <h1 style="font-size:3rem;margin:0">404</h1>
        <p style="color:#8b949e">Portfolio não encontrado</p>
      </div>`;
    return;
  }

  ThemeEngine.applyTheme(portfolio.theme_config || {});

  const flags = portfolio.feature_flags || {};

  // Garante que o elemento splash está oculto por padrão
  const splashEl = document.getElementById('splashScreen');
  if (splashEl) splashEl.style.display = 'none';

  // Splash só ativo se explicitamente habilitado via feature_flags.splash = true
  if (flags.splash === true) {
    splashEl.style.display = '';
    setupSplash({ onComplete: () => _afterSplash(portfolio, flags) }, portfolio.splash_config || {});
  } else {
    // Limpa localStorage para não ativar splash de "retorno" quando for habilitado depois
    localStorage.removeItem('pt_visited');
    document.body.classList.remove('site-loading');
    document.body.classList.add('site-loaded');
    _afterSplash(portfolio, flags);
  }
});

async function _loadPortfolio(slug) {
  let query = supabase.from('portfolios').select('*');
  if (slug) {
    query = query.eq('slug', slug);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) query = query.eq('user_id', user.id);
    else return null;
  }
  const { data } = await query.maybeSingle();
  return data;
}

function _getSlug() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('slug')) return params.get('slug');
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts[0] === 'p' && pathParts[1]) return pathParts[1];
  return null;
}

async function _afterSplash(portfolio, flags) {
  // 1. Perfil + seções em paralelo
  const [profileRes, sectionsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('portfolio_id', portfolio.id).maybeSingle(),
    supabase.from('sections').select('*').eq('portfolio_id', portfolio.id).eq('is_visible', true).order('display_order'),
  ]);

  const profile  = profileRes.data;
  const sections = sectionsRes.data || [];

  const sectionTypes = new Set(sections.map(s => s.section_type));

  // 2. Carrega todos os dados em paralelo — incluindo playlist se radio ativo
  const parallelLoads = [
    sectionTypes.has('gallery')
      ? supabase.from('galleries').select('*').eq('portfolio_id', portfolio.id).order('display_order')
      : null,
    sectionTypes.has('events')
      ? supabase.from('events').select('*').eq('portfolio_id', portfolio.id).order('event_date')
      : null,
    sectionTypes.has('publications')
      ? supabase.from('publications').select('*').eq('portfolio_id', portfolio.id).order('published_at', { ascending: false })
      : null,
    // Serviços: carrega se há seção 'services'
    sectionTypes.has('services')
      ? supabase.from('services').select('*').eq('portfolio_id', portfolio.id).order('display_order')
      : null,
    // Radio: carrega playlist sempre que flag radio estiver ativa
    flags.radio
      ? supabase.from('playlists')
          .select('*, playlist_tracks(*, media_files(file_name, file_url, duration))')
          .eq('portfolio_id', portfolio.id)
          .eq('is_active', true)
          .maybeSingle()
      : null,
  ];

  const results = await Promise.all(parallelLoads.filter(Boolean));
  let ri = 0;

  let galleries    = [];
  let galleryItems = {};
  let events       = [];
  let publications = [];
  let services     = [];
  let playlistTracks = [];

  if (sectionTypes.has('gallery')) {
    galleries = results[ri++]?.data || [];
    if (galleries.length) {
      const ids = galleries.map(g => g.id);
      const { data: items } = await supabase
        .from('gallery_items')
        .select('*, media:media_files(id, file_url, thumbnail_url, file_name, file_type)')
        .in('gallery_id', ids)
        .order('display_order');
      (items || []).forEach(item => {
        if (!galleryItems[item.gallery_id]) galleryItems[item.gallery_id] = [];
        galleryItems[item.gallery_id].push(item);
      });
    }
  }
  if (sectionTypes.has('events'))       events       = results[ri++]?.data || [];
  if (sectionTypes.has('publications')) publications = results[ri++]?.data || [];
  if (sectionTypes.has('services'))     services     = results[ri++]?.data || [];

  // Radio — inicializa ANTES de renderSections para que playlistTracks esteja pronto
  if (flags.radio) {
    const playlistData = results[ri++]?.data;
    playlistTracks = _buildTracks(playlistData);
    if (playlistTracks.length) {
      Radio.init(playlistTracks, { shuffle: playlistData?.shuffle });
    }
  }

  // Título da página
  if (profile?.full_name) {
    document.title = `${profile.full_name} — Portfolio`;
  }

  // Navbar
  setupNavbar(portfolio, profile, sections);

  // 3. Renderiza seções com todos os dados já disponíveis
  renderSections(sections, {
    portfolio, profile, flags,
    galleries, galleryItems,
    events, publications, services,
    playlistTracks,
  });

  // Animações de scroll
  setupAnimations();

  // MusicReactor — inicializa se radio ativo e tema configurado
  if (flags.radio && portfolio.theme_config?.musicReactor !== false) {
    const theme = portfolio.theme_config || {};
    MusicReactor.init({
      colors   : theme.colors || ['#7c3aed', '#db2777'],
      intensity: theme.reactorIntensity || 'medium',
    });
  }
}

function _buildTracks(playlist) {
  if (!playlist || !playlist.playlist_tracks?.length) return [];
  return playlist.playlist_tracks
    .sort((a, b) => a.track_order - b.track_order)
    .map(t => ({
      id        : t.id,
      track_type: t.track_type || 'file',
      title     : t.title || t.media_files?.file_name || 'Faixa',
      artist    : t.artist || '',
      url       : t.media_files?.file_url || '',
      youtube_id: t.youtube_id || '',
      cover_url : t.cover_url || null,
      duration  : t.media_files?.duration || 0,
      media     : t.media_files || null,
    }));
}
