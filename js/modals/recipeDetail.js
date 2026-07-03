// ==========================================
// Recipe Detail Modal
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { callApi } from '../api.js';
import { escapeHtml, showNotification } from '../utils.js';
import { renderLibrary } from '../views/library.js';
import { openDayChooser } from './dayChooser.js';
import { openRecipeForm } from './recipeForm.js';

export function initRecipeDetailModal() {
  elements.btnCloseRecipeDetail.addEventListener('click', () => {
    elements.modalRecipeDetail.classList.add('hidden');
  });
}

export function showRecipeDetail(recipe) {
  elements.modalRecipeTitle.innerText = recipe.title;

  if (recipe.image) {
    elements.modalRecipeImage.src = recipe.image;
    elements.modalRecipeImage.classList.remove('hidden');
  } else {
    elements.modalRecipeImage.classList.add('hidden');
  }

  // Tags
  elements.modalRecipeTags.innerHTML = recipe.tags.map(tag => {
    let type = 'type';
    if (['Barnvänligt', 'Båda'].includes(tag)) type = 'context';
    if (['Gryta/Soppa', 'Ugn', 'Steka/Koka'].includes(tag)) type = 'method';
    return `<span class="tag-badge tag-${type}">${escapeHtml(tag)}</span>`;
  }).join('');

  // Ingredients list
  elements.modalRecipeIngredients.innerHTML = recipe.ingredients.map(ing => {
    let text = ing.rawText || ing.name;
    if (!ing.rawText && ing.amount) {
      text = `${ing.amount} ${ing.unit || ''} ${ing.name}`;
    }
    return `<li><i data-lucide="dot" style="display:inline-block; width:12px; height:12px; margin-right:4px;"></i> ${escapeHtml(text)}</li>`;
  }).join('');

  // Instructions steps
  elements.modalRecipeInstructions.innerHTML = recipe.instructions.map(step => {
    return `<li>${escapeHtml(step)}</li>`;
  }).join('');

  // Source Link
  if (recipe.url) {
    elements.modalRecipeUrl.href = recipe.url;
    elements.modalRecipeUrlWrapper.classList.remove('hidden');
  } else {
    elements.modalRecipeUrlWrapper.classList.add('hidden');
  }

  // "Plan this" button click
  elements.btnPlanThisRecipe.onclick = () => {
    elements.modalRecipeDetail.classList.add('hidden');
    openDayChooser(recipe);
  };

  // Edit button click
  elements.btnEditRecipe.onclick = () => {
    elements.modalRecipeDetail.classList.add('hidden');
    openRecipeForm(recipe);
  };

  // Delete button click
  elements.btnDeleteRecipe.onclick = async () => {
    if (confirm(`Är du säker på att du vill ta bort receptet "${recipe.title}"?`)) {
      elements.modalRecipeDetail.classList.add('hidden');

      // Update local state
      state.recipes = state.recipes.filter(r => r.id !== recipe.id);
      localStorage.setItem('cache_recipes', JSON.stringify(state.recipes));
      renderLibrary();

      try {
        await callApi('deleteRecipe', { id: recipe.id });
        showNotification('Receptet raderat!', 'success');
      } catch (err) {
        console.error('Delete sync failed:', err);
      }
    }
  };

  elements.modalRecipeDetail.classList.remove('hidden');
  lucide.createIcons();
}
