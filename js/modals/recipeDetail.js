// ==========================================
// Recipe Detail Modal
// ==========================================
import { state, DEFAULT_SERVINGS } from '../state.js';
import { elements } from '../dom.js';
import { callApi } from '../api.js';
import { escapeHtml, showNotification, parseAmountVal, roundAmount } from '../utils.js';
import { renderLibrary } from '../views/library.js';
import { openDayChooser } from './dayChooser.js';
import { openRecipeForm } from './recipeForm.js';

let currentServings = DEFAULT_SERVINGS;

// Keeps the screen awake while a recipe is open, so it doesn't lock mid-cooking.
let wakeLockSentinel = null;
let wakeLockDesired = false;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return; // unsupported browser - fail silently
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
  } catch (err) {
    console.warn('Wake Lock request failed:', err);
  }
}

function releaseWakeLock() {
  wakeLockDesired = false;
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}

export function initRecipeDetailModal() {
  elements.btnCloseRecipeDetail.addEventListener('click', () => {
    elements.modalRecipeDetail.classList.add('hidden');
  });

  // The browser auto-releases the wake lock whenever the tab loses visibility
  // (e.g. screen locks on its own, user switches apps) - re-request it once
  // the page is visible again, as long as the recipe is still open.
  document.addEventListener('visibilitychange', () => {
    if (wakeLockDesired && document.visibilityState === 'visible') {
      requestWakeLock();
    }
  });

  // Release the wake lock whenever the modal becomes hidden, regardless of
  // which code path closed it (close button, navigating to another tab,
  // opening the edit/plan modal from within, etc.)
  const observer = new MutationObserver(() => {
    if (elements.modalRecipeDetail.classList.contains('hidden')) {
      releaseWakeLock();
    }
  });
  observer.observe(elements.modalRecipeDetail, { attributes: true, attributeFilter: ['class'] });
}

export function showRecipeDetail(recipe) {
  elements.modalRecipeTitle.innerText = recipe.title;

  if (recipe.image) {
    elements.modalRecipeImage.src = recipe.image;
    elements.modalRecipeImage.classList.remove('hidden');
    elements.modalRecipeImageContainer.classList.remove('hidden');
  } else {
    elements.modalRecipeImage.classList.add('hidden');
    elements.modalRecipeImageContainer.classList.add('hidden');
  }

  // Tags
  elements.modalRecipeTags.innerHTML = recipe.tags.map(tag => {
    let type = 'type';
    if (['Barnvänligt', 'Båda'].includes(tag)) type = 'context';
    if (['Gryta/Soppa', 'Ugn', 'Steka/Koka'].includes(tag)) type = 'method';
    return `<span class="tag-badge tag-${type}">${escapeHtml(tag)}</span>`;
  }).join('');

  // Ingredients list, scaled to the currently selected serving size
  const baseServings = recipe.servings || DEFAULT_SERVINGS;
  const plannedDay = state.weeklyPlan.find(p => p.recipe_id === recipe.id && p.servings);
  currentServings = (plannedDay && parseInt(plannedDay.servings, 10)) || state.defaultServings || baseServings;

  renderScaledIngredients(recipe, baseServings);

  elements.btnServingsDecrease.onclick = () => {
    currentServings = Math.max(1, currentServings - 1);
    renderScaledIngredients(recipe, baseServings);
  };
  elements.btnServingsIncrease.onclick = () => {
    currentServings = Math.min(50, currentServings + 1);
    renderScaledIngredients(recipe, baseServings);
  };

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

  wakeLockDesired = true;
  requestWakeLock();
}

// Re-renders the ingredient list scaled from the recipe's base serving count
// to whatever's currently selected in the stepper. Amounts that can't be
// parsed as a number (e.g. "efter smak") are shown unscaled, as-is.
function renderScaledIngredients(recipe, baseServings) {
  elements.modalRecipeServingsValue.innerText = currentServings;
  const ratio = currentServings / baseServings;

  elements.modalRecipeIngredients.innerHTML = recipe.ingredients.map(ing => {
    const amountVal = parseAmountVal(ing.amount);
    let text;

    if (ratio !== 1 && amountVal !== null) {
      text = `${roundAmount(amountVal * ratio)} ${ing.unit || ''} ${ing.name}`.trim();
    } else if (ing.rawText) {
      text = ing.rawText;
    } else if (ing.amount) {
      text = `${ing.amount} ${ing.unit || ''} ${ing.name}`.trim();
    } else {
      text = ing.name;
    }

    return `<li><i data-lucide="dot" style="display:inline-block; width:12px; height:12px; margin-right:4px;"></i> ${escapeHtml(text)}</li>`;
  }).join('');

  lucide.createIcons();
}
