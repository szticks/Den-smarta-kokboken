// ==========================================
// Google Sign-In (OAuth token client via Google Identity Services)
// ==========================================
// Replaces manual API-key copying: once signed in, the same Google account
// works on any device without re-entering anything. Falls back to the
// legacy shared API key if the user never signs in (see api.js).
const GOOGLE_CLIENT_ID = '348408325511-st7pfd25igmkkos1fe6926i2jlp0i0e3.apps.googleusercontent.com';

// Scopes needed both for everyday identity verification (email) and for the
// automated setup wizard (creating/deploying an Apps Script backend).
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.deployments',
  'https://www.googleapis.com/auth/script.webapp.deploy',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

let tokenClient = null;
let currentAccessToken = null;
let currentTokenExpiry = 0;
let currentEmail = null;

function ensureTokenClient() {
  if (tokenClient) return tokenClient;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: () => {} // overridden per-request in requestAccessToken()
  });
  return tokenClient;
}

// Restore whatever we still have cached from a previous page load (survives
// a refresh within the ~1h token lifetime, avoids re-prompting every time).
function restoreCachedToken() {
  const token = localStorage.getItem('google_access_token');
  const expiry = Number(localStorage.getItem('google_token_expiry') || 0);
  const email = localStorage.getItem('google_account_email');
  if (token && expiry > Date.now()) {
    currentAccessToken = token;
    currentTokenExpiry = expiry;
    currentEmail = email;
  }
}
restoreCachedToken();

function storeToken(accessToken, expiresInSeconds) {
  currentAccessToken = accessToken;
  currentTokenExpiry = Date.now() + expiresInSeconds * 1000;
  localStorage.setItem('google_access_token', currentAccessToken);
  localStorage.setItem('google_token_expiry', String(currentTokenExpiry));
}

async function fetchAndStoreEmail() {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${currentAccessToken}` }
    });
    const data = await response.json();
    currentEmail = data.email || null;
    if (currentEmail) localStorage.setItem('google_account_email', currentEmail);
  } catch (err) {
    console.warn('Could not fetch Google account email:', err);
  }
}

// Opens the Google sign-in/consent popup. Must be called from a user gesture
// (button click) - browsers block popups triggered without one.
export function signInWithGoogle() {
  return new Promise((resolve, reject) => {
    const client = ensureTokenClient();
    client.callback = async (response) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      storeToken(response.access_token, response.expires_in);
      await fetchAndStoreEmail();
      resolve({ accessToken: currentAccessToken, email: currentEmail });
    };
    client.requestAccessToken({ prompt: 'consent' });
  });
}

export function signOutFromGoogle() {
  if (currentAccessToken) {
    google.accounts.oauth2.revoke(currentAccessToken, () => {});
  }
  currentAccessToken = null;
  currentTokenExpiry = 0;
  currentEmail = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_token_expiry');
  localStorage.removeItem('google_account_email');
}

// Returns a still-valid cached token, or null if the user needs to sign in
// again (expired/never signed in). Never triggers a popup itself.
export function getValidAccessToken() {
  if (currentAccessToken && currentTokenExpiry > Date.now()) {
    return currentAccessToken;
  }
  return null;
}

export function isSignedIn() {
  return !!getValidAccessToken();
}

export function getSignedInEmail() {
  return currentEmail;
}
