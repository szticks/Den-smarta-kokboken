// ==========================================
// Tinder Swipe View Logic
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { escapeHtml, sanitizeImageUrl, shuffleArray } from '../utils.js';
import { showRecipeDetail } from '../modals/recipeDetail.js';
import { openDayChooser } from '../modals/dayChooser.js';

export function initTinderView() {
  elements.tinderBtnDislike.addEventListener('click', () => {
    if (!state.activeTinderCard) return;
    state.dragCurrent.x = -150;
    state.dragCurrent.y = 0;
    handleSwipe('left');
  });

  elements.tinderBtnLike.addEventListener('click', () => {
    if (!state.activeTinderCard) return;
    state.dragCurrent.x = 150;
    state.dragCurrent.y = 0;
    handleSwipe('right');
  });

  elements.tinderBtnInfo.addEventListener('click', () => {
    if (state.currentTinderIndex >= state.tinderDeck.length) return;
    const recipe = state.tinderDeck[state.currentTinderIndex];
    showRecipeDetail(recipe);
  });

  elements.filterTinderContext.addEventListener('change', initTinderDeck);
  elements.filterTinderTag.addEventListener('change', initTinderDeck);
}

export function initTinderDeck() {
  const contextFilter = elements.filterTinderContext.value;
  const tagFilter = elements.filterTinderTag.value;

  // Filter the recipes
  let filtered = [...state.recipes];

  if (contextFilter !== 'All') {
    // Filter by family context: Barnvänligt, Båda (Vuxenmat)
    // If contextFilter is Barnvänligt, we find recipes tagged "Barnvänligt"
    // If contextFilter is Båda, we find recipes tagged "Båda" or "Barnvänligt" (since both works for both)
    filtered = filtered.filter(r => r.tags.includes(contextFilter) || r.tags.includes('Båda'));
  }

  if (tagFilter !== 'All') {
    filtered = filtered.filter(r => r.tags.includes(tagFilter));
  }

  // Shuffle the cards to get a playful random feed
  state.tinderDeck = shuffleArray(filtered);
  state.currentTinderIndex = 0;

  renderTinderCards();
}

function renderTinderCards() {
  elements.tinderCardWrapper.innerHTML = '';

  if (state.tinderDeck.length === 0 || state.currentTinderIndex >= state.tinderDeck.length) {
    // Render Empty State
    elements.tinderCardWrapper.innerHTML = `
      <div class="tinder-empty-state">
        <i data-lucide="sparkles" class="empty-icon"></i>
        <p>Hittade inga nya recept. Ändra filtret eller lägg till fler i biblioteket!</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // Draw the top 2 cards for optimal performance
  const startIdx = state.currentTinderIndex;
  const endIdx = Math.min(startIdx + 2, state.tinderDeck.length);

  for (let i = endIdx - 1; i >= startIdx; i--) {
    const recipe = state.tinderDeck[i];
    const isTopCard = (i === startIdx);

    const card = document.createElement('div');
    card.className = `tinder-card ${isTopCard ? 'top-card' : ''}`;
    card.dataset.recipeId = recipe.id;

    // Thumbnail image or nice food icon fallback
    let imageHtml = '';
    if (recipe.image) {
      imageHtml = `<div class="tinder-card-image" style="background-image: url('${escapeHtml(sanitizeImageUrl(recipe.image))}')"></div>`;
    } else {
      imageHtml = `
        <div class="tinder-card-image-fallback">
          <i data-lucide="chef-hat"></i>
        </div>`;
    }

    // Tags Badge
    const tagBadgesHtml = recipe.tags.map(tag => {
      let type = 'type';
      if (['Barnvänligt', 'Båda'].includes(tag)) type = 'context';
      if (['Gryta/Soppa', 'Ugn', 'Steka/Koka'].includes(tag)) type = 'method';
      return `<span class="tag-badge tag-${type}">${escapeHtml(tag)}</span>`;
    }).join('');

    card.innerHTML = `
      ${imageHtml}
      <div class="tinder-card-gradient"></div>
      <div class="tinder-card-badge tinder-card-badge-like">PLANERA</div>
      <div class="tinder-card-badge tinder-card-badge-dislike">NEJ TACK</div>
      <div class="tinder-card-info">
        <h3 class="tinder-card-title">${escapeHtml(recipe.title)}</h3>
        <div class="tinder-card-tags">
          ${tagBadgesHtml}
        </div>
      </div>
    `;

    elements.tinderCardWrapper.appendChild(card);

    if (isTopCard) {
      state.activeTinderCard = card;
      setupDragEvents(card);
    }
  }

  lucide.createIcons();
}

function setupDragEvents(card) {
  // Mobile touch
  card.addEventListener('touchstart', onDragStart, { passive: true });
  card.addEventListener('touchmove', onDragMove, { passive: false });
  card.addEventListener('touchend', onDragEnd);

  // Desktop mouse
  card.addEventListener('mousedown', onDragStart);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragStart(e) {
  if (e.type === 'mousedown') {
    state.dragStart.x = e.clientX;
    state.dragStart.y = e.clientY;
    state.isDragging = true;
  } else {
    state.dragStart.x = e.touches[0].clientX;
    state.dragStart.y = e.touches[0].clientY;
    state.isDragging = true;
  }

  if (state.activeTinderCard) {
    state.activeTinderCard.style.transition = 'none';
  }
}

function onDragMove(e) {
  if (!state.isDragging || !state.activeTinderCard) return;

  let clientX, clientY;
  if (e.type === 'mousemove') {
    clientX = e.clientX;
    clientY = e.clientY;
  } else {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
    // Prevent screen scroll while dragging cards
    if (e.cancelable) e.preventDefault();
  }

  state.dragCurrent.x = clientX - state.dragStart.x;
  state.dragCurrent.y = clientY - state.dragStart.y;

  const rotation = state.dragCurrent.x * 0.08;
  state.activeTinderCard.style.transform = `translate(${state.dragCurrent.x}px, ${state.dragCurrent.y}px) rotate(${rotation}deg)`;

  // Fade badges
  const likeBadge = state.activeTinderCard.querySelector('.tinder-card-badge-like');
  const dislikeBadge = state.activeTinderCard.querySelector('.tinder-card-badge-dislike');

  const opacity = Math.min(Math.abs(state.dragCurrent.x) / 100, 1);

  if (state.dragCurrent.x > 0) {
    likeBadge.style.opacity = opacity;
    dislikeBadge.style.opacity = 0;
  } else {
    dislikeBadge.style.opacity = opacity;
    likeBadge.style.opacity = 0;
  }
}

function onDragEnd() {
  if (!state.isDragging || !state.activeTinderCard) return;
  state.isDragging = false;

  const swipeThreshold = 120;

  if (state.dragCurrent.x > swipeThreshold) {
    // Swipe Right (LIKE/PLAN)
    handleSwipe('right');
  } else if (state.dragCurrent.x < -swipeThreshold) {
    // Swipe Left (DISLIKE/SKIP)
    handleSwipe('left');
  } else {
    // Snap Back
    state.activeTinderCard.style.transition = 'transform var(--transition-smooth)';
    state.activeTinderCard.style.transform = 'translate(0px, 0px) rotate(0deg)';

    const likeBadge = state.activeTinderCard.querySelector('.tinder-card-badge-like');
    const dislikeBadge = state.activeTinderCard.querySelector('.tinder-card-badge-dislike');
    likeBadge.style.opacity = 0;
    dislikeBadge.style.opacity = 0;
  }

  // Clean up global listeners for desktop
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
}

function handleSwipe(direction) {
  const card = state.activeTinderCard;
  if (!card) return;

  state.activeTinderCard = null;
  card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';

  if (direction === 'right') {
    // Throw card right
    card.style.transform = `translate(${window.innerWidth}px, ${state.dragCurrent.y}px) rotate(45deg)`;

    // Choose day modal
    const recipe = state.tinderDeck[state.currentTinderIndex];

    setTimeout(() => {
      openDayChooser(recipe);
      advanceTinderDeck();
    }, 150);
  } else {
    // Throw card left
    card.style.transform = `translate(${-window.innerWidth}px, ${state.dragCurrent.y}px) rotate(-45deg)`;

    setTimeout(() => {
      advanceTinderDeck();
    }, 150);
  }
}

function advanceTinderDeck() {
  state.currentTinderIndex++;
  renderTinderCards();
}
