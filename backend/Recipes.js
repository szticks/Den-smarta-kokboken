/**
 * Domän: Recipes-fliken (CRUD för recept).
 */

function getRecipes(ss) {
  var sheet = ss.getSheetByName("Recipes");
  var list = sheetToObjects(sheet);

  list.forEach(function(item) {
    try { item.ingredients = JSON.parse(item.ingredients); } catch (e) { item.ingredients = []; }
    try { item.instructions = JSON.parse(item.instructions); } catch (e) { item.instructions = []; }
    try { item.tags = JSON.parse(item.tags); } catch (e) { item.tags = []; }
  });

  return { success: true, recipes: list };
}

function saveRecipe(ss, recipe) {
  var sheet = ss.getSheetByName("Recipes");
  var data = sheet.getDataRange().getValues();

  var ingredientsStr = JSON.stringify(recipe.ingredients || []);
  var instructionsStr = JSON.stringify(recipe.instructions || []);
  var tagsStr = JSON.stringify(recipe.tags || []);

  var id = recipe.id;
  var isNew = !id;

  if (isNew) {
    id = Utilities.getUuid();
  }

  var rowValues = [
    id,
    recipe.title || "Namnlöst recept",
    ingredientsStr,
    instructionsStr,
    tagsStr,
    recipe.url || "",
    recipe.image || "",
    new Date()
  ];

  if (isNew) {
    sheet.appendRow(rowValues);
  } else {
    var foundIdx = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        foundIdx = i + 1;
        break;
      }
    }

    if (foundIdx !== -1) {
      sheet.getRange(foundIdx, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
  }

  return { success: true, id: id, message: isNew ? "Recept tillagt!" : "Recept sparat!" };
}

function deleteRecipe(ss, id) {
  var sheet = ss.getSheetByName("Recipes");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Recept raderat!" };
    }
  }

  return { success: false, error: "Receptet hittades inte." };
}
