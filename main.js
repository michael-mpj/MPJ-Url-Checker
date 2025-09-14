// MPJ-Url-Checker main.js - Improved version

const ITEMS_PER_PAGE = 12;
let allUrls = [];
let filteredUrls = [];
let currentPage = 1;

// DOM Elements
const $ = id => document.getElementById(id);
const iframeContainer = $('iframe-container');
const loading = $('loading-indicator');
const errorMsg = $('error-message');
const navControls = $('nav-controls');
const prevBtn = $('prev-btn');
const nextBtn = $('next-btn');
const pageInfo = $('page-info');
const areaFilter = $('area-filter');
const jsonDisplay = $('jsonDataDisplay');
const saveRawBtn = $('save-raw-btn');
const downloadBtn = $('download-json-btn');
const uploadInput = $('upload-json-input');
const paginationContainer = $('pagination-container');
const messageBox = $('messageBox');
const messageText = $('messageText');
const messageCloseBtn = $('messageCloseBtn');

// Intersection Observer for lazy iframe loading
const iframeObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const iframe = entry.target;
      iframe.src = iframe.getAttribute('data-src');
      obs.unobserve(iframe);
    }
  });
}, { rootMargin: '0px', threshold: 0.1 });

// --- Utility Functions ---

function showMessage(message, type = 'info', duration = 3000) {
  messageText.textContent = message;
  messageBox.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 d-flex align-items-center`;
  messageBox.classList.remove('d-none');
  messageBox.setAttribute('aria-live', 'polite');
  setTimeout(() => {
    messageBox.classList.add('d-none');
    messageBox.removeAttribute('aria-live');
  }, duration);
}

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function saveToLocalStorage() {
  try {
    localStorage.setItem('iframeData', JSON.stringify(allUrls));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
    showMessage('Failed to save data locally. Your browser might be in private mode or storage is full.', 'warning');
  }
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('iframeData');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
    showMessage('Corrupted data found in local storage. Loading default data.', 'danger');
    return null;
  }
}

// --- Data Fetching & Initialization ---

async function fetchUrls() {
  loading.classList.remove('d-none');
  errorMsg.classList.add('d-none');
  try {
    const res = await fetch('urldata.json');
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}. Please ensure 'urldata.json' exists on the server.`);
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) throw new TypeError("Received non-JSON response. Please ensure 'urldata.json' is a valid JSON file.");
    allUrls = await res.json();
    if (!Array.isArray(allUrls)) throw new TypeError("JSON data is not an array. Expected an array of URL objects.");
    saveToLocalStorage();
    initializeData();
  } catch (e) {
    console.error("Error fetching URLs:", e);
    errorMsg.classList.remove('d-none');
    $('error-text').textContent = `Failed to load URLs: ${e.message}.`;
    allUrls = [];
    initializeData();
  } finally {
    loading.classList.add('d-none');
  }
}

function initializeData() {
  filteredUrls = [...allUrls];
  currentPage = 1;
  populateAreaFilter();
  renderPage();
  navControls.style.display = 'flex';
  paginationContainer.style.display = 'block';
  if (jsonDisplay && jsonDisplay.closest('.modal.show')) {
    jsonDisplay.value = JSON.stringify(allUrls, null, 2);
  }
}

function populateAreaFilter() {
  const areas = Array.from(new Set(allUrls.map(item => item.area).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  areaFilter.innerHTML = '<option value="all">All Areas</option>' +
    areas.map(area => `<option value="${escapeHTML(area)}">${escapeHTML(area)}</option>`).join('');
  areaFilter.value = 'all';
}

// --- Rendering Functions ---

function renderPage() {
  iframeContainer.innerHTML = '';
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredUrls.slice(start, start + ITEMS_PER_PAGE);

  if (filteredUrls.length === 0) {
    iframeContainer.innerHTML = '<p class="text-center text-muted col-12">No URLs found for the selected filter. Try adjusting your filter or adding new data.</p>';
    updatePagination();
    return;
  }

  if (pageItems.length === 0 && currentPage > 1) {
    currentPage--;
    renderPage();
    return;
  }

  pageItems.forEach(item => iframeContainer.appendChild(createUrlCard(item)));
  updatePagination();
}

function createUrlCard(item) {
  const col = document.createElement('div');
  col.className = 'col';

  const card = document.createElement('div');
  card.className = 'card h-100 shadow-sm';

  // Card Footer
  const footer = document.createElement('div');
  footer.className = 'card-footer bg-white border-top';
  footer.innerHTML = `
    <h6 class="card-title mb-1 text-primary">${escapeHTML(item.label || 'No Label')}</h6>
    <p class="card-text small mb-1"><strong>Area:</strong> ${escapeHTML(item.area || 'N/A')}</p>
    <p class="card-text small text-muted text-truncate mb-2" title="${escapeHTML(item.url)}">${escapeHTML(item.url)}</p>
  `;

  // Button Group
  const btnGroup = document.createElement('div');
  btnGroup.className = 'btn-group mt-2 w-100';
  btnGroup.role = 'group';

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'btn btn-sm btn-outline-secondary';
  refreshBtn.textContent = 'Refresh URL';
  refreshBtn.setAttribute('aria-label', `Refresh ${item.label || item.url}`);

  const openBtn = document.createElement('a');
  openBtn.href = item.url;
  openBtn.target = '_blank';
  openBtn.className = 'btn btn-sm btn-outline-primary';
  openBtn.textContent = 'Open in New Tab';
  openBtn.setAttribute('aria-label', `Open ${item.label || item.url} in new tab`);
  openBtn.setAttribute('rel', 'noopener noreferrer');

  btnGroup.append(refreshBtn, openBtn);
  footer.appendChild(btnGroup);

  // Card Body with Iframe
  const body = document.createElement('div');
  body.className = 'card-body p-0';

  const wrapper = document.createElement('div');
  wrapper.className = 'iframe-wrapper';

  const iframe = document.createElement('iframe');
  iframe.src = item.url;
  iframe.title = item.label || item.url;
  iframe.style.visibility = 'visible';
  iframe.loading = 'lazy';
  iframe.setAttribute('data-src', item.url);

  const spinner = document.createElement('div');
  spinner.className = 'spinner-border text-primary position-absolute top-50 start-50 translate-middle';
  spinner.role = 'status';
  spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';

  iframeObserver.observe(iframe);

  iframe.addEventListener('load', () => {
    spinner.style.display = 'none';
    iframe.style.visibility = 'visible';
  });

  iframe.addEventListener('error', () => {
    spinner.style.display = 'none';
    iframe.style.visibility = 'visible';
    if (!wrapper.querySelector('.iframe-error-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'iframe-error-overlay alert alert-warning text-center m-2 position-absolute w-100 h-100 d-flex flex-column justify-content-center align-items-center';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.background = 'rgba(255,255,255,0.95)';
      overlay.style.zIndex = '20';
      overlay.setAttribute('role', 'alert');
      overlay.innerHTML = `
        <i class="fas fa-exclamation-triangle me-1"></i>
        Cannot display content due to security policies (X-Frame-Options).<br>
        <small>Try "Open in New Tab".</small>
      `;
      wrapper.appendChild(overlay);
    }
  });

  refreshBtn.addEventListener('click', () => {
    spinner.style.display = 'block';
    iframe.style.visibility = 'visible';
    iframe.src = item.url;
  });

  wrapper.append(spinner, iframe);
  body.appendChild(wrapper);
  card.append(body, footer);
  col.appendChild(card);
  return col;
}

function updatePagination() {
  const totalPages = Math.max(1, Math.ceil(filteredUrls.length / ITEMS_PER_PAGE));
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  const paginationUl = paginationContainer.querySelector('.pagination');
  paginationUl.innerHTML = '';

  // Previous
  paginationUl.appendChild(createPageLi('Previous', currentPage === 1, () => goToPage(currentPage - 1)));

  // Page numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  if (endPage - startPage < 4) {
    if (startPage === 1) endPage = Math.min(totalPages, 5);
    if (endPage === totalPages) startPage = Math.max(1, totalPages - 4);
  }
  if (startPage > 1) paginationUl.appendChild(createEllipsisLi());
  for (let i = startPage; i <= endPage; i++) {
    paginationUl.appendChild(createPageLi(i, i === currentPage, () => goToPage(i)));
  }
  if (endPage < totalPages) paginationUl.appendChild(createEllipsisLi());

  // Next
  paginationUl.appendChild(createPageLi('Next', currentPage === totalPages, () => goToPage(currentPage + 1)));

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

function createPageLi(label, disabled, onClick) {
  const li = document.createElement('li');
  li.className = `page-item${disabled ? ' disabled' : ''}${label === currentPage ? ' active' : ''}`;
  li.innerHTML = `<a class="page-link" href="#" aria-label="${typeof label === 'number' ? `Go to page ${label}` : label}">${label}</a>`;
  if (!disabled) li.onclick = e => { e.preventDefault(); onClick(); };
  return li;
}

function createEllipsisLi() {
  const li = document.createElement('li');
  li.className = 'page-item disabled';
  li.innerHTML = `<span class="page-link">...</span>`;
  return li;
}

function goToPage(page) {
  const totalPages = Math.max(1, Math.ceil(filteredUrls.length / ITEMS_PER_PAGE));
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// --- Event Listeners ---

prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
nextBtn.addEventListener('click', () => goToPage(currentPage + 1));

areaFilter.addEventListener('change', () => {
  const selectedArea = areaFilter.value;
  filteredUrls = selectedArea === 'all'
    ? [...allUrls]
    : allUrls.filter(item => item.area === selectedArea);
  currentPage = 1;
  renderPage();
});

document.querySelector('[data-bs-target="#rawDataModal"]').addEventListener('click', () => {
  jsonDisplay.value = JSON.stringify(allUrls, null, 2);
});

saveRawBtn.addEventListener('click', () => {
  try {
    const parsedData = JSON.parse(jsonDisplay.value);
    if (!Array.isArray(parsedData)) throw new Error('Parsed data is not a valid JSON array.');
    allUrls = parsedData;
    saveToLocalStorage();
    initializeData();
    showMessage('Data updated successfully from raw JSON.', 'success');
    const rawDataModal = bootstrap.Modal.getInstance($('rawDataModal'));
    if (rawDataModal) rawDataModal.hide();
  } catch (e) {
    console.error("Error saving raw JSON:", e);
    showMessage(`Invalid JSON format: ${e.message}. Please fix and try again.`, 'danger', 5000);
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(allUrls, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jbr_urldata.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showMessage('JSON data downloaded successfully.', 'info');
});

uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return showMessage('No file selected.', 'warning');
  if (file.type !== 'application/json') {
    showMessage('Invalid file type. Please upload a JSON file (.json).', 'danger');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const uploadedData = JSON.parse(event.target.result);
      if (!Array.isArray(uploadedData)) throw new Error('Uploaded JSON is not a valid array.');
      allUrls = uploadedData;
      saveToLocalStorage();
      initializeData();
      showMessage('Data loaded from uploaded file.', 'success');
      const rawDataModal = bootstrap.Modal.getInstance($('rawDataModal'));
      if (rawDataModal) rawDataModal.hide();
      e.target.value = '';
    } catch (error) {
      console.error("Error parsing uploaded file:", error);
      showMessage(`Error parsing uploaded file: ${error.message}. Please ensure it's valid JSON.`, 'danger', 5000);
      e.target.value = '';
    }
  };
  reader.onerror = () => {
    showMessage('Error reading file. Please try again.', 'danger');
    e.target.value = '';
  };
  reader.readAsText(file);
});

messageCloseBtn.addEventListener('click', () => messageBox.classList.add('d-none'));

// --- App Entry Point ---

document.addEventListener('DOMContentLoaded', () => {
  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => {
        console.log('Service Worker registered:', reg.scope);
      })
      .catch(err => {
        console.warn('Service Worker registration failed:', err);
      });
  }

  const savedData = loadFromLocalStorage();
  if (savedData && savedData.length > 0) {
    allUrls = savedData;
    initializeData();
    loading.classList.add('d-none');
    showMessage('Data loaded from local storage.', 'info');
  } else {
    fetchUrls();
  }
});