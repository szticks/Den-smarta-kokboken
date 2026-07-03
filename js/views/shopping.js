// ==========================================
// Shopping List & Pantry Logic
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { callApi } from '../api.js';
import { escapeHtml, showNotification } from '../utils.js';

// Combines the deliberately-built shopping list (see modals/shoppingBuilder.js)
// with any pantry items flagged "slut i skafferiet" since it was built - those
// show up immediately rather than waiting for the next rebuild.
function getDisplayItems() {
  const items = state.shoppingListItems.map(item => {
    const isPantryOut = state.pantryFlags.includes(item.name.trim().toLowerCase());
    return {
      name: item.name,
      quantityText: isPantryOut ? 'SLUT!' : item.quantityText,
      isPantryOut
    };
  });

  state.pantryFlags.forEach(itemName => {
    const name = itemName.trim().toLowerCase();
    const alreadyIncluded = items.some(item => item.name.toLowerCase() === name);
    if (!alreadyIncluded) {
      items.push({ name: itemName.trim(), quantityText: 'SLUT!', isPantryOut: true });
    }
  });

  return items;
}

export function renderShoppingList() {
  elements.shoppingListWrapper.innerHTML = '';

  const shoppingItems = getDisplayItems();

  // Sort items: show pantry-flagged items first, then alphabetically
  shoppingItems.sort((a, b) => {
    if (a.isPantryOut && !b.isPantryOut) return -1;
    if (!a.isPantryOut && b.isPantryOut) return 1;
    return a.name.localeCompare(b.name, 'sv');
  });

  if (shoppingItems.length === 0) {
    elements.shoppingListWrapper.innerHTML = `
      <div class="tinder-empty-state">
        <i data-lucide="smile" class="empty-icon"></i>
        <p>Inköpslistan är tom. Klicka på "Bygg inköpslista" för att skapa en från veckoplanen.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  shoppingItems.forEach(item => {
    const isChecked = !!state.shoppingListChecked[item.name.toLowerCase()];

    const card = document.createElement('div');
    card.className = `shopping-item ${isChecked ? 'checked' : ''}`;

    let qtyHtml = '';
    if (item.isPantryOut) {
      qtyHtml = `<span class="shopping-item-quantity" style="background-color:rgba(249,115,22,0.12); color:var(--color-accent-orange);">SLUT!</span>`;
    } else if (item.quantityText) {
      qtyHtml = `<span class="shopping-item-quantity">${escapeHtml(item.quantityText)}</span>`;
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
          quantityText: item.quantityText
        });
      } catch (err) {
        console.error('Failed to sync shopping item state:', err);
      }
    });

    elements.shoppingListWrapper.appendChild(card);
  });

  lucide.createIcons();
}

export function updateShoppingBadge() {
  // Badge shows number of UNCHECKED items on the shopping list
  const items = getDisplayItems();
  const uncheckedCount = items.filter(item => !state.shoppingListChecked[item.name.toLowerCase()]).length;

  if (uncheckedCount > 0) {
    elements.shoppingBadge.innerText = uncheckedCount;
    elements.shoppingBadge.classList.remove('hidden');
  } else {
    elements.shoppingBadge.classList.add('hidden');
  }
}

export function initShoppingView() {
  // "Slutför inköp" click
  elements.btnCompleteShopping.addEventListener('click', async () => {
    if (confirm('Vill du markera inköpsrundan som klar? Detta nollställer skafferiflaggor, avbockningar och den byggda inköpslistan - du bygger en ny nästa vecka.')) {
      // Clear locally
      state.pantryFlags = [];
      state.shoppingListChecked = {};
      state.shoppingListItems = [];
      localStorage.setItem('cache_pantry_flags', JSON.stringify(state.pantryFlags));
      localStorage.setItem('cache_shopping_checked', JSON.stringify(state.shoppingListChecked));
      localStorage.setItem('cache_shopping_items', JSON.stringify(state.shoppingListItems));

      renderShoppingList();
      updateShoppingBadge();

      // Sync online
      try {
        showNotification('Rensar inköpslistan på Google Sheets...', 'info');
        await callApi('clearPantryFlags');
        await callApi('clearShoppingListState');
        await callApi('clearShoppingListItems');
        showNotification('Inköp slutfört! Bygg en ny lista nästa vecka.', 'success');
      } catch (err) {
        console.error('Failed to sync complete shopping:', err);
      }
    }
  });
}
