// ==========================================
// Recipe Creation / Form Logic
// ==========================================
import { state } from '../state.js';
import { elements } from '../dom.js';
import { callApi } from '../api.js';
import { showNotification } from '../utils.js';
import { renderLibrary } from '../views/library.js';

export function initRecipeFormModal() {
  elements.btnAddRecipeOpen.addEventListener('click', () => {
    openRecipeForm();
  });

  elements.btnCancelRecipeForm.addEventListener('click', () => {
    elements.modalRecipeForm.classList.add('hidden');
  });

  elements.btnCloseRecipeForm.addEventListener('click', () => {
    elements.modalRecipeForm.classList.add('hidden');
  });

  // Scrape functionality
  elements.btnScrapeUrl.addEventListener('click', async () => {
    const url = elements.scrapeUrlInput.value.trim();
    if (!url) {
      showScrapeError('Klistra in en giltig länk först!');
      return;
    }

    try {
      elements.scrapeSpinner.classList.remove('hidden');
      elements.btnScrapeUrl.disabled = true;
      elements.scrapeStatus.className = 'scrape-status info';
      elements.scrapeStatus.innerText = 'Försöker läsa in och skrapa recept...';

      const result = await callApi('scrapeRecipe', { url });

      elements.scrapeSpinner.classList.add('hidden');
      elements.btnScrapeUrl.disabled = false;

      fillFormFromRecipeDraft(result.recipe, url);

      if (result.success) {
        elements.scrapeStatus.className = 'scrape-status success';
        elements.scrapeStatus.innerText = 'Receptet skrapades framgångsrikt!';
        showNotification('Receptet ifyllt!', 'success');
      } else {
        elements.scrapeStatus.className = 'scrape-status warning';
        elements.scrapeStatus.innerText = result.message || 'Hittade inte recept-strukturen. Skriv in manuellt.';
      }
    } catch (err) {
      console.error('Scraping error:', err);
      elements.scrapeSpinner.classList.add('hidden');
      elements.btnScrapeUrl.disabled = false;
      showScrapeError(err.message || 'Misslyckades att ansluta till skrapningsmotorn.');
    }
  });

  // Photo OCR functionality
  elements.btnPhotoRecipe.addEventListener('click', () => {
    elements.photoRecipeInput.click();
  });

  elements.photoRecipeInput.addEventListener('change', async () => {
    const file = elements.photoRecipeInput.files[0];
    if (!file) return;

    try {
      elements.photoSpinner.classList.remove('hidden');
      elements.btnPhotoRecipe.disabled = true;
      elements.photoStatus.className = 'scrape-status info';
      elements.photoStatus.innerText = 'Läser av fotot...';

      const { base64, mimeType, dataUrl } = await downscaleImageToBase64(file);

      // Show the captured photo so it can be compared against the OCR result below
      elements.photoPreviewImg.src = dataUrl;
      elements.photoPreviewImg.classList.remove('enlarged');
      elements.photoPreviewWrapper.classList.remove('hidden');

      const result = await callApi('ocrRecipe', { imageBase64: base64, mimeType });

      elements.photoSpinner.classList.add('hidden');
      elements.btnPhotoRecipe.disabled = false;

      fillFormFromRecipeDraft(result.recipe);
      // Photo-OCR text is rougher than a link scrape - flag it for a later cleanup pass
      elements.recipeNeedsReview.checked = true;

      if (result.success) {
        elements.photoStatus.className = 'scrape-status success';
        elements.photoStatus.innerText = 'Fotot avläst! Kontrollera texten nedan innan du sparar.';
        showNotification('Receptet ifyllt från foto!', 'success');
      } else {
        elements.photoStatus.className = 'scrape-status warning';
        elements.photoStatus.innerText = result.message || 'Kunde inte tolka fotot. Skriv in manuellt.';
      }
    } catch (err) {
      console.error('Photo OCR error:', err);
      elements.photoSpinner.classList.add('hidden');
      elements.btnPhotoRecipe.disabled = false;
      elements.photoStatus.className = 'scrape-status error';
      elements.photoStatus.innerText = err.message || 'Misslyckades att läsa av fotot.';
    } finally {
      elements.photoRecipeInput.value = ''; // allow re-selecting the same file again
    }
  });

  elements.photoPreviewImg.addEventListener('click', () => {
    elements.photoPreviewImg.classList.toggle('enlarged');
  });

  // Take/attach a permanent cover photo for the recipe (separate from the OCR photo above)
  elements.btnCoverPhoto.addEventListener('click', () => {
    elements.coverPhotoInput.click();
  });

  elements.coverPhotoInput.addEventListener('change', async () => {
    const file = elements.coverPhotoInput.files[0];
    if (!file) return;

    try {
      elements.coverPhotoSpinner.classList.remove('hidden');
      elements.btnCoverPhoto.disabled = true;
      elements.coverPhotoStatus.innerText = 'Laddar upp bilden...';

      const { base64, mimeType } = await downscaleImageToBase64(file);
      const result = await callApi('uploadRecipeImage', { imageBase64: base64, mimeType });

      elements.recipeFormImage.value = result.imageUrl;
      elements.coverPhotoStatus.innerText = 'Bild uppladdad!';
      showNotification('Bild tillagd till receptet!', 'success');
    } catch (err) {
      console.error('Cover photo upload error:', err);
      elements.coverPhotoStatus.innerText = err.message || 'Misslyckades att ladda upp bilden.';
    } finally {
      elements.coverPhotoSpinner.classList.add('hidden');
      elements.btnCoverPhoto.disabled = false;
      elements.coverPhotoInput.value = '';
    }
  });

  // Tag Toggle Handlers in Form
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // In each group (context, type, method), only one tag can be active at a time
      const siblings = btn.parentNode.querySelectorAll('.tag-btn');
      siblings.forEach(sib => sib.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Save recipe form submit
  elements.recipeEditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = elements.recipeFormId.value;
    const title = elements.recipeFormTitle.value.trim();
    const image = elements.recipeFormImage.value.trim();
    const url = elements.recipeFormUrl.value.trim();

    // Get active tags
    const activeTags = [];
    document.querySelectorAll('.tag-btn.active').forEach(btn => {
      activeTags.push(btn.dataset.tag);
    });

    // Ensure default tags if none chosen
    if (activeTags.length === 0) activeTags.push("Båda", "Vardagsmat", "Steka/Koka");

    // Parse ingredients textarea
    const rawIngredientsLines = elements.recipeFormIngredients.value.split('\n').map(line => line.trim()).filter(Boolean);
    const ingredients = rawIngredientsLines.map(line => {
      // Simple frontend parsing to keep structure matching sheets
      const parts = line.match(/^([\d\/\s\.,½⅓¼¾\-–]+)?\s*(dl|g|kg|l|ml|tsk|msk|st|krm|förp|burk|burkar|klyfta|klyftor|skiva|skivor|pkt|påse|påsar)?\s*(.+)$/i);
      if (parts) {
        return {
          name: parts[3].trim(),
          amount: parts[1] ? parts[1].trim() : null,
          unit: parts[2] ? parts[2].trim().toLowerCase() : '',
          rawText: line
        };
      }
      return { name: line, amount: null, unit: '', rawText: line };
    });

    // Parse instructions textarea
    const instructions = elements.recipeFormInstructions.value.split('\n').map(line => line.trim()).filter(Boolean);

    const recipeData = {
      id: id || null,
      title,
      image,
      url,
      tags: activeTags,
      ingredients,
      instructions,
      needsReview: elements.recipeNeedsReview.checked
    };

    elements.modalRecipeForm.classList.add('hidden');

    // Optimistic UI updates
    if (id) {
      state.recipes = state.recipes.map(r => r.id === id ? { ...r, ...recipeData } : r);
    } else {
      // Temporary ID for offline safety
      recipeData.id = 'temp_' + Date.now();
      state.recipes.push(recipeData);
    }

    localStorage.setItem('cache_recipes', JSON.stringify(state.recipes));
    renderLibrary();

    try {
      const result = await callApi('saveRecipe', { recipe: recipeData });
      if (result.success && !id) {
        // Replace temporary ID with true UUID generated by Apps Script
        state.recipes = state.recipes.map(r => r.id === recipeData.id ? { ...r, id: result.id } : r);
        localStorage.setItem('cache_recipes', JSON.stringify(state.recipes));
        renderLibrary();
      }
      showNotification('Receptet sparat!', 'success');
    } catch (err) {
      console.error('Failed to sync save recipe:', err);
    }
  });
}

// Opens the form in "add" mode (no recipe) or "edit" mode (prefilled from an existing recipe)
export function openRecipeForm(recipe = null) {
  resetRecipeForm();

  if (recipe) {
    elements.recipeFormHeading.innerText = 'Redigera recept';
    elements.recipeFormId.value = recipe.id;
    fillFormFromRecipeDraft(recipe);
    elements.recipeNeedsReview.checked = !!recipe.needsReview;
  } else {
    elements.recipeFormHeading.innerText = 'Lägg till nytt recept';
  }

  elements.modalRecipeForm.classList.remove('hidden');
}

function resetRecipeForm() {
  elements.recipeFormId.value = '';
  elements.recipeEditorForm.reset();
  elements.scrapeUrlInput.value = '';
  elements.scrapeStatus.className = 'scrape-status';
  elements.scrapeStatus.innerText = '';
  elements.photoRecipeInput.value = '';
  elements.photoStatus.className = 'scrape-status';
  elements.photoStatus.innerText = '';
  elements.photoPreviewWrapper.classList.add('hidden');
  elements.photoPreviewImg.src = '';
  elements.recipeNeedsReview.checked = false;
  elements.coverPhotoInput.value = '';
  elements.coverPhotoStatus.innerText = '';

  // Reset tag selection active states
  document.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
}

// Fills the form from a scrape/OCR result shape ({ title, image, url, ingredients, instructions, tags })
function fillFormFromRecipeDraft(recipe, fallbackUrl = '') {
  elements.recipeFormTitle.value = recipe.title || '';
  elements.recipeFormImage.value = recipe.image || '';
  elements.recipeFormUrl.value = recipe.url || fallbackUrl;
  elements.recipeFormIngredients.value = ingredientsToText(recipe.ingredients);
  elements.recipeFormInstructions.value = recipe.instructions.join('\n');
  activateTagButtons(recipe.tags);
}

// Downscales an image file to a max dimension and returns it as base64 JPEG,
// keeping the upload small/fast and within Apps Script's request limits.
function downscaleImageToBase64(file, maxDimension = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Kunde inte läsa filen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Kunde inte läsa bilden.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', dataUrl });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ingredientsToText(ingredients) {
  return ingredients.map(ing => {
    if (ing.rawText) return ing.rawText;
    return `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim();
  }).join('\n');
}

function activateTagButtons(tags) {
  tags.forEach(tag => {
    const btn = document.querySelector(`.tag-btn[data-tag="${tag}"]`);
    if (btn) btn.classList.add('active');
  });
}

function showScrapeError(msg) {
  elements.scrapeStatus.className = 'scrape-status error';
  elements.scrapeStatus.innerText = msg;
}
