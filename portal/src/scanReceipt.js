const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

export async function scanReceiptImage(file) {
    const isPdf = file.type === 'application/pdf';
    const base64 = isPdf ? await fileToBase64Raw(file) : (await prepareImage(file)).base64;
    const fileName = file.name || (isPdf ? 'receipt.pdf' : 'receipt.jpg');

    // Step 1: Veryfi OCR via Netlify serverless function
    const veryfiData = await callVeryfi(base64, fileName);

    // Step 2: Map Veryfi response to app schema
    const receipt = mapVeryfiToSchema(veryfiData);

    // Step 3: Clean abbreviated item names with Claude (falls back to raw names if unavailable)
    if (ANTHROPIC_API_KEY && receipt.items.length > 0) {
        receipt.items = await cleanItemNames(receipt.items);
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

function mapVeryfiToSchema(data) {
    const items = (data.line_items || [])
        .map(it => ({
            name: it.description || it.name || '',
            quantity: parseFloat(it.quantity) || 1,
            unit: it.unit_of_measure || 'ea',
            unitPrice: parseFloat(it.unit_price) || 0,
            lineTotal: parseFloat(it.total) || 0,
            confidence: 1,
        }))
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

async function cleanItemNames(items) {
    const names = items.map(it => it.name);

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: `These are item names from a restaurant supply receipt OCR scan. Many have abbreviations, codes, or are truncated. Clean each name to be human-readable: expand abbreviations, fix truncations, remove item codes. Keep the food/product identity accurate. Return ONLY a JSON array of cleaned name strings in the same order. No other text.\n\n${JSON.stringify(names)}`
                }]
            })
        });

        if (!response.ok) return items;

        const data = await response.json();
        const text = (data.content?.[0]?.text || '').trim();

        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
            const cleaned = JSON.parse(match[0]);
            if (Array.isArray(cleaned) && cleaned.length === items.length) {
                return items.map((it, i) => ({ ...it, name: cleaned[i] || it.name }));
            }
        }
    } catch (_) {}

    return items;
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
