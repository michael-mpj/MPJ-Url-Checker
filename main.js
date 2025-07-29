// --- Constants & DOM Elements ---
const ITEMS_PER_PAGE = 12;
let allUrls = [];
let filteredUrls = [];
let currentPage = 1;

// DOM Elements
const iframeContainer = document.getElementById('iframe-container');
const loading = document.getElementById('loading-indicator');
const errorMsg = document.getElementById('error-message');
const navControls = document.getElementById('nav-controls');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageInfo = document.getElementById('page-info');
const areaFilter = document.getElementById('area-filter');
const jsonDisplay = document.getElementById('jsonDataDisplay');
const saveRawBtn = document.getElementById('save-raw-btn');
const downloadBtn = document.getElementById('download-json-btn');
const uploadInput = document.getElementById('upload-json-input');
const paginationContainer = document.getElementById('pagination-container');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');

// --- Utility Functions ---

function showMessage(message, type = 'info', duration = 3000) {
  messageText.textContent = message;
  messageBox.className = `alert alert-${type} d-block`;
  setTimeout(() => messageBox.classList.add('d-none'), duration);
}

function saveToLocalStorage() {
  localStorage.setItem('iframeData', JSON.stringify(allUrls));
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('iframeData');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// --- Data Fetching & Initialization ---

async function fetchUrls() {
  try {
    const res = await fetch('urldata.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allUrls = await res.json();
    saveToLocalStorage();
    initializeData();
  } catch (e) {
    errorMsg.classList.remove('d-none');
    document.getElementById('error-text').textContent = `Failed to load URLs: ${e.message}`;
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
}

// --- UI Rendering ---

function populateAreaFilter() {
  const areas = Array.from(new Set(allUrls.map(item => item.area).filter(Boolean)));
  areaFilter.innerHTML = '<option value="all">All Areas</option>' +
    areas.map(area => `<option value="${area}">${area}</option>`).join('');
}

function renderPage() {
  iframeContainer.innerHTML = '';
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredUrls.slice(start, start + ITEMS_PER_PAGE);

  if (filteredUrls.length === 0) {
    iframeContainer.innerHTML = '<p class="text-center text-muted col-12">No URLs found for the selected filter.</p>';
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
  card.className = 'card h-100';

  // Card Footer
  const footer = document.createElement('div');
  footer.className = 'card-footer bg-white border-top';
  footer.innerHTML = `
    <h6 class="card-title mb-1 text-primary">${item.label || 'No Label'}</h6>
    <p class="card-text small mb-1"><strong>Area:</strong> ${item.area || 'N/A'}</p>
    <p class="card-text small text-muted text-truncate mb-2" title="${item.url}">${item.url}</p>
  `;

  // Button Group
  const btnGroup = document.createElement('div');
  btnGroup.className = 'btn-group mt-2 w-100';
  btnGroup.role = 'group';

  // Refresh Button
  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'btn btn-sm btn-outline-secondary';
  refreshBtn.textContent = 'Refresh URL';

  // Open in New Tab Button
  const openBtn = document.createElement('a');
  openBtn.href = item.url;
  openBtn.target = '_blank';
  openBtn.className = 'btn btn-sm btn-outline-primary';
  openBtn.textContent = 'Open in New Tab';

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
  iframe.style.visibility = 'hidden';

  const spinner = document.createElement('div');
  spinner.className = 'spinner-border text-primary position-absolute top-50 start-50 translate-middle';
  spinner.role = 'status';
  spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';

  iframe.addEventListener('load', () => {
    spinner.style.display = 'none';
    iframe.style.visibility = 'visible';
  });

  refreshBtn.addEventListener('click', () => {
    spinner.style.display = 'block';
    iframe.style.visibility = 'hidden';
    iframe.src = 'about:blank';
    setTimeout(() => { iframe.src = item.url; }, 10);
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
  const prevLi = document.createElement('li');
  prevLi.className = `page-item${currentPage === 1 ? ' disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#">Previous</a>`;
  prevLi.onclick = e => { e.preventDefault(); if (currentPage > 1) goToPage(currentPage - 1); };
  paginationUl.appendChild(prevLi);

  // Page Numbers (show max 5 pages for brevity)
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) {
    const pageLi = document.createElement('li');
    pageLi.className = `page-item${i === currentPage ? ' active' : ''}`;
    pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    pageLi.onclick = e => { e.preventDefault(); if (i !== currentPage) goToPage(i); };
    paginationUl.appendChild(pageLi);
  }

  // Next
  const nextLi = document.createElement('li');
  nextLi.className = `page-item${currentPage === totalPages ? ' disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
  nextLi.onclick = e => { e.preventDefault(); if (currentPage < totalPages) goToPage(currentPage + 1); };
  paginationUl.appendChild(nextLi);

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

function goToPage(page) {
  currentPage = page;
  renderPage();
  window.scrollTo(0, 0);
}

// --- Event Listeners ---

prevBtn.onclick = () => currentPage > 1 && goToPage(currentPage - 1);
nextBtn.onclick = () => {
  const totalPages = Math.ceil(filteredUrls.length / ITEMS_PER_PAGE);
  if (currentPage < totalPages) goToPage(currentPage + 1);
};

areaFilter.onchange = () => {
  filteredUrls = areaFilter.value === 'all'
    ? [...allUrls]
    : allUrls.filter(item => item.area === areaFilter.value);
  currentPage = 1;
  renderPage();
};

document.querySelector('[data-bs-target="#rawDataModal"]').onclick = () => {
  jsonDisplay.value = JSON.stringify(allUrls, null, 2);
};

saveRawBtn.onclick = () => {
  try {
    allUrls = JSON.parse(jsonDisplay.value);
    saveToLocalStorage();
    initializeData();
    showMessage('Data updated successfully.', 'success');
  } catch {
    showMessage('Invalid JSON format. Please fix and try again.', 'danger');
  }
};

downloadBtn.onclick = () => {
  const blob = new Blob([JSON.stringify(allUrls, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'urldata.json';
  a.click();
  URL.revokeObjectURL(url);
};

uploadInput.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      allUrls = JSON.parse(e.target.result);
      saveToLocalStorage();
      localStorage.setItem('iframeData', JSON.stringify(allUrls));
      initializeData();
      showMessage('Data loaded from uploaded file.', 'success');
      document.querySelector('.modal.show .btn-close')?.click();
    } catch {
      showMessage('Error parsing uploaded file.', 'danger');
    }
  };
  reader.readAsText(file);
};

// --- Initial Load ---

document.addEventListener('DOMContentLoaded', () => {
  const savedData = loadFromLocalStorage();
  if (savedData) {
    allUrls = savedData;
    initializeData();
    loading.classList.add('d-none');
  } else {
    fetchUrls();
  }
});
