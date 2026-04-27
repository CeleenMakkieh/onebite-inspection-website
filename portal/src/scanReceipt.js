const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a receipt data extraction assistant. The user has uploaded a photo or scan of a purchase receipt. Your job is to read every single line item on the receipt and return the data as JSON.

Return ONLY valid JSON — no markdown fences, no explanation, no extra text. Start your response with { and end with }.

Use this exact structure:
{
  "vendor": "store or vendor name",
  "date": "YYYY-MM-DD or empty string",
  "receiptNumber": "receipt or invoice number, or empty string",
  "items": [
    {
      "name": "full item description exactly as written on receipt",
      "quantity": 1,
      "unit": "ea",
      "unitPrice": 0.00,
      "lineTotal": 0.00,
      "confidence": 1
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00
}

Important rules:
- Read EVERY line item — do not skip any, even if the receipt is long
- Copy the item name exactly as printed, including product codes or abbreviations
- quantity: the number of units purchased (default 1 if not shown)
- unit: "ea", "lb", "oz", "case", "bag", "box", "gal", "pkg", or whatever appears
- unitPrice: price per unit. If not shown separately, divide lineTotal by quantity
- lineTotal: the total dollar amount for that line
- confidence: 1 = clearly readable, 0.5 = partially unclear or blurry, 0 = could not read
- Use 0 for any number that is missing, and "" for any string that is missing
- If the image is rotated or blurry, do your best and set confidence accordingly`;

export async function scanReceiptImage(file) {
    if (!ANTHROPIC_API_KEY) throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env');

    // PDFs use a separate document path
    if (file.type === 'application/pdf') {
        return scanPdf(file);
    }

    // Resize and convert to JPEG for all image types
    const { base64, mediaType } = await prepareImage(file);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: mediaType, data: base64 }
                    },
                    {
                        type: 'text',
                        text: 'Read this receipt and extract every line item. Return all data as JSON.'
                    }
                ]
            }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Anthropic API error:', err);
        throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const text = (data.content?.[0]?.text || '').trim();
    console.log('Raw AI response:', text.slice(0, 300));

    return parseJson(text);
}

async function scanPdf(file) {
    const base64 = await fileToBase64Raw(file);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
            'anthropic-beta': 'pdfs-2024-09-25',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'document',
                        source: { type: 'base64', media_type: 'application/pdf', data: base64 }
                    },
                    {
                        type: 'text',
                        text: 'Read this receipt PDF and extract every line item. Return all data as JSON.'
                    }
                ]
            }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const text = (data.content?.[0]?.text || '').trim();
    return parseJson(text);
}

// Resize image to max 1600px and convert to JPEG.
// Uses createImageBitmap with imageOrientation:'from-image' to auto-correct
// EXIF rotation — critical for mobile gallery photos that are stored sideways.
async function prepareImage(file) {
    const MAX = 1600;
    const url = URL.createObjectURL(file);

    try {
        // createImageBitmap respects EXIF orientation on all modern mobile browsers
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image', resizeQuality: 'high' });
        URL.revokeObjectURL(url);

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

        return await canvasToBase64(canvas);
    } catch (_) {
        // Fallback for browsers that don't support createImageBitmap options
        URL.revokeObjectURL(url);
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

function parseJson(text) {
    // Direct parse
    try { return JSON.parse(text); } catch (_) {}

    // Strip markdown code fences if the model wrapped it anyway
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
        try { return JSON.parse(fenced[1].trim()); } catch (_) {}
    }

    // Extract first {...} block
    const block = text.match(/\{[\s\S]*\}/);
    if (block) {
        try { return JSON.parse(block[0]); } catch (_) {}
    }

    console.error('Could not parse AI response:', text);
    throw new Error('Could not read the receipt. Make sure the photo is clear and try again.');
}
