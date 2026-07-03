/**
 * Domän: Receptskrapare (körs på Google-servern för att kringgå CORS).
 */

function scrapeRecipe(url) {
  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.getResponseCode() !== 200) {
      throw new Error("HTTP-fel " + response.getResponseCode());
    }

    var html = response.getContentText("UTF-8");

    // og:image är oftast en pålitlig, fullständig bild-URL (sajter måste hålla
    // den korrekt för att delning på Facebook/Pinterest ska fungera), medan
    // schema.org-datans "image"-fält ibland bara är en relativ sökväg som
    // pekar på en helt annan domän/CDN än sidan själv.
    var ogImage = extractOgImage(html);

    // Sök efter Schema.org JSON-LD taggar
    var recipeData = null;
    var regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    var match;

    while ((match = regex.exec(html)) !== null) {
      try {
        var json = JSON.parse(match[1].trim());
        var recipe = findRecipeInJson(json);
        if (recipe) {
          recipeData = recipe;
          break;
        }
      } catch (e) {
        // Ignorera trasig JSON-LD
      }
    }

    if (!recipeData) {
      // Fallback: Försök extrahera titel från <title>
      var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      var title = titleMatch ? titleMatch[1].replace(/(\r\n|\n|\r)/gm, "").trim() : "";
      title = title.split("|")[0].split("-")[0].trim(); // Rensa sajt-namn

      return {
        success: false,
        message: "Kunde inte hitta strukturerad receptdata automatiskt på denna sida, men vi har fyllt i titeln och URL.",
        recipe: {
          title: title || "Skrapat recept",
          ingredients: [],
          instructions: [],
          tags: ["Vardagsmat", "Steka/Koka", "Båda"],
          url: url,
          image: ""
        }
      };
    }

    var recipe = normalizeRecipeData(recipeData, url, ogImage);
    return {
      success: true,
      recipe: recipe
    };
  } catch (e) {
    return {
      success: false,
      message: "Kunde inte läsa in länken: " + e.toString(),
      recipe: {
        title: "",
        ingredients: [],
        instructions: [],
        tags: ["Vardagsmat", "Steka/Koka", "Båda"],
        url: url,
        image: ""
      }
    };
  }
}

function extractOgImage(html) {
  var match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);

  // Some sites order the attributes the other way around
  if (!match) {
    match = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
  }

  return match ? decodeHtmlEntities(match[1]) : "";
}

// Attribute values pulled straight out of raw HTML source are still
// entity-encoded (e.g. "&amp;" for "&"), which would corrupt a URL's query
// string if used as-is.
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;|&#0?38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function findRecipeInJson(json) {
  if (!json) return null;

  if (Array.isArray(json)) {
    for (var i = 0; i < json.length; i++) {
      var found = findRecipeInJson(json[i]);
      if (found) return found;
    }
  } else if (json["@type"] === "Recipe" || (Array.isArray(json["@type"]) && json["@type"].indexOf("Recipe") !== -1)) {
    return json;
  } else if (json["@graph"]) {
    return findRecipeInJson(json["@graph"]);
  }

  return null;
}

function normalizeRecipeData(recipeData, url, ogImage) {
  var title = recipeData.name || "";

  // Extrahera ingredienser
  var rawIngredients = recipeData.recipeIngredient || [];
  if (typeof rawIngredients === "string") {
    rawIngredients = [rawIngredients];
  }

  var ingredients = rawIngredients.map(parseIngredientString);

  // Extrahera instruktioner
  var rawInstructions = recipeData.recipeInstructions || [];
  var instructions = [];

  if (typeof rawInstructions === "string") {
    instructions = [rawInstructions];
  } else if (Array.isArray(rawInstructions)) {
    rawInstructions.forEach(function(step) {
      if (typeof step === "string") {
        instructions.push(step);
      } else if (step && typeof step === "object") {
        if (step.text) {
          instructions.push(step.text);
        } else if (step.itemListElement) {
          step.itemListElement.forEach(function(substep) {
            if (substep.text) instructions.push(substep.text);
          });
        }
      }
    });
  }

  // Extrahera bild
  var image = "";
  if (recipeData.image) {
    if (typeof recipeData.image === "string") {
      image = recipeData.image;
    } else if (Array.isArray(recipeData.image) && recipeData.image.length > 0) {
      image = recipeData.image[0];
    } else if (recipeData.image.url) {
      image = recipeData.image.url;
    }
  }

  // Vissa sajters schema.org-data anger bilden som en relativ sökväg (t.ex.
  // "uploads/bild.png") som ibland dessutom ligger på en helt annan
  // domän/CDN än sidan själv, så den går inte att lösa upp på ett
  // tillförlitligt sätt. og:image-taggen måste däremot alltid vara en
  // korrekt, fullständig URL (annars fungerar inte delning på sociala
  // medier), så den föredras när schema.org-bilden inte redan är absolut.
  if (!/^https?:\/\//i.test(image)) {
    if (/^https?:\/\//i.test(ogImage)) {
      image = ogImage;
    } else if (image) {
      // Sista utväg: gissa att sökvägen ligger på sidans egen domän.
      // Fungerar inte alltid (bilden kan ligga på en separat CDN), men är
      // bättre än att lämna fältet helt tomt.
      var originMatch = url.match(/^([a-z][a-z0-9+.\-]*:\/\/[^\/]+)/i);
      image = originMatch ? originMatch[1] + (image.charAt(0) === '/' ? '' : '/') + image : "";
    }
  }

  // Autotagga baserat på namn
  var tags = [];
  var lowerTitle = title.toLowerCase();

  if (lowerTitle.indexOf("barn") !== -1 || lowerTitle.indexOf("pannkaka") !== -1 || lowerTitle.indexOf("köttbullar") !== -1 || lowerTitle.indexOf("tacos") !== -1 || lowerTitle.indexOf("makaroner") !== -1) {
    tags.push("Barnvänligt");
  } else {
    tags.push("Båda");
  }

  if (lowerTitle.indexOf("gryta") !== -1 || lowerTitle.indexOf("soppa") !== -1) {
    tags.push("Gryta/Soppa");
  } else if (lowerTitle.indexOf("ugn") !== -1 || lowerTitle.indexOf("gratäng") !== -1 || lowerTitle.indexOf("låda") !== -1 || lowerTitle.indexOf("paj") !== -1) {
    tags.push("Ugn");
  } else {
    tags.push("Steka/Koka");
  }

  if (lowerTitle.indexOf("helg") !== -1 || lowerTitle.indexOf("stek") !== -1 || lowerTitle.indexOf("fest") !== -1 || lowerTitle.indexOf("lyx") !== -1) {
    tags.push("Helgmat");
  } else {
    tags.push("Vardagsmat");
  }

  return {
    title: title,
    ingredients: ingredients,
    instructions: instructions.map(function(s) { return s.trim(); }).filter(Boolean),
    tags: tags,
    url: url,
    image: image
  };
}

function parseIngredientString(str) {
  str = str.trim();

  // Plocka ut mängd, enhet och namn (t.ex. "2.5 dl grädde", "500 g blandfärs", "salt och peppar")
  var regex = /^([\d\/\s\.,½⅓¼¾\-–]+)?\s*(dl|g|kg|l|ml|tsk|msk|st|krm|förp|burk|burkar|klyfta|klyftor|skiva|skivor|pkt|påse|påsar|knippe|knippen)?\s*(.+)$/i;
  var match = str.match(regex);

  if (match) {
    var rawAmount = match[1] ? match[1].trim() : "";
    var unit = match[2] ? match[2].trim().toLowerCase() : "";
    var name = match[3] ? match[3].trim() : str;

    // Rensa eventuella ledande "av " från namnet (t.ex. "skivor av tomat" -> "tomat")
    if (name.toLowerCase().indexOf("av ") === 0) {
      name = name.substring(3).trim();
    }

    var amount = parseAmount(rawAmount);

    return {
      name: name,
      amount: amount,
      unit: unit,
      rawText: str
    };
  }

  return {
    name: str,
    amount: null,
    unit: "",
    rawText: str
  };
}

function parseAmount(amountStr) {
  if (!amountStr) return null;

  amountStr = amountStr.replace('½', '0.5')
                       .replace('⅓', '0.33')
                       .replace('¼', '0.25')
                       .replace('¾', '0.75')
                       .replace(',', '.')
                       .replace('–', '-')
                       .trim();

  // Om det är ett intervall som "2-3", ta medelvärdet eller det lägre värdet. Vi tar det lägre.
  if (amountStr.indexOf('-') !== -1) {
    amountStr = amountStr.split('-')[0].trim();
  }

  if (amountStr.indexOf('/') !== -1) {
    var parts = amountStr.split('/');
    if (parts.length === 2) {
      var num = parseFloat(parts[0]);
      var den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
  }

  if (amountStr.indexOf(' ') !== -1) {
    var parts = amountStr.split(/\s+/);
    var total = 0;
    for (var i = 0; i < parts.length; i++) {
      var parsed = parseAmount(parts[i]);
      if (parsed !== null) total += parsed;
    }
    return total > 0 ? total : null;
  }

  var val = parseFloat(amountStr);
  return isNaN(val) ? null : val;
}
