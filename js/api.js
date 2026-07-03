// ==========================================
// Network & API Layer
// ==========================================
import { state, isConfigured } from './state.js';
import { elements } from './dom.js';
import { showNotification } from './utils.js';
import { switchView } from './router.js';
import { updateShoppingBadge } from './views/shopping.js';

// Actions that mutate server state and must be queued while offline
const SYNC_ACTIONS = [
  'saveRecipe', 'deleteRecipe', 'updateWeeklyPlan', 'updatePantryFlag',
  'clearPantryFlags', 'updateShoppingListItem', 'clearShoppingListState'
];

// Actions that intentionally return { success: false, message, ... } as a normal,
// inspectable result (e.g. "couldn't find a recipe on this page") rather than a
// technical failure - the caller checks result.success itself, so callApi must not
// convert this into a thrown error (that would discard the real message).
const SOFT_FAILURE_ACTIONS = ['scrapeRecipe', 'ocrRecipe'];

export async function callApi(action, payload = {}) {
  if (!isConfigured()) {
    throw new Error('Google Apps Script anslutning är inte konfigurerad.');
  }

  if (!state.isOnline) {
    if (SYNC_ACTIONS.includes(action)) {
      queueOfflineAction(action, payload);
    }
    throw new Error('OFFLINE_MODE');
  }

  try {
    updateSyncStatus('syncing');

    // We send payload, token, and action inside the POST body
    const response = await fetch(state.config.webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain' // Using text/plain prevents CORS preflight OPTIONS request in some setups, making Apps Script calls faster and more reliable
      },
      body: JSON.stringify({
        action,
        token: state.config.apiKey,
        payload
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.success === false && !SOFT_FAILURE_ACTIONS.includes(action)) {
      throw new Error(result.error || result.message || 'Okänt serverfel');
    }

    updateSyncStatus('online');
    return result;
  } catch (err) {
    console.error(`API Error on ${action}:`, err);
    updateSyncStatus('offline');

    if (err.message !== 'OFFLINE_MODE' && SYNC_ACTIONS.includes(action)) {
      queueOfflineAction(action, payload);
    }

    throw err;
  }
}

export function updateSyncStatus(status) {
  elements.syncStatus.className = 'sync-status';

  if (status === 'online') {
    elements.syncStatus.classList.add('status-online');
    elements.syncStatus.innerHTML = '<i data-lucide="cloud"></i> Synkad';
  } else if (status === 'syncing') {
    elements.syncStatus.classList.add('status-syncing');
    elements.syncStatus.innerHTML = '<span class="spinner"></span> Synkar...';
  } else {
    elements.syncStatus.classList.add('status-offline');
    elements.syncStatus.innerHTML = '<i data-lucide="cloud-off"></i> Offline';
  }

  lucide.createIcons();
}

export function updateNetworkStatus() {
  state.isOnline = navigator.onLine;
  if (state.isOnline) {
    updateSyncStatus('online');
    processOfflineQueue();
  } else {
    updateSyncStatus('offline');
  }
}

// Offline Queue Handlers
function queueOfflineAction(action, payload) {
  state.offlineQueue.push({ action, payload, timestamp: Date.now() });
  localStorage.setItem('offline_queue', JSON.stringify(state.offlineQueue));
  showNotification('Ändringen sparades lokalt (Offline-läge)', 'warning');
}

async function processOfflineQueue() {
  if (state.offlineQueue.length === 0 || !state.isOnline) return;

  const queueToProcess = [...state.offlineQueue];
  state.offlineQueue = [];
  localStorage.setItem('offline_queue', JSON.stringify([]));

  showNotification(`Synkar ${queueToProcess.length} ändringar till Google Sheets...`, 'info');
  updateSyncStatus('syncing');

  let successCount = 0;
  for (const item of queueToProcess) {
    try {
      await callApi(item.action, item.payload);
      successCount++;
    } catch (err) {
      // If a call fails again, put it back in the queue
      state.offlineQueue.push(item);
      console.error('Failed to sync offline item, putting back in queue:', item, err);
    }
  }

  localStorage.setItem('offline_queue', JSON.stringify(state.offlineQueue));

  if (successCount > 0) {
    showNotification(`${successCount} ändringar synkade framgångsrikt!`, 'success');
    fetchData(); // Reload fresh data from sheets
  } else {
    updateSyncStatus('offline');
  }
}

// Data Fetching
export async function fetchData() {
  if (!isConfigured()) return;

  try {
    const recipesResult = await callApi('getRecipes');
    state.recipes = recipesResult.recipes || [];
    localStorage.setItem('cache_recipes', JSON.stringify(state.recipes));

    const planResult = await callApi('getWeeklyPlan');
    state.weeklyPlan = planResult.plan || [];
    localStorage.setItem('cache_weekly_plan', JSON.stringify(state.weeklyPlan));

    const pantryResult = await callApi('getPantryFlags');
    state.pantryFlags = pantryResult.flagged || [];
    localStorage.setItem('cache_pantry_flags', JSON.stringify(state.pantryFlags));

    const shoppingListStateResult = await callApi('getShoppingListState');
    state.shoppingListChecked = shoppingListStateResult.checkedItems || {};
    localStorage.setItem('cache_shopping_checked', JSON.stringify(state.shoppingListChecked));

    // Refresh current view
    switchView(state.currentView);
    updateShoppingBadge();
  } catch (err) {
    console.warn('Could not fetch online data, using local cache:', err);
    // Render current view from loaded caches
    switchView(state.currentView);
    updateShoppingBadge();
  }
}
