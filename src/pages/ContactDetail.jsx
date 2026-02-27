import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { ArrowLeft, Mail, Phone, Building, Edit2, Trash2, Sparkles, CheckCircle, Circle, Plus, X, Send } from 'lucide-react';
import ContactModal from '../components/ContactModal';

const stages = ['À contacter', 'En discussion', 'Devis envoyé', 'Gagné', 'Perdu'];
const stageColor = {
    'À contacter': 'badge-blue', 'En discussion': 'badge-yellow',
    'Devis envoyé': 'badge-purple', 'Gagné': 'badge-green', 'Perdu': 'badge-red',
};

export default function ContactDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { contacts, updateContact, deleteContact, moveContact, invoices, tasks, toggleTask, addTask, callAI, getCRMContext, aiSettings } = useCRM();

    const contact = contacts.find(c => c.id === id);
    const [showEdit, setShowEdit] = useState(false);
    const [newTodo, setNewTodo] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [emailDraft, setEmailDraft] = useState('');
    const [emailType, setEmailType] = useState('relance');
    const [activeTab, setActiveTab] = useState('notes');

    if (!contact) {
        return (
            <div className="empty-state">
                <h3>Contact introuvable</h3>
                <Link to="/contacts" className="btn btn-primary mt-4">Retour aux contacts</Link>
            </div>
        );
    }

    const contactInvoices = invoices.filter(inv => inv.contactId === id);
    const contactTasks = tasks.filter(t => t.contactId === id);
    const totalBilled = contactInvoices.reduce((s, i) => s + i.amount, 0);

    const handleDelete = () => {
        if (confirm(`Supprimer ${contact.name} ?`)) {
            deleteContact(id);
            navigate('/contacts');
        }
    };

    const addTodo = () => {
        if (!newTodo.trim()) return;
        updateContact(id, { todos: [...(contact.todos || []), newTodo.trim()] });
        setNewTodo('');
    };

    const removeTodo = (i) => {
        const todos = [...(contact.todos || [])];
        todos.splice(i, 1);
        updateContact(id, { todos });
    };

    const generateEmail = async () => {
        setAiLoading(true);
        setEmailDraft('');
        try {
            const crmCtx = getCRMContext();
            const prompt = `Tu es un assistant commercial expert pour freelances. Génère un email professionnel de type "${emailType}" pour le contact suivant.

Contact: ${contact.name} (${contact.company})
Email: ${contact.email}
Statut pipeline: ${contact.stage}
Notes: ${contact.notes}
Historique email: ${contact.emails?.map(e => e.subject).join(', ') || 'Aucun'}
Total facturé: ${totalBilled}€

Génère un email court, personnalisé, professionnel et percutant. Ne mets pas de sujet, juste le corps de l'email.`;

            const result = await callAI([{ role: 'user', content: prompt }], 'Tu es un expert en communication commerciale pour freelances.');
            setEmailDraft(result);
        } catch (err) {
            setEmailDraft(`Erreur: ${err.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    const invoiceStatus = { 'Payée': 'badge-green', 'En attente': 'badge-yellow', 'En retard': 'badge-red', 'Brouillon': 'badge-gray' };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link to="/contacts" className="btn btn-ghost btn-sm btn-icon"><ArrowLeft size={18} /></Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="page-title" style={{ fontSize: 24 }}>{contact.name}</h1>
                        <span className={`badge ${stageColor[contact.stage]}`}>{contact.stage}</span>
                    </div>
                    <p className="text-secondary text-sm">{contact.company}</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}><Edit2 size={14} /> Modifier</button>
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /></button>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 24 }}>
                {/* Left */}
                <div className="flex-col gap-4">
                    {/* Infos */}
                    <div className="card mb-4">
                        <h3 className="font-semibold mb-4">Informations</h3>
                        <div className="grid grid-2 gap-4">
                            <div className="flex items-center gap-3">
                                <Mail size={16} color="var(--text-muted)" />
                                <div>
                                    <p className="text-xs text-muted">Email</p>
                                    <p className="text-sm">{contact.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={16} color="var(--text-muted)" />
                                <div>
                                    <p className="text-xs text-muted">Téléphone</p>
                                    <p className="text-sm">{contact.phone || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Building size={16} color="var(--text-muted)" />
                                <div>
                                    <p className="text-xs text-muted">Entreprise</p>
                                    <p className="text-sm">{contact.company}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted mb-1">Tags</p>
                                <div className="flex gap-2 flex-wrap">
                                    {contact.tags?.map(tag => <span key={tag} className="badge badge-gray">{tag}</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Stage selector */}
                        <div className="divider" />
                        <p className="text-xs text-muted mb-3">Statut pipeline</p>
                        <div className="flex gap-2 flex-wrap">
                            {stages.map(s => (
                                <button
                                    key={s}
                                    onClick={() => moveContact(id, s)}
                                    className={`btn btn-sm ${contact.stage === s ? 'btn-primary' : 'btn-ghost'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tabs: Notes / Emails / IA Email */}
                    <div className="card">
                        <div className="tabs mb-4">
                            {['notes', 'emails', 'email-ia'].map(t => (
                                <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                                    {t === 'notes' ? '📝 Notes' : t === 'emails' ? '📧 Emails' : '✨ Copilote Email'}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'notes' && (
                            <div>
                                <textarea
                                    className="input"
                                    value={contact.notes || ''}
                                    onChange={e => updateContact(id, { notes: e.target.value })}
                                    rows={6}
                                    placeholder="Vos notes sur ce contact..."
                                />
                            </div>
                        )}

                        {activeTab === 'emails' && (
                            <div>
                                {(contact.emails || []).length === 0 ? (
                                    <div className="empty-state" style={{ padding: '40px 0' }}>
                                        <Mail size={32} />
                                        <h3>Aucun email synchronisé</h3>
                                        <p>Connectez Gmail ou Outlook dans les paramètres</p>
                                    </div>
                                ) : (
                                    contact.emails.map(email => (
                                        <div key={email.id} className="rec-item">
                                            <div className="rec-item-icon" style={{ background: email.direction === 'sent' ? 'rgba(108,99,255,0.1)' : 'rgba(16,185,129,0.1)' }}>
                                                {email.direction === 'sent' ? '↑' : '↓'}
                                            </div>
                                            <div className="rec-item-content flex-1">
                                                <p>{email.subject}</p>
                                                <p>{email.preview}</p>
                                            </div>
                                            <span className="text-xs text-muted">{email.date}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'email-ia' && (
                            <div>
                                <div className="flex gap-3 mb-4 flex-wrap">
                                    {['relance', 'réponse-objection', 'remerciement', 'suivi-devis'].map(type => (
                                        <button key={type} onClick={() => setEmailType(type)} className={`btn btn-sm ${emailType === type ? 'btn-primary' : 'btn-ghost'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                <button className="btn btn-primary w-full mb-4" onClick={generateEmail} disabled={aiLoading}>
                                    {aiLoading ? <><span className="spinner" /> Génération en cours...</> : <><Sparkles size={16} /> Générer l'email</>}
                                </button>
                                {emailDraft && (
                                    <div>
                                        <textarea className="input" value={emailDraft} onChange={e => setEmailDraft(e.target.value)} rows={8} />
                                        <div className="flex gap-2 mt-2 justify-end">
                                            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(emailDraft)}>Copier</button>
                                            <button className="btn btn-primary btn-sm"><Send size={14} /> Envoyer</button>
                                        </div>
                                    </div>
                                )}
                                {!aiSettings.apiKey && (
                                    <div className="ai-section mt-2">
                                        <p className="text-sm text-secondary">⚠️ Configurez votre clé API dans <Link to="/settings" className="text-accent">Paramètres</Link> pour utiliser l'IA.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="flex-col gap-4">
                    {/* Revenue */}
                    <div className="card">
                        <p className="text-xs text-muted mb-1">CA potentiel</p>
                        <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-green)' }}>
                            {(contact.revenue || 0).toLocaleString()}€
                        </p>
                        <p className="text-xs text-muted mt-1">Total facturé: {totalBilled.toLocaleString()}€</p>
                        <div className="divider" />
                        <p className="text-xs text-muted mb-1">Ajouté le</p>
                        <p className="text-sm">{contact.createdAt}</p>
                    </div>

                    {/* To-do */}
                    <div className="card">
                        <h3 className="font-semibold mb-3">To-Do</h3>
                        {(contact.todos || []).map((todo, i) => (
                            <div key={i} className="flex items-start gap-2 mb-2">
                                <CheckCircle size={16} color="var(--accent-green)" style={{ marginTop: 2, flexShrink: 0 }} />
                                <p className="text-sm flex-1">{todo}</p>
                                <button onClick={() => removeTodo(i)} className="btn btn-ghost btn-icon" style={{ padding: 2 }}>
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                            <input className="input" style={{ fontSize: 13 }} placeholder="Nouvelle tâche..." value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} />
                            <button className="btn btn-primary btn-icon" onClick={addTodo}><Plus size={16} /></button>
                        </div>
                    </div>

                    {/* Invoices */}
                    <div className="card">
                        <h3 className="font-semibold mb-3">Devis & Factures</h3>
                        {contactInvoices.length === 0 ? (
                            <p className="text-sm text-muted">Aucune facture</p>
                        ) : (
                            contactInvoices.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between mb-2 p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <div>
                                        <p className="text-sm font-semibold">{inv.id}</p>
                                        <p className="text-xs text-muted">{inv.amount.toLocaleString()}€</p>
                                    </div>
                                    <span className={`badge ${invoiceStatus[inv.status] || 'badge-gray'}`}>{inv.status}</span>
                                </div>
                            ))
                        )}
                        <Link to="/invoices" className="btn btn-ghost btn-sm w-full mt-2" style={{ justifyContent: 'center' }}>
                            <Plus size={14} /> Nouveau devis
                        </Link>
                    </div>
                </div>
            </div>

            {showEdit && (
                <ContactModal
                    contact={contact}
                    onClose={() => setShowEdit(false)}
                    onSave={(data) => { updateContact(id, data); setShowEdit(false); }}
                />
            )}
        </div>
    );
}
