/**
 * ai.js — Unified AI utility for CRM AI
 * Supports OpenAI (GPT) and Google Gemini.
 * Both providers use separate stored API keys.
 */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * Load AI settings from localStorage.
 * Returns { provider, openaiKey, geminiKey, model }
 */
export function loadAISettings() {
    try {
        const raw = localStorage.getItem('crm_ai_settings_v2');
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { provider: 'gemini', openaiKey: '', geminiKey: '', model: 'gpt-4o-mini' };
}

/**
 * Save AI settings to localStorage.
 */
export function saveAISettings(settings) {
    localStorage.setItem('crm_ai_settings_v2', JSON.stringify(settings));
}

/**
 * Get the active API key for the current provider.
 */
export function getActiveKey(settings) {
    return settings.provider === 'openai' ? settings.openaiKey : settings.geminiKey;
}

/**
 * Decode an API error response into a human-readable string.
 */
async function decodeError(response, provider) {
    try {
        const body = await response.json();
        const msg = body?.error?.message || body?.error?.status || JSON.stringify(body);
        return formatErrorMessage(response.status, msg, provider);
    } catch {
        return formatErrorMessage(response.status, response.statusText, provider);
    }
}

function formatErrorMessage(status, msg, provider) {
    if (status === 401) {
        return `❌ Clé API invalide (401). Vérifiez votre clé ${provider === 'openai' ? 'OpenAI' : 'Gemini'} dans les Paramètres.`;
    }
    if (status === 429) {
        return `⚠️ Quota ou limite de taux dépassé (429). ${provider === 'openai'
            ? 'Vérifiez votre solde sur platform.openai.com/usage'
            : 'Votre quota gratuit Google AI est épuisé. Allez sur aistudio.google.com pour vérifier.'
            }`;
    }
    if (status === 400) {
        return `❌ Requête invalide (400): ${msg}`;
    }
    if (status === 403) {
        return `❌ Accès refusé (403). La clé API n'a pas les permissions nécessaires.`;
    }
    return `❌ Erreur ${status}: ${msg}`;
}

/**
 * Call OpenAI Chat Completions API.
 * @param {string} apiKey 
 * @param {string} model 
 * @param {Array} messages  — [{role, content}] including system role
 * @returns {Promise<string>}
 */
export async function callOpenAI(apiKey, model, messages) {
    if (!apiKey || !apiKey.trim()) throw new Error('❌ Clé API OpenAI manquante. Configurez-la dans les Paramètres.');

    const response = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 1500,
        }),
    });

    if (!response.ok) throw new Error(await decodeError(response, 'openai'));

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Call Google Gemini generateContent API.
 * NOTE: Gemini does NOT support a 'system' role.
 * We inject the system prompt as a prefix in the first user message.
 * @param {string} apiKey 
 * @param {string} systemPrompt
 * @param {Array} userMessages — [{role:'user'|'assistant', content}] (no system role)
 * @returns {Promise<string>}
 */
export async function callGemini(apiKey, systemPrompt, userMessages) {
    if (!apiKey || !apiKey.trim()) throw new Error('❌ Clé API Gemini manquante. Configurez-la dans les Paramètres.');

    // Filter out any system messages (Gemini rejects them)
    const filtered = userMessages.filter(m => m.role !== 'system');

    // Prepend system prompt to the first user message
    const firstContent = systemPrompt && filtered.length > 0
        ? `${systemPrompt}\n\n---\n\n${filtered[0].content}`
        : (systemPrompt || filtered[0]?.content || '');

    const geminiMessages = [
        { role: 'user', parts: [{ text: firstContent }] },
        ...filtered.slice(1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        })),
    ];

    const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey.trim()}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
        }),
    });

    if (!response.ok) throw new Error(await decodeError(response, 'gemini'));

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/**
 * High-level entry point used throughout the CRM.
 * @param {object} aiSettings — { provider, openaiKey, geminiKey, model }
 * @param {Array} messages — [{role, content}] may include system role
 * @param {string} systemPrompt — separate system prompt string
 * @returns {Promise<string>}
 */
export async function callAI(aiSettings, messages, systemPrompt = '') {
    const { provider, openaiKey, geminiKey, model } = aiSettings;

    if (provider === 'openai') {
        const fullMessages = systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages.filter(m => m.role !== 'system')]
            : messages;
        return callOpenAI(openaiKey, model, fullMessages);
    }

    if (provider === 'gemini') {
        return callGemini(geminiKey, systemPrompt, messages);
    }

    throw new Error(`Provider IA inconnu: "${provider}"`);
}

/**
 * Quick test — sends a single "ping" message to verify the key works.
 * Returns { ok: true } or throws a descriptive error.
 */
export async function testAIConnection(aiSettings) {
    const result = await callAI(aiSettings, [{ role: 'user', content: 'Réponds uniquement "OK".' }], '');
    if (!result) throw new Error('Réponse vide reçue.');
    return { ok: true, response: result };
}
