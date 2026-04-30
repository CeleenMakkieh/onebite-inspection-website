exports.handler = async (event) => {
    const CORS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
    }

    const clientId = process.env.VERYFI_CLIENT_ID;
    const username = process.env.VERYFI_USERNAME;
    const apiKey = process.env.VERYFI_API_KEY;

    if (!clientId || !username || !apiKey) {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Veryfi credentials not configured on server' }) };
    }

    try {
        const { fileData, fileName } = JSON.parse(event.body);

        const veryfiRes = await fetch('https://api.veryfi.com/api/v8/partner/documents/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CLIENT-ID': clientId,
                'AUTHORIZATION': `apikey ${username}:${apiKey}`,
            },
            body: JSON.stringify({
                file_data: fileData,
                file_name: fileName || 'receipt.jpg',
            }),
        });

        const rawText = await veryfiRes.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (_) {
            return {
                statusCode: 502,
                headers: { ...CORS, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: `Veryfi returned non-JSON (status ${veryfiRes.status}): ${rawText.slice(0, 300)}` }),
            };
        }
        return {
            statusCode: veryfiRes.status,
            headers: { ...CORS, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: e.message }),
        };
    }
};
