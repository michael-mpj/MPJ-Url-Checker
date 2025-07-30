// --- main.js - Better Version ---

// --- Constants & DOM Elements ---
let allUrls = []; // Stores all fetched URLs
let filteredUrls = []; // Stores URLs after applying filters

// DOM Elements - Cached for performance
const iframeContainer = document.getElementById('iframe-container');
// Shared IntersectionObserver for all iframes
const iframeObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const targetIframe = entry.target;
      targetIframe.src = targetIframe.getAttribute('data-src'); // Load the actual URL
      obs.unobserve(targetIframe); // Stop observing once loaded
    }
  });
}, {
  rootMargin: '0px',
  threshold: 0.1
});
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
const messageCloseBtn = document.getElementById('messageCloseBtn');

// --- Utility Functions ---

/**
 * Displays a temporary message to the user.
 * @param {string} message - The message content.
 * @param {'info'|'success'|'warning'|'danger'} type - The type of message (for Bootstrap styling).
 * @param {number} duration - How long the message should be visible in milliseconds.
 */
function showMessage(message, type = 'info', duration = 3000) {
  messageText.textContent = message;
  messageBox.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 d-flex align-items-center`;
  messageBox.classList.remove('d-none');
  messageBox.setAttribute('aria-live', 'polite'); // Announce changes to screen readers
  setTimeout(() => {
    messageBox.classList.add('d-none');
    messageBox.removeAttribute('aria-live');
  }, duration);
}

/**
 * Saves the current 'allUrls' array to localStorage.
 */
function saveToLocalStorage() {
  try {
    localStorage.setItem('iframeData', JSON.stringify(allUrls));
    // console.log("Data saved to localStorage.");
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
    showMessage('Failed to save data locally. Your browser might be in private mode or storage is full.', 'warning');
  }
}

/**
 * Loads URL data from localStorage.
 * @returns {Array|null} The parsed array of URLs or null if not found/error.
 */
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

/**
 * Fetches URLs from 'urldata.json' or uses a fallback if fetch fails.
 */
async function fetchUrls() {
  loading.classList.remove('d-none'); // Show loading indicator
  errorMsg.classList.add('d-none'); // Hide any previous errors

  try {
    const res = await fetch('urldata.json');
    if (!res.ok) {
      // More specific error for HTTP issues
      throw new Error(`HTTP error! Status: ${res.status}. Please ensure 'urldata.json' exists on the server.`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new TypeError("Received non-JSON response. Please ensure 'urldata.json' is a valid JSON file.");
    }

    allUrls = await res.json();
    if (!Array.isArray(allUrls)) {
      throw new TypeError("JSON data is not an array. Expected an array of URL objects.");
    }
    saveToLocalStorage();
    initializeData();
  } catch (e) {
    console.error("Error fetching URLs:", e);
    errorMsg.classList.remove('d-none');
    document.getElementById('error-text').textContent = `Failed to load URLs: ${e.message}.`;
    // Optionally load a default empty state or show specific instruction
    allUrls = []; // Clear any potentially bad data
    initializeData(); // Initialize with empty data to allow user interaction
  } finally {
    loading.classList.add('d-none'); // Hide loading indicator
  }
}

/**
 * Initializes/resets the data, populates filters, and renders the first page.
 */
function initializeData() {
  filteredUrls = [...allUrls]; // Reset filteredUrls to allUrls
  populateAreaFilter(); // Repopulate filter based on allUrls
  renderAllUrls(); // Render all URLs (no pagination)
  // Hide navigation and pagination controls
  if (navControls) navControls.style.display = 'none';
  if (paginationContainer) paginationContainer.style.display = 'none';
  // Ensure the modal's textarea is updated if it's currently open
  if (jsonDisplay && jsonDisplay.closest('.modal.show')) {
    jsonDisplay.value = JSON.stringify(allUrls, null, 2);
  }
}

// --- UI Rendering ---

/**
 * Populates the area filter dropdown with unique areas from allUrls.
 */
function populateAreaFilter() {
  const areas = Array.from(new Set(allUrls.map(item => item.area).filter(Boolean)));
  // Sort areas alphabetically for better UX
  areas.sort((a, b) => a.localeCompare(b));
  areaFilter.innerHTML = '<option value="all">All Areas</option>' +
    areas.map(area => `<option value="${escapeHTML(area)}">${escapeHTML(area)}</option>`).join('');
  // Set the filter back to 'all' or the currently selected value if it still exists
  areaFilter.value = 'all'; // Reset filter on data change
}

/**
 * Renders all URLs into the iframe container (no pagination).
 * Implements lazy loading for iframes.
 */
function renderAllUrls() {
  iframeContainer.innerHTML = '';
  if (filteredUrls.length === 0) {
    iframeContainer.innerHTML = '<p class="text-center text-muted col-12">No URLs found for the selected filter. Try adjusting your filter or adding new data.</p>';
    return;
  }
  filteredUrls.forEach(item => iframeContainer.appendChild(createUrlCard(item)));
}

/**
 * Creates a Bootstrap card element for a given URL item.
 * @param {object} item - The URL object containing label, area, and url.
 * @returns {HTMLElement} The created card element.
 */
function createUrlCard(item) {
  const col = document.createElement('div');
  col.className = 'col';

  const card = document.createElement('div');
  card.className = 'card h-100 shadow-sm'; // Added shadow for better visual

  // Card Footer
  const footer = document.createElement('div');
  footer.className = 'card-footer bg-white border-top';
  // Use text-break for long URLs and `text-muted` for smaller text
  footer.innerHTML = `
    <h6 class="card-title mb-1 text-primary">${escapeHTML(item.label || 'No Label')}</h6>
    <p class="card-text small mb-1"><strong>Area:</strong> ${escapeHTML(item.area || 'N/A')}</p>
    <p class="card-text small text-muted text-truncate mb-2" title="${escapeHTML(item.url)}">${escapeHTML(item.url)}</p>
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
  refreshBtn.setAttribute('aria-label', `Refresh ${item.label || item.url}`);

  // Open in New Tab Button
  const openBtn = document.createElement('a');
  openBtn.href = item.url;
  openBtn.target = '_blank';
  openBtn.className = 'btn btn-sm btn-outline-primary';
  openBtn.textContent = 'Open in New Tab';
  openBtn.setAttribute('aria-label', `Open ${item.label || item.url} in new tab`);
  openBtn.setAttribute('rel', 'noopener noreferrer'); // Security improvement

  btnGroup.append(refreshBtn, openBtn);
  footer.appendChild(btnGroup);

  // Card Body with Iframe
  const body = document.createElement('div');
  body.className = 'card-body p-0';

  const wrapper = document.createElement('div');
  wrapper.className = 'iframe-wrapper';

  const iframe = document.createElement('iframe');
  // Initial src is set to about:blank to prevent immediate loading
  iframe.src = 'about:blank';
  iframe.title = item.label || item.url;
  iframe.style.visibility = 'hidden';
  iframe.loading = 'lazy'; // Native lazy loading for iframes
  iframe.setAttribute('data-src', item.url); // Store the actual URL in a data attribute

  const spinner = document.createElement('div');
  spinner.className = 'spinner-border text-primary position-absolute top-50 start-50 translate-middle';
  spinner.role = 'status';
  spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';

  // Use shared IntersectionObserver
  iframeObserver.observe(iframe);

  iframe.addEventListener('load', () => {
    spinner.style.display = 'none';
    iframe.style.visibility = 'visible';
  });

  // Handle potential iframe load errors (e.g., cross-origin restrictions)
  // Overlay error message instead of replacing wrapper content
  iframe.addEventListener('error', () => {
    spinner.style.display = 'none';
    iframe.style.visibility = 'visible';
    // Only add overlay if not already present
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
        <small>Try \"Open in New Tab\".</small>
      `;
      wrapper.appendChild(overlay);
    }
  });

  refreshBtn.addEventListener('click', () => {
    spinner.style.display = 'block';
    iframe.style.visibility = 'hidden';
    iframe.src = 'about:blank'; // Reset iframe src
    setTimeout(() => {
      iframe.src = item.url; // Reload content
    }, 10);
  });

  wrapper.append(spinner, iframe);
  body.appendChild(wrapper);
  card.append(body, footer);
  col.appendChild(card);
  return col;
}





/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// --- Event Listeners ---



  const selectedArea = areaFilter.value;
  filteredUrls = selectedArea === 'all' ?
    [...allUrls] :
    allUrls.filter(item => item.area === selectedArea);
  renderAllUrls();
});

document.querySelector('[data-bs-target="#rawDataModal"]').addEventListener('click', () => {
  jsonDisplay.value = JSON.stringify(allUrls, null, 2);
});

saveRawBtn.addEventListener('click', () => {
  try {
    const parsedData = JSON.parse(jsonDisplay.value);
    if (!Array.isArray(parsedData)) {
      throw new Error('Parsed data is not a valid JSON array.');
    }
    allUrls = parsedData; // Update global data
    saveToLocalStorage(); // Save updated data
    initializeData(); // Re-initialize UI with new data
    showMessage('Data updated successfully from raw JSON.', 'success');
    // Close the modal after successful save
    const rawDataModal = bootstrap.Modal.getInstance(document.getElementById('rawDataModal'));
    if (rawDataModal) rawDataModal.hide();
  } catch (e) {
    console.error("Error saving raw JSON:", e);
    showMessage(`Invalid JSON format: ${e.message}. Please fix and try again.`, 'danger', 5000);
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(allUrls, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jbr_urldata.json'; // More descriptive filename
  document.body.appendChild(a); // Append to body for Firefox compatibility
  a.click();
  document.body.removeChild(a); // Clean up
  URL.revokeObjectURL(url);
  showMessage('JSON data downloaded successfully.', 'info');
});

uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) {
    showMessage('No file selected.', 'warning');
    return;
  }
  if (file.type !== 'application/json') {
    showMessage('Invalid file type. Please upload a JSON file (.json).', 'danger');
    // Clear the input to allow re-uploading the same file if it was an accident
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const uploadedData = JSON.parse(event.target.result);
      if (!Array.isArray(uploadedData)) {
        throw new Error('Uploaded JSON is not a valid array.');
      }
      allUrls = uploadedData;
      saveToLocalStorage();
      initializeData();
      showMessage('Data loaded from uploaded file.', 'success');
      // Programmatically close the modal if it's open
      const rawDataModal = bootstrap.Modal.getInstance(document.getElementById('rawDataModal'));
      if (rawDataModal) rawDataModal.hide();
      e.target.value = ''; // Clear input for next upload
    } catch (error) {
      console.error("Error parsing uploaded file:", error);
      showMessage(`Error parsing uploaded file: ${error.message}. Please ensure it's valid JSON.`, 'danger', 5000);
      e.target.value = ''; // Clear input on error
    }
  };
  reader.onerror = () => {
    showMessage('Error reading file. Please try again.', 'danger');
    e.target.value = ''; // Clear input on error
  };
  reader.readAsText(file);
});

// Allow user to close the message box manually
messageCloseBtn.addEventListener('click', () => messageBox.classList.add('d-none'));

// --- Initial Load Logic ---

document.addEventListener('DOMContentLoaded', () => {
  const savedData = loadFromLocalStorage();
  if (savedData && savedData.length > 0) { // Check if savedData is not null/empty
    allUrls = savedData;
    initializeData();
    loading.classList.add('d-none');
    showMessage('Data loaded from local storage.', 'info');
  } else {
    fetchUrls(); // Fetch from JSON if no saved data or saved data is empty
  }
});