/**
 * Domän: ShoppingListState-fliken (avbockningar).
 */

function getShoppingListState(ss) {
  var sheet = ss.getSheetByName("ShoppingListState");
  var list = sheetToObjects(sheet);

  var checkedItems = {};
  list.forEach(function(item) {
    checkedItems[item.item_name] = (item.checked === true || item.checked === "TRUE");
  });

  return { success: true, checkedItems: checkedItems };
}

function updateShoppingListItem(ss, itemName, checked, quantityText) {
  var sheet = ss.getSheetByName("ShoppingListState");
  var data = sheet.getDataRange().getValues();

  var foundIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === itemName.toLowerCase()) {
      foundIdx = i + 1;
      break;
    }
  }

  if (foundIdx !== -1) {
    sheet.getRange(foundIdx, 2).setValue(checked ? "TRUE" : "FALSE");
    if (quantityText !== undefined) {
      sheet.getRange(foundIdx, 3).setValue(quantityText);
    }
  } else {
    sheet.appendRow([itemName, checked ? "TRUE" : "FALSE", quantityText || ""]);
  }

  return { success: true };
}

function clearShoppingListState(ss) {
  var sheet = ss.getSheetByName("ShoppingListState");
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true };
}
