import { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { Save, Eye, EyeOff, CheckCircle, Settings2, Cpu, Loader, ExternalLink, AlertCircle, CheckCircle2, Paintbrush } from 'lucide-react';
import { testAIConnection } from '../utils/ai.js';

export default function Settings() {
    const { aiSettings, updateAISettings, appearance, updateAppearance } = useCRM();

    const [form, setForm] = useState({ ...aiSettings });
    const [appForm, setAppForm] = useState({ theme: 'dark', font: 'inter', ...(appearance || {}) });
    const [saved, setSaved] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [showGeminiKey, setShowGeminiKey] = useState(false);

    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Keep form in sync if aiSettings change externally
    useEffect(() => {
        setForm({ ...aiSettings });
        setAppForm({ theme: 'dark', font: 'inter', ...(appearance || {}) });
    }, [aiSettings, appearance]);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
    const setApp = (k, v) => setAppForm(prev => ({ ...prev, [k]: v }));

    const handleSave = () => {
        updateAISettings(form);
        updateAppearance(appForm);
        setSaved(true);
        setTestResult(null);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleTest = async () => {
        // Save first, then test
        updateAISettings(form);
        setTesting(true);
        setTestResult(null);
        try {
            await testAIConnection(form);
            setTestResult({ ok: true, message: `✅ Connexion ${form.provider === 'openai' ? 'OpenAI' : 'Gemini'} réussie ! L'IA est opérationnelle.` });
        } catch (err) {
            setTestResult({ ok: false, message: err.message });
        } finally {
            setTesting(false);
        }
    };

    const openaiModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    const activeKey = form.provider === 'openai' ? form.openaiKey : form.geminiKey;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Paramètres</h1>
                    <p className="page-subtitle">Configuration de votre CRM et de l'IA</p>
                </div>
            </div>

            <div style={{ maxWidth: 660 }}>
                {/* AI Config Card */}
                <div className="card mb-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Cpu size={18} color="var(--accent-secondary)" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Configuration IA</h3>
                            <p className="text-sm text-secondary">Configurez votre provider d'IA. Chaque provider a sa propre clé.</p>
                        </div>
                    </div>

                    {/* Provider selector */}
                    <div className="input-group mb-5">
                        <label className="input-label">Provider actif</label>
                        <div className="flex gap-3">
                            {[
                                { id: 'gemini', label: 'Google Gemini', desc: 'gemini-2.0-flash (recommandé, gratuit)', emoji: '🔵' },
                                { id: 'openai', label: 'OpenAI', desc: 'GPT-4o, GPT-4o-mini...', emoji: '🟢' },
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => set('provider', p.id)}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: 10, cursor: 'pointer',
                                        border: `2px solid ${form.provider === p.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                                        background: form.provider === p.id ? 'rgba(108,99,255,0.1)' : 'var(--bg-card)',
                                        textAlign: 'left', transition: 'var(--transition)',
                                    }}
                                >
                                    <p style={{ fontWeight: 600, color: form.provider === p.id ? 'var(--accent-secondary)' : 'var(--text-primary)', fontSize: 14, marginBottom: 2 }}>
                                        {p.emoji} {p.label}
                                    </p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* OpenAI section */}
                    <div style={{
                        border: `1px solid ${form.provider === 'openai' ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
                        borderRadius: 10, padding: 16, marginBottom: 16,
                        background: form.provider === 'openai' ? 'rgba(108,99,255,0.03)' : 'transparent',
                        opacity: form.provider === 'openai' ? 1 : 0.6,
                    }}>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                            🟢 OpenAI
                        </p>

                        <div className="input-group mb-3">
                            <label className="input-label">Modèle</label>
                            <select className="input" value={form.model || 'gpt-4o-mini'} onChange={e => set('model', e.target.value)}>
                                {openaiModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Clé API OpenAI</label>
                            <div className="relative">
                                <input
                                    className="input"
                                    type={showOpenAIKey ? 'text' : 'password'}
                                    value={form.openaiKey || ''}
                                    onChange={e => set('openaiKey', e.target.value)}
                                    placeholder="sk-proj-..."
                                    style={{ paddingRight: 44 }}
                                    autoComplete="off"
                                />
                                <button
                                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                    {showOpenAIKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-secondary)', marginTop: 4, textDecoration: 'none' }}>
                                <ExternalLink size={11} /> Obtenir une clé sur platform.openai.com
                            </a>
                        </div>
                    </div>

                    {/* Gemini section */}
                    <div style={{
                        border: `1px solid ${form.provider === 'gemini' ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
                        borderRadius: 10, padding: 16, marginBottom: 20,
                        background: form.provider === 'gemini' ? 'rgba(108,99,255,0.03)' : 'transparent',
                        opacity: form.provider === 'gemini' ? 1 : 0.6,
                    }}>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                            🔵 Google Gemini
                        </p>

                        <div className="input-group">
                            <label className="input-label">Clé API Google AI Studio</label>
                            <div className="relative">
                                <input
                                    className="input"
                                    type={showGeminiKey ? 'text' : 'password'}
                                    value={form.geminiKey || ''}
                                    onChange={e => set('geminiKey', e.target.value)}
                                    placeholder="AIza..."
                                    style={{ paddingRight: 44 }}
                                    autoComplete="off"
                                />
                                <button
                                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-secondary)', marginTop: 4, textDecoration: 'none' }}>
                                <ExternalLink size={11} /> Obtenir une clé sur aistudio.google.com (gratuit)
                            </a>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mb-3">
                        <button
                            className="btn btn-ghost"
                            onClick={handleTest}
                            disabled={!activeKey || testing}
                        >
                            {testing
                                ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Test en cours...</>
                                : '🔌 Tester la connexion'
                            }
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {saved
                                ? <><CheckCircle size={16} /> Sauvegardé !</>
                                : <><Save size={16} /> Sauvegarder</>
                            }
                        </button>
                    </div>

                    {/* Test result */}
                    {testResult && (
                        <div style={{
                            padding: '12px 16px', borderRadius: 8, marginTop: 4,
                            background: testResult.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                            border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                        }}>
                            {testResult.ok
                                ? <CheckCircle2 size={16} color="var(--accent-green)" style={{ marginTop: 1, flexShrink: 0 }} />
                                : <AlertCircle size={16} color="var(--accent-red)" style={{ marginTop: 1, flexShrink: 0 }} />
                            }
                            <p style={{ fontSize: 13, lineHeight: 1.6, color: testResult.ok ? 'var(--accent-green)' : 'var(--accent-red)', whiteSpace: 'pre-wrap' }}>
                                {testResult.message}
                            </p>
                        </div>
                    )}
                </div>

                {/* Appearance Card */}
                <div className="card mb-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Paintbrush size={18} color="#ec4899" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Apparence & Couleurs</h3>
                            <p className="text-sm text-secondary">Personnalisez le thème et la typographie de votre CRM.</p>
                        </div>
                    </div>

                    <div className="grid grid-2 gap-4">
                        <div className="input-group">
                            <label className="input-label">Thème Couleur</label>
                            <select className="input" value={appForm.theme} onChange={e => {
                                setApp('theme', e.target.value);
                                updateAppearance({ theme: e.target.value });
                            }}>
                                <option value="dark">🌙 Sombre (Défaut)</option>
                                <option value="midnight">🌌 Bleu Nuit (Contraste +)</option>
                                <option value="light">☀️ Clair</option>
                                <option value="high-contrast">⬛ Contraste Élevé</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Typographie principale</label>
                            <select className="input" value={appForm.font} onChange={e => {
                                setApp('font', e.target.value);
                                updateAppearance({ font: e.target.value });
                            }}>
                                <option value="inter">Inter (Moderne, Lisible)</option>
                                <option value="roboto">Roboto (Classique)</option>
                                <option value="playfair">Playfair Display (Élégant, Serif)</option>
                                <option value="firacode">Fira Code (Technique, Monospace)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* User Profile */}
                <div className="card mb-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Settings2 size={18} color="var(--accent-blue)" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Profil Freelance</h3>
                            <p className="text-sm text-secondary">Ces infos seront utilisées dans vos devis/factures</p>
                        </div>
                    </div>
                    <div className="grid grid-2 gap-3">
                        <div className="input-group">
                            <label className="input-label">Nom complet</label>
                            <input className="input" placeholder="Jean Dupont" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Activité</label>
                            <input className="input" placeholder="Développeur Web Freelance" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">SIRET</label>
                            <input className="input" placeholder="XXX XXX XXX XXXXX" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">TVA</label>
                            <input className="input" placeholder="FR XX XXXXXXXXX" />
                        </div>
                        <div className="input-group" style={{ gridColumn: 'span 2' }}>
                            <label className="input-label">Adresse</label>
                            <input className="input" placeholder="123 rue de la Paix, 75001 Paris" />
                        </div>
                    </div>
                </div>

                {/* Email sync */}
                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 18 }}>📧</span>
                        </div>
                        <div>
                            <h3 className="font-semibold">Synchronisation Email</h3>
                            <p className="text-sm text-secondary">Connectez Gmail ou Outlook</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn btn-ghost flex-1" style={{ justifyContent: 'center', opacity: 0.6 }}>
                            📧 Connecter Gmail <span className="badge badge-yellow" style={{ marginLeft: 4 }}>Bientôt</span>
                        </button>
                        <button className="btn btn-ghost flex-1" style={{ justifyContent: 'center', opacity: 0.6 }}>
                            📬 Connecter Outlook <span className="badge badge-yellow" style={{ marginLeft: 4 }}>Bientôt</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
