/**
 * Domän: Fota-recept-flödet. Konverterar ett foto till text via Drives
 * inbyggda OCR (Advanced Drive Service, gratis - kräver ingen egen betald
 * API-nyckel), och gissar sedan vilka rader som är ingredienser
 * respektive instruktioner.
 *
 * OBS: Kräver att "Drive API" är aktiverad som avancerad tjänst i Apps
 * Script-editorn (Tjänster (+) -> Drive API -> Lägg till). Se README.
 *
 * parseIngredientString() återanvänds från Scraper.js (delad namnrymd).
 */

// TEMP: run this manually once from the Apps Script editor (select it in the
// function dropdown next to Run) to force the Drive-permission consent
// screen to appear, since it calls Drive.Files.create unconditionally.
// Safe to delete afterwards - it cleans up its own test file.
function testDriveAuthorization() {
  var blob = Utilities.newBlob('test', 'text/plain', 'auth-test.txt');
  var file = Drive.Files.create({ name: 'Smarta Kokboken - auth test' }, blob);
  Drive.Files.remove(file.id);
  Logger.log('Drive authorization OK');
}

var OCR_SECTION_HEADERS = [
  "ingredienser", "ingredienser:", "tillagning", "tillagning:", "instruktioner",
  "instruktioner:", "gör så här", "gör så här:", "gör såhär", "gör såhär:",
  "recept", "till servering", "till servering:", "så här gör du", "så här gör du:"
];

var OCR_UNIT_WORDS = /\b(dl|g|kg|l|ml|tsk|msk|st|krm|förp|burk|burkar|klyfta|klyftor|skiva|skivor|pkt|påse|påsar|knippe|knippen)\b/i;
var OCR_QUANTITY_START = /^[\d½⅓¼¾]/;

function ocrRecipeFromPhoto(imageBase64, mimeType) {
  var tempFileId = null;
  try {
    if (!imageBase64) {
      throw new Error("Ingen bild mottogs.");
    }

    var blob = Utilities.newBlob(Utilities.base64Decode(imageBase64), mimeType || 'image/jpeg', 'recipe-photo');

    var docFile = Drive.Files.create(
      { name: 'Smarta Kokboken - OCR-temp', mimeType: MimeType.GOOGLE_DOCS },
      blob,
      { ocr: true, ocrLanguage: 'sv' }
    );
    tempFileId = docFile.id;

    var doc = DocumentApp.openById(tempFileId);
    var rawText = doc.getBody().getText();

    return { success: true, recipe: parseOcrTextToRecipe(rawText) };
  } catch (e) {
    return {
      success: false,
      message: "Kunde inte läsa av fotot: " + e.toString(),
      recipe: {
        title: "",
        ingredients: [],
        instructions: [],
        tags: ["Vardagsmat", "Steka/Koka", "Båda"],
        url: "",
        image: ""
      }
    };
  } finally {
    if (tempFileId) {
      try { Drive.Files.remove(tempFileId); } catch (e2) { /* best effort cleanup */ }
    }
  }
}

function parseOcrTextToRecipe(rawText) {
  var lines = rawText.split('\n')
    .map(function(l) { return l.trim(); })
    .filter(function(l) { return l.length > 0; })
    .filter(function(l) { return OCR_SECTION_HEADERS.indexOf(l.toLowerCase()) === -1; });

  var title = "";
  var contentLines = lines;

  if (lines.length > 0) {
    var firstLine = lines[0];
    var firstLineWordCount = firstLine.split(/\s+/).length;
    // Best-effort title guess: the first short line that doesn't look like an ingredient
    if (!isLikelyIngredientLine(firstLine) && firstLineWordCount <= 8) {
      title = firstLine;
      contentLines = lines.slice(1);
    }
  }

  var ingredients = [];
  var instructions = [];

  contentLines.forEach(function(line) {
    if (isLikelyIngredientLine(line)) {
      ingredients.push(parseIngredientString(line));
    } else {
      instructions.push(line);
    }
  });

  return {
    title: title,
    ingredients: ingredients,
    instructions: instructions,
    tags: ["Vardagsmat", "Steka/Koka", "Båda"],
    url: "",
    image: ""
  };
}

function isLikelyIngredientLine(line) {
  var wordCount = line.trim().split(/\s+/).length;
  if (OCR_QUANTITY_START.test(line.trim())) return true;
  if (wordCount <= 6 && OCR_UNIT_WORDS.test(line)) return true;
  return false;
}
