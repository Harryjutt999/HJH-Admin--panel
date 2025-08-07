const { kv } = require('@vercel/kv');

// --- ADMIN PASSWORD YAHAN SET KAREIN ---
const ADMIN_PASSWORD = "9#K$z@pW8!vR&eG*"; // <-- Apna password yahan likhein

// Helper function to generate a new unique key
function generateUniqueKey() {
    const part1 = "HJH";
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part3 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part4 = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${part1}-${part2}-${part3}-${part4}`;
}

exports.handler = async (event, context) => {
    const DB_KEY = 'hjh_access_keys';
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const { action, key } = requestBody;

    // Authentication for admin actions
    if (action === 'generate' || action === 'block') {
        const authHeader = event.headers.authorization;
        if (!authHeader || authHeader.split(' ')[1] !== ADMIN_PASSWORD) {
            return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Unauthorized' }) };
        }
    }

    let keys = await kv.get(DB_KEY) || [];

    // Handle GET request for admin
    if (event.httpMethod === 'GET' ) {
         const authHeader = event.headers.authorization;
        if (!authHeader || authHeader.split(' ')[1] !== ADMIN_PASSWORD) {
             return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Unauthorized' }) };
        }
        return { statusCode: 200, body: JSON.stringify(keys) };
    }

    // Handle POST requests
    switch (action) {
        case 'generate':
            const newKey = generateUniqueKey();
            keys.push({ key: newKey, status: 'Available', created_on: new Date().toISOString(), activated_on: null });
            await kv.set(DB_KEY, keys);
            return { statusCode: 200, body: JSON.stringify({ success: true, key: newKey }) };

        case 'block':
            const keyToBlock = keys.find(k => k.key === key);
            if (keyToBlock) {
                keyToBlock.status = 'Blocked';
                await kv.set(DB_KEY, keys);
                return { statusCode: 200, body: JSON.stringify({ success: true }) };
            }
            return { statusCode: 404, body: JSON.stringify({ success: false, message: 'Key not found' }) };

        case 'validate':
            const keyToValidate = keys.find(k => k.key === key);
            if (!keyToValidate) {
                return { statusCode: 200, body: JSON.stringify({ success: false, message: 'Invalid Access Key' }) };
            }
            if (keyToValidate.status === 'Blocked') {
                return { statusCode: 200, body: JSON.stringify({ success: false, message: 'This key has been blocked' }) };
            }
            if (keyToValidate.status === 'Available') {
                keyToValidate.status = 'Used';
                keyToValidate.activated_on = new Date().toISOString();
                await kv.set(DB_KEY, keys);
            }
            return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Access Granted' }) };

        default:
            return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Invalid action' }) };
    }
};
