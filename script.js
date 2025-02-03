let scannedItems = [];
let lastScannedTime = 0; // Store last scan timestamp
let currentBarcode = '';

const productMap = {
    '4806518335346': { name: 'Belo', price: 600 },
    '4800010075069': { name: 'Cream O', price: 10 },
    // add more mappings here
};

// Function to navigate between tabs
function navigateTo(tab) {
    const tabs = document.querySelectorAll('.tab-content');

    tabs.forEach(tc => tc.classList.remove('active'));

    document.getElementById(tab).classList.add('active');

    // Start scanner when switching to Scan tab
    if (tab === 'scan') {
        startBarcodeScanner();
    } else {
        Quagga.stop(); // Stop scanner when leaving scan tab
    }
}

// Function to hide welcome message
function hideWelcome() {
    document.getElementById('welcome').style.display = 'none';
    document.getElementById('logo-name').style.display = 'block';
}

// Function to hide logo
function hideLogo() {
    document.getElementById('logo').style.display = 'none';
}

// Function to start barcode scanner
function startBarcodeScanner() {
    Quagga.init({
        inputStream: { 
            name: "Live", 
            type: "LiveStream", 
            target: "#barcode-scanner", 
            constraints: { facingMode: "environment" } 
        },
        decoder: { 
            readers: ["ean_reader", "upc_reader", "code_128_reader", "ean_8_reader"]
        },
        frequency: 10,  
        locator: { patchSize: "large", halfSample: true }, 
        numOfWorkers: 4 
    }, function(err) {
        if (err) { 
            console.error(err); 
            return; 
        }
        Quagga.start();
    });

    // On barcode detected
    Quagga.onDetected(function(result) {
        const barcode = result.codeResult.code;
        const currentTime = new Date().getTime();

        // Prevent spamming scans (2-second interval)
        if (currentTime - lastScannedTime < 2000) return;
        lastScannedTime = currentTime;

        const existingItem = scannedItems.find(item => item.barcode === barcode);

        if (existingItem) {
            // Show notification for existing item
            const notification = document.createElement('div');
            notification.textContent = `You already have ${existingItem.quantity} ${productMap[barcode] ? productMap[barcode].name : 'Unknown Product'} in your cart.`;
            notification.style.position = 'fixed';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            notification.style.color = 'white';
            notification.style.padding = '10px';
            notification.style.borderRadius = '10px';
            notification.style.zIndex = '1000';

            document.body.appendChild(notification);

            // Remove notification after 2 seconds
            setTimeout(function() {
                document.body.removeChild(notification);
            }, 2000);

            document.getElementById('popup').style.display = 'flex';
            document.getElementById('quantity').value = 1;
        } else {
            if (productMap[barcode]) {
                currentBarcode = barcode;
                document.getElementById('popup').style.display = 'flex';
                document.getElementById('quantity').value = 1;
            } else {
                // Removed alert notification
            }
        }
    });

    // On barcode processed
    Quagga.onProcessed(function(result) {
        if (result.codeResult) {
            return;
        }

        // Show notification for invalid barcode scan
        const notification = document.createElement('div');
        notification.textContent = 'I cant read it properly, please scan again';
        notification.style.position = 'fixed';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        notification.style.color = 'white';
        notification.style.padding = '10px';
        notification.style.borderRadius = '10px';
        notification.style.zIndex = '1000';

        document.body.appendChild(notification);

        // Remove notification after 2 seconds
        setTimeout(function() {
            document.body.removeChild(notification);
        }, 2000);
    });
}

// Function to add quantity
function addQuantity() {
    const quantity = parseInt(document.getElementById('quantity').value);
    const barcode = currentBarcode;
    const existingItem = scannedItems.find(item => item.barcode === barcode);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        if (productMap[barcode]) {
            const price = productMap[barcode].price;
            scannedItems.push({ barcode, quantity, price });
        } else {
            // Removed alert notification
            return;
        }
    }

    document.getElementById('popup').style.display = 'none';
    updateCart();
    if (scannedItems.length > 0) {
        document.getElementById('proceed-button').style.display = 'block';
    }

    // Show notification for added item
    const notification = document.createElement('div');
    notification.textContent = `Added ${quantity} ${productMap[barcode] ? productMap[barcode].name : 'Unknown Product'} to cart.`;
    notification.classList.add('notification');

    document.getElementById('scan').appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(function() {
        document.getElementById('scan').removeChild(notification);
    }, 5000);
}

// Function to cancel quantity
function cancelQuantity() {
    document.getElementById('popup').style.display = 'none';
    navigateTo('scan');
    startBarcodeScanner();
}

// Function to update cart table
function updateCart() {
    const cartTable = document.getElementById('cartTable');
    const totalPriceElement = document.getElementById('totalPrice');
    cartTable.innerHTML = ''; // Clear table

    let total = 0;
    scannedItems.forEach((item, index) => {
        let row = `<tr style="border-radius: 12px; background: #f9f9f9;">
            <td style="padding: 12px; text-align: center;">${productMap[item.barcode] ? productMap[item.barcode].name : 'Unknown Product'}</td>
            <td style="padding: 12px; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; text-align: center;">₱${item.price}</td>
        </tr>`;
        cartTable.innerHTML += row;
        total += parseFloat(item.price) * item.quantity;
    });

    totalPriceElement.textContent = `Total: ₱${total.toFixed(2)}`;
}

// Function to split data into chunks
function splitData(data, chunkSize) {
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
}

// Function to generate QR codes for large data
function generateQRForLargeData(data, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous QR codes

    const chunkSize = 2953; // Maximum data size for QR code version 40 with error correction level L
    const chunks = splitData(data, chunkSize);

    chunks.forEach((chunk, index) => {
        const qrCode = new QRCode(container, {
            text: chunk,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H,
            encoding: 'UTF-8'
        });

        // Add a separator between QR codes
        if (index < chunks.length - 1) {
            container.appendChild(document.createElement('br'));
        }
    });
}

// Function to save data to a text file
function saveDataToFile(data, filename) {
    const blob = new Blob([data], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

function checkout() {
    navigateTo('checkout');
    const cartTable = document.getElementById('cartTable');
    const qrCodeData = [];

    // Get data from cart table
    for (let i = 0; i < cartTable.rows.length; i++) {
        const row = cartTable.rows[i];
        const product = row.cells[0].textContent;
        const quantity = row.cells[1].textContent;
        const price = row.cells[2].textContent;

        // Find the barcode for the product
        const barcode = scannedItems.find(item => productMap[item.barcode] && productMap[item.barcode].name === product).barcode;

        // Convert product name to English
        const englishProduct = productMap[barcode] ? productMap[barcode].name : 'Unknown Product';

        qrCodeData.push(`${englishProduct} x ${quantity} - ${price}`);
    }

    const dataString = qrCodeData.join('\n');

    // Save data to a text file
    saveDataToFile(dataString, 'cart_data.txt');

    // Split data into smaller chunks
    const chunkSize = 2953; // Maximum data size for QR code version 40 with error correction level L
    const chunks = [];
    for (let i = 0; i < dataString.length; i += chunkSize) {
        chunks.push(dataString.slice(i, i + chunkSize));
    }

    // Generate QR codes for each chunk
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    qrCodeContainer.innerHTML = ''; // Clear previous QR code

    chunks.forEach((chunk, index) => {
        const qrCode = new QRCode(qrCodeContainer, {
            text: chunk,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L,
            encoding: 'UTF-8',
            version: 40
        });

        // Add a separator between QR codes
        if (index < chunks.length - 1) {
            qrCodeContainer.appendChild(document.createElement('br'));
        }
    });
}

// Function to close QR popup
function closeQRPopup() {
    navigateTo('start');
    // Reset the scanned items array
    scannedItems = [];
    // Reset the cart table
    const cartTable = document.getElementById('cartTable');
    cartTable.innerHTML = '';
    // Reset the total price
    const totalPriceElement = document.getElementById('totalPrice');
    totalPriceElement.textContent = 'Total: ₱0.00';
    // Hide the proceed button
    document.getElementById('proceed-button').style.display = 'none';
    // Reset the product map
    productMap = {
        '4806518335346': { name: 'Belo', price: 600 },
        '4800010075069': { name: 'Cream O', price: 10 },
        '4005900437907': { name: 'Nivea Pearl Radiant', price: 600 },
        // add more mappings here
    };
    // Reset the last scanned time
    lastScannedTime = 0;
}

// Function to proceed to cart
function proceedToCart() {
    navigateTo('cart');
}

// Initialize scanner when page loads
window.onload = () => navigateTo('start');