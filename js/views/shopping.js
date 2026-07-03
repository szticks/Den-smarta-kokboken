// ==========================================
// Shopping List & Pantry Logic
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { callApi } from '../api.js';
import { escapeHtml, parseAmountVal, roundAmount, showNotification } from '../utils.js';

// Builds the aggregated shopping list (recipe ingredients + flagged pantry items).
// Shared by rendering, badge counting, and export so the three never drift apart.
function aggregateShoppingItems() {
  const aggregated = {};

  state.weeklyPlan.forEach(dayPlan => {
    if (dayPlan.recipe_id) {
      const recipe = state.recipes.find(r => r.id === dayPlan.recipe_id);
      if (recipe) {
        recipe.ingredients.forEach(ing => {
          const name = ing.name.trim().toLowerCase();
          const unit = ing.unit ? ing.unit.trim().toLowerCase() : '';
          const key = `${name}_${unit}`;

          const amountVal = parseAmountVal(ing.amount);

          if (aggregated[key]) {
            if (amountVal !== null && aggregated[key].amount !== null) {
              aggregated[key].amount += amountVal;
            }
          } else {
            aggregated[key] = {
              name: ing.name.trim(), // Keep capitalization
              amount: amountVal,
              unit: ing.unit || '',
              isBaseline: state.baselineItems.includes(name),
              isPantryOut: state.pantryFlags.includes(name)
            };
          }
        });
      }
    }
  });

  // Add flagged pantry items (slut i skafferiet) that are NOT already in the weekly plan ingredients
  state.pantryFlags.forEach(itemName => {
    const name = itemName.trim().toLowerCase();

    const alreadyAggregated = Object.values(aggregated).some(item => item.name.toLowerCase() === name);

    if (!alreadyAggregated) {
      const key = `${name}_pantry`;
      aggregated[key] = {
        name: itemName.trim(),
        amount: null,
        unit: '',
        isBaseline: true,
        isPantryOut: true
      };
    } else {
      Object.keys(aggregated).forEach(k => {
        if (aggregated[k].name.toLowerCase() === name) {
          aggregated[k].isPantryOut = true;
        }
      });
    }
  });

  return Object.values(aggregated);
}

function quantityText(item) {
  if (item.isPantryOut) return 'SLUT!';
  if (item.amount) return `${roundAmount(item.amount)} ${item.unit}`;
  return '';
}

export function renderShoppingList() {
  elements.shoppingListWrapper.innerHTML = '';

  const shoppingItems = aggregateShoppingItems();

  // Sort items: show pantry-flagged items first, then alphabetically
  shoppingItems.sort((a, b) => {
    if (a.isPantryOut && !b.isPantryOut) return -1;
    if (!a.isPantryOut && b.isPantryOut) return 1;
    return a.name.localeCompare(b.name, 'sv');
  });

  const hideBaseline = elements.toggleHideBaseline.checked;
  let visibleCount = 0;

  shoppingItems.forEach(item => {
    // Filter out baseline items if "göm basvaror" is checked, UNLESS they have been flagged as "slut" (isPantryOut)
    if (hideBaseline && item.isBaseline && !item.isPantryOut) {
      return; // Skip rendering
    }

    visibleCount++;
    const isChecked = !!state.shoppingListChecked[item.name.toLowerCase()];

    const card = document.createElement('div');
    card.className = `shopping-item ${isChecked ? 'checked' : ''} ${item.isBaseline ? 'is-baseline' : ''}`;

    // Format quantity text
    let qtyHtml = '';
    if (item.isPantryOut) {
      qtyHtml = `<span class="shopping-item-quantity" style="background-color:rgba(249,115,22,0.12); color:var(--color-accent-orange);">SLUT!</span>`;
    } else if (item.amount) {
      qtyHtml = `<span class="shopping-item-quantity">${roundAmount(item.amount)} ${escapeHtml(item.unit)}</span>`;
    } else if (item.unit) {
      qtyHtml = `<span class="shopping-item-quantity">${escapeHtml(item.unit)}</span>`;
    }

    card.innerHTML = `
      <div class="shopping-item-left">
        <div class="shopping-checkbox">
          <i data-lucide="check"></i>
        </div>
        <span class="shopping-item-name">${escapeHtml(item.name)}</span>
      </div>
      <div class="shopping-item-right">
        ${qtyHtml}
      </div>
    `;

    card.addEventListener('click', async () => {
      const newChecked = !isChecked;
      const lowerName = item.name.toLowerCase();

      // Update locally
      state.shoppingListChecked[lowerName] = newChecked;
      localStorage.setItem('cache_shopping_checked', JSON.stringify(state.shoppingListChecked));

      // Toggle class
      card.classList.toggle('checked', newChecked);

      // Update badge
      updateShoppingBadge();

      // Sync online
      try {
        await callApi('updateShoppingListItem', {
          itemName: item.name,
          checked: newChecked,
          quantityText: quantityText(item)
        });
      } catch (err) {
        console.error('Failed to sync shopping item state:', err);
      }
    });

    elements.shoppingListWrapper.appendChild(card);
  });

  if (visibleCount === 0) {
    elements.shoppingListWrapper.innerHTML = `
      <div class="tinder-empty-state">
        <i data-lucide="smile" class="empty-icon"></i>
        <p>Inköpslistan är tom! Du har inga ingredienser inplanerade för veckan och inga basvaror flaggade som slut.</p>
      </div>
    `;
  }

  lucide.createIcons();
}

export function updateShoppingBadge() {
  // Badge shows number of UNCHECKED items on the shopping list
  const aggregated = aggregateShoppingItems();
  const hideBaseline = elements.toggleHideBaseline.checked;
  let uncheckedCount = 0;

  aggregated.forEach(item => {
    if (hideBaseline && item.isBaseline && !item.isPantryOut) return; // Hidden

    const isChecked = !!state.shoppingListChecked[item.name.toLowerCase()];
    if (!isChecked) {
      uncheckedCount++;
    }
  });

  if (uncheckedCount > 0) {
    elements.shoppingBadge.innerText = uncheckedCount;
    elements.shoppingBadge.classList.remove('hidden');
  } else {
    elements.shoppingBadge.classList.add('hidden');
  }
}

export function initShoppingView() {
  elements.toggleHideBaseline.addEventListener('change', () => {
    renderShoppingList();
    updateShoppingBadge();
  });

  // "Slutför inköp" click
  elements.btnCompleteShopping.addEventListener('click', async () => {
    if (confirm('Vill du markera inköpsrundan som klar? Detta kommer att nollställa alla skafferiflaggor och inköpslistans bockar i Google Sheets.')) {
      // Clear locally
      state.pantryFlags = [];
      state.shoppingListChecked = {};
      localStorage.setItem('cache_pantry_flags', JSON.stringify(state.pantryFlags));
      localStorage.setItem('cache_shopping_checked', JSON.stringify(state.shoppingListChecked));

      renderShoppingList();
      updateShoppingBadge();

      // Sync online
      try {
        showNotification('Rensar inköpslistan på Google Sheets...', 'info');
        await callApi('clearPantryFlags');
        await callApi('clearShoppingListState');
        showNotification('Inköp slutfört och skafferiflaggor nollställda!', 'success');
      } catch (err) {
        console.error('Failed to sync complete shopping:', err);
      }
    }
  });
}
