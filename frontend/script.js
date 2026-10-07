/**
 * EcoSort AI - Frontend Logic
 * -----------------------------------------------------------------
 * Handles: navigation, theme toggle, image upload (click + drag/drop),
 * preview, validation, calling the backend /api/analyze endpoint,
 * loading animation, result rendering, and error handling.
 *
 * IMPORTANT: No API keys live here. This file only talks to OUR OWN
 * backend server, which is the only place that holds the AI API key.
 * -----------------------------------------------------------------
 */

// ------------------------------------------------------------------
// Configuration — change this when deploying (see README)
// ------------------------------------------------------------------
const API_BASE_URL = 'https://ecosort-ai-3d4q.onrender.com';

// ------------------------------------------------------------------
// State
// ------------------------------------------------------------------
let selectedFile = null;
let currentMode = 'unknown'; // 'ai' | 'demo'

// ------------------------------------------------------------------
// DOM references
// ------------------------------------------------------------------
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const uploadPrompt = document.getElementById('uploadPrompt');
const previewWrapper = document.getElementById('previewWrapper');
const previewImage = document.getElementById('previewImage');
const fileNameEl = document.getElementById('fileName');
const fileSizeEl = document.getElementById('fileSize');
const changeImageBtn = document.getElementById('changeImageBtn');
const removeImageBtn = document.getElementById('removeImageBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const demoSelector = document.getElementById('demoSelector');
const demoScenarioSelect = document.getElementById('demoScenario');

const modeIndicator = document.getElementById('modeIndicator');
const modeText = document.getElementById('modeText');

const resultEmpty = document.getElementById('resultEmpty');
const resultLoading = document.getElementById('resultLoading');
const resultError = document.getElementById('resultError');
const resultContent = document.getElementById('resultContent');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');

const toastContainer = document.getElementById('toastContainer');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ------------------------------------------------------------------
// Init
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  initTheme();
  checkBackendMode();
});

// ------------------------------------------------------------------
// Mobile nav
// ------------------------------------------------------------------
hamburger?.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks?.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => navLinks.classList.remove('open'))
);

// ------------------------------------------------------------------
// Theme toggle (dark mode) — persisted via localStorage
// ------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem('ecosort-theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.textContent = '☀️';
  }
}

themeToggle?.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    themeIcon.textContent = '🌙';
    localStorage.setItem('ecosort-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.textContent = '☀️';
    localStorage.setItem('ecosort-theme', 'dark');
  }
});

// ------------------------------------------------------------------
// Check backend mode (AI Analysis Mode vs Demo Mode)
// ------------------------------------------------------------------
async function checkBackendMode() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    const data = await res.json();
    currentMode = data.aiConfigured ? 'ai' : 'demo';
    updateModeIndicator(data.mode, data.aiConfigured);
    demoSelector.style.display = data.aiConfigured ? 'none' : 'flex';
  } catch (err) {
    // Backend unreachable — assume demo mode so the UI still works
    currentMode = 'demo';
    updateModeIndicator('Demo Mode (backend unreachable)', false);
    demoSelector.style.display = 'flex';
  }
}

function updateModeIndicator(text, isAi) {
  modeText.textContent = text;
  modeIndicator.style.background = isAi ? '' : '';
  modeIndicator.querySelector('.mode-dot').style.background = isAi ? 'var(--emerald)' : '#b7791f';
}

// ------------------------------------------------------------------
// Upload interactions
// ------------------------------------------------------------------
browseBtn?.addEventListener('click', () => fileInput.click());
uploadZone?.addEventListener('click', (e) => {
  if (previewWrapper.classList.contains('hidden')) fileInput.click();
});

fileInput?.addEventListener('change', (e) => {
  if (e.target.files?.[0]) handleFile(e.target.files[0]);
});

// Drag and drop
['dragover', 'dragenter'].forEach((evt) =>
  uploadZone?.addEventListener(evt, (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  })
);
['dragleave', 'dragend'].forEach((evt) =>
  uploadZone?.addEventListener(evt, () => uploadZone.classList.remove('dragover'))
);
uploadZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
});

changeImageBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

removeImageBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  resetUpload();
});

retryBtn?.addEventListener('click', () => {
  showResultState('empty');
});

// ------------------------------------------------------------------
// File handling + validation
// ------------------------------------------------------------------
function handleFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast('Unsupported file type. Please upload a JPG, PNG, or WEBP image.', true);
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    showToast('Image is too large. Please upload a file under 10MB.', true);
    return;
  }

  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSize(file.size);
    uploadPrompt.classList.add('hidden');
    previewWrapper.classList.remove('hidden');
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  selectedFile = null;
  fileInput.value = '';
  uploadPrompt.classList.remove('hidden');
  previewWrapper.classList.add('hidden');
  analyzeBtn.disabled = true;
  showResultState('empty');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ------------------------------------------------------------------
// Analyze button
// ------------------------------------------------------------------
analyzeBtn?.addEventListener('click', async () => {
  if (!selectedFile) {
    showToast('Please upload an image first.', true);
    return;
  }
  await analyzeImage();
});

async function analyzeImage() {
  showResultState('loading');
  animateLoadingSteps();

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);

    if (currentMode === 'demo') {
      formData.append('demoMode', 'true');
      if (demoScenarioSelect.value) formData.append('scenario', demoScenarioSelect.value);
    }

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Analysis failed. Please try again.');
    }

    renderResult(data.result, data.mode);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please check your connection and try again.');
  }
}

// Fake step-by-step progress animation (purely visual, backend does the real work)
function animateLoadingSteps() {
  const steps = ['step1', 'step2', 'step3', 'step4'];
  steps.forEach((id) => document.getElementById(id).classList.remove('active'));
  let i = 0;
  const interval = setInterval(() => {
    if (i > 0) document.getElementById(steps[i - 1])?.classList.remove('active');
    if (i < steps.length) {
      document.getElementById(steps[i])?.classList.add('active');
      i++;
    } else {
      clearInterval(interval);
    }
  }, 500);
}

// ------------------------------------------------------------------
// Result rendering
// ------------------------------------------------------------------
function renderResult(result, mode) {
  document.getElementById('resultModeBadge').textContent =
    mode === 'demo' ? 'DEMO MODE — SIMULATED AI OUTPUT' : 'AI ANALYSIS COMPLETE ✓';
  document.getElementById('resultModeBadge').classList.toggle('demo', mode === 'demo');

  document.getElementById('resultItem').textContent = result.item;
  document.getElementById('resultCategory').textContent = categoryWithIcon(result.category);
  document.getElementById('resultDisposal').textContent = result.disposal;
  document.getElementById('resultTip').textContent = result.sustainability_tip;
  document.getElementById('resultWarning').textContent =
    result.warning || 'Local waste-management rules may vary.';
  document.getElementById('resultReason').textContent = result.reason ? `Why: ${result.reason}` : '';

  const confidencePercent = { High: 92, Medium: 65, Low: 35 }[result.confidence] || 50;
  document.getElementById('confidenceValue').textContent = `${result.confidence} Confidence`;
  const fill = document.getElementById('confidenceFill');
  fill.style.width = '0%';
  requestAnimationFrame(() => { fill.style.width = `${confidencePercent}%`; });

  showResultState('content');
}

function categoryWithIcon(category) {
  const icons = {
    'Recyclable / Dry Waste': '♻️ ',
    'Organic / Wet Waste': '🍃 ',
    'E-Waste': '🔋 ',
    'Hazardous Waste': '⚠️ ',
    'General / Non-Recyclable Waste': '🗑️ ',
  };
  return `${icons[category] || ''}${category}`;
}

function showError(message) {
  errorTitle.textContent = 'Analysis Failed';
  errorMessage.textContent = message;
  showResultState('error');
  showToast(message, true);
}

function showResultState(state) {
  resultEmpty.classList.add('hidden');
  resultLoading.classList.add('hidden');
  resultError.classList.add('hidden');
  resultContent.classList.add('hidden');

  if (state === 'empty') resultEmpty.classList.remove('hidden');
  if (state === 'loading') resultLoading.classList.remove('hidden');
  if (state === 'error') resultError.classList.remove('hidden');
  if (state === 'content') resultContent.classList.remove('hidden');
}

// ------------------------------------------------------------------
// Toast notifications
// ------------------------------------------------------------------
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}
