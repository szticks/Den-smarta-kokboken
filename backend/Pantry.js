/**
 * Domän: PantryFlags-fliken ("slut i skafferiet"-flaggor för basvaror).
 */

function getPantryFlags(ss) {
  var sheet = ss.getSheetByName("PantryFlags");
  var list = sheetToObjects(sheet);

  var flagged = list.filter(function(item) {
    return item.flagged_for_purchase === true || item.flagged_for_purchase === "TRUE";
  }).map(function(item) {
    return item.item_name;
  });

  return { success: true, flagged: flagged };
}

function updatePantryFlag(ss, itemName, flagged) {
  var sheet = ss.getSheetByName("PantryFlags");
  var data = sheet.getDataRange().getValues();

  var foundIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === itemName.toLowerCase()) {
      foundIdx = i + 1;
      break;
    }
  }

  if (foundIdx !== -1) {
    sheet.getRange(foundIdx, 2).setValue(flagged ? "TRUE" : "FALSE");
    sheet.getRange(foundIdx, 3).setValue(new Date());
  } else if (flagged) {
    sheet.appendRow([itemName, "TRUE", new Date()]);
  }

  return { success: true };
}

function clearPantryFlags(ss) {
  var sheet = ss.getSheetByName("PantryFlags");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    sheet.getRange(i + 1, 2).setValue("FALSE");
    sheet.getRange(i + 1, 3).setValue(new Date());
  }

  return { success: true };
}
