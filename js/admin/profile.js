/* === ADMIN/PROFILE.JS — Gerenciador de Perfil === */

let currentProfile    = null;
let socialLinksEditor = [];

async function loadProfilePage() {
  if (!currentPortfolio) return;
  await _fetchProfile();
  _renderProfileForm();
  _renderSocialForm();
}

async function _fetchProfile() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('portfolio_id', currentPortfolio.id)
    .maybeSingle();

  currentProfile = data;
  socialLinksEditor = data?.social_links ? JSON.parse(JSON.stringify(data.social_links)) : [];
}

function _renderProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form || !currentProfile) return;

  form.querySelector('#profileName').value      = currentProfile.full_name    || '';
  form.querySelector('#profileTagline').value   = currentProfile.tagline      || '';
  form.querySelector('#profileBio').value       = currentProfile.bio          || '';
  form.querySelector('#profileEmail').value     = currentProfile.email        || '';
  form.querySelector('#profilePhone').value     = currentProfile.phone        || '';
  form.querySelector('#profileLocation').value  = currentProfile.location     || '';
  form.querySelector('#profileWebsite').value   = currentProfile.website      || '';

  // Avatar preview
  if (currentProfile.avatar_url) {
    const preview = document.getElementById('avatarPreview');
    if (preview) preview.src = currentProfile.avatar_url;
  }
}

async function setupProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form || form.dataset.initialized) return;
  form.dataset.initialized = 'true';

  const avatarInput = document.getElementById('avatarInput');
  const changeBtn   = document.getElementById('changeAvatarBtn');

  if (changeBtn && avatarInput) {
    changeBtn.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files[0];
      if (!file) return;

      showLoading('Enviando avatar...');
      try {
        const ext  = file.name.split('.').pop().toLowerCase();
        const path = `${currentPortfolio.id}/avatar-${Date.now()}.${ext}`;
        const url  = await uploadFile(file, 'avatars', path);
        document.getElementById('avatarPreview').src = url;

        // Upsert: atualiza se existe, insere se não existe
        const { error } = await supabase.from('profiles').upsert({
          portfolio_id: currentPortfolio.id,
          avatar_url:   url,
        }, { onConflict: 'portfolio_id' });

        if (error) throw error;
        if (currentProfile) currentProfile.avatar_url = url;
        showToast('Avatar atualizado', 'success');
      } catch (err) {
        console.error(err);
        showToast('Erro ao enviar avatar', 'error');
      } finally {
        hideLoading();
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      full_name : form.querySelector('#profileName').value.trim(),
      tagline   : form.querySelector('#profileTagline').value.trim(),
      bio       : form.querySelector('#profileBio').value.trim(),
      email     : form.querySelector('#profileEmail').value.trim(),
      phone     : form.querySelector('#profilePhone').value.trim(),
      location  : form.querySelector('#profileLocation').value.trim(),
      website   : form.querySelector('#profileWebsite').value.trim(),
      social_links: socialLinksEditor,
    };

    showLoading('Salvando...');
    try {
      if (currentProfile) {
        const { error } = await supabase.from('profiles').update(payload).eq('portfolio_id', currentPortfolio.id);
        if (error) throw error;
        Object.assign(currentProfile, payload);
      } else {
        const { data, error } = await supabase.from('profiles').insert({
          portfolio_id: currentPortfolio.id, ...payload
        }).select().single();
        if (error) throw error;
        currentProfile = data;
      }
      showToast('Perfil salvo!', 'success');
    } catch (err) {
      showToast('Erro ao salvar perfil', 'error');
      console.error(err);
    } finally {
      hideLoading();
    }
  });
}

function _renderSocialForm() {
  const container = document.getElementById('socialLinksContainer');
  if (!container) return;

  const render = () => {
    container.innerHTML = socialLinksEditor.map((link, i) => `
      <div class="social-link-row" data-idx="${i}">
        <select class="form-input form-select social-platform">
          ${['github','linkedin','instagram','twitter','youtube','tiktok','facebook','spotify','soundcloud','behance','dribbble','website','other']
            .map(p => `<option value="${p}" ${link.platform === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`)
            .join('')}
        </select>
        <input type="url" class="form-input social-url" placeholder="https://..." value="${escapeAttr(link.url || '')}">
        <button type="button" class="btn btn-ghost btn-sm text-danger remove-social" data-idx="${i}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>`).join('');

    container.querySelectorAll('.social-platform').forEach((sel, i) => {
      sel.addEventListener('change', () => { socialLinksEditor[i].platform = sel.value; });
    });
    container.querySelectorAll('.social-url').forEach((input, i) => {
      input.addEventListener('input', () => { socialLinksEditor[i].url = input.value; });
    });
    container.querySelectorAll('.remove-social').forEach(btn => {
      btn.addEventListener('click', () => {
        socialLinksEditor.splice(parseInt(btn.dataset.idx), 1);
        render();
      });
    });
  };

  const addSocialBtn = document.getElementById('addSocialBtn');
  if (addSocialBtn) {
    addSocialBtn.onclick = () => {
      socialLinksEditor.push({ platform: 'github', url: '' });
      render();
    };
  }

  render();
}
