/**
 * "Smarta Kokboken" Backend Engine (v1.3)
 * Detta är ROUTER-filen: HTTP-ingången, autentisering och kalkylarkets schema.
 *
 * Klistra in VARJE fil i backend/-mappen som en egen fil i Extensions -> Apps Script
 * (Fil -> Nytt -> Skript, döp den till samma namn, t.ex. "Router").
 * Alla filer delar samma globala namnrymd i Apps Script, precis som förut.
 * Distribuera som en Webbapp (Web App) med åtkomst "Alla" (Anyone).
 */

function initializeSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Inställningsflik (genererar API-nyckel vid första körning)
  var settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Settings");
    settingsSheet.getRange(1, 1).setValue("API_KEY");
    var token = generateToken(32);
    settingsSheet.getRange(1, 2).setValue(token);
    settingsSheet.getRange(2, 1).setValue("VERSION");
    settingsSheet.getRange(2, 2).setValue("1.3");

    // Formatera inställningssidan för fin design
    settingsSheet.getRange("A1:B2").setFontWeight("bold");
    settingsSheet.getRange("A1:A2").setBackground("#eaeaea");
    settingsSheet.setColumnWidth(1, 120);
    settingsSheet.setColumnWidth(2, 350);
  }

  // Hjälpfunktion för att skapa tabell med kolumner
  var createSheetIfMissing = function(name, headers) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }
    return sheet;
  };

  // 2. Receptflik
  createSheetIfMissing("Recipes", ["id", "title", "ingredients", "instructions", "tags", "url", "image", "created_at"]);

  // 3. Veckoplansflik
  var weeklyPlanSheet = ss.getSheetByName("WeeklyPlan");
  if (!weeklyPlanSheet) {
    weeklyPlanSheet = ss.insertSheet("WeeklyPlan");
    weeklyPlanSheet.appendRow(["day_index", "day_name", "recipe_id", "recipe_title"]);
    weeklyPlanSheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f3f3");
    var days = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
    for (var i = 0; i < 7; i++) {
      weeklyPlanSheet.appendRow([i, days[i], "", ""]);
    }
  }

  // 4. Skafferiflik (för flaggade slut-basvaror)
  createSheetIfMissing("PantryFlags", ["item_name", "flagged_for_purchase", "updated_at"]);

  // 5. Inköpslistans tillstånd
  createSheetIfMissing("ShoppingListState", ["item_name", "checked", "quantity_text"]);
}

function generateToken(length) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ----------------------------------------------------
// HTTP POST Gateway
// ----------------------------------------------------
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);

    // Säkerställ att tabellerna är initierade
    initializeSpreadsheet();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var settingsSheet = ss.getSheetByName("Settings");
    var expectedToken = settingsSheet.getRange(1, 2).getValue();

    // Autentisering
    if (requestData.token !== expectedToken) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Ogiltig API-nyckel. Kontrollera inställningarna i appen."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var action = requestData.action;
    var payload = requestData.payload;
    var result = {};

    switch (action) {
      case "ping":
        result = { success: true, message: "Ansluten till Google Sheets!" };
        break;

      case "scrapeRecipe":
        result = scrapeRecipe(payload.url);
        break;

      case "ocrRecipe":
        result = ocrRecipeFromPhoto(payload.imageBase64, payload.mimeType);
        break;

      case "getRecipes":
        result = getRecipes(ss);
        break;

      case "saveRecipe":
        result = saveRecipe(ss, payload.recipe);
        break;

      case "deleteRecipe":
        result = deleteRecipe(ss, payload.id);
        break;

      case "getWeeklyPlan":
        result = getWeeklyPlan(ss);
        break;

      case "updateWeeklyPlan":
        result = updateWeeklyPlan(ss, payload.plan);
        break;

      case "getPantryFlags":
        result = getPantryFlags(ss);
        break;

      case "updatePantryFlag":
        result = updatePantryFlag(ss, payload.itemName, payload.flagged);
        break;

      case "clearPantryFlags":
        result = clearPantryFlags(ss);
        break;

      case "getShoppingListState":
        result = getShoppingListState(ss);
        break;

      case "updateShoppingListItem":
        result = updateShoppingListItem(ss, payload.itemName, payload.checked, payload.quantityText);
        break;

      case "clearShoppingListState":
        result = clearShoppingListState(ss);
        break;

      default:
        throw new Error("Okänd åtgärd: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------
// Delad hjälpfunktion (används av flera domänfiler)
// ----------------------------------------------------
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var rows = data.slice(1);

  return rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, idx) {
      obj[header] = row[idx];
    });
    return obj;
  });
}
