// ==========================================
// Global Application State
// ==========================================
import { isSignedIn } from './googleAuth.js';

export const state = {
  recipes: [],
  weeklyPlan: [],
  pantryFlags: [],
  shoppingListChecked: {},
  shoppingListItems: [], // the active, deliberately-built shopping list (see "Bygg inköpslista")
  baselineItems: [],
  config: {
    webAppUrl: '',
    apiKey: ''
  },
  currentView: 'view-dashboard',
  isOnline: navigator.onLine,
  offlineQueue: [],

  // Tinder state
  tinderDeck: [],
  currentTinderIndex: 0,
  activeTinderCard: null,
  dragStart: { x: 0, y: 0 },
  dragCurrent: { x: 0, y: 0 },
  isDragging: false
};

// Default Baseline Items (Basvaror som döljs som standard)
export const DEFAULT_BASELINE = [
  "salt", "svartpeppar", "vitpeppar", "olivolja", "rapsolja", "matolja",
  "smör", "strösocker", "vetemjöl", "vatten", "gul lök", "vitlöksklyfta",
  "vitlök", "blandfärs", "mjölk", "grädde", "buljongtärning", "soja"
];

export function isConfigured() {
  return !!(state.config.webAppUrl && (state.config.apiKey || isSignedIn()));
}
