import { kv } from '@vercel/kv';

// --- ADMIN PASSWORD YAHAN SET KAREIN ---
const ADMIN_PASSWORD = "9#K$z@pW8!vR&eG*"; // <-- Apna mazboot password yahan likhein

// Helper function to generate a new unique key
function generateUniqueKey() {
    const part1 = "HJH";
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part3 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part4 = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${part1}-${part2}-${part3}-${part4}`;
}

export default async function handler(request, response) {
    // Authentication Check
    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader.split(' ')[1] !== ADMIN_PASSWORD) {
        // For validation, we don't need a password
        if (request.method === 'POST' && request.body.action === 'validate') {
            // Allow validation requests to proceed
        } else {
            return response.status(401).json({ success: false, message: 'Unauthorized' });
        }
    }

    const DB_KEY = 'hjh_access_keys';

    // GET request: Saari keys fetch karein (Admin only)
    if (request.method === 'GET') {
        const keys = await kv.get(DB_KEY) || [];
        return response.status(200).json(keys);
    }

    // POST request: Action perform karein
    if (request.method === 'POST') {
        const { action, key } = request.body;
        let keys = await kv.get(DB_KEY) || [];

        switch (action) {
            case 'generate': // Admin only
                const newKey = generateUniqueKey();
                keys.push({
                    key: newKey,
                    status: 'Available',
                    created_on: new Date().toISOString(),
                    activated_on: null
                });
                await kv.set(DB_KEY, keys);
                return response.status(200).json({ success: true, key: newKey });

            case 'block': // Admin only
                const keyToBlock = keys.find(k => k.key === key);
                if (keyToBlock) {
                    keyToBlock.status = 'Blocked';
                    await kv.set(DB_KEY, keys);
                    return response.status(200).json({ success: true });
                }
                return response.status(404).json({ success: false, message: 'Key not found' });
            
            case 'validate': // Public action for user app
                const keyToValidate = keys.find(k => k.key === key);
                if (!keyToValidate) {
                    return response.status(200).json({ success: false, message: 'Invalid Access Key' });
                }
                if (keyToValidate.status === 'Blocked') {
                    return response.status(200).json({ success: false, message: 'This key has been blocked' });
                }
                if (keyToValidate.status === 'Used') {
                     // Optional: Aap "Used" key ko dobara access de sakte hain.
                     // Agar aap chahte hain ke ek baar use hone ke baad dobara na chale, to yahan se error bhej dein.
                     // return response.status(200).json({ success: false, message: 'This key has already been used' });
                }
                if (keyToValidate.status === 'Available') {
                    keyToValidate.status = 'Used';
                    keyToValidate.activated_on = new Date().toISOString();
                    await kv.set(DB_KEY, keys);
                }
                return response.status(200).json({ success: true, message: 'Access Granted' });

            default:
                return response.status(400).json({ success: false, message: 'Invalid action' });
        }
    }

    return response.status(405).json({ message: 'Method Not Allowed' });
                  }
                  
