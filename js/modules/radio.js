/* === RADIO.JS — Player híbrido: MP3 local + YouTube ===
 *
 * track_type = 'file'    → <audio> HTML5 + Web Audio API
 * track_type = 'youtube' → YouTube IFrame API (iframe oculto)
 *
 * API pública:
 *   Radio.init(tracks, opts)
 *   Radio.togglePlay()
 *   Radio.prev() / Radio.next()
 *   Radio.isPlaying()
 */

const Radio = (() => {
  // === Estado ===
  let tracks     = [];
  let currentIdx = 0;
  let shuffle    = false;

  // === MP3 ===
  let audioCtx  = null;
  let analyser  = null;
  let audioSrc  = null;
  let audioEl   = null;

  // === YouTube ===
  let ytPlayer    = null;
  let ytReady     = false;
  let ytApiLoaded = false;
  let ytLoadedId  = null;   // ID do vídeo atualmente carregado no player YT

  // === DOM ===
  const el = {};

  // ============================================================
  // INIT
  // ============================================================
  function init(tracklist, opts = {}) {
    tracks  = tracklist || [];
    shuffle = opts.shuffle || false;

    if (!tracks.length) return;

    _bindElements();
    _createAudioEl();
    _bindEvents();
    _loadTrack(0, false);   // carrega primeira faixa sem autotocar

    if (tracks.some(t => t.track_type === 'youtube')) {
      _loadYouTubeAPI();
    }
  }

  // ============================================================
  // ELEMENTOS
  // ============================================================
  function _bindElements() {
    el.player     = document.getElementById('radioPlayer');
    el.panel      = document.getElementById('radioPanel');
    el.toggle     = document.getElementById('radioToggle');
    el.closePanel = document.getElementById('radioClosePanel');
    el.title      = document.getElementById('radioTitle');
    el.artist     = document.getElementById('radioArtist');
    el.progress   = document.getElementById('radioProgress');
    el.timeCur    = document.getElementById('radioTimeCur');
    el.timeTot    = document.getElementById('radioTimeTot');
    el.playBtn    = document.getElementById('radioPlay');
    el.prevBtn    = document.getElementById('radioPrev');
    el.nextBtn    = document.getElementById('radioNext');
    el.shuffleBtn = document.getElementById('radioShuffle');
    el.volume     = document.getElementById('radioVolume');

    // Exibe o player e começa com panel fechado
    if (el.player) el.player.style.display = '';
    if (el.panel)  el.panel.classList.add('collapsed');
  }

  function _createAudioEl() {
    audioEl = new Audio();
    audioEl.crossOrigin = 'anonymous';
    audioEl.volume      = 0.75;
    audioEl.preload     = 'metadata';

    audioEl.addEventListener('timeupdate', _updateMp3Progress);
    audioEl.addEventListener('ended',      () => next());
    audioEl.addEventListener('loadedmetadata', () => {
      if (el.timeTot) el.timeTot.textContent = formatDuration(audioEl.duration);
    });
  }

  function _bindEvents() {
    // Toggle abre/fecha panel
    if (el.toggle) {
      el.toggle.addEventListener('click', () => {
        el.panel && el.panel.classList.toggle('collapsed');
      });
    }
    if (el.closePanel) {
      el.closePanel.addEventListener('click', () => {
        el.panel && el.panel.classList.add('collapsed');
      });
    }

    if (el.playBtn)    el.playBtn.addEventListener('click',    togglePlay);
    if (el.prevBtn)    el.prevBtn.addEventListener('click',    prev);
    if (el.nextBtn)    el.nextBtn.addEventListener('click',    next);
    if (el.shuffleBtn) el.shuffleBtn.addEventListener('click', _toggleShuffle);

    if (el.volume) {
      el.volume.addEventListener('input', () => {
        const v = parseFloat(el.volume.value);
        if (audioEl) audioEl.volume = v;
        if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
          ytPlayer.setVolume(v * 100);
        }
      });
    }

    if (el.progress) {
      el.progress.addEventListener('input', () => {
        const t = _cur();
        if (!t) return;
        if (t.track_type === 'youtube') {
          const dur = ytPlayer?.getDuration?.() || 0;
          if (dur) ytPlayer.seekTo(parseFloat(el.progress.value) * dur, true);
        } else {
          if (audioEl.duration) {
            audioEl.currentTime = parseFloat(el.progress.value) * audioEl.duration;
          }
        }
      });
    }
  }

  // ============================================================
  // CARREGAR FAIXA
  // ============================================================
  function _loadTrack(idx, autoplay) {
    const t = tracks[idx];
    if (!t) return;
    currentIdx = idx;

    _stopAll();

    // Atualiza UI
    if (el.title)   el.title.textContent   = t.title  || 'Faixa';
    if (el.artist)  el.artist.textContent  = t.artist || '';
    if (el.timeCur) el.timeCur.textContent = '0:00';
    if (el.timeTot) el.timeTot.textContent = '—';
    if (el.progress) {
      el.progress.value = 0;
      el.progress.style.background = 'var(--border)';
    }

    if (t.track_type === 'youtube') {
      _handleYouTubeTrack(t, autoplay);
    } else {
      _loadMp3Track(t, autoplay);
    }
  }

  function _cur() { return tracks[currentIdx] || null; }

  function _stopAll() {
    // Para MP3
    if (audioEl && !audioEl.paused) audioEl.pause();
    if (audioEl) audioEl.src = '';
    clearInterval(_ytProgressInterval);

    // Para YouTube
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
      try { ytPlayer.stopVideo(); } catch (_) {}
    }

    _updatePlayBtn(false);
    if (typeof MusicReactor !== 'undefined') MusicReactor.update(0, 0, 0);
  }

  // ============================================================
  // MP3
  // ============================================================
  function _loadMp3Track(t, autoplay) {
    const url = t.url || t.media?.file_url || '';
    if (!url) return;
    audioEl.src = url;
    audioEl.load();
    if (autoplay) {
      _ensureAudioCtx();
      audioEl.play().catch(() => {});
      _updatePlayBtn(true);
    }
  }

  function _ensureAudioCtx() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser  = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioSrc  = audioCtx.createMediaElementSource(audioEl);
      audioSrc.connect(analyser);
      analyser.connect(audioCtx.destination);
      _startVisualizer();
    } catch (_) {}
  }

  function _startVisualizer() {
    const bufLen = analyser.frequencyBinCount;
    const data   = new Uint8Array(bufLen);
    function draw() {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      if (typeof MusicReactor !== 'undefined') {
        MusicReactor.update(
          _avg(data, 0,                     Math.floor(bufLen * 0.1)) / 255,
          _avg(data, Math.floor(bufLen*0.1), Math.floor(bufLen * 0.5)) / 255,
          _avg(data, Math.floor(bufLen*0.5), bufLen) / 255
        );
      }
    }
    draw();
  }

  function _avg(data, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) sum += data[i];
    return (end - start) ? sum / (end - start) : 0;
  }

  function _updateMp3Progress() {
    const t = _cur();
    if (!t || t.track_type === 'youtube') return;
    if (!audioEl.duration) return;
    const pct = audioEl.currentTime / audioEl.duration;
    if (el.progress) {
      el.progress.value = pct;
      el.progress.style.background =
        `linear-gradient(to right, var(--primary) ${pct*100}%, var(--border) ${pct*100}%)`;
    }
    if (el.timeCur) el.timeCur.textContent = formatDuration(audioEl.currentTime);
  }

  // ============================================================
  // YOUTUBE
  // ============================================================
  function _loadYouTubeAPI() {
    if (ytApiLoaded || window.YT?.Player) return;
    ytApiLoaded = true;

    // Container fora da viewport para o iframe (não usar opacity:0 — YT pode bloquear)
    if (!document.getElementById('radioYtContainer')) {
      const div = document.createElement('div');
      div.id = 'radioYtContainer';
      div.style.cssText = 'position:fixed;width:2px;height:2px;pointer-events:none;left:-9999px;top:0;overflow:hidden';
      document.body.appendChild(div);
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      _createYTPlayer();
    };

    const tag = document.createElement('script');
    tag.src   = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  function _createYTPlayer() {
    if (ytPlayer) return;
    ytPlayer = new YT.Player('radioYtContainer', {
      height: '1', width: '1',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0 },
      events: {
        onReady: () => {
          ytReady = true;
          // Se havia uma faixa YT pendente, carregar agora
          const t = _cur();
          if (t?.track_type === 'youtube' && t.youtube_id && !ytLoadedId) {
            ytPlayer.cueVideoById(t.youtube_id);
            ytLoadedId = t.youtube_id;
          }
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) next();
          const playing = e.data === YT.PlayerState.PLAYING;
          _updatePlayBtn(playing);
          if (!playing && typeof MusicReactor !== 'undefined') MusicReactor.update(0, 0, 0);
        },
        onError: () => {
          // Vídeo indisponível, pula para próximo
          setTimeout(() => next(), 1500);
        },
      },
    });
  }

  function _handleYouTubeTrack(t, autoplay) {
    // Garante que API está carregada
    _loadYouTubeAPI();

    if (!ytReady) {
      // Player ainda não pronto — será carregado no onReady
      ytLoadedId = null;
      return;
    }

    // Carrega o vídeo no player YT
    if (autoplay) {
      ytPlayer.loadVideoById(t.youtube_id);
    } else {
      ytPlayer.cueVideoById(t.youtube_id);
    }
    ytLoadedId = t.youtube_id;

    if (autoplay) {
      _updatePlayBtn(true);
      _startYTProgress();
    }
  }

  let _ytProgressInterval = null;
  let _ytReactorPhase = 0;

  function _startYTProgress() {
    clearInterval(_ytProgressInterval);
    _ytProgressInterval = setInterval(() => {
      const t = _cur();
      if (!t || t.track_type !== 'youtube' || !ytPlayer || !ytReady) return;

      let cur = 0, dur = 0, state = -1;
      try {
        if (typeof ytPlayer.getCurrentTime === 'function') cur = ytPlayer.getCurrentTime() || 0;
        if (typeof ytPlayer.getDuration    === 'function') dur = ytPlayer.getDuration()    || 0;
        if (typeof ytPlayer.getPlayerState === 'function') state = ytPlayer.getPlayerState();
      } catch (_) { return; }  // postMessage cross-origin ou player destruído — ignora

      const playing = (typeof YT !== 'undefined') && state === YT.PlayerState.PLAYING;

      if (dur && el.progress) {
        const pct = cur / dur;
        el.progress.value = pct;
        el.progress.style.background =
          `linear-gradient(to right, var(--primary) ${pct*100}%, var(--border) ${pct*100}%)`;
      }
      if (el.timeCur) el.timeCur.textContent = formatDuration(cur);
      if (el.timeTot) el.timeTot.textContent = formatDuration(dur);

      // Simulação de pulso para MusicReactor durante YouTube (sem acesso ao áudio real)
      if (playing && typeof MusicReactor !== 'undefined') {
        _ytReactorPhase += 0.15;
        const bass   = 0.4 + Math.sin(_ytReactorPhase) * 0.3;
        const mid    = 0.3 + Math.sin(_ytReactorPhase * 1.3 + 1) * 0.2;
        const treble = 0.2 + Math.sin(_ytReactorPhase * 0.7 + 2) * 0.15;
        MusicReactor.update(bass, mid, treble);
      }
    }, 250);
  }

  // ============================================================
  // CONTROLES
  // ============================================================
  function togglePlay() {
    if (!tracks.length) return;
    const t = _cur();
    if (!t) return;

    if (t.track_type === 'youtube') {
      if (!ytReady || !ytPlayer) return;

      try {
        // Se o vídeo ainda não foi carregado no player, carrega agora
        if (ytLoadedId !== t.youtube_id) {
          ytPlayer.loadVideoById(t.youtube_id);
          ytLoadedId = t.youtube_id;
          _updatePlayBtn(true);
          _startYTProgress();
          return;
        }

        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          ytPlayer.pauseVideo();
          _updatePlayBtn(false);
        } else {
          ytPlayer.playVideo();
          _updatePlayBtn(true);
          _startYTProgress();
        }
      } catch (_) { return; }
    } else {
      _ensureAudioCtx();
      if (audioEl.paused) {
        audioEl.play().catch(() => {});
        _updatePlayBtn(true);
      } else {
        audioEl.pause();
        _updatePlayBtn(false);
      }
    }
  }

  function prev() {
    const idx = (currentIdx - 1 + tracks.length) % tracks.length;
    _loadTrack(idx, isPlaying());
  }

  function next() {
    const idx = shuffle
      ? Math.floor(Math.random() * tracks.length)
      : (currentIdx + 1) % tracks.length;
    _loadTrack(idx, true);
  }

  function _toggleShuffle() {
    shuffle = !shuffle;
    if (el.shuffleBtn) el.shuffleBtn.classList.toggle('active', shuffle);
  }

  function isPlaying() {
    const t = _cur();
    if (!t) return false;
    if (t.track_type === 'youtube') {
      return ytReady && ytPlayer?.getPlayerState?.() === YT.PlayerState.PLAYING;
    }
    return audioEl && !audioEl.paused;
  }

  function _updatePlayBtn(playing) {
    if (!el.playBtn) return;
    el.playBtn.innerHTML = playing
      ? '<i class="fa-solid fa-pause"></i>'
      : '<i class="fa-solid fa-play"></i>';
  }

  return { init, togglePlay, prev, next, isPlaying };
})();
