// ==========================================
// Recipe Library Logic
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { escapeHtml, sanitizeImageUrl } from '../utils.js';
import { showRecipeDetail } from '../modals/recipeDetail.js';

let activeLibraryTag = 'All';

export function initLibraryView() {
  // Filter chips click handler
  elements.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeLibraryTag = chip.dataset.filterTag;
      renderLibrary();
    });
  });

  elements.librarySearch.addEventListener('input', renderLibrary);
}

export function renderLibrary() {
  elements.recipeGrid.innerHTML = '';

  const searchQuery = elements.librarySearch.value.trim().toLowerCase();

  let filtered = state.recipes.filter(recipe => {
    // Sök filter
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchQuery));

    // Tagg filter ("Att granska" är en flagga, inte en riktig tagg)
    const matchesTag = activeLibraryTag === 'All'
      || (activeLibraryTag === 'NeedsReview' ? recipe.needsReview : recipe.tags.includes(activeLibraryTag));

    return matchesSearch && matchesTag;
  });

  elements.recipeCount.innerText = `${filtered.length} sparade recept`;

  if (filtered.length === 0) {
    elements.recipeGrid.innerHTML = `
      <div class="tinder-empty-state" style="grid-column: span 2;">
        <i data-lucide="search" class="empty-icon"></i>
        <p>Hittade inga recept som matchar din sökning.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  filtered.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    let imageHtml = '';
    if (recipe.image) {
      imageHtml = `<div class="recipe-card-image" style="background-image: url('${escapeHtml(sanitizeImageUrl(recipe.image))}')"></div>`;
    } else {
      imageHtml = `
        <div class="recipe-card-image" style="height:110px;">
          <div class="recipe-card-image-fallback">
            <i data-lucide="chef-hat"></i>
          </div>
        </div>`;
    }

    const tagBadgesHtml = recipe.tags.slice(0, 2).map(tag => {
      let type = 'type';
      if (['Barnvänligt', 'Båda'].includes(tag)) type = 'context';
      if (['Gryta/Soppa', 'Ugn', 'Steka/Koka'].includes(tag)) type = 'method';
      return `<span class="tag-badge tag-${type}">${escapeHtml(tag)}</span>`;
    }).join('');

    card.innerHTML = `
      ${imageHtml}
      <div class="recipe-card-info">
        <h3 class="recipe-card-title">${escapeHtml(recipe.title)}</h3>
        <div class="recipe-card-tags">
          ${tagBadgesHtml}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      showRecipeDetail(recipe);
    });

    elements.recipeGrid.appendChild(card);
  });

  lucide.createIcons();
}
