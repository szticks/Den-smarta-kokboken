// ==========================================
// Automated Setup Wizard Modal
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { callApi, fetchData } from '../api.js';
import { showNotification } from '../utils.js';
import { getValidAccessToken, getSignedInEmail, signInWithGoogle } from '../googleAuth.js';
import { provisionBackend } from '../googleProvision.js';

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

  elements.btnFinishProvisioning.addEventListener('click', async () => {
    if (!provisionedWebAppUrl) return;

    elements.settingsAppUrl.value = provisionedWebAppUrl;
    localStorage.setItem('smarta_kokboken_url', provisionedWebAppUrl);
    state.config.webAppUrl = provisionedWebAppUrl;

    try {
      const result = await callApi('ping');
      if (result.success) {
        showNotification('Anslutningen fungerar! Din kokbok är redo.', 'success');
        elements.modalSetupWizard.classList.add('hidden');
        fetchData();
      } else {
        showNotification('Kopplingen svarade men något är fel - har du kört funktionen och godkänt behörigheterna?', 'error');
      }
    } catch (err) {
      console.error('Post-provisioning connection test failed:', err);
      showNotification(`Kunde inte ansluta ännu: ${err.message}. Har du kört funktionen och godkänt behörigheterna?`, 'error');
    }
  });
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
  elements.setupWizardProgress.classList.add('hidden');
  elements.setupWizardResult.classList.add('hidden');
  elements.setupWizardLog.innerHTML = '';
}
