// ==========================================
// Pantry drawer (Slut i skafferiet)
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { callApi } from '../api.js';
import { showNotification } from '../utils.js';
import { renderShoppingList, updateShoppingBadge } from '../views/shopping.js';

export function initQuickPantryModal() {
  elements.btnQuickPantry.addEventListener('click', openQuickPantryModal);
  elements.btnQuickPantryShopping.addEventListener('click', openQuickPantryModal);

  elements.btnCloseQuickPantry.addEventListener('click', () => {
    elements.modalQuickPantry.classList.add('hidden');
  });

  // Add custom pantry item
  elements.btnAddCustomPantry.addEventListener('click', async () => {
    const customVal = elements.customPantryItemInput.value.trim();
    if (!customVal) return;

    const lowerItem = customVal.toLowerCase();

    if (state.pantryFlags.includes(lowerItem)) {
      showNotification('Artikeln är redan markerad som slut.', 'info');
      elements.customPantryItemInput.value = '';
      return;
    }

    // Save locally
    state.pantryFlags.push(lowerItem);
    localStorage.setItem('cache_pantry_flags', JSON.stringify(state.pantryFlags));

    elements.customPantryItemInput.value = '';
    elements.modalQuickPantry.classList.add('hidden');

    renderShoppingList();
    updateShoppingBadge();

    // Sync online
    try {
      await callApi('updatePantryFlag', {
        itemName: lowerItem,
        flagged: true
      });
      showNotification(`"${customVal}" tillagd som slut i skafferiet!`, 'success');
    } catch (err) {
      console.error('Failed to sync custom pantry flag:', err);
    }
  });
}

function openQuickPantryModal() {
  renderQuickPantry();
  elements.modalQuickPantry.classList.remove('hidden');
}

function renderQuickPantry() {
  elements.quickPantryGrid.innerHTML = '';

  state.baselineItems.slice(0, 15).forEach(itemName => {
    const isFlagged = state.pantryFlags.includes(itemName);

    const chip = document.createElement('div');
    chip.className = `quick-pantry-chip ${isFlagged ? 'active' : ''}`;
    chip.innerText = itemName;

    chip.addEventListener('click', async () => {
      const newFlagged = !isFlagged;

      // Update locally
      if (newFlagged) {
        state.pantryFlags.push(itemName);
      } else {
        state.pantryFlags = state.pantryFlags.filter(f => f !== itemName);
      }
      localStorage.setItem('cache_pantry_flags', JSON.stringify(state.pantryFlags));

      // Toggle class
      chip.classList.toggle('active', newFlagged);

      // Refresh the shopping list behind the modal (in case it's open on the Inköp tab) and badge
      renderShoppingList();
      updateShoppingBadge();

      // Sync online
      try {
        await callApi('updatePantryFlag', {
          itemName: itemName,
          flagged: newFlagged
        });
      } catch (err) {
        console.error('Failed to sync pantry flag:', err);
      }
    });

    elements.quickPantryGrid.appendChild(chip);
  });
}
