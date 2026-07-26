// ==========================================
// Local persistence (config + offline cache)
// ==========================================
import { state, DEFAULT_BASELINE, DEFAULT_SERVINGS } from './state.js';
import { elements } from './dom.js';

export function loadLocalConfig() {
  state.config.webAppUrl = localStorage.getItem('smarta_kokboken_url') || '';
  state.config.apiKey = localStorage.getItem('smarta_kokboken_key') || '';

  // Load baseline items
  const savedBaseline = localStorage.getItem('smarta_kokboken_baseline');
  if (savedBaseline) {
    state.baselineItems = savedBaseline.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  } else {
    state.baselineItems = DEFAULT_BASELINE;
    localStorage.setItem('smarta_kokboken_baseline', DEFAULT_BASELINE.join(','));
  }

  // Load default household serving size (per-device preference, like baseline items)
  const savedServings = parseInt(localStorage.getItem('smarta_kokboken_default_servings'), 10);
  state.defaultServings = Number.isInteger(savedServings) && savedServings > 0 ? savedServings : DEFAULT_SERVINGS;

  // Pre-fill settings inputs
  elements.settingsAppUrl.value = state.config.webAppUrl;
  elements.settingsApiKey.value = state.config.apiKey;
  elements.settingsBaseline.value = state.baselineItems.join(', ');
  elements.settingsDefaultServings.value = state.defaultServings;

  // Load local state cache
  state.recipes = JSON.parse(localStorage.getItem('cache_recipes') || '[]');
  state.weeklyPlan = JSON.parse(localStorage.getItem('cache_weekly_plan') || '[]');
  state.pantryFlags = JSON.parse(localStorage.getItem('cache_pantry_flags') || '[]');
  state.shoppingListChecked = JSON.parse(localStorage.getItem('cache_shopping_checked') || '{}');
  state.shoppingListItems = JSON.parse(localStorage.getItem('cache_shopping_items') || '[]');
  state.offlineQueue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
}
