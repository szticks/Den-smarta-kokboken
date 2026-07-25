// ==========================================
// UI Elements Cache
// ==========================================
export const elements = {};

export function initElements() {
  // Views
  elements.views = document.querySelectorAll('.app-view');
  elements.navItems = document.querySelectorAll('.app-nav .nav-item');
  elements.syncStatus = document.getElementById('sync-status');

  // Dashboard
  elements.weeklyPlanList = document.getElementById('weekly-plan-list');
  elements.btnQuickPantry = document.getElementById('btn-quick-pantry');
  elements.btnQuickPantryShopping = document.getElementById('btn-quick-pantry-shopping');
  elements.randomizeWeekContext = document.getElementById('randomize-week-context');
  elements.btnRandomizeWeek = document.getElementById('btn-randomize-week');

  // Tinder
  elements.tinderCardWrapper = document.getElementById('tinder-card-wrapper');
  elements.filterTinderContext = document.getElementById('filter-tinder-context');
  elements.filterTinderTag = document.getElementById('filter-tinder-tag');
  elements.tinderBtnDislike = document.getElementById('tinder-btn-dislike');
  elements.tinderBtnLike = document.getElementById('tinder-btn-like');
  elements.tinderBtnInfo = document.getElementById('tinder-btn-info');

  // Library
  elements.recipeGrid = document.getElementById('recipe-grid');
  elements.librarySearch = document.getElementById('library-search');
  elements.filterChips = document.querySelectorAll('.filter-chip');
  elements.recipeCount = document.getElementById('recipe-count');
  elements.btnAddRecipeOpen = document.getElementById('btn-add-recipe-open');

  // Shopping List
  elements.shoppingListWrapper = document.getElementById('shopping-list-wrapper');
  elements.btnCompleteShopping = document.getElementById('btn-complete-shopping');
  elements.shoppingBadge = document.getElementById('shopping-badge');
  elements.btnBuildShoppingList = document.getElementById('btn-build-shopping-list');

  // Shopping List Builder Modal
  elements.modalShoppingBuilder = document.getElementById('modal-shopping-builder');
  elements.shoppingBuilderList = document.getElementById('shopping-builder-list');
  elements.btnCloseShoppingBuilder = document.getElementById('btn-close-shopping-builder');
  elements.btnConfirmShoppingList = document.getElementById('btn-confirm-shopping-list');

  // Settings
  elements.settingsForm = document.getElementById('settings-form');
  elements.settingsAppUrl = document.getElementById('settings-app-url');
  elements.settingsApiKey = document.getElementById('settings-api-key');
  elements.btnTestConnection = document.getElementById('btn-test-connection');
  elements.connectionStatusMsg = document.getElementById('connection-status-msg');
  elements.settingsBaseline = document.getElementById('settings-baseline-items');
  elements.btnSaveBaseline = document.getElementById('btn-save-baseline');
  elements.btnShowQr = document.getElementById('btn-show-qr');
  elements.qrCodeWrapper = document.getElementById('qr-code-wrapper');
  elements.qrCodeCanvas = document.getElementById('qr-code-canvas');

  // Modals
  elements.modalRecipeDetail = document.getElementById('modal-recipe-detail');
  elements.modalDayChooser = document.getElementById('modal-day-chooser');
  elements.modalRecipeForm = document.getElementById('modal-recipe-form');
  elements.modalQuickPantry = document.getElementById('modal-quick-pantry');

  // Modal Recipe details content
  elements.modalRecipeTitle = document.getElementById('modal-recipe-title');
  elements.modalRecipeImageContainer = document.getElementById('modal-recipe-image-container');
  elements.modalRecipeImage = document.getElementById('modal-recipe-image');
  elements.modalRecipeTags = document.getElementById('modal-recipe-tags');
  elements.modalRecipeIngredients = document.getElementById('modal-recipe-ingredients');
  elements.modalRecipeInstructions = document.getElementById('modal-recipe-instructions');
  elements.modalRecipeUrl = document.getElementById('modal-recipe-url');
  elements.modalRecipeUrlWrapper = document.getElementById('modal-recipe-url-wrapper');
  elements.btnPlanThisRecipe = document.getElementById('btn-plan-this-recipe');
  elements.btnEditRecipe = document.getElementById('btn-edit-recipe');
  elements.btnDeleteRecipe = document.getElementById('btn-delete-recipe');

  // Modal Day chooser
  elements.dayChooserRecipeName = document.getElementById('day-chooser-recipe-name');
  elements.dayButtons = document.querySelectorAll('.btn-day');

  // Modal Recipe Form inputs
  elements.recipeFormHeading = document.getElementById('recipe-form-title');
  elements.recipeEditorForm = document.getElementById('recipe-editor-form');
  elements.recipeFormId = document.getElementById('recipe-id');
  elements.recipeFormTitle = document.getElementById('recipe-title');
  elements.recipeFormImage = document.getElementById('recipe-image-url');
  elements.recipeFormIngredients = document.getElementById('recipe-ingredients-text');
  elements.recipeFormInstructions = document.getElementById('recipe-instructions-text');
  elements.recipeFormUrl = document.getElementById('recipe-url-ref');
  elements.scrapeUrlInput = document.getElementById('scrape-url-input');
  elements.btnScrapeUrl = document.getElementById('btn-scrape-url');
  elements.scrapeSpinner = document.getElementById('scrape-spinner');
  elements.scrapeStatus = document.getElementById('scrape-status');
  elements.photoRecipeInput = document.getElementById('photo-recipe-input');
  elements.btnPhotoRecipe = document.getElementById('btn-photo-recipe');
  elements.photoSpinner = document.getElementById('photo-spinner');
  elements.photoStatus = document.getElementById('photo-status');
  elements.photoPreviewWrapper = document.getElementById('photo-preview-wrapper');
  elements.photoPreviewImg = document.getElementById('photo-preview-img');
  elements.recipeNeedsReview = document.getElementById('recipe-needs-review');
  elements.coverPhotoInput = document.getElementById('cover-photo-input');
  elements.btnCoverPhoto = document.getElementById('btn-cover-photo');
  elements.coverPhotoSpinner = document.getElementById('cover-photo-spinner');
  elements.coverPhotoStatus = document.getElementById('cover-photo-status');

  // Modal Quick Pantry
  elements.quickPantryGrid = document.getElementById('quick-pantry-grid');
  elements.customPantryItemInput = document.getElementById('custom-pantry-item-input');
  elements.btnAddCustomPantry = document.getElementById('btn-add-custom-pantry');

  // Close and Cancel Buttons
  elements.btnCloseRecipeDetail = document.getElementById('btn-close-recipe-detail');
  elements.btnCloseDayChooser = document.getElementById('btn-close-day-chooser');
  elements.btnCloseRecipeForm = document.getElementById('btn-close-recipe-form');
  elements.btnCancelRecipeForm = document.getElementById('btn-cancel-recipe-form');
  elements.btnCloseQuickPantry = document.getElementById('btn-close-quick-pantry');
}
