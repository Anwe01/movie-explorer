/**
 * ═══════════════════════════════════════════════════════════
 *   MOVIE EXPLORER — script.js
 *   Technologies FrontEnd (JavaScript) — Projet Universitaire
 * ═══════════════════════════════════════════════════════════
 *
 *   Fonctionnalités :
 *   ✔ Recherche de films via l'API OMDb (fetch / AJAX)
 *   ✔ Manipulation DOM dynamique
 *   ✔ localStorage (favoris + thème)
 *   ✔ Dark / Light mode
 *   ✔ Skeleton loading
 *   ✔ Suggestions en temps réel
 *   ✔ Modal de détails complets
 *   ✔ Pagination
 *   ✔ Tri des résultats
 *   ✔ Toast notifications
 *   ✔ Design responsive
 */

'use strict';

/* ═══════════════════════════════════════════════════════
   0.  CONFIGURATION
═══════════════════════════════════════════════════════ */
const CONFIG = {
  /**
   * OMDb API KEY  — https://www.omdbapi.com/apikey.aspx
   * Clé gratuite : 1 000 requêtes / jour.
   * Pour tester : remplacez "YOUR_API_KEY" par votre clé.
   * Exemple : apiKey: 'a1b2c3d4'
   */
  apiKey: '95d7f8c1',          // ← mettez votre clé ici
  apiBase: 'https://www.omdbapi.com/',
  resultsPerPage: 10,
  suggestDelay: 400,         // délai debounce suggestions (ms)
  toastDuration: 3500,       // durée des toasts (ms)
};

/* ═══════════════════════════════════════════════════════
   1.  ÉTAT DE L'APPLICATION
═══════════════════════════════════════════════════════ */
const state = {
  currentQuery:   '',
  currentPage:    1,
  totalResults:   0,
  totalPages:     0,
  results:        [],        // films retournés par la recherche
  favorites:      [],        // films sauvegardés (localStorage)
  theme:          'dark',    // 'dark' | 'light'
  activeSection:  'home',    // 'home' | 'favorites'
  currentImdbId:  null,      // imdbID du film ouvert dans le modal
  suggestTimer:   null,
};

/* ═══════════════════════════════════════════════════════
   2.  SÉLECTEURS DOM
═══════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const dom = {
  /* Navbar */
  navbar:        $('navbar'),
  logoBtn:       $('logoBtn'),
  navHome:       $('navHome'),
  navFavorites:  $('navFavorites'),
  favCount:      $('favCount'),
  favCountMob:   $('favCountMob'),
  themeToggle:   $('themeToggle'),
  hamburger:     $('hamburger'),
  mobileMenu:    $('mobileMenu'),

  /* Hero / Search */
  heroSection:   $('heroSection'),
  searchInput:   $('searchInput'),
  searchBtn:     $('searchBtn'),
  searchClear:   $('searchClear'),
  searchWrapper: $('searchWrapper'),
  suggestions:   $('suggestions'),

  /* Main */
  mainContent:   $('mainContent'),
  statsBar:      $('statsBar'),
  statsText:     $('statsText'),
  sortSelect:    $('sortSelect'),
  skeletonGrid:  $('skeletonGrid'),
  emptyState:    $('emptyState'),
  emptyTitle:    $('emptyTitle'),
  emptyText:     $('emptyText'),
  emptyBtn:      $('emptyBtn'),
  moviesGrid:    $('moviesGrid'),
  pagination:    $('pagination'),
  prevPage:      $('prevPage'),
  nextPage:      $('nextPage'),
  pageNumbers:   $('pageNumbers'),

  /* Sections */
  sectionHome:      $('sectionHome'),
  sectionFavorites: $('sectionFavorites'),
  emptyFavorites:   $('emptyFavorites'),
  favoritesGrid:    $('favoritesGrid'),
  favTotal:         $('favTotal'),
  clearFavoritesBtn:$('clearFavoritesBtn'),
  goSearchBtn:      $('goSearchBtn'),

  /* Modal */
  modalOverlay:  $('modalOverlay'),
  modalClose:    $('modalClose'),
  modalLoader:   $('modalLoader'),
  modalContent:  $('modalContent'),
  modalPoster:   $('modalPoster'),
  modalRated:    $('modalRated'),
  modalType:     $('modalType'),
  modalYear:     $('modalYear'),
  modalTitle:    $('modalTitle'),
  modalImdbScore:$('modalImdbScore'),
  modalRt:       $('modalRt'),
  modalRtScore:  $('modalRtScore'),
  modalGenre:    $('modalGenre'),
  modalPlot:     $('modalPlot'),
  modalDirector: $('modalDirector'),
  modalActors:   $('modalActors'),
  modalRuntime:  $('modalRuntime'),
  modalCountry:  $('modalCountry'),
  modalLanguage: $('modalLanguage'),
  modalBoxOffice:$('modalBoxOffice'),
  modalFavBtn:   $('modalFavBtn'),
  modalFavText:  $('modalFavText'),
  modalImdbLink: $('modalImdbLink'),

  /* Toast */
  toastContainer: $('toastContainer'),
};

/* ═══════════════════════════════════════════════════════
   3.  INITIALISATION
═══════════════════════════════════════════════════════ */
function init() {
  loadFromStorage();
  applyTheme(state.theme);
  updateFavCount();
  bindEvents();
  checkNavScroll();

  // afficher 8 squelettes supplémentaires (démonstration visuelle)
  addMoreSkeletons();
}

/** Ajouter plus de cartes squelettes pour le rendu initial */
function addMoreSkeletons() {
  const grid = dom.skeletonGrid;
  for (let i = 0; i < 4; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = `
      <div class="skeleton-poster"></div>
      <div class="skeleton-body">
        <div class="skeleton-line" style="width:${60 + Math.random()*30}%"></div>
        <div class="skeleton-line" style="width:${40 + Math.random()*20}%"></div>
        <div class="skeleton-line" style="width:${65 + Math.random()*25}%"></div>
      </div>`;
    grid.appendChild(card);
  }
}

/* ═══════════════════════════════════════════════════════
   4.  PERSISTANCE (localStorage)
═══════════════════════════════════════════════════════ */
const LS_KEYS = { favorites: 'me_favorites_v2', theme: 'me_theme_v1' };

function loadFromStorage() {
  try {
    const favs  = localStorage.getItem(LS_KEYS.favorites);
    const theme = localStorage.getItem(LS_KEYS.theme);
    if (favs)  state.favorites = JSON.parse(favs);
    if (theme) state.theme = theme;
  } catch(e) {
    console.warn('localStorage non disponible :', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(LS_KEYS.favorites, JSON.stringify(state.favorites));
    localStorage.setItem(LS_KEYS.theme, state.theme);
  } catch(e) {
    console.warn('Erreur localStorage :', e);
  }
}

/* ═══════════════════════════════════════════════════════
   5.  THÈME
═══════════════════════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  saveToStorage();
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

/* ═══════════════════════════════════════════════════════
   6.  NAVIGATION (sections)
═══════════════════════════════════════════════════════ */
function showSection(section) {
  state.activeSection = section;

  /* Sections */
  dom.sectionHome.style.display      = section === 'home'      ? 'block' : 'none';
  dom.sectionFavorites.style.display = section === 'favorites' ? 'block' : 'none';

  /* Nav links actifs */
  $$('.nav-link, .mob-link').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });

  /* Fermer menu mobile */
  closeMobileMenu();

  /* Scroll top */
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (section === 'favorites') {
    dom.statsBar.style.display = 'none';
    renderFavorites();
  }
}

/* ═══════════════════════════════════════════════════════
   7.  FETCH — API OMDb
═══════════════════════════════════════════════════════ */
/**
 * Recherche par terme (retourne liste)
 * @param {string} query
 * @param {number} page
 * @returns {Promise<Object>}
 */
async function searchMovies(query, page = 1) {
  const url = buildUrl({ s: query, page, type: '' });
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response === 'False') throw new Error(data.Error || 'Aucun résultat');
  return data;
}

/**
 * Détails complets d'un film par imdbID
 * @param {string} imdbId
 * @returns {Promise<Object>}
 */
async function fetchMovieDetails(imdbId) {
  const url = buildUrl({ i: imdbId, plot: 'full' });
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response === 'False') throw new Error(data.Error || 'Film introuvable');
  return data;
}

/**
 * Construction de l'URL API
 * @param {Object} params
 * @returns {string}
 */
function buildUrl(params) {
  const p = new URLSearchParams({ apikey: CONFIG.apiKey, ...params });
  // Supprimer les paramètres vides
  for (const [k, v] of [...p.entries()]) { if (!v) p.delete(k); }
  return `${CONFIG.apiBase}?${p}`;
}

/* ═══════════════════════════════════════════════════════
   8.  RECHERCHE PRINCIPALE
═══════════════════════════════════════════════════════ */
async function doSearch(query, page = 1) {
  query = query.trim();
  if (!query) { showToast('Entrez un titre de film.', 'info'); return; }

  state.currentQuery = query;
  state.currentPage  = page;

  showSkeletons(true);
  hideEmpty();
  dom.moviesGrid.innerHTML = '';
  dom.statsBar.style.display = 'none';
  dom.pagination.style.display = 'none';

  /* Scroll vers les résultats */
  dom.mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const data = await searchMovies(query, page);

    state.results      = data.Search || [];
    state.totalResults = parseInt(data.totalResults) || 0;
    state.totalPages   = Math.ceil(state.totalResults / CONFIG.resultsPerPage);

    /* Tri */
    sortResults();

    showSkeletons(false);
    renderMoviesGrid(state.results, dom.moviesGrid);
    renderStats();
    renderPagination();

  } catch (err) {
    showSkeletons(false);
    showEmptyState(
      err.message === 'Movie not found!' ? 'Aucun film trouvé' : 'Aucun résultat',
      err.message === 'Movie not found!'
        ? `Aucun film correspondant à "${query}".`
        : err.message
    );
    dom.statsBar.style.display = 'none';
  }
}

/* ═══════════════════════════════════════════════════════
   9.  TRI DES RÉSULTATS
═══════════════════════════════════════════════════════ */
function sortResults() {
  const v = dom.sortSelect.value;
  const arr = [...state.results];

  switch(v) {
    case 'year-desc': arr.sort((a,b) => (parseInt(b.Year)||0) - (parseInt(a.Year)||0)); break;
    case 'year-asc':  arr.sort((a,b) => (parseInt(a.Year)||0) - (parseInt(b.Year)||0)); break;
    case 'title-asc': arr.sort((a,b) => a.Title.localeCompare(b.Title)); break;
    case 'title-desc':arr.sort((a,b) => b.Title.localeCompare(a.Title)); break;
    default: break;
  }
  state.results = arr;
}

/* ═══════════════════════════════════════════════════════
   10. RENDU DES CARTES FILMS
═══════════════════════════════════════════════════════ */
/**
 * Génère et insère les cartes films dans un conteneur
 * @param {Array}       movies    — tableau de films
 * @param {HTMLElement} container — DOM cible
 */
function renderMoviesGrid(movies, container) {
  container.innerHTML = '';

  if (!movies.length) {
    showEmptyState('Aucun film', 'La liste est vide.');
    return;
  }

  const fragment = document.createDocumentFragment();

  movies.forEach((movie, i) => {
    const isFav = isFavorite(movie.imdbID);
    const card  = createMovieCard(movie, isFav);
    /* Délai d'animation */
    card.style.animationDelay = `${Math.min(i * 50, 500)}ms`;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

/**
 * Crée une carte film (DOM) et retourne l'élément
 * @param {Object}  movie
 * @param {boolean} isFav
 * @returns {HTMLElement}
 */
function createMovieCard(movie, isFav) {
  const card = document.createElement('article');
  card.className   = 'movie-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('data-imdbid', movie.imdbID);
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${movie.Title}, ${movie.Year}`);

  const hasPoster = movie.Poster && movie.Poster !== 'N/A';
  const posterHtml = hasPoster
    ? `<img class="card-poster"
            src="${movie.Poster}"
            alt="Affiche de ${escHtml(movie.Title)}"
            loading="lazy"
            onerror="this.parentElement.innerHTML='${noPosterHtml()}'" />`
    : noPosterHtml();

  const typeLabel = typeToFr(movie.Type);
  const year      = movie.Year ? movie.Year.slice(0, 4) : '—';

  card.innerHTML = `
    <div class="card-poster-wrap">
      ${posterHtml}
      <div class="card-type-badge">${typeLabel}</div>
      <div class="card-year-badge">${year}</div>
      <button class="card-fav-btn ${isFav ? 'active' : ''}"
              data-imdbid="${movie.imdbID}"
              title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
              aria-label="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
              aria-pressed="${isFav}">
        <i class="fas fa-heart"></i>
      </button>
      <div class="card-overlay">
        <div class="overlay-btn">
          <i class="fas fa-info-circle"></i> Détails
        </div>
      </div>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escHtml(movie.Title)}</h3>
      <div class="card-meta">
        <i class="fas fa-calendar-alt"></i>
        <span>${year}</span>
        ${movie.Type ? `<span>·</span><span>${typeLabel}</span>` : ''}
      </div>
    </div>`;

  /* Événements */
  card.addEventListener('click', e => {
    if (e.target.closest('.card-fav-btn')) return; // ne pas ouvrir le modal si clic fav
    openModal(movie.imdbID);
  });

  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(movie.imdbID); }
  });

  const favBtn = card.querySelector('.card-fav-btn');
  favBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(movie, favBtn);
  });

  return card;
}

/** HTML pour affiche manquante */
function noPosterHtml() {
  return `<div class="card-no-poster">
    <i class="fas fa-film"></i>
    <span>Affiche non disponible</span>
  </div>`;
}

/* ═══════════════════════════════════════════════════════
   11. FAVORIS
═══════════════════════════════════════════════════════ */
function isFavorite(imdbId) {
  return state.favorites.some(f => f.imdbID === imdbId);
}

function toggleFavorite(movie, btn) {
  if (isFavorite(movie.imdbID)) {
    removeFavorite(movie.imdbID, btn);
  } else {
    addFavorite(movie, btn);
  }
}

function addFavorite(movie, btn) {
  state.favorites.push(movie);
  saveToStorage();
  updateFavCount();

  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('title', 'Retirer des favoris');
  }
  showToast(`"${movie.Title}" ajouté aux favoris !`, 'success');

  /* Mettre à jour le bouton du modal si ouvert */
  syncModalFavBtn(movie.imdbID);
}

function removeFavorite(imdbId, btn) {
  const movie = state.favorites.find(f => f.imdbID === imdbId);
  state.favorites = state.favorites.filter(f => f.imdbID !== imdbId);
  saveToStorage();
  updateFavCount();

  if (btn) {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('title', 'Ajouter aux favoris');
  }

  if (movie) showToast(`"${movie.Title}" retiré des favoris.`, 'info');

  /* Si on est dans la section favoris, re-render */
  if (state.activeSection === 'favorites') renderFavorites();

  /* Mettre à jour dans la grille principale */
  const cardBtn = dom.moviesGrid.querySelector(`[data-imdbid="${imdbId}"]`);
  if (cardBtn) {
    cardBtn.classList.remove('active');
    cardBtn.setAttribute('aria-pressed', 'false');
  }

  syncModalFavBtn(imdbId);
}

function updateFavCount() {
  const n = state.favorites.length;
  [dom.favCount, dom.favCountMob].forEach(el => {
    el.textContent = n;
    el.style.display = n > 0 ? 'inline-flex' : 'none';
  });
}

function renderFavorites() {
  const count = state.favorites.length;
  dom.favTotal.textContent = `${count} film${count > 1 ? 's' : ''}`;
  dom.clearFavoritesBtn.style.display = count > 0 ? 'flex' : 'none';

  if (!count) {
    dom.emptyFavorites.style.display = 'flex';
    dom.favoritesGrid.innerHTML = '';
    return;
  }

  dom.emptyFavorites.style.display = 'none';
  renderMoviesGrid(state.favorites, dom.favoritesGrid);
}

function clearAllFavorites() {
  if (!confirm(`Supprimer tous les favoris (${state.favorites.length}) ?`)) return;
  state.favorites = [];
  saveToStorage();
  updateFavCount();
  renderFavorites();
  showToast('Tous les favoris ont été supprimés.', 'info');
}

/* ═══════════════════════════════════════════════════════
   12. MODAL DÉTAILS
═══════════════════════════════════════════════════════ */
async function openModal(imdbId) {
  state.currentImdbId = imdbId;
  dom.modalOverlay.style.display = 'flex';
  dom.modalLoader.style.display  = 'flex';
  dom.modalContent.style.display = 'none';
  document.body.style.overflow = 'hidden';

  try {
    const movie = await fetchMovieDetails(imdbId);
    populateModal(movie);
    dom.modalLoader.style.display  = 'none';
    dom.modalContent.style.display = 'grid';
  } catch (err) {
    closeModal();
    showToast('Erreur de chargement des détails.', 'error');
    console.error(err);
  }
}

function populateModal(m) {
  /* Affiche */
  const hasPoster = m.Poster && m.Poster !== 'N/A';
  dom.modalPoster.src = hasPoster ? m.Poster : '';
  dom.modalPoster.alt = `Affiche ${m.Title}`;
  if (!hasPoster) dom.modalPoster.style.background = 'var(--bg-elevated)';

  /* Badge rated */
  if (m.Rated && m.Rated !== 'N/A') {
    dom.modalRated.textContent = m.Rated;
    dom.modalRated.style.display = 'block';
  } else {
    dom.modalRated.style.display = 'none';
  }

  /* Infos de base */
  dom.modalType.textContent  = typeToFr(m.Type);
  dom.modalYear.textContent  = m.Year !== 'N/A' ? m.Year : '';
  dom.modalTitle.textContent = m.Title;

  /* Ratings */
  dom.modalImdbScore.textContent = m.imdbRating !== 'N/A' ? `${m.imdbRating}/10` : '—';

  const rtRating = (m.Ratings || []).find(r => r.Source === 'Rotten Tomatoes');
  if (rtRating) {
    dom.modalRtScore.textContent = rtRating.Value;
    dom.modalRt.style.display = 'flex';
  } else {
    dom.modalRt.style.display = 'none';
  }

  /* Genres */
  dom.modalGenre.innerHTML = '';
  if (m.Genre && m.Genre !== 'N/A') {
    m.Genre.split(',').forEach(g => {
      const tag = document.createElement('span');
      tag.className   = 'genre-tag';
      tag.textContent = g.trim();
      dom.modalGenre.appendChild(tag);
    });
  }

  /* Plot */
  dom.modalPlot.textContent = (m.Plot && m.Plot !== 'N/A') ? m.Plot : 'Synopsis non disponible.';

  /* Détails */
  setText(dom.modalDirector,  m.Director);
  setText(dom.modalActors,    m.Actors);
  setText(dom.modalRuntime,   m.Runtime);
  setText(dom.modalCountry,   m.Country);
  setText(dom.modalLanguage,  m.Language);
  setText(dom.modalBoxOffice, m.BoxOffice);

  /* Bouton favori */
  syncModalFavBtn(m.imdbID);

  /* Lien IMDb */
  dom.modalImdbLink.href = `https://www.imdb.com/title/${m.imdbID}/`;

  /* Stocker référence complète pour pouvoir l'ajouter aux favoris */
  dom.modalFavBtn.onclick = () => {
    const mini = { imdbID: m.imdbID, Title: m.Title, Year: m.Year, Poster: m.Poster, Type: m.Type };
    toggleFavorite(mini, null);
    syncModalFavBtn(m.imdbID);
  };
}

function syncModalFavBtn(imdbId) {
  if (state.currentImdbId !== imdbId) return;
  const isFav = isFavorite(imdbId);
  dom.modalFavBtn.classList.toggle('active', isFav);
  dom.modalFavText.textContent = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
  dom.modalFavBtn.querySelector('i').className = isFav ? 'fas fa-heart-broken' : 'fas fa-heart';
}

function closeModal() {
  dom.modalOverlay.style.display = 'none';
  document.body.style.overflow   = '';
  state.currentImdbId = null;
}

/* ═══════════════════════════════════════════════════════
   13. SUGGESTIONS (recherche instantanée)
═══════════════════════════════════════════════════════ */
function triggerSuggestions(query) {
  clearTimeout(state.suggestTimer);
  query = query.trim();

  if (query.length < 2) {
    hideSuggestions();
    return;
  }

  state.suggestTimer = setTimeout(async () => {
    try {
      const data = await searchMovies(query, 1);
      renderSuggestions(data.Search || []);
    } catch {
      hideSuggestions();
    }
  }, CONFIG.suggestDelay);
}

function renderSuggestions(movies) {
  if (!movies.length) { hideSuggestions(); return; }

  dom.suggestions.innerHTML = '';
  const top5 = movies.slice(0, 5);

  top5.forEach(movie => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.setAttribute('role', 'option');
    item.setAttribute('tabindex', '0');

    const hasPoster = movie.Poster && movie.Poster !== 'N/A';
    item.innerHTML = `
      ${hasPoster
        ? `<img class="sug-poster" src="${movie.Poster}" alt="" loading="lazy" onerror="this.style.background='var(--bg-elevated)'">`
        : `<div class="sug-poster" style="background:var(--bg-elevated)"></div>`}
      <div class="sug-info">
        <div class="sug-title">${escHtml(movie.Title)}</div>
        <div class="sug-year">${movie.Year || ''} · ${typeToFr(movie.Type)}</div>
      </div>`;

    item.addEventListener('click', () => {
      dom.searchInput.value = movie.Title;
      hideSuggestions();
      doSearch(movie.Title);
    });

    item.addEventListener('keydown', e => {
      if (e.key === 'Enter') { item.click(); }
    });

    dom.suggestions.appendChild(item);
  });

  dom.suggestions.classList.add('visible');
}

function hideSuggestions() {
  dom.suggestions.classList.remove('visible');
  dom.suggestions.innerHTML = '';
}

/* ═══════════════════════════════════════════════════════
   14. UI HELPERS
═══════════════════════════════════════════════════════ */
function showSkeletons(show) {
  dom.skeletonGrid.style.display = show ? 'grid' : 'none';
}

function showEmptyState(title, text) {
  dom.emptyTitle.textContent = title;
  dom.emptyText.textContent  = text;
  dom.emptyState.style.display = 'flex';
}

function hideEmpty() {
  dom.emptyState.style.display = 'none';
}

function renderStats() {
  const count = state.totalResults;
  dom.statsText.textContent = `${count.toLocaleString('fr-FR')} résultat${count > 1 ? 's' : ''} pour "${state.currentQuery}"`;
  dom.statsBar.style.display = 'block';
}

/* Pagination */
function renderPagination() {
  if (state.totalPages <= 1) {
    dom.pagination.style.display = 'none';
    return;
  }

  dom.pagination.style.display = 'flex';
  dom.prevPage.disabled = state.currentPage <= 1;
  dom.nextPage.disabled = state.currentPage >= state.totalPages;

  /* Page numbers (afficher 5 max autour de la page courante) */
  dom.pageNumbers.innerHTML = '';
  const total   = state.totalPages;
  const current = state.currentPage;
  let pages = [];

  if (total <= 7) {
    pages = range(1, total);
  } else {
    if (current <= 4) {
      pages = [...range(1, 5), '…', total];
    } else if (current >= total - 3) {
      pages = [1, '…', ...range(total - 4, total)];
    } else {
      pages = [1, '…', current - 1, current, current + 1, '…', total];
    }
  }

  pages.forEach(p => {
    const el = document.createElement('button');
    if (p === '…') {
      el.className   = 'page-num';
      el.textContent = '…';
      el.disabled    = true;
    } else {
      el.className   = `page-num ${p === current ? 'active' : ''}`;
      el.textContent = p;
      el.setAttribute('aria-label', `Page ${p}`);
      el.addEventListener('click', () => {
        doSearch(state.currentQuery, p);
      });
    }
    dom.pageNumbers.appendChild(el);
  });
}

function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

/* ═══════════════════════════════════════════════════════
   15. TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════ */
/**
 * Affiche un toast
 * @param {string} msg   — message
 * @param {'success'|'error'|'info'} type
 */
function showToast(msg, type = 'info') {
  const icons = { success: 'fa-check', error: 'fa-times', info: 'fa-info' };
  const icon  = icons[type] || icons.info;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${icon}"></i></div>
    <span class="toast-msg">${escHtml(msg)}</span>
    <button class="toast-close" aria-label="Fermer"><i class="fas fa-times"></i></button>`;

  dom.toastContainer.appendChild(toast);

  /* Fermeture manuelle */
  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));

  /* Fermeture automatique */
  setTimeout(() => removeToast(toast), CONFIG.toastDuration);
}

function removeToast(toast) {
  if (!toast.parentElement) return;
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove());
}

/* ═══════════════════════════════════════════════════════
   16. UTILITAIRES
═══════════════════════════════════════════════════════ */
/** Échappe les caractères HTML dangereux */
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Traduit le type OMDb en français */
function typeToFr(type) {
  const map = { movie: 'Film', series: 'Série', episode: 'Épisode', game: 'Jeu' };
  return map[type] || 'Inconnu';
}

/** Remplace "N/A" par "—" */
function setText(el, val) {
  el.textContent = (val && val !== 'N/A') ? val : '—';
}

/** Scroll navbar sticky */
function checkNavScroll() {
  dom.navbar.classList.toggle('scrolled', window.scrollY > 20);
}

/* Mobile menu */
function toggleMobileMenu() {
  const open = dom.hamburger.classList.toggle('open');
  dom.hamburger.setAttribute('aria-expanded', open);
  dom.mobileMenu.classList.toggle('open', open);
}
function closeMobileMenu() {
  dom.hamburger.classList.remove('open');
  dom.hamburger.setAttribute('aria-expanded', false);
  dom.mobileMenu.classList.remove('open');
}

/* ═══════════════════════════════════════════════════════
   17. BINDING DES ÉVÉNEMENTS
═══════════════════════════════════════════════════════ */
function bindEvents() {

  /* ── Navbar ── */
  dom.themeToggle.addEventListener('click', toggleTheme);
  dom.hamburger.addEventListener('click', toggleMobileMenu);
  dom.logoBtn.addEventListener('click', e => {
    e.preventDefault();
    showSection('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Navigation links (desktop + mobile) */
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-section]');
    if (!link) return;
    e.preventDefault();
    showSection(link.dataset.section);
  });

  /* ── Recherche ── */
  dom.searchBtn.addEventListener('click', () => {
    hideSuggestions();
    doSearch(dom.searchInput.value);
  });

  dom.searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      hideSuggestions();
      doSearch(dom.searchInput.value);
    }
    if (e.key === 'Escape') hideSuggestions();
  });

  dom.searchInput.addEventListener('input', e => {
    const val = e.target.value;
    dom.searchClear.style.display = val ? 'flex' : 'none';
    triggerSuggestions(val);
  });

  dom.searchClear.addEventListener('click', () => {
    dom.searchInput.value = '';
    dom.searchClear.style.display = 'none';
    hideSuggestions();
    dom.searchInput.focus();
  });

  /* Fermer suggestions si clic hors */
  document.addEventListener('click', e => {
    if (!dom.searchWrapper.contains(e.target)) hideSuggestions();
  });

  /* Quick tags */
  $$('.tag').forEach(btn => {
    btn.addEventListener('click', () => {
      dom.searchInput.value = btn.dataset.query;
      dom.searchClear.style.display = 'flex';
      doSearch(btn.dataset.query);
    });
  });

  /* ── Tri ── */
  dom.sortSelect.addEventListener('change', () => {
    if (!state.results.length) return;
    sortResults();
    dom.moviesGrid.innerHTML = '';
    renderMoviesGrid(state.results, dom.moviesGrid);
  });

  /* ── Pagination ── */
  dom.prevPage.addEventListener('click', () => {
    if (state.currentPage > 1) doSearch(state.currentQuery, state.currentPage - 1);
  });
  dom.nextPage.addEventListener('click', () => {
    if (state.currentPage < state.totalPages) doSearch(state.currentQuery, state.currentPage + 1);
  });

  /* ── Modal ── */
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalOverlay.addEventListener('click', e => {
    if (e.target === dom.modalOverlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dom.modalOverlay.style.display !== 'none') closeModal();
  });

  /* ── Favoris ── */
  dom.clearFavoritesBtn.addEventListener('click', clearAllFavorites);
  dom.emptyBtn.addEventListener('click', () => {
    dom.searchInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Footer links */
  $$('.footer-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      showSection(a.dataset.section);
    });
  });

  /* Scroll */
  window.addEventListener('scroll', checkNavScroll, { passive: true });
}

/* ═══════════════════════════════════════════════════════
   18.  LANCEMENT
═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);