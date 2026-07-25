// ==========================================
// SMARTA KOKBOKEN - APPLICATION ENTRY POINT (v1.3)
// ==========================================
import { state, isConfigured } from './state.js';
import { elements, initElements } from './dom.js';
import { loadLocalConfig } from './storage.js';
import { switchView } from './router.js';
import { updateNetworkStatus, fetchData } from './api.js';
import { showNotification } from './utils.js';

import { initDashboardView } from './views/dashboard.js';
import { initTinderView } from './views/tinder.js';
import { initLibraryView } from './views/library.js';
import { initShoppingView } from './views/shopping.js';
import { initSettingsView } from './views/settings.js';

import { initRecipeDetailModal } from './modals/recipeDetail.js';
import { initRecipeFormModal } from './modals/recipeForm.js';
import { initDayChooserModal } from './modals/dayChooser.js';
import { initQuickPantryModal } from './modals/quickPantry.js';
import { initShoppingBuilderModal } from './modals/shoppingBuilder.js';
import { initSetupWizardModal } from './modals/setupWizard.js';

// Populate elements and load config immediately, mirroring the previous
// single-file boot order (this script is loaded at the bottom of index.html).
initElements();
loadLocalConfig();

// Wire up all view/modal event listeners now that `elements` is populated.
initDashboardView();
initTinderView();
initLibraryView();
initShoppingView();
initSettingsView();
initRecipeDetailModal();
initRecipeFormModal();
initDayChooserModal();
initQuickPantryModal();
initShoppingBuilderModal();
initSetupWizardModal();

function setupNavigation() {
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.targetView));
  });

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  updateNetworkStatus();

  // Navigate to initial view
  switchView(state.currentView);

  // Initial load from Google Sheets
  if (isConfigured()) {
    fetchData();
  } else {
    // If not configured, force settings view
    switchView('view-settings');
    showNotification('Välkommen! Konfigurera din anslutning till Google Sheets för att starta.', 'info');
  }
});
