// ==========================================
// Navigation & Routing
// ==========================================
import { state } from './state.js';
import { elements } from './dom.js';
import { renderDashboard } from './views/dashboard.js';
import { initTinderDeck } from './views/tinder.js';
import { renderLibrary } from './views/library.js';
import { renderShoppingList } from './views/shopping.js';

export function switchView(viewId) {
  state.currentView = viewId;

  // Update view visibility
  elements.views.forEach(view => {
    view.classList.toggle('active', view.id === viewId);
  });

  // Update nav item active status
  elements.navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.targetView === viewId);
  });

  // Trigger lifecycle loaders
  if (viewId === 'view-dashboard') {
    renderDashboard();
  } else if (viewId === 'view-tinder') {
    initTinderDeck();
  } else if (viewId === 'view-library') {
    renderLibrary();
  } else if (viewId === 'view-shopping') {
    renderShoppingList();
  }

  // Close any open modals
  closeAllModals();
}

export function closeAllModals() {
  elements.modalRecipeDetail.classList.add('hidden');
  elements.modalDayChooser.classList.add('hidden');
  elements.modalRecipeForm.classList.add('hidden');
  elements.modalQuickPantry.classList.add('hidden');
}
