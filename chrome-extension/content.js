// CRM AI — LinkedIn Content Script
// Extrait les données du profil LinkedIn et les stocke pour le popup

function extractLinkedInProfile() {
    const profile = {};

    // Nom complet
    const nameEl = document.querySelector('h1.text-heading-xlarge, h1[class*="inline"], .pv-text-details__left-panel h1');
    profile.name = nameEl?.textContent?.trim() || '';

    // Headline / Poste
    const headlineEl = document.querySelector('.text-body-medium.break-words, .pv-text-details__left-panel .text-body-medium');
    profile.headline = headlineEl?.textContent?.trim() || '';

    // Entreprise actuelle
    const companyEl = document.querySelector('[aria-label*="Entreprise"] span, .pv-text-details__right-panel-item span, .inline-show-more-text--is-collapsed');
    // Try multiple selectors for company
    const experienceSection = document.querySelector('#experience ~ .pvs-list__container .pvs-entity .pvs-entity__path-node');
    const companyFromExp = experienceSection?.textContent?.trim();
    profile.company = companyFromExp || companyEl?.textContent?.trim() || '';

    // Localisation
    const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words, [class*="pb2 pv-text-details"] span');
    profile.location = locationEl?.textContent?.trim() || '';

    // URL du profil
    profile.linkedinUrl = window.location.href.split('?')[0];

    // LinkedIn username
    const match = profile.linkedinUrl.match(/\/in\/([^/]+)/);
    profile.linkedinUsername = match ? match[1] : '';

    // Photo de profil
    const avatarEl = document.querySelector('.pv-top-card-profile-picture__image--show, img.profile-photo-edit__preview');
    profile.avatarUrl = avatarEl?.src || '';

    // Connexions / Followers
    const followersEl = document.querySelector('.pvs-header__subtitle span');
    profile.connections = followersEl?.textContent?.trim() || '';

    // About section
    const aboutEl = document.querySelector('#about ~ .pvs-list__container .inline-show-more-text, #about ~ div [class*="full-width"]');
    profile.about = aboutEl?.textContent?.trim().slice(0, 500) || '';

    return profile;
}

// Inject floating button on LinkedIn profile pages
function injectButton() {
    if (document.getElementById('crmai-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'crmai-btn';
    btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
    Ajouter au CRM
  `;
    btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 99999;
    background: linear-gradient(135deg, #6c63ff, #a78bfa);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 12px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(108, 99, 255, 0.4);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
  `;
    btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; btn.style.boxShadow = '0 6px 28px rgba(108,99,255,0.5)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 4px 20px rgba(108,99,255,0.4)'; });

    btn.addEventListener('click', () => {
        const profile = extractLinkedInProfile();
        // Store in chrome.storage for popup to read
        chrome.storage.local.set({ linkedinProfile: profile, extractedAt: Date.now() });
        // Visual feedback
        btn.innerHTML = '✓ Profil extrait !';
        btn.style.background = 'linear-gradient(135deg, #10b981, #34d399)';
        setTimeout(() => {
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg> Ajouter au CRM`;
            btn.style.background = 'linear-gradient(135deg, #6c63ff, #a78bfa)';
        }, 2000);
    });

    document.body.appendChild(btn);
}

// Run when page is ready
if (document.readyState === 'complete') {
    injectButton();
} else {
    window.addEventListener('load', injectButton);
}

// Handle LinkedIn SPA navigation (they use pushState)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl && url.includes('/in/')) {
        lastUrl = url;
        setTimeout(injectButton, 1500);
    }
}).observe(document, { subtree: true, childList: true });
