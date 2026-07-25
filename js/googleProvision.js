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
  const data = await response.json();
  if (!response.ok) {
    const message = (data.error && (data.error.message || data.error)) || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
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

// Runs the whole setup end to end, reporting progress via onProgress(stepLabel).
export async function provisionBackend(accessToken, email, onProgress) {
  onProgress('Hämtar backend-koden...');
  const files = await fetchBackendSourceFiles();

  onProgress('Skapar ditt Google Sheet...');
  const spreadsheetId = await createSpreadsheet(accessToken, 'Smarta Kokboken');

  onProgress('Fyller i grundstrukturen i arket...');
  const legacyApiKey = generateLegacyKey();
  await setUpInitialSheetData(accessToken, spreadsheetId, email, legacyApiKey);

  onProgress('Skapar Apps Script-projektet...');
  const scriptId = await createBoundScript(accessToken, 'Smarta Kokboken Engine', spreadsheetId);

  onProgress('Laddar upp backend-koden...');
  await pushBackendFiles(accessToken, scriptId, files);

  onProgress('Driftsätter som webbapp...');
  const { webAppUrl } = await createDeployment(accessToken, scriptId);

  return {
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    scriptEditorUrl: `https://script.google.com/d/${scriptId}/edit`,
    webAppUrl
  };
}
