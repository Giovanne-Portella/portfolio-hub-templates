/* === NAVBAR.JS === */

function setupNavbar(portfolio, profile, sections) {
  const navbar   = document.getElementById('navbar');
  const toggle   = document.getElementById('navToggle');
  const mobileNav = document.getElementById('navMobile');
  const linksContainer = document.getElementById('navLinks');
  const mobileContainer = document.getElementById('navMobileLinks');

  // Atualiza brand com nome do portfolio/perfil
  const brand = document.getElementById('navBrand');
  if (brand) {
    brand.textContent = profile?.full_name || portfolio?.name || 'Portfolio';
  }

  // Footer
  const footerName = document.getElementById('footerName');
  if (footerName) {
    footerName.textContent = profile?.full_name || portfolio?.name || 'Portfolio';
  }

  // Footer social
  const footerSocial = document.getElementById('footerSocial');
  if (footerSocial && profile?.social_links?.length) {
    footerSocial.innerHTML = profile.social_links.map(s =>
      `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener" aria-label="${escapeAttr(s.platform)}">
         <i class="${escapeAttr(s.icon || _socialIcon(s.platform))}"></i>
       </a>`
    ).join('');
  }

  if (!navbar) return;

  // Scroll → adiciona classe .scrolled
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    _updateActiveLink();
  }, { passive: true });

  // Toggle mobile
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('open');
      mobileNav.classList.toggle('open', open);
    });

    // Fecha ao clicar fora (considera navbar + drawer mobile)
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target) && !mobileNav.contains(e.target)) {
        toggle.classList.remove('open');
        mobileNav.classList.remove('open');
      }
    });
  }

  // Render links dinamicamente
  if (sections && sections.length > 0) {
    const html = sections
      .filter(s => s.is_visible)
      .map(s => `<a href="#section-${escapeAttr(s.id)}" data-section="${escapeAttr(s.id)}">${escapeHtml(s.title || _sectionLabel(s.section_type))}</a>`)
      .join('');

    if (linksContainer)  linksContainer.innerHTML  = html;
    if (mobileContainer) mobileContainer.innerHTML = html;

    // Fecha mobile ao clicar em link
    [linksContainer, mobileContainer].forEach(c => {
      if (!c) return;
      c.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          if (toggle) toggle.classList.remove('open');
          if (mobileNav) mobileNav.classList.remove('open');
        });
      });
    });
  }

  function _updateActiveLink() {
    const scrollY = window.scrollY + 100;
    const all = document.querySelectorAll('[id^="section-"]');
    let active = null;
    all.forEach(el => {
      if (el.offsetTop <= scrollY) active = el.id.replace('section-', '');
    });

    document.querySelectorAll('[data-section]').forEach(a => {
      a.classList.toggle('active', a.dataset.section === active);
    });
  }
}

function _socialIcon(platform) {
  const map = {
    github: 'fa-brands fa-github', linkedin: 'fa-brands fa-linkedin',
    instagram: 'fa-brands fa-instagram', twitter: 'fa-brands fa-x-twitter',
    youtube: 'fa-brands fa-youtube', tiktok: 'fa-brands fa-tiktok',
    facebook: 'fa-brands fa-facebook', spotify: 'fa-brands fa-spotify',
    soundcloud: 'fa-brands fa-soundcloud', behance: 'fa-brands fa-behance',
    dribbble: 'fa-brands fa-dribbble', website: 'fa-solid fa-globe',
  };
  return map[platform] || 'fa-solid fa-link';
}

function _sectionLabel(type) {
  const map = {
    hero: 'Início', bio: 'Sobre', about: 'Sobre',
    gallery: 'Galeria', music: 'Música', discography: 'Discografia',
    events: 'Eventos', publications: 'Publicações', courses: 'Cursos',
    services: 'Serviços', team: 'Equipe', contact: 'Contato',
    projects: 'Projetos', custom: 'Seção',
  };
  return map[type] || type;
}
