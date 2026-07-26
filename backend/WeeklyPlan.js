/**
 * Domän: WeeklyPlan-fliken (veckans matsedel per dag).
 */

function getWeeklyPlan(ss) {
  var sheet = ss.getSheetByName("WeeklyPlan");
  var list = sheetToObjects(sheet);
  return { success: true, plan: list };
}

function updateWeeklyPlan(ss, plan) {
  var sheet = ss.getSheetByName("WeeklyPlan");

  plan.forEach(function(dayPlan) {
    var dayIdx = parseInt(dayPlan.day_index);
    if (dayIdx >= 0 && dayIdx < 7) {
      sheet.getRange(dayIdx + 2, 3).setValue(dayPlan.recipe_id || "");
      sheet.getRange(dayIdx + 2, 4).setValue(dayPlan.recipe_title || "");
      if (dayPlan.servings !== undefined) {
        sheet.getRange(dayIdx + 2, 5).setValue(dayPlan.servings || "");
      }
    }
  });

  return { success: true, message: "Veckoplan uppdaterad!" };
}
