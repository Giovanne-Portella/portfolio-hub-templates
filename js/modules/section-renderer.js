/* === SECTION-RENDERER.JS — Renderiza seções dinamicamente === */

const SECTION_RENDERERS = {
  hero:        renderHeroSection,
  bio:         renderBioSection,
  about:       renderBioSection,
  gallery:     renderGallerySection,
  music:       renderMusicSection,       // lista faixas da playlist ativa
  discography: renderDiscographySection, // mostra faixas da playlist como álbuns/releases
  events:      renderEventsSection,
  publications:renderPublicationsSection,
  services:    renderServicesSection,
  contact:     renderContactSection,
  custom:      renderCustomSection,
};

async function renderSections(sections, portfolioData) {
  const container = document.getElementById('sections-root');
  if (!container) return;
  container.innerHTML = '';

  for (const section of sections) {
    if (!section.is_visible) continue;
    const renderer = SECTION_RENDERERS[section.section_type];
    if (!renderer) continue;

    const el = document.createElement('div');
    el.id = `section-${section.id}`;
    el.className = `pt-section pt-section--${section.section_type}`;
    try {
      await renderer(el, section, portfolioData);
    } catch (e) {
      console.error(`Error rendering section ${section.section_type}:`, e);
    }
    container.appendChild(el);
  }

  // Setup intersection observer for reveal animations
  _setupReveal();
  _setupScrollTop();
}

function _setupReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

function _setupScrollTop() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ============================================================
 * HERO
 * ============================================================ */
async function renderHeroSection(el, section, data) {
  const profile = data.profile || {};
  const config  = section.config || {};
  const social  = profile.social_links || [];

  const socialHtml = social.map(s =>
    `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener" aria-label="${escapeAttr(s.platform)}">
       <i class="${escapeAttr(s.icon || 'fa-brands fa-link')}"></i>
     </a>`
  ).join('');

  el.innerHTML = `
    <section class="hero">
      <div class="hero-blob"></div>
      <div class="hero-content">
        ${profile.avatar_url ? `<img src="${escapeAttr(profile.avatar_url)}" alt="${escapeAttr(profile.full_name)}" class="hero-avatar">` : ''}
        <span class="hero-tag">${escapeHtml(config.tag || data.portfolio?.template_type || 'Portfolio')}</span>
        <h1 class="hero-title text-gradient" id="heroTitle">${escapeHtml(profile.full_name || 'Seu Nome')}</h1>
        <p class="hero-subtitle">${escapeHtml(profile.tagline || profile.bio || '')}</p>
        <div class="hero-actions">
          ${config.cta_label ? `<a href="${escapeAttr(config.cta_url || '#contact')}" class="btn btn-primary">${escapeHtml(config.cta_label)}</a>` : ''}
          ${profile.email ? `<a href="mailto:${escapeAttr(profile.email)}" class="btn btn-secondary"><i class="fa-regular fa-envelope"></i> Contato</a>` : ''}
        </div>
        ${socialHtml ? `<div class="hero-social">${socialHtml}</div>` : ''}
      </div>
      <div class="hero-scroll-hint"><i class="fa-solid fa-chevron-down"></i></div>
    </section>`;

  if (config.typing_effect !== false && profile.tagline) {
    _setupTyping('heroTitle', profile.full_name || 'Seu Nome');
  }
}

/* ============================================================
 * BIO / ABOUT
 * ============================================================ */
async function renderBioSection(el, section, data) {
  const profile = data.profile || {};
  const config  = section.config || {};
  const isAlt   = section.display_order % 2 !== 0;

  const metaItems = [
    profile.location && { icon: 'fa-solid fa-location-dot', text: profile.location },
    profile.email    && { icon: 'fa-solid fa-envelope',     text: profile.email,    href: `mailto:${profile.email}` },
    profile.phone    && { icon: 'fa-solid fa-phone',        text: profile.phone,    href: `tel:${profile.phone}` },
    profile.website  && { icon: 'fa-solid fa-globe',        text: profile.website,  href: profile.website },
  ].filter(Boolean);

  el.innerHTML = `
    <section class="section ${isAlt ? 'section-alt' : ''}">
      <div class="container">
        <div class="about-grid">
          ${profile.avatar_url ? `
          <div class="about-avatar-wrap reveal">
            <div class="about-avatar-glow"></div>
            <img src="${escapeAttr(profile.avatar_url)}" alt="${escapeAttr(profile.full_name)}" class="about-avatar">
          </div>` : '<div></div>'}
          <div class="reveal">
            <p class="section-tag">${escapeHtml(section.title || 'Sobre Mim')}</p>
            <h2 class="section-title">${escapeHtml(config.heading || 'Quem sou eu')}</h2>
            <p class="about-text">${escapeHtml(profile.bio || '')}</p>
            ${metaItems.length ? `
            <div class="about-meta">
              ${metaItems.map(m => `
              <div class="about-meta-item">
                <i class="${escapeAttr(m.icon)}"></i>
                ${m.href ? `<a href="${escapeAttr(m.href)}">${escapeHtml(m.text)}</a>` : `<span>${escapeHtml(m.text)}</span>`}
              </div>`).join('')}
            </div>` : ''}
            ${config.cta_label ? `<a href="${escapeAttr(config.cta_url || '#')}" class="btn btn-primary">${escapeHtml(config.cta_label)}</a>` : ''}
          </div>
        </div>
      </div>
    </section>`;
}

/* ============================================================
 * GALLERY
 * ============================================================ */
async function renderGallerySection(el, section, data) {
  const galleries = data.galleries || [];
  const secGalleries = galleries.filter(g => g.section_id === section.id || !g.section_id);
  const config = section.config || {};

  let itemsHtml = '';
  if (secGalleries.length > 0) {
    const gallery = secGalleries[0];
    const items   = data.galleryItems?.[gallery.id] || [];
    const layout  = gallery.layout || 'grid';

    const itemsMarkup = items.map(item => {
      const media = item.media;
      if (!media) return '';
      if (media.file_type === 'image') {
        return `<div class="gallery-item reveal" data-lightbox data-src="${escapeAttr(media.file_url)}" data-caption="${escapeAttr(item.caption || '')}">
          <img src="${escapeAttr(media.thumbnail_url || media.file_url)}" alt="${escapeAttr(item.caption || media.file_name)}" loading="lazy">
          <div class="gallery-item-overlay"><span class="gallery-item-caption">${escapeHtml(item.caption || '')}</span></div>
        </div>`;
      }
      if (media.file_type === 'video') {
        return `<div class="gallery-item reveal" data-lightbox data-src="${escapeAttr(media.file_url)}" data-type="video" data-caption="${escapeAttr(item.caption || '')}">
          <div class="gallery-item-type"><i class="fa-solid fa-play"></i></div>
          <img src="${escapeAttr(media.thumbnail_url || '')}" alt="${escapeAttr(item.caption || media.file_name)}" loading="lazy">
          <div class="gallery-item-overlay"><span class="gallery-item-caption">${escapeHtml(item.caption || '')}</span></div>
        </div>`;
      }
      if (media.file_type === 'audio') {
        return `<div class="gallery-item gallery-item-audio reveal">
          <i class="fa-solid fa-music audio-icon"></i>
          <span class="audio-title">${escapeHtml(item.caption || media.file_name)}</span>
        </div>`;
      }
      return '';
    }).join('');

    itemsHtml = `<div class="gallery-${layout}">${itemsMarkup}</div>`;
  }

  el.innerHTML = `
    <section class="section section-alt">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">${escapeHtml(section.title || 'Galeria')}</span>
          <h2 class="section-title reveal">${escapeHtml(config.heading || 'Meu Trabalho')}</h2>
        </div>
        ${itemsHtml || '<div class="empty-state"><i class="fa-regular fa-images"></i><p>Nenhuma mídia adicionada ainda.</p></div>'}
      </div>
    </section>`;

  _setupLightbox(el);
}

/* ============================================================
 * MUSIC — lista de faixas da playlist (rádio)
 * ============================================================ */
async function renderMusicSection(el, section, data) {
  const tracks = data.playlistTracks || [];
  const config = section.config || {};

  const tracksHtml = tracks.map((t, i) => `
    <div class="music-track-item reveal" data-track-idx="${i}" role="button" tabindex="0"
         title="Tocar: ${escapeAttr(t.title || '')}">
      <div class="music-track-num">${i + 1}</div>
      <div class="music-track-icon">
        ${t.track_type === 'youtube'
          ? `<i class="fa-brands fa-youtube" style="color:#ff0000"></i>`
          : `<i class="fa-solid fa-music"></i>`}
      </div>
      <div class="music-track-info">
        <div class="music-track-title">${escapeHtml(t.title || 'Faixa sem nome')}</div>
        ${t.artist ? `<div class="music-track-artist">${escapeHtml(t.artist)}</div>` : ''}
      </div>
      ${t.duration ? `<span class="music-track-dur">${formatDuration(t.duration)}</span>` : ''}
      <button class="music-track-play" aria-label="Tocar">
        <i class="fa-solid fa-play"></i>
      </button>
    </div>`).join('');

  el.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">${escapeHtml(section.title || 'Música')}</span>
          <h2 class="section-title reveal">${escapeHtml(config.heading || 'Playlist')}</h2>
        </div>
        ${tracksHtml
          ? `<div class="music-tracklist">${tracksHtml}</div>`
          : '<div class="empty-state"><i class="fa-solid fa-music"></i><p>Nenhuma faixa adicionada.</p></div>'}
      </div>
    </section>`;

  // Clique numa faixa aciona o rádio
  el.querySelectorAll('.music-track-item').forEach((item, i) => {
    const play = () => {
      if (typeof Radio !== 'undefined') {
        Radio._loadTrackPublic ? Radio._loadTrackPublic(i) : null;
      }
    };
    item.addEventListener('click', play);
    item.addEventListener('keydown', e => { if (e.key === 'Enter') play(); });
  });
}

/* ============================================================
 * DISCOGRAPHY — álbuns/releases (mesmo fonte: playlist, layout card)
 * ============================================================ */
async function renderDiscographySection(el, section, data) {
  const tracks = data.playlistTracks || [];
  const config = section.config || {};

  const cardsHtml = tracks.map((t, i) => {
    const thumb = t.cover_url || t.media?.thumbnail_url || '';
    return `
    <div class="disc-card reveal" data-track-idx="${i}">
      <div class="disc-card-cover">
        ${thumb
          ? `<img src="${escapeAttr(thumb)}" alt="${escapeAttr(t.title || '')}" loading="lazy">`
          : `<div class="disc-card-cover-placeholder"><i class="fa-solid fa-record-vinyl"></i></div>`}
        <button class="disc-card-play" aria-label="Tocar">
          <i class="fa-solid fa-play"></i>
        </button>
      </div>
      <div class="disc-card-info">
        <div class="disc-card-title">${escapeHtml(t.title || 'Sem título')}</div>
        ${t.artist ? `<div class="disc-card-artist">${escapeHtml(t.artist)}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <section class="section section-alt">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">${escapeHtml(section.title || 'Discografia')}</span>
          <h2 class="section-title reveal">${escapeHtml(config.heading || 'Discografia')}</h2>
        </div>
        ${cardsHtml
          ? `<div class="disc-grid">${cardsHtml}</div>`
          : '<div class="empty-state"><i class="fa-solid fa-record-vinyl"></i><p>Nenhum álbum adicionado.</p></div>'}
      </div>
    </section>`;
}

/* ============================================================
 * EVENTS
 * ============================================================ */
async function renderEventsSection(el, section, data) {
  const events = (data.events || []).filter(e => !e.section_id || e.section_id === section.id);
  const config = section.config || {};

  const eventsHtml = events.map(ev => {
    const d = ev.event_date ? new Date(ev.event_date) : null;
    return `
    <div class="event-card ${ev.is_featured ? 'event-featured' : ''} reveal">
      ${d ? `<div class="event-date-block">
        <div class="event-date-day">${d.getDate()}</div>
        <div class="event-date-month">${d.toLocaleString('pt-BR', {month:'short'}).toUpperCase()}</div>
      </div>` : ''}
      <div class="event-info">
        <div class="event-title">${escapeHtml(ev.title)}</div>
        ${ev.location ? `<div class="event-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(ev.location)}</div>` : ''}
        ${ev.description ? `<p class="card-text" style="font-size:.8rem">${escapeHtml(ev.description)}</p>` : ''}
        ${ev.ticket_url ? `<a href="${escapeAttr(ev.ticket_url)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="margin-top:.5rem">Ingressos</a>` : ''}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <section class="section section-alt">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">${escapeHtml(section.title || 'Eventos')}</span>
          <h2 class="section-title reveal">${escapeHtml(config.heading || 'Próximos Eventos')}</h2>
        </div>
        ${eventsHtml ? `<div class="events-list">${eventsHtml}</div>` : '<div class="empty-state"><i class="fa-regular fa-calendar"></i><p>Nenhum evento cadastrado.</p></div>'}
      </div>
    </section>`;
}

/* ============================================================
 * PUBLICATIONS
 * ============================================================ */
async function renderPublicationsSection(el, section, data) {
  const pubs   = (data.publications || []).filter(p => !p.section_id || p.section_id === section.id);
  const config = section.config || {};

  const pubTypes = { article: 'Artigo', book: 'Livro', thesis: 'Tese', conference: 'Congresso', other: 'Outro' };

  const pubsHtml = pubs.map(p => `
    <div class="pub-card reveal">
      <span class="pub-type-badge">${escapeHtml(pubTypes[p.pub_type] || p.pub_type)}</span>
      <div class="pub-title">${escapeHtml(p.title)}</div>
      ${p.authors ? `<div class="pub-authors">${escapeHtml(p.authors)}</div>` : ''}
      ${p.abstract ? `<p class="pub-abstract">${escapeHtml(p.abstract)}</p>` : ''}
      <div class="pub-meta">
        ${p.journal ? `<span><i class="fa-regular fa-newspaper"></i> ${escapeHtml(p.journal)}</span>` : ''}
        ${p.published_at ? `<span><i class="fa-regular fa-calendar"></i> ${new Date(p.published_at).getFullYear()}</span>` : ''}
        ${p.doi ? `<a href="https://doi.org/${escapeAttr(p.doi)}" target="_blank" rel="noopener">DOI</a>` : ''}
        ${p.url ? `<a href="${escapeAttr(p.url)}" target="_blank" rel="noopener">Acessar</a>` : ''}
        ${p.pdf_url ? `<a href="${escapeAttr(p.pdf_url)}" target="_blank" rel="noopener"><i class="fa-regular fa-file-pdf"></i> PDF</a>` : ''}
      </div>
    </div>`).join('');

  el.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">${escapeHtml(section.title || 'Publicações')}</span>
          <h2 class="section-title reveal">${escapeHtml(config.heading || 'Pesquisa & Publicações')}</h2>
        </div>
        ${pubsHtml ? `<div class="publications-list">${pubsHtml}</div>` : '<div class="empty-state"><i class="fa-regular fa-file-lines"></i><p>Nenhuma publicação cadastrada.</p></div>'}
      </div>
    </section>`;
}

/* ============================================================
 * SERVICES
 * ============================================================ */
async function renderServicesSection(el, section, data) {
  const services = (data.services || []).filter(s => !s.section_id || s.section_id === section.id);
  const config   = section.config || {};

  const svcHtml = services.map(s => {
    const features = Array.isArray(s.features) ? s.features : [];
    return `
    <div class="service-card reveal">
      ${s.icon ? `<div class="service-icon"><i class="${escapeAttr(s.icon)}"></i></div>` : ''}
      <div class="service-title">${escapeHtml(s.title)}</div>
      ${s.description ? `<p class="service-desc">${escapeHtml(s.description)}</p>` : ''}
      ${features.length ? `<ul class="service-features">${features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}
      ${s.price ? `<span class="service-price">${escapeHtml(s.price)}</span>` : ''}
    </div>`;
  }).join('');

  el.innerHTML = `
    <section class="section section-alt">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">${escapeHtml(section.title || 'Serviços')}</span>
          <h2 class="section-title reveal">${escapeHtml(config.heading || 'O que ofereço')}</h2>
        </div>
        ${svcHtml ? `<div class="services-grid">${svcHtml}</div>` : '<div class="empty-state"><i class="fa-solid fa-briefcase"></i><p>Nenhum serviço cadastrado.</p></div>'}
      </div>
    </section>`;
}

/* ============================================================
 * CONTACT
 * ============================================================ */
async function renderContactSection(el, section, data) {
  const profile = data.profile || {};
  const config  = section.config || {};

  const infoItems = [
    profile.email   && { icon: 'fa-solid fa-envelope', label: 'Email',      value: profile.email,    href: `mailto:${profile.email}` },
    profile.phone   && { icon: 'fa-solid fa-phone',    label: 'Telefone',   value: profile.phone,    href: `tel:${profile.phone}` },
    profile.location&& { icon: 'fa-solid fa-map-pin',  label: 'Localização',value: profile.location  },
  ].filter(Boolean);

  el.innerHTML = `
    <section class="section" id="section-contact">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">${escapeHtml(section.title || 'Contato')}</span>
          <h2 class="section-title reveal">${escapeHtml(config.heading || 'Vamos conversar')}</h2>
        </div>
        <div class="contact-grid">
          <div class="reveal">
            <p>${escapeHtml(config.text || 'Fique à vontade para entrar em contato.')}</p>
            <div class="contact-info-list">
              ${infoItems.map(i => `
              <div class="contact-info-item">
                <div class="contact-info-icon"><i class="${escapeAttr(i.icon)}"></i></div>
                <div>
                  <div style="font-size:.7rem;color:var(--text-muted)">${escapeHtml(i.label)}</div>
                  ${i.href ? `<a href="${escapeAttr(i.href)}">${escapeHtml(i.value)}</a>` : `<span>${escapeHtml(i.value)}</span>`}
                </div>
              </div>`).join('')}
            </div>
          </div>
          ${config.show_form !== false ? `
          <form class="contact-form reveal" id="contactForm">
            <div class="form-group">
              <label class="form-label">Nome</label>
              <input type="text" name="name" class="form-input" placeholder="Seu nome" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" name="email" class="form-input" placeholder="seu@email.com" required>
            </div>
            <div class="form-group">
              <label class="form-label">Mensagem</label>
              <textarea name="message" class="form-textarea" placeholder="Sua mensagem..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fa-regular fa-paper-plane"></i> Enviar</button>
          </form>` : ''}
        </div>
      </div>
    </section>`;

  const form = el.querySelector('#contactForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showToast('Obrigado! Mensagem enviada.', 'success');
      form.reset();
    });
  }
}

/* ============================================================
 * CUSTOM
 * ============================================================ */
async function renderCustomSection(el, section, data) {
  const blocks = (data.contentBlocks || []).filter(b => b.section_id === section.id);
  const config = section.config || {};

  const blocksHtml = blocks.map(b => {
    if (b.block_type === 'text') {
      return `<div class="reveal" style="color:var(--text-secondary);line-height:1.8">${escapeHtml(b.content.text || '')}</div>`;
    }
    if (b.block_type === 'image') {
      return `<img src="${escapeAttr(b.content.url || '')}" alt="${escapeAttr(b.content.alt || '')}" class="reveal" style="max-width:100%;border-radius:var(--radius)">`;
    }
    if (b.block_type === 'cta') {
      return `<div class="reveal" style="text-align:center">
        <a href="${escapeAttr(b.content.url || '#')}" class="btn btn-primary btn-lg">${escapeHtml(b.content.label || 'Saiba mais')}</a>
      </div>`;
    }
    return '';
  }).join('');

  el.innerHTML = `
    <section class="section">
      <div class="container">
        ${section.title ? `<div class="section-header"><h2 class="section-title reveal">${escapeHtml(section.title)}</h2></div>` : ''}
        <div style="display:flex;flex-direction:column;gap:1.5rem">${blocksHtml}</div>
      </div>
    </section>`;
}

/* ============================================================
 * LIGHTBOX
 * ============================================================ */
function _setupLightbox(container) {
  const items = container.querySelectorAll('[data-lightbox]');
  if (items.length === 0) return;

  const lb = document.createElement('div');
  lb.className = 'lightbox-overlay';
  lb.innerHTML = `
    <button class="lightbox-close"><i class="fa-solid fa-xmark"></i></button>
    <button class="lightbox-prev"><i class="fa-solid fa-chevron-left"></i></button>
    <button class="lightbox-next"><i class="fa-solid fa-chevron-right"></i></button>
    <div class="lightbox-content" id="lbContent"></div>`;
  document.body.appendChild(lb);

  const lbContent = lb.querySelector('#lbContent');
  let current = 0;
  const srcs = Array.from(items).map(i => ({ src: i.dataset.src, type: i.dataset.type || 'image', caption: i.dataset.caption || '' }));

  function open(idx) {
    current = idx;
    const item = srcs[idx];
    lbContent.innerHTML = item.type === 'video'
      ? `<video src="${escapeAttr(item.src)}" controls autoplay style="max-width:90vw;max-height:75vh;border-radius:var(--radius)"></video>${item.caption ? `<p class="lightbox-caption">${escapeHtml(item.caption)}</p>` : ''}`
      : `<img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.caption)}">${item.caption ? `<p class="lightbox-caption">${escapeHtml(item.caption)}</p>` : ''}`;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    lbContent.innerHTML = '';
  }

  items.forEach((item, i) => item.addEventListener('click', () => open(i)));
  lb.querySelector('.lightbox-close').addEventListener('click', close);
  lb.querySelector('.lightbox-prev').addEventListener('click', () => open((current - 1 + srcs.length) % srcs.length));
  lb.querySelector('.lightbox-next').addEventListener('click', () => open((current + 1) % srcs.length));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  open((current - 1 + srcs.length) % srcs.length);
    if (e.key === 'ArrowRight') open((current + 1) % srcs.length);
  });
}

/* ============================================================
 * TYPING EFFECT
 * ============================================================ */
function _setupTyping(elementId, fullText) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = '';
  let i = 0;
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  el.appendChild(cursor);

  function typeChar() {
    if (i < fullText.length) {
      el.insertBefore(document.createTextNode(fullText[i]), cursor);
      i++;
      setTimeout(typeChar, 60 + Math.random() * 40);
    } else {
      setTimeout(() => cursor.remove(), 1500);
    }
  }
  setTimeout(typeChar, 600);
}
