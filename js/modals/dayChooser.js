// ==========================================
// Day Chooser Modal (used after a Tinder swipe or "plan this")
// ==========================================
import { elements } from '../dom.js';
import { getWeekDayName, showNotification } from '../utils.js';
import { updateWeeklyPlanInState } from '../views/dashboard.js';

export function initDayChooserModal() {
  elements.btnCloseDayChooser.addEventListener('click', () => {
    elements.modalDayChooser.classList.add('hidden');
  });
}

export function openDayChooser(recipe) {
  elements.dayChooserRecipeName.innerText = recipe.title;
  elements.modalDayChooser.classList.remove('hidden');

  // Click listener for day buttons
  elements.dayButtons.forEach(btn => {
    // Replace with a fresh event listener
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', async () => {
      const dayIdx = parseInt(newBtn.dataset.dayIdx);
      elements.modalDayChooser.classList.add('hidden');

      await updateWeeklyPlanInState(dayIdx, recipe.id, recipe.title);
      showNotification(`Matplan uppdaterad! ${recipe.title} på ${getWeekDayName(dayIdx)}.`, 'success');
    });
  });

  // Update elements cache
  elements.dayButtons = document.querySelectorAll('.btn-day');
}
