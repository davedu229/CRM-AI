import { useState, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { Mail, RefreshCw, Sparkles, CheckCircle, AlertCircle, ExternalLink, ChevronRight, Inbox, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Google OAuth / Gmail API ─────────────────────────────────────────────────
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

function loadGSI() {
    return new Promise((resolve) => {
        if (window.google?.accounts) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

async function fetchGmailMessages(accessToken, maxResults = 20) {
    const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    if (!listData.messages) return [];

    const messages = await Promise.all(
        listData.messages.slice(0, maxResults).map(async (msg) => {
            const detail = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const d = await detail.json();
            const headers = d.payload?.headers || [];
            const get = (name) => headers.find(h => h.name === name)?.value || '';
            const snippet = d.snippet || '';
            return {
                id: msg.id,
                subject: get('Subject'),
                from: get('From'),
                date: get('Date'),
                snippet,
                threadId: d.threadId,
            };
        })
    );
    return messages;
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function EmailSync() {
    const { contacts, updateContact, callAI, getCRMContext, aiSettings } = useCRM();
    const googleClientId = aiSettings.googleClientId || '';


    const [clientId, setClientId] = useState(googleClientId || '');
    const [accessToken, setAccessToken] = useState(null);
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [analyses, setAnalyses] = useState([]);  // résultats IA par email
    const [savedClientId, setSavedClientId] = useState(googleClientId || '');
    const [showSetup, setShowSetup] = useState(!googleClientId);
    const tokenClientRef = useRef(null);

    const login = async () => {
        setError('');
        if (!savedClientId) { setError('Entrez votre Google Client ID d\'abord.'); return; }
        try {
            await loadGSI();
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
                client_id: savedClientId,
                scope: GMAIL_SCOPES,
                callback: async (resp) => {
                    if (resp.error) { setError('Erreur OAuth: ' + resp.error); return; }
                    setAccessToken(resp.access_token);
                    await loadEmails(resp.access_token);
                },
            });
            tokenClientRef.current.requestAccessToken();
        } catch (e) {
            setError('Impossible de charger Google OAuth: ' + e.message);
        }
    };

    const loadEmails = async (token) => {
        setLoading(true);
        try {
            const msgs = await fetchGmailMessages(token, 15);
            setEmails(msgs);
        } catch (e) {
            setError('Erreur Gmail API: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const analyzeEmails = async () => {
        if (!emails.length || !aiSettings.apiKey) return;
        setAnalyzing(true);
        setAnalyses([]);
        const crmCtx = getCRMContext();
        const contactNames = contacts.map(c => `${c.name} (${c.company})`).join(', ');

        try {
            const emailsSummary = emails.slice(0, 8).map((e, i) =>
                `[${i}] De: ${e.from} | Sujet: ${e.subject} | Aperçu: ${e.snippet?.slice(0, 120)}`
            ).join('\n');

            const prompt = `Tu es un assistant CRM pour freelance. Analyse ces emails Gmail et classe-les par rapport aux contacts du CRM.

EMAILS:
${emailsSummary}

CONTACTS CRM:
${contactNames}

${crmCtx}

Pour chaque email pertinent (ignore newsletters, spams, notifications auto), génère un JSON array:
[{
  "emailIndex": 0,
  "contactName": "nom du contact correspondant ou null",
  "tone": "positif | neutre | négatif | hésitant | urgent",
  "resume": "1 phrase résumant l'email",
  "action": "action recommandée pour le freelance",
  "draftReply": "brouillon de réponse courte et professionnelle (3-4 phrases max)"
}]

Réponds UNIQUEMENT avec le JSON valide, sans markdown.`;

            const raw = await callAI([{ role: 'user', content: prompt }], 'Tu es un assistant CRM expert en communication commerciale. Réponds UNIQUEMENT en JSON valide.');
            const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            setAnalyses(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
            setError('Erreur analyse IA: ' + e.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const applyToContact = (analysis) => {
        const contact = contacts.find(c => c.name === analysis.contactName);
        if (!contact) return;
        const note = `[Email ${new Date().toLocaleDateString('fr-FR')}] ${analysis.resume} → Action: ${analysis.action}`;
        updateContact(contact.id, { notes: (contact.notes ? contact.notes + '\n\n' : '') + note });
    };

    const toneColor = { positif: 'badge-green', neutre: 'badge-gray', négatif: 'badge-red', hésitant: 'badge-yellow', urgent: 'badge-red' };
    const toneEmoji = { positif: '😊', neutre: '😐', négatif: '😟', hésitant: '🤔', urgent: '🚨' };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Synchronisation Email</h1>
                    <p className="page-subtitle">Connectez Gmail — l'IA classe vos emails et génère des brouillons de réponse</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowSetup(!showSetup)}>
                        <Settings2 size={16} /> Configuration
                    </button>
                    {accessToken && (
                        <button className="btn btn-ghost btn-sm" onClick={() => loadEmails(accessToken)} disabled={loading}>
                            <RefreshCw size={16} className={loading ? 'spinner' : ''} /> Actualiser
                        </button>
                    )}
                </div>
            </div>

            {/* Setup panel */}
            {showSetup && (
                <div className="card mb-6" style={{ borderColor: 'rgba(108,99,255,0.3)' }}>
                    <h3 className="font-semibold mb-4">🔐 Configuration Google OAuth</h3>
                    <div className="grid grid-2 gap-6">
                        <div>
                            <div className="input-group mb-3">
                                <label className="input-label">Google Client ID</label>
                                <input
                                    className="input"
                                    value={clientId}
                                    onChange={e => setClientId(e.target.value)}
                                    placeholder="XXXXXXX.apps.googleusercontent.com"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button className="btn btn-primary" onClick={() => { setSavedClientId(clientId); setShowSetup(false); }}>
                                    <CheckCircle size={16} /> Enregistrer
                                </button>
                                <button className="btn btn-ghost" onClick={login} disabled={!clientId}>
                                    <Mail size={16} /> Connecter Gmail
                                </button>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 16, fontSize: 13 }}>
                            <p className="font-semibold mb-2 text-accent">Comment obtenir votre Client ID :</p>
                            <ol style={{ paddingLeft: 16, lineHeight: 2, color: 'var(--text-secondary)' }}>
                                <li>Allez sur <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)' }}>console.cloud.google.com</a></li>
                                <li>Créez un projet → APIs → Gmail API → Activer</li>
                                <li>Identifiants → Créer des identifiants → ID Client OAuth</li>
                                <li>Type: <strong>Application Web</strong></li>
                                <li>Origines JS autorisées: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>http://localhost:5173</code></li>
                                <li>Copiez le Client ID ici</li>
                            </ol>
                            <p className="text-xs text-muted mt-2">✅ Gratuit — vos emails restent sur votre navigateur, jamais partagés</p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={16} color="var(--accent-red)" />
                    <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</p>
                </div>
            )}

            {/* Non connecté */}
            {!accessToken && (
                <div className="card" style={{ minHeight: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(16,185,129,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(59,130,246,0.3)' }}>
                        <Mail size={36} color="var(--accent-blue)" />
                    </div>
                    <div>
                        <h2 className="font-bold" style={{ fontSize: 20, marginBottom: 8 }}>Connectez votre Gmail</h2>
                        <p className="text-secondary" style={{ maxWidth: 400 }}>
                            Autorisez l'accès en lecture seule à votre boîte mail. L'IA analyse les échanges avec vos clients et génère des brouillons de réponse.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn btn-primary" onClick={login} disabled={!savedClientId}>
                            <Mail size={16} /> Se connecter avec Google
                        </button>
                        {!savedClientId && <button className="btn btn-ghost" onClick={() => setShowSetup(true)}>⚙️ Configurer d'abord</button>}
                    </div>
                    <div className="flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: 99, border: '1px solid var(--border)' }}>
                        <CheckCircle size={14} color="var(--accent-green)" />
                        <span className="text-xs text-secondary">Lecture seule — vos emails ne quittent jamais votre navigateur</span>
                    </div>
                </div>
            )}

            {/* Connecté : liste des emails */}
            {accessToken && (
                <>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="badge badge-green">✓ Gmail connecté</span>
                            <span className="text-sm text-muted">{emails.length} emails récupérés</span>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={analyzeEmails}
                            disabled={analyzing || !aiSettings.apiKey || emails.length === 0}
                        >
                            {analyzing ? <><span className="spinner" /> Analyse en cours...</> : <><Sparkles size={16} /> Analyser avec l'IA</>}
                        </button>
                    </div>

                    {loading && (
                        <div className="empty-state"><span className="spinner" style={{ width: 40, height: 40 }} /><p className="text-secondary mt-2">Chargement des emails...</p></div>
                    )}

                    {!loading && emails.length > 0 && (
                        <div className="flex-col gap-3">
                            {emails.map((email, idx) => {
                                const analysis = analyses.find(a => a.emailIndex === idx);
                                const contact = analysis?.contactName ? contacts.find(c => c.name === analysis.contactName) : null;

                                return (
                                    <div key={email.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        {/* Email header */}
                                        <div style={{ padding: '14px 20px', borderBottom: analysis ? '1px solid var(--border)' : 'none', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
                                                📧
                                            </div>
                                            <div className="flex-1" style={{ minWidth: 0 }}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-semibold truncate" style={{ flex: 1 }}>{email.subject || '(sans objet)'}</p>
                                                    <span className="text-xs text-muted">{email.date?.slice(0, 16)}</span>
                                                </div>
                                                <p className="text-sm text-secondary truncate">{email.from}</p>
                                                <p className="text-xs text-muted mt-1 truncate">{email.snippet}</p>
                                            </div>
                                        </div>

                                        {/* IA Analysis */}
                                        {analysis && (
                                            <div style={{ padding: '16px 20px', background: 'rgba(108,99,255,0.04)' }}>
                                                <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="ai-badge">✨ IA</span>
                                                        {analysis.contactName && <span className="badge badge-purple">👤 {analysis.contactName}</span>}
                                                        <span className={`badge ${toneColor[analysis.tone] || 'badge-gray'}`}>
                                                            {toneEmoji[analysis.tone]} {analysis.tone}
                                                        </span>
                                                    </div>
                                                    {contact && (
                                                        <Link to={`/contacts/${contact.id}`} className="btn btn-ghost btn-sm">
                                                            Voir la fiche →
                                                        </Link>
                                                    )}
                                                </div>

                                                <p className="text-sm mb-2"><strong>Résumé :</strong> {analysis.resume}</p>
                                                <p className="text-sm text-accent mb-3"><strong>Action :</strong> {analysis.action}</p>

                                                {analysis.draftReply && (
                                                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 14, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                                                        <p className="text-xs text-muted mb-2">✏️ Brouillon de réponse suggéré :</p>
                                                        <p className="text-sm" style={{ lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{analysis.draftReply}</p>
                                                    </div>
                                                )}

                                                <div className="flex gap-2 flex-wrap">
                                                    {analysis.draftReply && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(analysis.draftReply)}>
                                                            📋 Copier le brouillon
                                                        </button>
                                                    )}
                                                    {contact && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => applyToContact(analysis)}>
                                                            <CheckCircle size={14} /> Sauvegarder dans la fiche
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
