// ==========================================
// Settings Logic
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { callApi, fetchData } from '../api.js';
import { showNotification } from '../utils.js';
import { renderShoppingList, updateShoppingBadge } from './shopping.js';
import { signInWithGoogle, signOutFromGoogle, isSignedIn, getSignedInEmail } from '../googleAuth.js';

export function initSettingsView() {
  updateGoogleSignInStatus();

  elements.btnGoogleSignIn.addEventListener('click', async () => {
    elements.googleSignInLabel.textContent = 'Loggar in...';
    try {
      await signInWithGoogle();
      updateGoogleSignInStatus();
      showNotification('Inloggad med Google!', 'success');

      // If the URL is already filled in, save it and load data now that we're authenticated
      const url = elements.settingsAppUrl.value.trim();
      if (url) {
        localStorage.setItem('smarta_kokboken_url', url);
        state.config.webAppUrl = url;
        fetchData();
      }
    } catch (err) {
      console.error('Google sign-in failed:', err);
      updateGoogleSignInStatus();
      showNotification('Inloggningen misslyckades eller avbröts.', 'error');
    }
  });

  elements.btnGoogleSignOut.addEventListener('click', () => {
    signOutFromGoogle();
    updateGoogleSignInStatus();
    showNotification('Utloggad från Google.', 'info');
  });

  elements.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = elements.settingsAppUrl.value.trim();
    const key = elements.settingsApiKey.value.trim();

    localStorage.setItem('smarta_kokboken_url', url);
    localStorage.setItem('smarta_kokboken_key', key);

    state.config.webAppUrl = url;
    state.config.apiKey = key;

    showNotification('Anslutningsinställningar sparade!', 'success');

    // Try to load fresh data
    fetchData();
  });

  elements.btnTestConnection.addEventListener('click', async () => {
    const url = elements.settingsAppUrl.value.trim();
    const key = elements.settingsApiKey.value.trim();

    if (!url || (!key && !isSignedIn())) {
      showConnectionMsg('Fyll i webbapps-URL:en, och antingen logga in med Google eller ange en API-nyckel.', 'error');
      return;
    }

    try {
      elements.connectionStatusMsg.className = 'connection-status-msg info';
      elements.connectionStatusMsg.innerText = 'Testar koppling...';
      elements.connectionStatusMsg.classList.remove('hidden');

      // Temporarily overwrite state config for test
      const oldUrl = state.config.webAppUrl;
      const oldKey = state.config.apiKey;
      state.config.webAppUrl = url;
      state.config.apiKey = key;

      const result = await callApi('ping');

      // Restore config
      state.config.webAppUrl = oldUrl;
      state.config.apiKey = oldKey;

      if (result.success) {
        showConnectionMsg('Succé! Kopplingen till Google Sheets fungerar.', 'success');
      } else {
        showConnectionMsg('Kopplingen misslyckades: Ogiltigt svar.', 'error');
      }
    } catch (err) {
      showConnectionMsg(`Kopplingen misslyckades: ${err.message}`, 'error');
    }
  });

  // Baseline list save
  elements.btnSaveBaseline.addEventListener('click', () => {
    const text = elements.settingsBaseline.value;
    const list = text.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);

    state.baselineItems = list;
    localStorage.setItem('smarta_kokboken_baseline', list.join(','));

    showNotification('Basvarulista sparad!', 'success');
    renderShoppingList();
    updateShoppingBadge();
  });
}

function showConnectionMsg(msg, type) {
  elements.connectionStatusMsg.className = `connection-status-msg ${type}`;
  elements.connectionStatusMsg.innerText = msg;
  elements.connectionStatusMsg.classList.remove('hidden');
}

function updateGoogleSignInStatus() {
  if (isSignedIn()) {
    elements.googleSignInLabel.textContent = `Inloggad som ${getSignedInEmail() || 'ditt Google-konto'}`;
    elements.googleSignInIcon.setAttribute('data-lucide', 'check-circle-2');
    elements.btnGoogleSignIn.classList.remove('btn-primary');
    elements.btnGoogleSignIn.classList.add('btn-success');
    elements.btnGoogleSignOut.classList.remove('hidden');
  } else {
    elements.googleSignInLabel.textContent = 'Logga in med Google';
    elements.googleSignInIcon.setAttribute('data-lucide', 'log-in');
    elements.btnGoogleSignIn.classList.remove('btn-success');
    elements.btnGoogleSignIn.classList.add('btn-primary');
    elements.btnGoogleSignOut.classList.add('hidden');
  }
  lucide.createIcons();
}
