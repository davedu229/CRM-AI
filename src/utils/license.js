/**
 * Utility function to validate a software license key.
 * In a real production app, this would make an API call to LemonSqueezy, Gumroad, or your backend.
 * 
 * @param {string} key - The license key entered by the user.
 * @returns {Promise<{ valid: boolean, message: string, features?: string[] }>}
 */
export async function validateLicenseKey(key) {
    if (!key) {
        throw new Error('Veuillez entrer une clé de licence.');
    }

    const trimmed = key.trim();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // --- MOCK VALIDATION LOGIC ---
    // For demonstration purposes:
    // Any key starting with 'LGTM' or 'TEST' is considered valid.
    // 'PRO-' gives pro features.

    if (trimmed.startsWith('LGTM') || trimmed.startsWith('TEST') || trimmed.startsWith('PRO-')) {
        return {
            valid: true,
            message: 'Licence activée avec succès.',
            features: trimmed.startsWith('PRO-') ? ['pro'] : ['basic'],
            expiresAt: null, // Lifetime license
        };
    }

    if (trimmed === 'EXPIRED') {
        throw new Error('Cette clé de licence a expiré. Veuillez renouveler votre abonnement.');
    }

    throw new Error('Clé de licence invalide. Veuillez vérifier votre saisie.');
}
