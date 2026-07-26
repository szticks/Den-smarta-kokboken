// ==========================================
// Automated Setup Wizard Modal
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { callApi, fetchData } from '../api.js';
import { showNotification, escapeHtml } from '../utils.js';
import { getValidAccessToken, getSignedInEmail, signInWithGoogle } from '../googleAuth.js';
import { provisionBackend, listExistingSpreadsheets } from '../googleProvision.js';

let provisionedWebAppUrl = null;

export function initSetupWizardModal() {
  elements.btnOpenSetupWizard.addEventListener('click', () => {
    resetWizard();
    elements.modalSetupWizard.classList.remove('hidden');
  });

  elements.btnCloseSetupWizard.addEventListener('click', () => {
    elements.modalSetupWizard.classList.add('hidden');
  });

  elements.btnStartProvisioning.addEventListener('click', async () => {
    let accessToken = getValidAccessToken();
    let email = getSignedInEmail();

    if (!accessToken) {
      try {
        const signInResult = await signInWithGoogle();
        accessToken = signInResult.accessToken;
        email = signInResult.email;
      } catch (err) {
        console.error('Google sign-in failed:', err);
        showNotification('Google-inloggning krävs för att skapa en backend automatiskt.', 'error');
        return;
      }
    }

    elements.setupWizardIntro.classList.add('hidden');
    elements.setupWizardProgress.classList.remove('hidden');
    elements.setupWizardLog.innerHTML = '';
    elements.btnStartProvisioning.disabled = true;

    try {
      const result = await provisionBackend(accessToken, email, logStep);
      provisionedWebAppUrl = result.webAppUrl;

      logStep('Klart! Ett sista steg återstår.');
      elements.setupWizardScriptLink.href = result.scriptEditorUrl;
      elements.setupWizardProgress.classList.add('hidden');
      elements.setupWizardResult.classList.remove('hidden');
    } catch (err) {
      console.error('Provisioning failed:', err);
      logStep(`Fel: ${err.message}`, true);
      elements.btnStartProvisioning.disabled = false;
      elements.setupWizardIntro.classList.remove('hidden');
    }
  });

  elements.btnFinishProvisioning.addEventListener('click', () => {
    if (!provisionedWebAppUrl) return;
    testAndSaveConnection(provisionedWebAppUrl, ' Har du kört funktionen och godkänt behörigheterna?');
  });

  elements.btnListExistingSheets.addEventListener('click', async () => {
    let accessToken = getValidAccessToken();

    if (!accessToken) {
      try {
        const signInResult = await signInWithGoogle();
        accessToken = signInResult.accessToken;
      } catch (err) {
        console.error('Google sign-in failed:', err);
        showNotification('Google-inloggning krävs för att hitta dina tidigare kokböcker.', 'error');
        return;
      }
    }

    elements.setupWizardIntro.classList.add('hidden');
    elements.setupWizardExisting.classList.remove('hidden');
    elements.setupWizardExistingList.innerHTML = '<p class="subtitle">Söker...</p>';

    try {
      const sheets = await listExistingSpreadsheets(accessToken);
      renderExistingSheets(sheets);
    } catch (err) {
      console.error('Listing existing spreadsheets failed:', err);
      elements.setupWizardExistingList.innerHTML = `<p class="subtitle">Kunde inte hämta listan: ${escapeHtml(err.message)}</p>`;
    }
  });

  elements.btnBackToIntro.addEventListener('click', () => {
    elements.setupWizardExisting.classList.add('hidden');
    elements.setupWizardIntro.classList.remove('hidden');
  });
}

function renderExistingSheets(sheets) {
  if (!sheets.length) {
    elements.setupWizardExistingList.innerHTML = '<p class="subtitle">Inga tidigare skapade kokböcker hittades på det här kontot. (Kokböcker skapade innan den här funktionen fanns syns tyvärr inte här.)</p>';
    return;
  }

  elements.setupWizardExistingList.innerHTML = '';
  sheets.forEach((sheet) => {
    const createdLabel = sheet.createdTime ? new Date(sheet.createdTime).toLocaleString('sv-SE') : '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-full setup-wizard-existing-item';
    btn.innerHTML = `<span>${escapeHtml(sheet.name)}</span><small>${escapeHtml(createdLabel)}</small>`;
    btn.addEventListener('click', () => testAndSaveConnection(sheet.webAppUrl));
    elements.setupWizardExistingList.appendChild(btn);
  });
}

async function testAndSaveConnection(webAppUrl, failureHint = '') {
  elements.settingsAppUrl.value = webAppUrl;
  localStorage.setItem('smarta_kokboken_url', webAppUrl);
  state.config.webAppUrl = webAppUrl;

  try {
    const result = await callApi('ping');
    if (result.success) {
      showNotification('Anslutningen fungerar! Din kokbok är redo.', 'success');
      elements.modalSetupWizard.classList.add('hidden');
      fetchData();
    } else {
      showNotification(`Kopplingen svarade men något är fel.${failureHint}`, 'error');
    }
  } catch (err) {
    console.error('Connection test failed:', err);
    showNotification(`Kunde inte ansluta: ${err.message}${failureHint}`, 'error');
  }
}

function logStep(text, isError = false) {
  const line = document.createElement('div');
  line.className = isError ? 'setup-wizard-log-line error' : 'setup-wizard-log-line';
  line.innerText = text;
  elements.setupWizardLog.appendChild(line);
}

function resetWizard() {
  provisionedWebAppUrl = null;
  elements.btnStartProvisioning.disabled = false;
  elements.setupWizardIntro.classList.remove('hidden');
  elements.setupWizardExisting.classList.add('hidden');
  elements.setupWizardExistingList.innerHTML = '';
  elements.setupWizardProgress.classList.add('hidden');
  elements.setupWizardResult.classList.add('hidden');
  elements.setupWizardLog.innerHTML = '';
}
