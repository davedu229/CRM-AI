import { useState, useRef, useCallback } from 'react';
import { useCRM } from '../context/CRMContext';
import { getActiveKey } from '../utils/ai.js';
import { useNavigate } from 'react-router-dom';
import {
    Upload, FileText, Sparkles, Edit2, Save, ArrowRight,
    CheckCircle, X, Plus, Trash2, AlertCircle, ChevronDown
} from 'lucide-react';

// Extract text from PDF using pdfjs-dist
async function extractTextFromPDF(file) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
}

async function extractTextFromFile(file) {
    if (file.type === 'application/pdf') {
        return extractTextFromPDF(file);
    }
    // Plain text / markdown / doc
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

const RATE_EXAMPLES = [
    { label: 'Développeur Web', taux: 600 },
    { label: 'Designer UX/UI', taux: 450 },
    { label: 'Consultant SEO', taux: 350 },
    { label: 'Rédacteur', taux: 250 },
    { label: 'Chef de projet', taux: 500 },
];

const STEPS = ['brief', 'analyse', 'devis', 'sauvegarde'];

export default function BriefToDevis() {
    const { contacts, addInvoice, callAI, aiSettings } = useCRM();
    const navigate = useNavigate();

    const [step, setStep] = useState('brief'); // brief | analyse | devis | sauvegarde
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [briefText, setBriefText] = useState('');
    const [extractedText, setExtractedText] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState('');
    const [tjm, setTjm] = useState(500);
    const [selectedContact, setSelectedContact] = useState('');

    // Generated devis
    const [devis, setDevis] = useState(null);
    const [savedId, setSavedId] = useState(null);

    const inputRef = useRef(null);

    // ── FILE HANDLING ──────────────────────────────────────────────────────────
    const handleFile = useCallback(async (f) => {
        if (!f) return;
        const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
        if (!allowed.includes(f.type) && !f.name.endsWith('.txt') && !f.name.endsWith('.md')) {
            setError('Format non supporté. Utilisez PDF, TXT ou MD.');
            return;
        }
        setError('');
        setFile(f);
        setExtracting(true);
        try {
            const text = await extractTextFromFile(f);
            setExtractedText(text);
        } catch (e) {
            setError('Impossible de lire le fichier : ' + e.message);
        } finally {
            setExtracting(false);
        }
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    // ── AI ANALYSIS ────────────────────────────────────────────────────────────
    const analyzeWithAI = async () => {
        const content = extractedText || briefText;
        if (!content.trim()) { setError('Le brief est vide.'); return; }
        if (!getActiveKey(aiSettings)) { setError('Configurez votre clé API dans Paramètres.'); return; }

        setError('');
        setStep('analyse');

        const prompt = `Tu es un expert en chiffrage pour freelances. Analyse ce cahier des charges / brief client et génère un devis détaillé.

BRIEF CLIENT:
"""
${content.slice(0, 8000)}
"""

TARIF JOURNALIER DU FREELANCE: ${tjm}€/jour (soit ${Math.round(tjm / 8)}€/heure)

Génère un devis structuré. Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) :
{
  "titre": "Titre court du projet",
  "resume": "Résumé du besoin client en 2-3 phrases",
  "complexite": "Simple | Moyen | Complexe",
  "delai_estime": "ex: 3 semaines",
  "lignes": [
    {
      "categorie": "ex: Conception, Développement, Déploiement...",
      "description": "Description précise de la prestation",
      "jours": 2.5,
      "unitPrice": 1250,
      "quantity": 1
    }
  ],
  "notes": "Conditions importantes, exclusions, hypothèses",
  "acompte_recommande": 30
}

Règles:
- Sois réaliste sur les durées (pense à la communication client, les itérations)
- Découpe en phases logiques (Cadrage, Design, Dev, Tests, Livraison)
- unitPrice = jours × ${tjm}
- Inclure toujours une ligne "Gestion de projet & communication" (10-15% du total)`;

        try {
            const raw = await callAI(
                [{ role: 'user', content: prompt }],
                'Tu es un expert en chiffrage de projets digitaux pour freelances. Réponds UNIQUEMENT en JSON valide, sans aucun texte autour.'
            );

            let parsed;
            try {
                const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                parsed = JSON.parse(cleaned);
            } catch {
                throw new Error('La réponse IA n\'est pas un JSON valide. Réessayez.');
            }

            // Ensure required fields
            parsed.lignes = (parsed.lignes || []).map((l, i) => ({
                ...l,
                id: i,
                quantity: l.quantity ?? 1,
                unitPrice: l.unitPrice ?? (l.jours * tjm),
            }));

            setDevis(parsed);
            setStep('devis');
        } catch (e) {
            setError(e.message);
            setStep('brief');
        }
    };

    // ── DEVIS EDITING ──────────────────────────────────────────────────────────
    const updateLigne = (id, key, value) => {
        setDevis(prev => ({
            ...prev,
            lignes: prev.lignes.map(l =>
                l.id === id ? { ...l, [key]: value, unitPrice: key === 'jours' ? Number(value) * tjm : (key === 'unitPrice' ? Number(value) : l.unitPrice) } : l
            ),
        }));
    };
    const removeLigne = (id) => setDevis(prev => ({ ...prev, lignes: prev.lignes.filter(l => l.id !== id) }));
    const addLigne = () => setDevis(prev => ({
        ...prev,
        lignes: [...prev.lignes, { id: Date.now(), categorie: 'Autre', description: '', jours: 1, quantity: 1, unitPrice: tjm }],
    }));

    const total = devis?.lignes?.reduce((s, l) => s + (Number(l.quantity) * Number(l.unitPrice)), 0) ?? 0;
    const acompte = devis ? Math.round(total * (devis.acompte_recommande / 100)) : 0;

    // ── SAVE TO CRM ────────────────────────────────────────────────────────────
    const saveDevis = () => {
        const contact = contacts.find(c => c.id === selectedContact);
        const saved = addInvoice({
            contactId: selectedContact,
            contactName: contact?.name || 'À définir',
            company: contact?.company || '',
            type: 'Devis',
            status: 'Brouillon',
            dueDate: '',
            amount: total,
            items: devis.lignes.map(l => ({
                description: `[${l.categorie}] ${l.description}`,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
            })),
        });
        setSavedId(saved.id);
        setStep('sauvegarde');
    };

    const complexityColor = { Simple: 'badge-green', Moyen: 'badge-yellow', Complexe: 'badge-red' };

    // ── STEP INDICATOR ─────────────────────────────────────────────────────────
    const StepIndicator = () => (
        <div className="flex items-center gap-2 mb-8">
            {[
                { id: 'brief', label: 'Brief' },
                { id: 'analyse', label: 'Analyse IA' },
                { id: 'devis', label: 'Devis' },
                { id: 'sauvegarde', label: 'Sauvegardé' },
            ].map((s, i, arr) => {
                const idx = STEPS.indexOf(step);
                const sIdx = STEPS.indexOf(s.id);
                const done = idx > sIdx;
                const active = idx === sIdx;
                return (
                    <div key={s.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700,
                                background: done ? 'var(--accent-green)' : active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'rgba(255,255,255,0.06)',
                                color: done || active ? 'white' : 'var(--text-muted)',
                                border: active ? '2px solid var(--accent-secondary)' : 'none',
                                transition: 'all 0.3s ease',
                            }}>
                                {done ? <CheckCircle size={14} /> : i + 1}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--text-primary)' : done ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                                {s.label}
                            </span>
                        </div>
                        {i < arr.length - 1 && <ArrowRight size={14} color="var(--text-muted)" />}
                    </div>
                );
            })}
        </div>
    );

    // ── RENDER ─────────────────────────────────────────────────────────────────
    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Brief → Devis Automatique</h1>
                    <p className="page-subtitle">Déposez un cahier des charges — l'IA génère un devis chiffré en quelques secondes</p>
                </div>
            </div>

            <div style={{ maxWidth: 860, margin: '0 auto' }}>
                <StepIndicator />

                {/* ── STEP 1: Brief ──────────────────────────────────────────────── */}
                {(step === 'brief') && (
                    <div>
                        <div className="grid grid-2 gap-4 mb-4">
                            {/* File drop zone */}
                            <div>
                                <p className="input-label mb-2">Déposer un fichier (PDF, TXT, MD)</p>
                                <div
                                    style={{
                                        border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border)'}`,
                                        borderRadius: 'var(--radius)',
                                        padding: '40px 20px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        background: dragOver ? 'rgba(108,99,255,0.08)' : 'rgba(255,255,255,0.02)',
                                        minHeight: 200,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                                    }}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={onDrop}
                                    onClick={() => inputRef.current?.click()}
                                >
                                    <input ref={inputRef} type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                                    {extracting ? (
                                        <>
                                            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                                            <p className="text-secondary text-sm">Extraction du texte...</p>
                                        </>
                                    ) : file ? (
                                        <>
                                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <CheckCircle size={24} color="var(--accent-green)" />
                                            </div>
                                            <p className="font-semibold">{file.name}</p>
                                            <p className="text-xs text-muted">{extractedText.length.toLocaleString()} caractères extraits</p>
                                            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setFile(null); setExtractedText(''); }}>
                                                <X size={14} /> Changer de fichier
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(108,99,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Upload size={24} color="var(--accent-secondary)" />
                                            </div>
                                            <p className="font-semibold text-secondary">Glissez votre brief ici</p>
                                            <p className="text-xs text-muted">ou cliquez pour parcourir</p>
                                            <p className="text-xs text-muted">PDF · TXT · Markdown</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* OR text input */}
                            <div>
                                <p className="input-label mb-2">Ou collez directement le brief</p>
                                <textarea
                                    className="input"
                                    rows={10}
                                    value={briefText}
                                    onChange={e => setBriefText(e.target.value)}
                                    placeholder={`Exemple:\n\nNous cherchons un freelance pour refonte complète de notre site e-commerce.\n\n- Design UI/UX from scratch (Figma)\n- Développement Next.js\n- Connecter à l'API Shopify\n- 10 pages environ\n- Livraison dans 6 semaines\n- Budget indicatif : 10-15k€`}
                                    style={{ height: '100%', minHeight: 200 }}
                                />
                            </div>
                        </div>

                        {/* Settings */}
                        <div className="card mb-4">
                            <h3 className="font-semibold mb-4">⚙️ Paramètres de chiffrage</h3>
                            <div className="grid grid-2 gap-4">
                                <div className="input-group">
                                    <label className="input-label">Votre Taux Journalier Moyen (TJM)</label>
                                    <div className="relative">
                                        <input
                                            className="input"
                                            type="number"
                                            value={tjm}
                                            onChange={e => setTjm(Number(e.target.value))}
                                            min={100} max={5000} step={50}
                                            style={{ paddingRight: 40 }}
                                        />
                                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>€</span>
                                    </div>
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {RATE_EXAMPLES.map(r => (
                                            <button key={r.label} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setTjm(r.taux)}>
                                                {r.label} ({r.taux}€)
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Contact associé (optionnel)</label>
                                    <select className="input" value={selectedContact} onChange={e => setSelectedContact(e.target.value)}>
                                        <option value="">À définir plus tard</option>
                                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 mb-4 p-3 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <AlertCircle size={16} color="var(--accent-red)" />
                                <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</p>
                            </div>
                        )}

                        <button
                            className="btn btn-primary w-full"
                            onClick={analyzeWithAI}
                            disabled={(!file && !briefText.trim()) || !getActiveKey(aiSettings)}
                            style={{ justifyContent: 'center', padding: '14px' }}
                        >
                            <Sparkles size={18} />
                            Générer le devis avec l'IA
                            {!getActiveKey(aiSettings) && <span className="badge badge-yellow" style={{ marginLeft: 8 }}>Clé API requise</span>}
                        </button>
                    </div>
                )}

                {/* ── STEP 2: Analyse en cours ───────────────────────────────────── */}
                {step === 'analyse' && (
                    <div className="card" style={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 24 }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 40px rgba(108,99,255,0.4)',
                            animation: 'pulse 2s ease-in-out infinite',
                        }}>
                            <Sparkles size={36} color="white" />
                        </div>
                        <div>
                            <h2 className="font-bold" style={{ fontSize: 22, marginBottom: 8 }}>L'IA analyse votre brief</h2>
                            <p className="text-secondary">Lecture du document · Identification des livrables · Chiffrage...</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            {['Lecture du brief', 'Découpe en phases', 'Estimation des jours', 'Calcul du prix'].map((label, i) => (
                                <div key={label} style={{
                                    padding: '6px 12px', borderRadius: 99, fontSize: 12,
                                    background: 'rgba(108,99,255,0.1)', color: 'var(--accent-secondary)',
                                    border: '1px solid rgba(108,99,255,0.2)',
                                    animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
                                }}>
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Devis éditable ─────────────────────────────────────── */}
                {step === 'devis' && devis && (
                    <div>
                        {/* Header */}
                        <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(167,139,250,0.05))', borderColor: 'rgba(108,99,255,0.2)' }}>
                            <div className="flex items-start justify-between flex-wrap gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="font-bold" style={{ fontSize: 20 }}>{devis.titre}</h2>
                                        <span className={`badge ${complexityColor[devis.complexite] || 'badge-gray'}`}>{devis.complexite}</span>
                                    </div>
                                    <p className="text-secondary text-sm" style={{ maxWidth: 500 }}>{devis.resume}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p className="text-xs text-muted mb-1">Durée estimée</p>
                                    <p className="font-semibold" style={{ color: 'var(--accent-secondary)' }}>{devis.delai_estime}</p>
                                </div>
                            </div>
                        </div>

                        {/* Lignes éditables */}
                        <div className="card mb-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">📋 Détail des prestations</h3>
                                <p className="text-xs text-muted">Modifiez les valeurs directement</p>
                            </div>

                            {/* Table header */}
                            <div className="flex gap-2 mb-2" style={{ padding: '0 8px' }}>
                                <p className="text-xs text-muted" style={{ flex: 1 }}>Description</p>
                                <p className="text-xs text-muted" style={{ width: 70, textAlign: 'center' }}>Jours</p>
                                <p className="text-xs text-muted" style={{ width: 110, textAlign: 'right' }}>Prix unitaire</p>
                                <p className="text-xs text-muted" style={{ width: 110, textAlign: 'right' }}>Total</p>
                                <div style={{ width: 32 }} />
                            </div>

                            {devis.lignes.map((ligne) => (
                                <div key={ligne.id} style={{
                                    display: 'flex', gap: 8, alignItems: 'center', padding: '10px 8px',
                                    borderRadius: 8, marginBottom: 6,
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'border-color 0.2s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(108,99,255,0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                                >
                                    <div style={{ flex: 1 }}>
                                        <p className="text-xs" style={{ color: 'var(--accent-secondary)', marginBottom: 3 }}>{ligne.categorie}</p>
                                        <input
                                            className="input" style={{ padding: '6px 8px', fontSize: 13 }}
                                            value={ligne.description}
                                            onChange={e => updateLigne(ligne.id, 'description', e.target.value)}
                                        />
                                    </div>
                                    <input
                                        className="input" type="number" min="0.5" step="0.5"
                                        style={{ width: 70, padding: '8px', textAlign: 'center', fontSize: 13 }}
                                        value={ligne.jours}
                                        onChange={e => updateLigne(ligne.id, 'jours', e.target.value)}
                                    />
                                    <div style={{ width: 110, position: 'relative' }}>
                                        <input
                                            className="input" type="number" min="0"
                                            style={{ padding: '8px 24px 8px 8px', fontSize: 13, textAlign: 'right' }}
                                            value={ligne.unitPrice}
                                            onChange={e => updateLigne(ligne.id, 'unitPrice', e.target.value)}
                                        />
                                        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12 }}>€</span>
                                    </div>
                                    <div style={{ width: 110, textAlign: 'right', paddingRight: 4 }}>
                                        <p className="font-semibold" style={{ fontSize: 14 }}>
                                            {(Number(ligne.quantity) * Number(ligne.unitPrice)).toLocaleString()}€
                                        </p>
                                    </div>
                                    <button className="btn btn-ghost btn-icon" style={{ padding: 6, flexShrink: 0 }} onClick={() => removeLigne(ligne.id)}>
                                        <Trash2 size={14} color="var(--accent-red)" />
                                    </button>
                                </div>
                            ))}

                            <button className="btn btn-ghost btn-sm mt-2" onClick={addLigne}>
                                <Plus size={14} /> Ajouter une ligne
                            </button>
                        </div>

                        {/* Total & conditions */}
                        <div className="grid grid-2 gap-4 mb-4">
                            <div className="card">
                                <p className="text-xs text-muted mb-1">📝 Notes & conditions</p>
                                <textarea
                                    className="input" rows={4} style={{ fontSize: 13 }}
                                    value={devis.notes || ''}
                                    onChange={e => setDevis(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(167,139,250,0.04))', borderColor: 'rgba(108,99,255,0.2)' }}>
                                <div className="flex justify-between mb-3">
                                    <p className="text-secondary">Sous-total</p>
                                    <p className="font-semibold">{total.toLocaleString()}€</p>
                                </div>
                                <div className="flex justify-between mb-3">
                                    <p className="text-secondary">TVA (si applicable)</p>
                                    <p className="text-muted">—</p>
                                </div>
                                <div className="divider" style={{ margin: '12px 0' }} />
                                <div className="flex justify-between mb-4">
                                    <p className="font-bold" style={{ fontSize: 16 }}>TOTAL HT</p>
                                    <p className="font-bold" style={{ fontSize: 22, color: 'var(--accent-secondary)' }}>{total.toLocaleString()}€</p>
                                </div>
                                <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(16,185,129,0.15)' }}>
                                    <p className="text-xs text-muted mb-1">Acompte recommandé ({devis.acompte_recommande}%)</p>
                                    <p className="font-semibold" style={{ color: 'var(--accent-green)', fontSize: 18 }}>{acompte.toLocaleString()}€</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button className="btn btn-ghost" onClick={() => { setStep('brief'); setDevis(null); }}>
                                ← Recommencer
                            </button>
                            <button className="btn btn-primary flex-1" style={{ justifyContent: 'center' }} onClick={saveDevis}>
                                <Save size={16} /> Sauvegarder dans le CRM
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: Sauvegardé ────────────────────────────────────────── */}
                {step === 'sauvegarde' && (
                    <div className="card" style={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'rgba(16,185,129,0.15)',
                            border: '2px solid var(--accent-green)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CheckCircle size={40} color="var(--accent-green)" />
                        </div>
                        <div>
                            <h2 className="font-bold" style={{ fontSize: 22, marginBottom: 8 }}>Devis sauvegardé ! 🎉</h2>
                            <p className="text-secondary">Référence : <span className="font-semibold text-accent">{savedId}</span></p>
                            <p className="text-secondary">Montant total : <span className="font-bold" style={{ color: 'var(--accent-green)', fontSize: 20 }}>{total.toLocaleString()}€</span></p>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button className="btn btn-ghost" onClick={() => { setStep('brief'); setFile(null); setExtractedText(''); setBriefText(''); setDevis(null); setSavedId(null); }}>
                                Nouveau devis
                            </button>
                            <button className="btn btn-primary" onClick={() => navigate('/invoices')}>
                                <FileText size={16} /> Voir dans Devis & Factures
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
