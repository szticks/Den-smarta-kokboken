// ==========================================
// Helpers & Utilities
// ==========================================
import { state } from './state.js';
import { elements } from './dom.js';

// Adds/removes an ingredient from the personal baseline list (state.baselineItems),
// shared by the shopping list builder and the everyday shopping list view so both
// can offer the same "mark as basvara" pin. Returns the item's new baseline state.
export function toggleBaselineItem(rawName) {
  const name = rawName.trim().toLowerCase();
  const isBaseline = state.baselineItems.includes(name);

  if (isBaseline) {
    state.baselineItems = state.baselineItems.filter(i => i !== name);
  } else {
    state.baselineItems = [...state.baselineItems, name];
  }

  localStorage.setItem('smarta_kokboken_baseline', state.baselineItems.join(','));
  elements.settingsBaseline.value = state.baselineItems.join(', ');

  return !isBaseline;
}

// Round to max 2 decimals, clean trailing zeros
export function roundAmount(val) {
  return Math.round(val * 100) / 100;
}

export function parseAmountVal(amountStr) {
  if (amountStr === null || amountStr === undefined) return null;
  if (typeof amountStr === 'number') return amountStr;

  const parsed = parseFloat(amountStr);
  return isNaN(parsed) ? null : parsed;
}

// Fisher-Yates shuffle
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getWeekDayName(idx) {
  return ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"][idx];
}

// Escape untrusted text (e.g. scraped recipe data) before inserting via innerHTML
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Only allow http(s) image URLs to be interpolated into inline styles
export function sanitizeImageUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : '';
}

// Dynamic toast notification
export function showNotification(message, type = 'info') {
  // Check if a container already exists, else create it
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.width = '90%';
    container.style.maxWidth = '360px';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'glass-panel';

  // Custom toast styling based on type
  toast.style.padding = '12px 18px';
  toast.style.borderRadius = 'var(--radius-md)';
  toast.style.fontSize = '0.85rem';
  toast.style.fontWeight = '500';
  toast.style.boxShadow = 'var(--shadow-md)';
  toast.style.border = '1px solid var(--border-glass)';
  toast.style.color = '#fff';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.style.transition = 'opacity 0.3s, transform 0.3s';
  toast.style.transform = 'translateY(-20px)';
  toast.style.opacity = '0';

  let icon = 'info';
  if (type === 'success') {
    toast.style.background = 'rgba(16, 185, 129, 0.9)';
    toast.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    icon = 'check-circle';
  } else if (type === 'error') {
    toast.style.background = 'rgba(239, 68, 68, 0.9)';
    toast.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    icon = 'alert-octagon';
  } else if (type === 'warning') {
    toast.style.background = 'rgba(245, 158, 11, 0.9)';
    toast.style.borderColor = 'rgba(245, 158, 11, 0.2)';
    icon = 'alert-triangle';
  } else {
    toast.style.background = 'rgba(30, 41, 59, 0.9)';
    toast.style.borderColor = 'rgba(255, 255, 255, 0.08)';
  }

  toast.innerHTML = `<i data-lucide="${icon}" style="width:16px; height:16px; flex-shrink:0;"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  lucide.createIcons();

  // Animation in
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 10);

  // Animation out
  setTimeout(() => {
    toast.style.transform = 'translateY(-10px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}
