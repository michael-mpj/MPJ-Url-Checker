let allUrls = [];
let filteredUrls = [];
let currentPage = 1;
const itemsPerPage = 12;

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

// Custom message box elements
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');

/**
 * Displays a message in a custom message box.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('success', 'danger', 'info', 'warning').
 */
function showMessage(message, type) {
  messageText.textContent = message;
  messageBox.className = `alert alert-${type} d-block`;
  setTimeout(() => {
    messageBox.classList.add('d-none');
  }, 3000); // Hide after 3 seconds
}

/**
 * Fetches URLs from 'urldata.json' or uses saved data from localStorage.
 */
async function fetchUrls() {
  try {
    const res = await fetch('urldata.json');
    const data = await res.json();
    allUrls = data;
    initializeData();
  } catch (e) {
    errorMsg.classList.remove('d-none');
    document.getElementById('error-text').textContent = `Failed to load URLs: ${e.message}`;
  } finally {
    loading.classList.add('d-none');
  }
}

/**
 * Initializes data, filters, and renders the page.
 */
function initializeData() {
  filteredUrls = [...allUrls];
  currentPage = 1;
  populateAreaFilter();
  renderPage();
  navControls.style.display = 'flex'; // Ensure nav controls are visible
}

/**
 * Populates the area filter dropdown with unique areas from allUrls.
 */
function populateAreaFilter() {
  const areas = new Set(allUrls.map(item => item.area).filter(area => area)); // Get unique non-null areas
  areaFilter.innerHTML = '<option value="all">All Areas</option>'; // Reset to default
  areas.forEach(area => {
    const option = document.createElement('option');
    option.value = area;
    option.textContent = area;
    areaFilter.appendChild(option);
  });
}

/**
 * Renders the current page of URLs into the iframe container.
 */
function renderPage() {
  iframeContainer.innerHTML = '';
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredUrls.slice(start, start + itemsPerPage);

  if (pageItems.length === 0 && filteredUrls.length > 0 && currentPage > 1) {
    // If no items on current page after filtering, go back one page
    currentPage--;
    renderPage();
    return;
  } else if (pageItems.length === 0 && filteredUrls.length === 0) {
    iframeContainer.innerHTML = '<p class="text-center text-muted col-12">No URLs found for the selected filter.</p>';
    updatePagination();
    return;
  }

  pageItems.forEach(item => {
    const col = document.createElement('div');
    col.className = 'col';

    const card = document.createElement('div');
    card.className = 'card h-100';

    // Create header for the card
    const header = document.createElement('div');
    header.className = 'card-header';

    const labelEl = document.createElement('h6');
    labelEl.className = 'card-title mb-1 text-primary';
    labelEl.textContent = item.label || 'No Label';

    const areaEl = document.createElement('p');
    areaEl.className = 'card-text small mb-1';
    areaEl.innerHTML = `<strong>Area:</strong> ${item.area || 'N/A'}`;

    const urlEl = document.createElement('p');
    urlEl.className = 'card-text small text-muted text-truncate mb-2';
    urlEl.textContent = item.url;
    urlEl.title = item.url;

    const openBtn = document.createElement('a');
    openBtn.href = item.url;
    openBtn.target = '_blank'; // Open in new tab
    openBtn.className = 'btn btn-sm btn-outline-primary mt-2';
    openBtn.textContent = 'Open in New Tab';

    header.append(labelEl, areaEl, urlEl, openBtn); // Append elements to the header

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
    spinner.setAttribute('role', 'status');
    const spinnerText = document.createElement('span');
    spinnerText.className = 'visually-hidden';
    spinnerText.textContent = 'Loading...';
    spinner.appendChild(spinnerText);

    iframe.addEventListener('load', () => {
      spinner.style.display = 'none';
      iframe.style.visibility = 'visible';
    });

    wrapper.append(spinner, iframe);
    body.appendChild(wrapper);
    card.appendChild(header); // Append the created header
    card.appendChild(body);
    col.appendChild(card);
    iframeContainer.appendChild(col);
  });

  updatePagination();
}

/**
 * Updates the pagination information and button states.
 */
function updatePagination() {
  const totalPages = Math.ceil(filteredUrls.length / itemsPerPage);
  pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`; // Handle 0 total pages
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Event Listeners
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
    window.scrollTo(0, 0); // Use window.scrollTo for clarity
  }
});

nextBtn.addEventListener('click', () => {
  const totalPages = Math.ceil(filteredUrls.length / itemsPerPage); // Use filteredUrls for total pages
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
    window.scrollTo(0, 0); // Use window.scrollTo for clarity
  }
});

areaFilter.addEventListener('change', () => {
  const selectedArea = areaFilter.value;
  if (selectedArea === 'all') {
    filteredUrls = [...allUrls];
  } else {
    filteredUrls = allUrls.filter(item => item.area === selectedArea);
  }
  currentPage = 1; // Reset to first page on filter change
  renderPage();
});

document.querySelector('[data-bs-target="#rawDataModal"]').addEventListener('click', () => {
  jsonDisplay.value = JSON.stringify(allUrls, null, 2);
});

saveRawBtn.addEventListener('click', () => {
  try {
    allUrls = JSON.parse(jsonDisplay.value);
    initializeData(); // Re-initialize data after saving
    localStorage.setItem('iframeData', JSON.stringify(allUrls));
    showMessage('Data updated successfully.', 'success');
  } catch (err) {
    showMessage('Invalid JSON format. Please fix and try again.', 'danger');
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(allUrls, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'urldata.json';
  a.click();
  URL.revokeObjectURL(url);
});

uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      allUrls = JSON.parse(e.target.result);
      initializeData(); // Re-initialize data after uploading
      showMessage('Data loaded from uploaded file.', 'success');
    } catch (err) {
      showMessage('Error parsing uploaded file.', 'danger');
    }
  };
  reader.readAsText(file);
});

// Initial data load on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const savedData = localStorage.getItem('iframeData');
  if (savedData) {
    try {
      allUrls = JSON.parse(savedData);
      initializeData(); // Initialize with saved data
    } catch (e) {
      console.error("Error parsing saved data, fetching from JSON.", e);
      fetchUrls(); // Fallback to fetching if saved data is corrupt
    }
  } else {
    fetchUrls(); // Fetch if no saved data
  }
});
