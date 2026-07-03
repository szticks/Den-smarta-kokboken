// ==========================================
// Dashboard View (Weekly Plan Overview)
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { callApi } from '../api.js';
import { escapeHtml, getWeekDayName, shuffleArray, showNotification } from '../utils.js';
import { updateShoppingBadge } from './shopping.js';
import { switchView } from '../router.js';
import { showRecipeDetail } from '../modals/recipeDetail.js';

export function initDashboardView() {
  elements.btnRandomizeWeek.addEventListener('click', () => {
    randomizeWeek(elements.randomizeWeekContext.value);
  });
}

export function renderDashboard() {
  elements.weeklyPlanList.innerHTML = '';

  const days = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];

  days.forEach((dayName, idx) => {
    // Find if we have a recipe planned for this day
    const dayPlan = state.weeklyPlan.find(p => parseInt(p.day_index) === idx);
    const hasRecipe = dayPlan && dayPlan.recipe_id;

    const card = document.createElement('div');
    card.className = `day-card ${hasRecipe ? 'planned' : ''}`;
    card.dataset.dayIdx = idx;

    let recipeTitleText = hasRecipe ? dayPlan.recipe_title : 'Inte planerad – klicka för att lägga till';

    card.innerHTML = `
      <div class="day-card-left">
        <span class="day-name">${dayName}</span>
        <span class="day-recipe-title">${escapeHtml(recipeTitleText)}</span>
      </div>
      <div class="day-card-right">
        ${hasRecipe ? `
          <button class="btn-icon-sm btn-reroll" data-day-idx="${idx}" title="Snurra igen (Slumpa annat recept)">
            <i data-lucide="refresh-cw"></i>
          </button>
          <button class="btn-icon-sm btn-remove-plan" data-day-idx="${idx}" title="Ta bort recept">
            <i data-lucide="trash-2"></i>
          </button>
        ` : `
          <button class="btn-icon-sm btn-add-plan" data-day-idx="${idx}" title="Planera recept">
            <i data-lucide="plus"></i>
          </button>
        `}
      </div>
    `;

    // Card Click: open details if planned, else open library to select recipe
    card.querySelector('.day-card-left').addEventListener('click', () => {
      if (hasRecipe) {
        const recipe = state.recipes.find(r => r.id === dayPlan.recipe_id);
        if (recipe) {
          showRecipeDetail(recipe);
        } else {
          showNotification('Receptets information kunde inte hittas offline.', 'error');
        }
      } else {
        // Go to library to plan
        switchView('view-library');
      }
    });

    // Add plan button
    if (!hasRecipe) {
      card.querySelector('.btn-add-plan').addEventListener('click', (e) => {
        e.stopPropagation();
        switchView('view-library');
      });
    } else {
      // Remove plan button
      card.querySelector('.btn-remove-plan').addEventListener('click', async (e) => {
        e.stopPropagation();
        await updateWeeklyPlanInState(idx, '', '');
        renderDashboard();
      });

      // Reroll single day button
      card.querySelector('.btn-reroll').addEventListener('click', async (e) => {
        e.stopPropagation();
        rerollSingleDay(idx);
      });
    }

    elements.weeklyPlanList.appendChild(card);
  });

  lucide.createIcons();
}

export async function rerollSingleDay(dayIdx) {
  // Find currently planned recipes to avoid immediate repeats
  const alreadyPlannedIds = state.weeklyPlan.map(p => p.recipe_id).filter(Boolean);

  // Filter library recipes (can also filter by day tags if we want, but for now just pick any other random recipe)
  let availableRecipes = state.recipes.filter(r => !alreadyPlannedIds.includes(r.id));

  if (availableRecipes.length === 0) {
    // If no other recipes, just choose from all except this specific day's recipe
    const currentDayPlan = state.weeklyPlan.find(p => parseInt(p.day_index) === dayIdx);
    availableRecipes = state.recipes.filter(r => r.id !== (currentDayPlan ? currentDayPlan.recipe_id : ''));
  }

  if (availableRecipes.length === 0) {
    showNotification('Det finns inga andra recept att slumpa fram!', 'error');
    return;
  }

  // Pick random
  const randomIndex = Math.floor(Math.random() * availableRecipes.length);
  const selectedRecipe = availableRecipes[randomIndex];

  // Apply changes
  await updateWeeklyPlanInState(dayIdx, selectedRecipe.id, selectedRecipe.title);
  renderDashboard();
  showNotification(`Ny maträtt för ${getWeekDayName(dayIdx)}: ${selectedRecipe.title}!`, 'success');
}

export async function updateWeeklyPlanInState(dayIdx, recipeId, recipeTitle) {
  // Update state locally
  state.weeklyPlan = state.weeklyPlan.map(p => {
    if (parseInt(p.day_index) === dayIdx) {
      return { ...p, recipe_id: recipeId, recipe_title: recipeTitle };
    }
    return p;
  });
  localStorage.setItem('cache_weekly_plan', JSON.stringify(state.weeklyPlan));

  // Sync online
  try {
    await callApi('updateWeeklyPlan', {
      plan: [{ day_index: dayIdx, recipe_id: recipeId, recipe_title: recipeTitle }]
    });
  } catch (err) {
    console.error('Failed to sync weekly plan:', err);
  }

  updateShoppingBadge();
}

async function randomizeWeek(contextFilter) {
  // Same context matching as the Tinder filter: "Barnvänligt" also allows "Båda",
  // while "Båda" (vuxen/family-neutral) only matches recipes explicitly tagged "Båda".
  let filtered = [...state.recipes];
  if (contextFilter !== 'All') {
    filtered = filtered.filter(r => r.tags.includes(contextFilter) || r.tags.includes('Båda'));
  }

  if (filtered.length === 0) {
    showNotification('Inga recept matchar det filtret. Lägg till fler recept eller välj ett annat filter.', 'error');
    return;
  }

  const hasExistingPlan = state.weeklyPlan.some(p => p.recipe_id);
  if (hasExistingPlan && !confirm('Detta ersätter hela veckans nuvarande matsedel med slumpade recept. Vill du fortsätta?')) {
    return;
  }

  // Cycle through a shuffled pool so repeats only happen once every unique recipe has been used
  const shuffled = shuffleArray(filtered);
  const newPlan = [];
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const recipe = shuffled[dayIdx % shuffled.length];
    newPlan.push({ day_index: dayIdx, recipe_id: recipe.id, recipe_title: recipe.title });
  }

  state.weeklyPlan = newPlan;
  localStorage.setItem('cache_weekly_plan', JSON.stringify(state.weeklyPlan));
  renderDashboard();
  updateShoppingBadge();

  // Sync online in a single batched call instead of one per day
  try {
    await callApi('updateWeeklyPlan', { plan: newPlan });
    showNotification('Veckans matsedel slumpad!', 'success');
  } catch (err) {
    console.error('Failed to sync randomized week:', err);
  }
}
