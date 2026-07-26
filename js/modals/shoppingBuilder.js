// ==========================================
// Shopping List Builder Modal
// ==========================================
// Computes a fresh candidate list from the current weekly plan and lets the
// user uncheck anything they already have before committing it as the
// active shopping list (see views/shopping.js) - deliberate, not automatic.
import { state, DEFAULT_SERVINGS } from '../state.js';
import { elements } from '../dom.js';
import { callApi } from '../api.js';
import { escapeHtml, parseAmountVal, roundAmount, showNotification } from '../utils.js';
import { renderShoppingList, updateShoppingBadge } from '../views/shopping.js';

// { key: { name, amount, unit, isBaseline, needsReview, included } }
let candidates = {};

export function initShoppingBuilderModal() {
  elements.btnBuildShoppingList.addEventListener('click', openShoppingBuilder);

  elements.btnCloseShoppingBuilder.addEventListener('click', () => {
    elements.modalShoppingBuilder.classList.add('hidden');
  });

  elements.btnConfirmShoppingList.addEventListener('click', async () => {
    const items = Object.values(candidates)
      .filter(item => item.included)
      .map(item => ({ name: item.name, quantityText: quantityTextFor(item) }));

    elements.modalShoppingBuilder.classList.add('hidden');

    state.shoppingListItems = items;
    localStorage.setItem('cache_shopping_items', JSON.stringify(state.shoppingListItems));
    renderShoppingList();
    updateShoppingBadge();

    try {
      await callApi('generateShoppingList', { items });
      showNotification('Inköpslistan byggd!', 'success');
    } catch (err) {
      console.error('Failed to sync generated shopping list:', err);
    }
  });
}

function quantityTextFor(item) {
  if (item.amount) return `${roundAmount(item.amount)} ${item.unit}`.trim();
  return item.unit || '';
}

function openShoppingBuilder() {
  candidates = buildCandidates();
  renderBuilderList();
  elements.modalShoppingBuilder.classList.remove('hidden');
}

// Aggregates ingredients from every recipe currently planned this week,
// summing matching amounts (same name+unit) across days.
function buildCandidates() {
  const aggregated = {};

  state.weeklyPlan.forEach(dayPlan => {
    if (!dayPlan.recipe_id) return;
    const recipe = state.recipes.find(r => r.id === dayPlan.recipe_id);
    if (!recipe) return;

    // Scale each ingredient from the recipe's base serving count to however
    // many portions this specific day is planned for.
    const dayServings = parseInt(dayPlan.servings, 10) || state.defaultServings;
    const baseServings = recipe.servings || DEFAULT_SERVINGS;
    const scale = dayServings / baseServings;

    recipe.ingredients.forEach(ing => {
      const name = ing.name.trim().toLowerCase();
      const unit = ing.unit ? ing.unit.trim().toLowerCase() : '';
      const key = `${name}_${unit}`;
      const parsedAmount = parseAmountVal(ing.amount);
      const amountVal = parsedAmount !== null ? parsedAmount * scale : null;
      const isBaseline = state.baselineItems.includes(name);

      if (aggregated[key]) {
        if (amountVal !== null && aggregated[key].amount !== null) {
          aggregated[key].amount += amountVal;
        }
        if (recipe.needsReview) aggregated[key].needsReview = true;
      } else {
        aggregated[key] = {
          name: ing.name.trim(),
          amount: amountVal,
          unit: ing.unit || '',
          isBaseline,
          needsReview: !!recipe.needsReview,
          // Baseline items default unchecked (matches the old "hide baseline" behaviour);
          // everything else defaults checked (you probably need it).
          included: !isBaseline
        };
      }
    });
  });

  return aggregated;
}

function renderBuilderList() {
  elements.shoppingBuilderList.innerHTML = '';

  const items = Object.values(candidates).sort((a, b) => a.name.localeCompare(b.name, 'sv'));

  if (items.length === 0) {
    elements.shoppingBuilderList.innerHTML = `
      <div class="tinder-empty-state">
        <i data-lucide="calendar-x" class="empty-icon"></i>
        <p>Inga recept planerade för veckan än. Planera veckomenyn först.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `shopping-item ${item.included ? 'checked' : ''}`;

    const warningIcon = item.needsReview
      ? '<i data-lucide="alert-triangle" class="shopping-item-needs-review-icon" title="Från ett recept som behöver granskas"></i>'
      : '';

    let qtyHtml = '';
    const qtyText = quantityTextFor(item);
    if (qtyText) {
      qtyHtml = `<span class="shopping-item-quantity">${escapeHtml(qtyText)}</span>`;
    }

    card.innerHTML = `
      <div class="shopping-item-left">
        <div class="shopping-checkbox">
          <i data-lucide="check"></i>
        </div>
        ${warningIcon}
        <span class="shopping-item-name">${escapeHtml(item.name)}</span>
      </div>
      <div class="shopping-item-right">
        ${qtyHtml}
      </div>
    `;

    card.addEventListener('click', () => {
      item.included = !item.included;
      card.classList.toggle('checked', item.included);
    });

    elements.shoppingBuilderList.appendChild(card);
  });

  lucide.createIcons();
}
