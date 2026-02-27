// CRM AI — LinkedIn Extension Popup Logic

const CRM_URL = 'http://localhost:5173';
const STAGES = ['À contacter', 'En discussion', 'Devis envoyé', 'Gagné', 'Perdu'];

let profile = null;
let settings = { apiKey: '', provider: 'openai' };

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
    // Load settings
    const stored = await chrome.storage.local.get(['crmSettings', 'linkedinProfile', 'extractedAt']);
    if (stored.crmSettings) settings = stored.crmSettings;

    const content = document.getElementById('content');
    const age = stored.extractedAt ? (Date.now() - stored.extractedAt) / 1000 : Infinity;

    // Check if we're on LinkedIn
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isLinkedIn = tab?.url?.includes('linkedin.com/in/');

    if (!isLinkedIn) {
        content.innerHTML = `
      <div class="no-profile">
        <div class="icon">💼</div>
        <p style="margin-bottom:8px; font-size:13px; color:#e2e8f0; font-weight:600">Naviguez vers un profil LinkedIn</p>
        <p style="font-size:11px; color:#64748b">Ouvrez linkedin.com/in/[profil] pour importer automatiquement les infos</p>
      </div>`;
        return;
    }

    if (!stored.linkedinProfile || age > 120 || !stored.linkedinProfile.name) {
        // Inject content script and extract
        try {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            await new Promise(r => setTimeout(r, 800));
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const nameEl = document.querySelector('h1.text-heading-xlarge, h1[class*="top-card"] span');
                    const headlineEl = document.querySelector('.text-body-medium.break-words');
                    const locationEl = document.querySelector('.not-first-middot span[class*="t-black"]');
                    return {
                        name: nameEl?.textContent?.trim() || '',
                        headline: headlineEl?.textContent?.trim() || '',
                        location: locationEl?.textContent?.trim() || '',
                        linkedinUrl: window.location.href.split('?')[0],
                        company: '',
                    };
                },
            });
            if (result[0]?.result) {
                profile = result[0].result;
                await chrome.storage.local.set({ linkedinProfile: profile, extractedAt: Date.now() });
            }
        } catch (e) {
            profile = stored.linkedinProfile || null;
        }
    } else {
        profile = stored.linkedinProfile;
    }

    renderMain(content);
}

// ── RENDER MAIN ───────────────────────────────────────────────────────────────
function renderMain(content) {
    if (!profile?.name) {
        content.innerHTML = `
      <div class="no-profile">
        <div class="icon">🔍</div>
        <p style="margin-bottom:6px; font-size:13px; color:#e2e8f0; font-weight:600">Profil non détecté</p>
        <p style="font-size:11px; color:#64748b; margin-bottom:12px">Cliquez sur le bouton violet dans la page LinkedIn</p>
        <button class="btn btn-secondary" onclick="window.location.reload()">↺ Réessayer</button>
      </div>`;
        return;
    }

    const nameShort = profile.name.split(' ')[0];

    content.innerHTML = `
    <div class="profile-card">
      <div style="display:flex; align-items:flex-start; gap:10px;">
        <div style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#6c63ff,#a78bfa); display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:700; color:white; flex-shrink:0;">
          ${profile.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1; min-width:0;">
          <div class="profile-name">${profile.name}</div>
          <div class="profile-headline">${profile.headline || 'Poste non renseigné'}</div>
          <div class="profile-company">${profile.company || ''}</div>
          <div class="profile-location">📍 ${profile.location || 'Localisation inconnue'}</div>
        </div>
        <span class="badge badge-green">✓ Extrait</span>
      </div>
    </div>

    <div id="message-section">
      <p class="section-title">✨ Accroche personnalisée</p>
      <div id="icebreaker-area">
        <button class="btn btn-primary" id="gen-btn" ${!settings.apiKey ? 'disabled' : ''}>
          <span>✨</span> Générer avec l'IA
        </button>
        ${!settings.apiKey ? '<p style="font-size:10px; color:#64748b; text-align:center; margin-top:4px;">Clé API requise — voir ⚙️</p>' : ''}
      </div>
    </div>

    <hr class="divider"/>

    <div class="input-group">
      <label>Stage CRM</label>
      <select id="stage-select">
        ${STAGES.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </div>

    <div class="input-group">
      <label>Email (optionnel)</label>
      <input type="email" id="email-input" placeholder="prenom@entreprise.com" />
    </div>

    <div class="input-group">
      <label>Notes</label>
      <input type="text" id="notes-input" placeholder="Intéressé par..." />
    </div>

    <div id="status-area"></div>

    <button class="btn btn-primary" id="import-btn">
      💾 Ajouter dans le CRM
    </button>

    <div class="settings-toggle" id="settings-toggle">⚙️ Paramètres API</div>
    <div id="settings-panel" style="display:none;">
      <div class="settings-panel">
        <p class="section-title">Configuration IA</p>
        <div class="input-group">
          <label>Provider</label>
          <select id="provider-select">
            <option value="openai" ${settings.provider === 'openai' ? 'selected' : ''}>OpenAI (GPT-4o-mini)</option>
            <option value="gemini" ${settings.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
          </select>
        </div>
        <div class="input-group">
          <label>Clé API</label>
          <input type="password" id="api-key-input" value="${settings.apiKey}" placeholder="sk-... ou AIza..." />
        </div>
        <button class="btn btn-secondary" id="save-settings-btn">💾 Enregistrer</button>
      </div>
    </div>
  `;

    // Event listeners
    document.getElementById('gen-btn')?.addEventListener('click', generateIcebreaker);
    document.getElementById('import-btn')?.addEventListener('click', importToCRM);
    document.getElementById('settings-toggle')?.addEventListener('click', toggleSettings);
    document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);
}

// ── GENERATE ICEBREAKER ───────────────────────────────────────────────────────
async function generateIcebreaker() {
    const btn = document.getElementById('gen-btn');
    const area = document.getElementById('icebreaker-area');
    btn.innerHTML = '<span class="spinner"></span> Génération...';
    btn.disabled = true;

    const prompt = `Tu es un expert en prospection B2B pour freelances. Rédige un message d'accroche LinkedIn court, personnalisé et authentique pour contacter ce profil.

Profil LinkedIn :
- Nom : ${profile.name}
- Poste : ${profile.headline}
- Entreprise : ${profile.company || 'non renseignée'}
- Localisation : ${profile.location}

Règles :
- Maximum 4 phrases
- Commence par mentionner quelque chose de spécifique (son poste ou son secteur)
- Ne pas paraître commercial ou robotique
- Ton naturel et humain
- En français
- Ne pas mentionner LinkedIn explicitement

Écris uniquement le message, sans introduction ni explication.`;

    try {
        let reply = '';
        if (settings.provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
                body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 200 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Erreur OpenAI');
            reply = data.choices[0].message.content;
        } else {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Erreur Gemini');
            reply = data.candidates[0].content.parts[0].text;
        }

        area.innerHTML = `
      <div class="icebreaker-label">✨ Message généré par l'IA</div>
      <div class="icebreaker-box" id="icebreaker-text">${reply}</div>
      <button class="btn btn-secondary" id="copy-btn">📋 Copier le message</button>
      <button class="btn btn-secondary" id="regen-btn" style="margin-top:-2px;">↺ Régénérer</button>
    `;
        document.getElementById('copy-btn')?.addEventListener('click', () => {
            navigator.clipboard.writeText(reply);
            document.getElementById('copy-btn').textContent = '✓ Copié !';
            setTimeout(() => { document.getElementById('copy-btn').textContent = '📋 Copier le message'; }, 2000);
        });
        document.getElementById('regen-btn')?.addEventListener('click', generateIcebreaker);
        // Autofill notes
        document.getElementById('notes-input').value = profile.headline;

    } catch (e) {
        area.innerHTML = `<div class="error-box">Erreur : ${e.message}</div><button class="btn btn-secondary" id="retry-btn">Réessayer</button>`;
        document.getElementById('retry-btn')?.addEventListener('click', generateIcebreaker);
    }
}

// ── IMPORT TO CRM ─────────────────────────────────────────────────────────────
async function importToCRM() {
    const stage = document.getElementById('stage-select').value;
    const email = document.getElementById('email-input').value;
    const notes = document.getElementById('notes-input').value;
    const icebreaker = document.getElementById('icebreaker-text')?.textContent || '';

    const contactData = {
        name: profile.name,
        company: profile.company || '',
        email,
        headline: profile.headline,
        location: profile.location,
        linkedinUrl: profile.linkedinUrl,
        stage,
        notes: notes || profile.headline,
        icebreaker,
        source: 'linkedin',
    };

    // Open CRM with import params
    const params = new URLSearchParams({ import: JSON.stringify(contactData) });
    const url = `${CRM_URL}/contacts?${params.toString()}`;

    await chrome.tabs.create({ url });

    document.getElementById('status-area').innerHTML = `
    <div class="success-box">✅ CRM ouvert — ${profile.name} est prêt à être ajouté !</div>`;
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function saveSettings() {
    const provider = document.getElementById('provider-select').value;
    const apiKey = document.getElementById('api-key-input').value;
    settings = { provider, apiKey };
    await chrome.storage.local.set({ crmSettings: settings });
    document.getElementById('save-settings-btn').textContent = '✓ Enregistré !';
    setTimeout(() => { document.getElementById('save-settings-btn').textContent = '💾 Enregistrer'; }, 2000);
    // Re-render to enable generate button if key was added
    renderMain(document.getElementById('content'));
}

// ── START ─────────────────────────────────────────────────────────────────────
init();
