// ==========================================
// Settings Logic
// ==========================================
import { state, isConfigured } from '../state.js';
import { elements } from '../dom.js';
import { callApi, fetchData } from '../api.js';
import { showNotification } from '../utils.js';
import { renderShoppingList, updateShoppingBadge } from './shopping.js';

export function initSettingsView() {
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

    if (!url || !key) {
      showConnectionMsg('Fyll i både URL och API-nyckel för att testa!', 'error');
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

  // Show/hide QR code to link a new device without manual typing
  elements.btnShowQr.addEventListener('click', () => {
    const isHidden = elements.qrCodeWrapper.classList.contains('hidden');

    if (!isHidden) {
      elements.qrCodeWrapper.classList.add('hidden');
      return;
    }

    if (!isConfigured()) {
      showNotification('Spara dina inställningar innan du skapar en QR-kod.', 'error');
      return;
    }

    const deviceLinkUrl = `${window.location.origin}${window.location.pathname}?${new URLSearchParams({
      configUrl: state.config.webAppUrl,
      configKey: state.config.apiKey
    })}`;

    QRCode.toCanvas(elements.qrCodeCanvas, deviceLinkUrl, { width: 220, margin: 1 }, (err) => {
      if (err) {
        console.error('QR generation failed:', err);
        showNotification('Kunde inte skapa QR-koden.', 'error');
        return;
      }
      elements.qrCodeWrapper.classList.remove('hidden');
    });
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
