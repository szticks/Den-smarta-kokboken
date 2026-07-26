// ==========================================
// Automated backend provisioning
// ==========================================
// Creates a brand-new Google Sheet + bound Apps Script project, pushes this
// repo's backend/ code into it, and deploys it as a web app - the same
// steps as the manual README setup, done via the Drive/Apps Script/Sheets
// REST APIs instead of copy-pasting through the Apps Script editor.
const BACKEND_FILES = [
  'Router', 'Recipes', 'WeeklyPlan', 'Pantry', 'ShoppingList', 'Scraper', 'OcrRecipe', 'RecipeImage'
];

async function apiFetch(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  // DELETE requests return an empty 204 body, which response.json() can't parse.
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = (data.error && (data.error.message || data.error)) || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

// Deleting the spreadsheet also takes its bound Apps Script project with it,
// since a container-bound script is stored as part of the spreadsheet file.
async function deleteSpreadsheet(accessToken, spreadsheetId) {
  await apiFetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}`, accessToken, { method: 'DELETE' });
}

// Fetches this app's own backend/*.js source straight from the origin it's
// running on (works identically for a self-hosted fork, no hardcoded repo).
async function fetchBackendSourceFiles() {
  const jsFiles = await Promise.all(
    BACKEND_FILES.map(async (name) => {
      const res = await fetch(`./backend/${name}.js`);
      if (!res.ok) throw new Error(`Kunde inte hämta backend/${name}.js (${res.status})`);
      return { name, type: 'SERVER_JS', source: await res.text() };
    })
  );

  const manifestRes = await fetch('./backend/appsscript.json');
  if (!manifestRes.ok) throw new Error('Kunde inte hämta backend/appsscript.json');
  const manifest = { name: 'appsscript', type: 'JSON', source: await manifestRes.text() };

  return [...jsFiles, manifest];
}

async function createSpreadsheet(accessToken, title) {
  const data = await apiFetch('https://www.googleapis.com/drive/v3/files', accessToken, {
    method: 'POST',
    body: JSON.stringify({ mimeType: 'application/vnd.google-apps.spreadsheet', name: title })
  });
  return data.id;
}

// Marks a provisioned spreadsheet with private (app-only) metadata so it can
// later be found again via listExistingSpreadsheets(), e.g. after the user
// clears their browser data and loses the saved web app URL. Best-effort -
// a failure here shouldn't undo an otherwise-successful provisioning run.
async function tagSpreadsheetMetadata(accessToken, spreadsheetId, scriptId, webAppUrl) {
  await apiFetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({
      appProperties: { smartaKokboken: 'true', scriptId, webAppUrl }
    })
  });
}

// Finds spreadsheets this Google account has previously provisioned through
// this app (tagged via tagSpreadsheetMetadata). Only sees files the app
// itself created, per the drive.file scope - not the user's whole Drive.
export async function listExistingSpreadsheets(accessToken) {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='smartaKokboken' and value='true' } and trashed=false",
    fields: 'files(id,name,createdTime,appProperties)',
    orderBy: 'createdTime desc'
  });
  const data = await apiFetch(`https://www.googleapis.com/drive/v3/files?${params}`, accessToken);
  return (data.files || [])
    .map((file) => ({
      id: file.id,
      name: file.name,
      createdTime: file.createdTime,
      webAppUrl: file.appProperties && file.appProperties.webAppUrl
    }))
    .filter((sheet) => sheet.webAppUrl);
}

async function createBoundScript(accessToken, title, parentId) {
  const data = await apiFetch('https://script.googleapis.com/v1/projects', accessToken, {
    method: 'POST',
    body: JSON.stringify({ title, parentId })
  });
  return data.scriptId;
}

async function pushBackendFiles(accessToken, scriptId, files) {
  await apiFetch(`https://script.googleapis.com/v1/projects/${scriptId}/content`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ files })
  });
}

async function createDeployment(accessToken, scriptId) {
  const version = await apiFetch(`https://script.googleapis.com/v1/projects/${scriptId}/versions`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ description: 'Automatisk uppsättning' })
  });

  const deployment = await apiFetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      versionNumber: version.versionNumber,
      manifestFileName: 'appsscript',
      description: 'Smarta Kokboken'
    })
  });

  const details = await apiFetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments/${deployment.deploymentId}`, accessToken);
  const webAppEntry = (details.entryPoints || []).find(ep => ep.entryPointType === 'WEB_APP' && ep.webApp && ep.webApp.url);
  if (!webAppEntry) {
    throw new Error('Driftsättningen lyckades men ingen webbapps-URL hittades.');
  }

  return { deploymentId: deployment.deploymentId, webAppUrl: webAppEntry.webApp.url };
}

// Builds the same sheet tabs/headers that Router.js's initializeSpreadsheet()
// would create on first use - done up front via the Sheets API so the
// backend is immediately ready and the user's email is set without them
// ever having to open the sheet and type it in themselves.
async function setUpInitialSheetData(accessToken, spreadsheetId, authorizedEmail, legacyApiKey) {
  const days = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

  await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        { addSheet: { properties: { title: 'Settings' } } },
        { addSheet: { properties: { title: 'Recipes' } } },
        { addSheet: { properties: { title: 'WeeklyPlan' } } },
        { addSheet: { properties: { title: 'PantryFlags' } } },
        { addSheet: { properties: { title: 'ShoppingListState' } } },
        { addSheet: { properties: { title: 'ShoppingListItems' } } },
        { deleteSheet: { sheetId: 0 } } // the default first sheet every new spreadsheet starts with
      ]
    })
  });

  await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        { range: 'Settings!A1:B3', values: [['API_KEY', legacyApiKey], ['VERSION', '1.3'], ['AUTHORIZED_EMAIL', authorizedEmail]] },
        { range: 'Recipes!A1:I1', values: [['id', 'title', 'ingredients', 'instructions', 'tags', 'url', 'image', 'created_at', 'needs_review']] },
        {
          range: 'WeeklyPlan!A1:D8',
          values: [['day_index', 'day_name', 'recipe_id', 'recipe_title'], ...days.map((d, i) => [i, d, '', ''])]
        },
        { range: 'PantryFlags!A1:C1', values: [['item_name', 'flagged_for_purchase', 'updated_at']] },
        { range: 'ShoppingListState!A1:C1', values: [['item_name', 'checked', 'quantity_text']] },
        { range: 'ShoppingListItems!A1:B1', values: [['item_name', 'quantity_text']] }
      ]
    })
  });
}

function generateLegacyKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

// Stamps a creation timestamp into the Sheet/script names so repeated or
// duplicate provisioning runs can actually be told apart in Drive.
function formatTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Runs the whole setup end to end, reporting progress via onProgress(stepLabel).
export async function provisionBackend(accessToken, email, onProgress) {
  onProgress('Hämtar backend-koden...');
  const files = await fetchBackendSourceFiles();

  const timestamp = formatTimestamp();

  onProgress('Skapar ditt Google Sheet...');
  const spreadsheetId = await createSpreadsheet(accessToken, `Smarta Kokboken (${timestamp})`);

  try {
    onProgress('Fyller i grundstrukturen i arket...');
    const legacyApiKey = generateLegacyKey();
    await setUpInitialSheetData(accessToken, spreadsheetId, email, legacyApiKey);

    onProgress('Skapar Apps Script-projektet...');
    const scriptId = await createBoundScript(accessToken, `Smarta Kokboken Engine (${timestamp})`, spreadsheetId);

    onProgress('Laddar upp backend-koden...');
    await pushBackendFiles(accessToken, scriptId, files);

    onProgress('Driftsätter som webbapp...');
    const { webAppUrl } = await createDeployment(accessToken, scriptId);

    await tagSpreadsheetMetadata(accessToken, spreadsheetId, scriptId, webAppUrl).catch((tagErr) => {
      console.warn('Could not tag spreadsheet for later reconnection:', tagErr);
    });

    return {
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      scriptEditorUrl: `https://script.google.com/d/${scriptId}/edit`,
      webAppUrl
    };
  } catch (err) {
    // Avoid leaving an orphaned half-set-up Sheet behind on failure - clean up
    // and let the user retry from a blank slate instead of piling up duplicates.
    onProgress('Något gick fel - städar upp det påbörjade arket...', true);
    await deleteSpreadsheet(accessToken, spreadsheetId).catch((cleanupErr) => {
      console.error('Cleanup failed:', cleanupErr);
    });
    throw err;
  }
}
