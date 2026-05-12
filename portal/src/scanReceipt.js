export async function scanReceiptImage(file) {
    const isPdf = file.type === 'application/pdf';
    const base64 = isPdf ? await fileToBase64Raw(file) : (await prepareImage(file)).base64;
    const fileName = file.name || (isPdf ? 'receipt.pdf' : 'receipt.jpg');

    // Step 1: Veryfi OCR via Netlify serverless function
    const veryfiData = await callVeryfi(base64, fileName);

    // Step 2: Map Veryfi response to app schema
    const receipt = mapVeryfiToSchema(veryfiData);

    // Step 3: Clean names + categorize — Claude backend function first, rule-based fallback
    if (receipt.items.length > 0) {
        receipt.items = await cleanItemNames(receipt.items);
        // Rule-based cleaner fills in for any item Claude didn't handle
        receipt.items = receipt.items.map(it => ({
            ...it,
            name: it._claudeCleaned ? it.name : cleanNameRules(it.name),
            category: it.category || guessCategory(it.name),
        }));
    }

    return receipt;
}

async function callVeryfi(fileData, fileName) {
    const res = await fetch('/.netlify/functions/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData, fileName }),
    });

    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (_) {
        throw new Error(`Server returned an unreadable response (status ${res.status}). The image may be too large — try a smaller photo.`);
    }

    if (!res.ok) {
        const msg = data?.error || data?.message || `Veryfi error ${res.status}`;
        throw new Error(msg);
    }

    return data;
}

const UNIT_MAP = {
    'EA': 'ea', 'EACH': 'ea', 'PC': 'ea', 'PCS': 'ea', 'UNIT': 'ea',
    'LB': 'lb', 'LBS': 'lb', 'POUND': 'lb', 'POUNDS': 'lb',
    'OZ': 'oz', 'OUNCE': 'oz', 'OUNCES': 'oz',
    'KG': 'kg', 'KILO': 'kg', 'KILOGRAM': 'kg',
    'CS': 'case', 'CASE': 'case', 'CA': 'case',
    'BX': 'box', 'BOX': 'box',
    'BG': 'bag', 'BAG': 'bag',
    'GAL': 'gal', 'GALLON': 'gal', 'GL': 'gal',
    'PKG': 'pkg', 'PACK': 'pkg', 'PACKAGE': 'pkg', 'PK': 'pkg',
    'DZ': 'dz', 'DOZEN': 'dz',
    'CT': 'ct', 'COUNT': 'ct',
    'QT': 'qt', 'QUART': 'qt',
    'PT': 'pt', 'PINT': 'pt',
    'L': 'L', 'LT': 'L', 'LITER': 'L',
};

function normalizeUnit(raw) {
    if (!raw) return 'ea';
    const u = raw.trim().toUpperCase();
    return UNIT_MAP[u] || raw.toLowerCase() || 'ea';
}

function mapVeryfiToSchema(data) {
    const items = (data.line_items || [])
        .map(it => {
            const qty = parseFloat(it.quantity) || 1;
            const lineTotal = parseFloat(it.total) || parseFloat(it.line_total) || 0;
            const rawUnitPrice = parseFloat(it.unit_price) || parseFloat(it.price) || 0;
            // Calculate unit price from total/qty if Veryfi didn't extract it
            const unitPrice = rawUnitPrice > 0 ? rawUnitPrice : (lineTotal > 0 && qty > 0 ? lineTotal / qty : 0);
            return {
                name: it.description || it.name || '',
                quantity: qty,
                unit: normalizeUnit(it.unit_of_measure),
                unitPrice: Math.round(unitPrice * 100) / 100,
                lineTotal,
                confidence: 1,
            };
        })
        .filter(it => it.name.trim());

    return {
        vendor: data.vendor?.name || (typeof data.vendor === 'string' ? data.vendor : '') || '',
        date: data.date || '',
        receiptNumber: data.invoice_number || data.receipt_number || '',
        items,
        subtotal: parseFloat(data.subtotal) || 0,
        tax: parseFloat(data.tax) || 0,
        total: parseFloat(data.total) || 0,
    };
}

function guessCategory(name) {
    const n = name.toLowerCase();
    if (/chicken|beef|pork|lamb|turkey|veal|duck|steak|rib|wing|breast|thigh|sausage|bacon|ham|ground|bnls|chkn|brs|meat|poultry|loin/.test(n)) return 'Meat & Poultry';
    if (/tomato|lettuce|pepper|onion|garlic|cilantro|parsley|spinach|cucumber|zucchini|eggplant|potato|carrot|celery|mushroom|avocado|lemon|lime|orange|apple|banana|grape|salad|produce|vegetable|fruit|broccoli|cabbage|kale|herb/.test(n)) return 'Produce & Fresh Items';
    if (/milk|cheese|butter|cream|yogurt|egg|dairy|mozzarella|cheddar|feta|ricotta/.test(n)) return 'Dairy & Eggs';
    if (/oil|flour|sugar|salt|rice|pasta|sauce|can|jar|bean|lentil|grain|cereal|bread crumb|panko|starch|syrup|honey|mayo|ketchup|mustard|relish/.test(n)) return 'Dry Goods & Pantry';
    if (/frozen|ice cream|freeze/.test(n)) return 'Frozen Foods';
    if (/water|juice|soda|drink|beverage|tea|coffee|lemonade|smoothie/.test(n)) return 'Beverages';
    if (/bread|pita|tortilla|bun|roll|bagel|croissant|muffin|pastry|bakery|loaf/.test(n)) return 'Bread & Bakery';
    if (/container|cup|lid|straw|napkin|bag|box|wrap|foil|glove|utensil|spoon|fork|plate|supply|plastic|paper/.test(n)) return 'Containers & Supplies';
    if (/clean|soap|detergent|bleach|sanitizer|disinfect|degreaser|wipe/.test(n)) return 'Cleaning & Household';
    if (/pickle|preserved|olive|pepperoncini|jalapeno jar|marinated/.test(n)) return 'Pickles & Preserved Items';
    if (/spice|seasoning|cumin|paprika|oregano|basil|thyme|cinnamon|pepper|chili|turmeric|curry|za.atar|sumac|allspice/.test(n)) return 'Spices & Condiments';
    if (/fee|deposit|discount|adjust|credit|tax|delivery|charge/.test(n)) return 'Adjustments & Fees';
    return 'Miscellaneous';
}

async function cleanItemNames(items) {
    const names = items.map(it => it.name);

    try {
        const response = await fetch('/.netlify/functions/clean-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names }),
        });

        const text = await response.text();
        let cleaned;
        try {
            cleaned = JSON.parse(text);
        } catch (_) {
            console.warn('clean-items returned non-JSON:', text.slice(0, 200));
            return items;
        }

        if (!response.ok) {
            console.warn('clean-items error:', cleaned?.error);
            return items;
        }

        if (Array.isArray(cleaned) && cleaned.length === items.length) {
            return items.map((it, i) => ({
                ...it,
                name: cleaned[i]?.name || it.name,
                category: cleaned[i]?.category || '',
                _claudeCleaned: true,
                needsReview: cleaned[i]?.confident === false,
            }));
        }
        console.warn('clean-items unexpected response length');
    } catch (e) {
        console.warn('cleanItemNames error:', e.message);
    }

    return items;
}

function cleanNameRules(name) {
    if (!name) return name;
    let n = name.trim();
    // Remove trailing numeric product codes
    n = n.replace(/\s+#?\d{5,}$/, '');
    // Convert ALL CAPS to Title Case as a minimum readability fix
    if (n === n.toUpperCase() && n.length > 2) {
        n = n.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
    return n.trim() || name;
}

// Resize image to max 1600px and auto-correct EXIF rotation for mobile photos
async function prepareImage(file) {
    const MAX = 1600;

    try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image', resizeQuality: 'high' });
        const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
        const w = Math.round(bitmap.width * scale);
        const h = Math.round(bitmap.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();

        return canvasToBase64(canvas);
    } catch (_) {
        return fallbackPrepare(file, MAX);
    }
}

function fallbackPrepare(file, MAX) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            canvasToBase64(canvas).then(resolve).catch(reject);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            fileToBase64Raw(file).then(b64 => resolve({ base64: b64, mediaType: 'image/jpeg' })).catch(reject);
        };
        img.src = url;
    });
}

function canvasToBase64(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            const reader = new FileReader();
            reader.onload = () => resolve({ base64: reader.result.split(',')[1], mediaType: 'image/jpeg' });
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.88);
    });
}

function fileToBase64Raw(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
