/**
 * Domän: Egna receptbilder. Låter dig fota en bild (t.ex. den färdiga rätten,
 * eller en skärmbild när en skrapad bild-URL inte fungerar) och sparar den
 * permanent i din Google Drive, till skillnad från OCR-fotot i OcrRecipe.js
 * som bara används tillfälligt för textavläsning.
 *
 * Använder den vanliga (icke-avancerade) DriveApp-tjänsten, som alltid är
 * tillgänglig utan extra aktivering.
 */

function uploadRecipeImage(imageBase64, mimeType) {
  try {
    if (!imageBase64) {
      throw new Error("Ingen bild mottogs.");
    }

    var blob = Utilities.newBlob(Utilities.base64Decode(imageBase64), mimeType || 'image/jpeg', 'recipe-cover-' + new Date().getTime() + '.jpg');

    var folder = getOrCreateRecipeImagesFolder();
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // drive.google.com/uc?export=view often shows a virus-scan warning page
    // instead of the raw image for some files, which breaks <img> rendering.
    // This googleusercontent.com host reliably serves the actual image bytes.
    var imageUrl = "https://lh3.googleusercontent.com/d/" + file.getId();

    return { success: true, imageUrl: imageUrl };
  } catch (e) {
    return { success: false, error: "Kunde inte ladda upp bilden: " + e.toString() };
  }
}

function getOrCreateRecipeImagesFolder() {
  var folders = DriveApp.getFoldersByName("Smarta Kokboken - Receptbilder");
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder("Smarta Kokboken - Receptbilder");
}
