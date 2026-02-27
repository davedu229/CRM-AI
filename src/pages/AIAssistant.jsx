import { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Sparkles, Mic, Send, CheckSquare, User, ArrowRight, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';

const EXAMPLES = [
    "Appel avec Thomas Dupont. Il veut réduire le budget de 20%. On a discuté intégration API. Décision vendredi.",
    "RDV Sophie Martin. Très enthousiaste pour le projet UX. Elle veut commencer en mars. Budget confirmé 8k€.",
    "Réunion Lucas Bernard. Premier contact positif. Besoin audit SEO + stratégie content. Décideur mais attend validation DG.",
];

export default function AIAssistant() {
    const { contacts, updateContact, moveContact, callAI, getCRMContext, addTask, aiSettings } = useCRM();
    const [note, setNote] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedContact, setSelectedContact] = useState('');
    const [applied, setApplied] = useState(false);

    const processNote = async () => {
        if (!note.trim()) return;
        setLoading(true);
        setResult(null);
        setApplied(false);

        try {
            const crmCtx = getCRMContext();
            const contactList = contacts.map(c => `${c.id}: ${c.name} (${c.company}) — Stage actuel: ${c.stage}`).join('\n');

            const prompt = `Tu es l'assistant IA d'un CRM pour freelance. Analyse cette note brute et extrais des informations structurées.

NOTE BRUTE:
"${note}"

CONTACTS DISPONIBLES:
${contactList}

${selectedContact ? `Contact sélectionné: ${contacts.find(c => c.id === selectedContact)?.name}` : 'Identifie le contact mentionné si possible.'}

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) dans ce format exact:
{
  "contactId": "id du contact ou null si non trouvé",
  "contactName": "nom du contact",
  "summary": "résumé concis et professionnel de la note en 2-3 phrases",
  "newStage": "nouveau stage pipeline si changement recommandé, sinon null. Doit être un de: À contacter, En discussion, Devis envoyé, Gagné, Perdu",
  "stageChanged": true ou false,
  "todos": ["tâche à faire 1", "tâche à faire 2"],
  "noteToAdd": "note nettoyée à ajouter au contact"
}`;

            const raw = await callAI([{ role: 'user', content: prompt }], 'Tu es un assistant CRM expert. Réponds UNIQUEMENT en JSON valide, sans aucun texte autour, sans backticks.');

            let parsed;
            try {
                const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                parsed = JSON.parse(cleaned);
            } catch {
                throw new Error('Réponse IA invalide. Réessayez.');
            }
            setResult(parsed);
        } catch (err) {
            setResult({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    const applyResult = () => {
        if (!result || result.error) return;
        if (result.contactId) {
            const existingContact = contacts.find(c => c.id === result.contactId);
            if (existingContact) {
                const updatedNotes = `${existingContact.notes ? existingContact.notes + '\n\n' : ''}[${new Date().toLocaleDateString('fr-FR')}] ${result.noteToAdd}`;
                const updatedTodos = [...(existingContact.todos || []), ...(result.todos || [])];
                updateContact(result.contactId, { notes: updatedNotes, todos: updatedTodos });
                if (result.stageChanged && result.newStage) {
                    moveContact(result.contactId, result.newStage);
                }
            }
        }
        result.todos?.forEach(todo => {
            addTask({ text: todo, contactId: result.contactId, priority: 'medium', dueDate: '' });
        });
        setApplied(true);
    };

    const stageColors = {
        'À contacter': 'var(--accent-blue)', 'En discussion': 'var(--accent-yellow)',
        'Devis envoyé': 'var(--accent-secondary)', 'Gagné': 'var(--accent-green)', 'Perdu': 'var(--accent-red)',
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Assistant IA</h1>
                    <p className="page-subtitle">Dictez vos notes en vrac — l'IA fait le reste</p>
                </div>
                {!aiSettings.apiKey && (
                    <Link to="/settings" className="btn btn-ghost">⚙️ Configurer l'IA</Link>
                )}
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Input */}
                <div>
                    <div className="card">
                        <div className="ai-section-header mb-4">
                            <Sparkles size={18} color="var(--accent-secondary)" />
                            <span className="ai-section-title">Saisie de notes</span>
                        </div>

                        <div className="input-group mb-3">
                            <label className="input-label">Contact associé (optionnel)</label>
                            <select className="input" value={selectedContact} onChange={e => setSelectedContact(e.target.value)}>
                                <option value="">L'IA identifiera automatiquement</option>
                                {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                            </select>
                        </div>

                        <div className="input-group mb-3">
                            <label className="input-label">Vos notes brutes</label>
                            <textarea
                                className="input"
                                rows={8}
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Ex: Appel avec Thomas. Il veut réduire le budget mais reste intéressé. Décision vendredi. Il faut envoyer un nouveau devis..."
                            />
                        </div>

                        <button className="btn btn-primary w-full mb-3" onClick={processNote} disabled={loading || !note.trim()}>
                            {loading ? <><span className="spinner" /> Analyse en cours...</> : <><Sparkles size={16} /> Analyser avec l'IA</>}
                        </button>

                        <div className="divider" />
                        <p className="text-xs text-muted mb-2">Exemples de notes :</p>
                        {EXAMPLES.map((ex, i) => (
                            <button key={i} className="btn btn-ghost btn-sm w-full mb-1" style={{ textAlign: 'left', justifyContent: 'flex-start', height: 'auto', whiteSpace: 'normal', padding: '8px 12px' }}
                                onClick={() => setNote(ex)}>
                                💡 {ex}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Result */}
                <div>
                    {!result && !loading && (
                        <div className="card" style={{ height: '100%' }}>
                            <div className="empty-state">
                                <Sparkles size={48} color="var(--accent-secondary)" style={{ opacity: 0.6 }} />
                                <h3>Résultat de l'analyse</h3>
                                <p>Saisissez des notes et cliquez sur "Analyser" pour voir la magie opérer</p>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="card" style={{ height: '100%' }}>
                            <div className="empty-state">
                                <Loader size={48} color="var(--accent-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                                <h3>L'IA analyse vos notes...</h3>
                                <p>Identification du contact, résumé, tâches...</p>
                            </div>
                        </div>
                    )}

                    {result && !loading && (
                        <div className="card">
                            {result.error ? (
                                <div className="ai-section">
                                    <p className="text-red">❌ {result.error}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="ai-section-header mb-4">
                                        <Sparkles size={18} color="var(--accent-secondary)" />
                                        <span className="ai-section-title">Analyse complète</span>
                                        {applied && <span className="badge badge-green">✓ Appliqué</span>}
                                    </div>

                                    {/* Contact identifié */}
                                    <div className="rec-item mb-3">
                                        <div className="rec-item-icon" style={{ background: 'rgba(108,99,255,0.1)' }}>
                                            <User size={16} color="var(--accent-secondary)" />
                                        </div>
                                        <div className="rec-item-content">
                                            <p style={{ color: 'var(--accent-secondary)' }}>Contact identifié</p>
                                            <p>{result.contactName || 'Non identifié'}</p>
                                        </div>
                                    </div>

                                    {/* Résumé */}
                                    <div className="mb-4">
                                        <p className="text-xs text-muted mb-2">📋 Résumé</p>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, fontSize: 14, lineHeight: 1.6 }}>
                                            {result.summary}
                                        </div>
                                    </div>

                                    {/* Stage change */}
                                    {result.stageChanged && result.newStage && (
                                        <div className="mb-4">
                                            <p className="text-xs text-muted mb-2">📊 Mouvement pipeline recommandé</p>
                                            <div className="flex items-center gap-2">
                                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    {contacts.find(c => c.id === result.contactId)?.stage || '...'}
                                                </span>
                                                <ArrowRight size={14} color="var(--text-muted)" />
                                                <span className="badge" style={{ background: `${stageColors[result.newStage]}22`, color: stageColors[result.newStage] }}>
                                                    {result.newStage}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* To-dos */}
                                    {result.todos?.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs text-muted mb-2">✅ Tâches générées ({result.todos.length})</p>
                                            {result.todos.map((todo, i) => (
                                                <div key={i} className="flex items-start gap-2 mb-2">
                                                    <CheckSquare size={15} color="var(--accent-green)" style={{ marginTop: 2, flexShrink: 0 }} />
                                                    <p className="text-sm">{todo}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!applied ? (
                                        <button className="btn btn-primary w-full" onClick={applyResult}>
                                            <Sparkles size={16} /> Appliquer au CRM
                                        </button>
                                    ) : (
                                        <div className="ai-section">
                                            <p className="text-sm" style={{ color: 'var(--accent-green)' }}>
                                                ✅ Contact mis à jour, tâches créées{result.stageChanged ? ', pipeline déplacé' : ''} !
                                            </p>
                                            {result.contactId && (
                                                <Link to={`/contacts/${result.contactId}`} className="btn btn-ghost btn-sm mt-2">
                                                    Voir la fiche contact →
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
