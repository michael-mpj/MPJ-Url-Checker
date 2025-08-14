// Function to fetch JSON data from urldata.json
async function fetchLocationsData() {
    try {
        const response = await fetch('urldata.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching locations data:", error);
        return []; // Return an empty array on error
    }
}

// Helper: Download data URL as a file
function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Function to convert SVG string to Canvas and then to Data URL (PNG/JPEG)
// This is necessary because qrjs2 generates SVG, but browsers need canvas for direct image downloads.
function svgToCanvasDataURL(svgString, type = 'image/png', quality = 0.9) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const img = new Image();

        // Convert SVG string to a Base64 encoded data URL
        // This is a more robust way to load SVG into an Image object for canvas drawing.
        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

        img.onload = () => {
            // Set canvas dimensions to match the SVG image
            canvas.width = img.width;
            canvas.height = img.height;
            // Draw the SVG image onto the canvas
            ctx.drawImage(img, 0, 0);

            try {
                // Get the data URL from the canvas
                const dataUrl = canvas.toDataURL(type, quality);
                resolve(dataUrl);
            } catch (e) {
                reject(new Error('Failed to convert canvas to data URL: ' + e.message));
            }
        };

        img.onerror = (error) => {
            console.error("Error loading SVG for canvas conversion:", error);
            reject(new Error('Failed to load SVG as image for canvas conversion.'));
        };

        img.src = dataUrl; // Set the image source to the SVG data URL
    });
}

// Generate QR code cards and append them to the container
async function generateQrCards() {
    const locations = await fetchLocationsData();
    const container = document.getElementById('qr-codes-container');

    if (!container) {
        console.error("QR codes container not found!");
        return;
    }

    locations.forEach(async (location, idx) => {
        // Create Bootstrap column for responsiveness
        const col = document.createElement('div');
        col.className = 'col';

        // Create Bootstrap card
        const card = document.createElement('div');
        card.className = 'card qr-card h-100'; // h-100 ensures consistent card height

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body qr-card-body';

        // Label for the QR code
        const label = document.createElement('h5');
        label.className = 'card-title qr-label';
        label.textContent = location.label || location.area || 'QR Code';
        cardBody.appendChild(label);

        // SVG QR Code Display Container
        const qrSvgContainer = document.createElement('div');
        qrSvgContainer.className = 'qr-svg'; // Class for styling the SVG container

        // Generate SVG using qrjs2 library
        // size: 256 matches the CSS width/height for .qr-svg
        const svgString = QRJS.encode(location.url, { type: 'svg', margin: 4, size: 256 });
        qrSvgContainer.innerHTML = svgString; // Insert the SVG string into the div
        cardBody.appendChild(qrSvgContainer);

        // Download buttons group
        const btnGroup = document.createElement('div');
        btnGroup.className = 'qr-download-group';

        // PNG Download Button
        const pngBtn = document.createElement('button');
        pngBtn.className = 'btn btn-primary btn-sm';
        pngBtn.innerHTML = '<i class="fas fa-download me-1"></i> PNG';
        pngBtn.onclick = async () => {
            try {
                // Convert the displayed SVG to a PNG data URL for download
                const pngDataUrl = await svgToCanvasDataURL(svgString, 'image/png');
                downloadDataUrl(pngDataUrl, `${location.label || 'qr'}-jbr.png`);
            } catch (error) {
                console.error("Error downloading PNG:", error);
                // You could add a user-friendly message here if needed
            }
        };

        // JPG Download Button
        const jpgBtn = document.createElement('button');
        jpgBtn.className = 'btn btn-success btn-sm';
        jpgBtn.innerHTML = '<i class="fas fa-download me-1"></i> JPG';
        jpgBtn.onclick = async () => {
            try {
                // Convert the displayed SVG to a JPEG data URL for download
                const jpgDataUrl = await svgToCanvasDataURL(svgString, 'image/jpeg');
                downloadDataUrl(jpgDataUrl, `${location.label || 'qr'}-jbr.jpg`);
            } catch (error) {
                console.error("Error downloading JPG:", error);
                // You could add a user-friendly message here if needed
            }
        };

        btnGroup.append(pngBtn, jpgBtn);
        cardBody.appendChild(btnGroup);

        card.appendChild(cardBody);
        col.appendChild(card);
        container.appendChild(col);
    });
}

// Ensure the DOM is fully loaded before executing scripts
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in the footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    // Generate the QR code cards
    generateQrCards();
});
