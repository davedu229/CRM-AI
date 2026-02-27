import { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Plus, FileText, Download, Trash2, Edit2, X, Link2, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';

const statusColor = {
    'Payée': 'badge-green', 'En attente': 'badge-yellow',
    'En retard': 'badge-red', 'Brouillon': 'badge-gray',
};
const statuses = ['Brouillon', 'En attente', 'Payée', 'En retard'];

function InvoiceModal({ onClose, onSave, invoice, contacts }) {
    const [form, setForm] = useState({
        contactId: invoice?.contactId || '',
        type: invoice?.type || 'Devis',
        status: invoice?.status || 'Brouillon',
        dueDate: invoice?.dueDate || '',
        items: invoice?.items || [{ description: '', quantity: 1, unitPrice: 0 }],
    });

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
    const setItem = (i, k, v) => {
        const items = [...form.items];
        items[i] = { ...items[i], [k]: v };
        setForm(prev => ({ ...prev, items }));
    };
    const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }] }));
    const removeItem = (i) => setForm(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));

    const total = form.items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice)), 0);
    const contact = contacts.find(c => c.id === form.contactId);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...form,
            amount: total,
            contactName: contact?.name || '',
            company: contact?.company || '',
        });
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 680 }}>
                <div className="modal-header">
                    <h2 className="modal-title">{invoice ? 'Modifier' : 'Nouveau'} {form.type}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-2 gap-3 mb-3">
                        <div className="input-group">
                            <label className="input-label">Contact *</label>
                            <select className="input" value={form.contactId} onChange={e => set('contactId', e.target.value)} required>
                                <option value="">Sélectionner...</option>
                                {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Type</label>
                            <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                                <option>Devis</option><option>Facture</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-2 gap-3 mb-4">
                        <div className="input-group">
                            <label className="input-label">Statut</label>
                            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                                {statuses.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Date d'échéance</label>
                            <input className="input" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
                        </div>
                    </div>

                    <h3 className="font-semibold mb-3">Lignes</h3>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '12px', marginBottom: 12 }}>
                        {form.items.map((item, i) => (
                            <div key={i} className="flex gap-2 mb-2 items-end">
                                <div className="input-group flex-1">
                                    {i === 0 && <label className="input-label">Description</label>}
                                    <input className="input" value={item.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Prestation..." />
                                </div>
                                <div className="input-group" style={{ width: 70 }}>
                                    {i === 0 && <label className="input-label">Qté</label>}
                                    <input className="input" type="number" min="1" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                                </div>
                                <div className="input-group" style={{ width: 120 }}>
                                    {i === 0 && <label className="input-label">Prix unit. (€)</label>}
                                    <input className="input" type="number" min="0" value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} />
                                </div>
                                <div style={{ width: 80, textAlign: 'right', paddingBottom: 10, flexShrink: 0 }}>
                                    <span className="font-semibold" style={{ fontSize: 13 }}>{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}€</span>
                                </div>
                                <button type="button" className="btn btn-ghost btn-icon" style={{ marginBottom: 2 }} onClick={() => removeItem(i)}><X size={14} /></button>
                            </div>
                        ))}
                        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={addItem}><Plus size={14} /> Ajouter une ligne</button>
                    </div>

                    <div className="flex justify-end mb-4">
                        <div style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '12px 20px', textAlign: 'right' }}>
                            <p className="text-xs text-muted mb-1">Total HT</p>
                            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-secondary)' }}>{total.toLocaleString()}€</p>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
                        <button type="submit" className="btn btn-primary">
                            {invoice ? 'Enregistrer' : `Créer le ${form.type}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function generatePDF(invoice) {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    doc.setFillColor(10, 12, 20);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(241, 245, 249);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.type.toUpperCase(), margin, y + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`N° ${invoice.id}`, margin, y + 18);
    doc.text(`Date: ${invoice.date}`, margin, y + 24);
    doc.text(`Échéance: ${invoice.dueDate}`, margin, y + 30);

    y += 45;
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DESTINATAIRE', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(invoice.contactName, margin, y + 7);
    doc.text(invoice.company, margin, y + 13);

    y += 30;
    doc.setFillColor(20, 22, 35);
    doc.roundedRect(margin, y, 170, 10, 2, 2, 'F');
    doc.setTextColor(167, 139, 250);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', margin + 3, y + 7);
    doc.text('QTÉ', 130, y + 7);
    doc.text('PRIX UNIT.', 150, y + 7);
    doc.text('TOTAL', 175, y + 7);

    y += 14;
    invoice.items.forEach((item, idx) => {
        if (idx % 2 === 0) {
            doc.setFillColor(15, 17, 28);
            doc.rect(margin, y - 4, 170, 10, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(241, 245, 249);
        doc.setFontSize(9);
        doc.text(item.description, margin + 3, y + 3);
        doc.text(String(item.quantity), 133, y + 3);
        doc.text(`${Number(item.unitPrice).toLocaleString()}€`, 153, y + 3);
        doc.setFont('helvetica', 'bold');
        doc.text(`${(item.quantity * item.unitPrice).toLocaleString()}€`, 178, y + 3);
        y += 10;
    });

    y += 8;
    doc.setFillColor(108, 99, 255);
    doc.roundedRect(140, y, 50, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${invoice.amount.toLocaleString()}€`, 143, y + 10);

    doc.save(`${invoice.id}.pdf`);
}

// ── Portal Generation ────────────────────────────────────────────────────────
function generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
}

function PortalShareModal({ invoice, contact, tasks, onClose }) {
    const [token] = useState(() => generateToken());
    const [stripeAcompte, setStripeAcompte] = useState('');
    const [stripeTotal, setStripeTotal] = useState('');
    const [copied, setCopied] = useState(false);
    const [phases, setPhases] = useState(
        (invoice.items || []).map((item, i) => ({
            label: item.description,
            days: item.quantity,
            status: i === 0 ? 'En cours' : 'À faire',
        }))
    );

    const portalUrl = `${window.location.origin}/portal/${token}`;

    const createPortal = () => {
        const portalData = {
            token, invoice, clientName: contact?.name || '', clientEmail: contact?.email || '',
            freelancer: { name: 'Freelance Pro', email: '', initial: 'F' },
            phases, stripeAcompte, stripeTotal,
            createdAt: new Date().toISOString(),
        };
        localStorage.setItem(`portal_${token}`, JSON.stringify(portalData));
        navigator.clipboard.writeText(portalUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); });
    };

    const updatePhaseStatus = (i, status) => {
        setPhases(prev => prev.map((p, idx) => idx === i ? { ...p, status } : p));
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 640 }}>
                <div className="modal-header">
                    <h2 className="modal-title">🔗 Partager via Portail Client</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">
                    {/* Invoice summary */}
                    <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                        <p className="text-sm"><strong>{invoice.id}</strong> · {contact?.name} · <strong style={{ color: 'var(--accent-secondary)' }}>{invoice.amount?.toLocaleString()}€</strong></p>
                    </div>

                    {/* Stripe links */}
                    <p className="font-semibold mb-3">💳 Liens de paiement Stripe (optionnel)</p>
                    <div className="grid grid-2 gap-3 mb-4">
                        <div className="input-group">
                            <label className="input-label">Acompte 30% ({Math.round(invoice.amount * 0.3).toLocaleString()}€)</label>
                            <input className="input" value={stripeAcompte} onChange={e => setStripeAcompte(e.target.value)} placeholder="https://buy.stripe.com/..." />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Total ({invoice.amount?.toLocaleString()}€)</label>
                            <input className="input" value={stripeTotal} onChange={e => setStripeTotal(e.target.value)} placeholder="https://buy.stripe.com/..." />
                        </div>
                    </div>
                    <p className="text-xs text-muted mb-4">Générez vos liens dans <strong>dashboard.stripe.com → Payment Links</strong></p>

                    {/* Project phases */}
                    {phases.length > 0 && (
                        <div className="mb-4">
                            <p className="font-semibold mb-3">📋 Kanban projet visible par le client</p>
                            <div className="flex-col gap-2">
                                {phases.map((phase, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-sm flex-1">{phase.label}</span>
                                        <select className="input" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                                            value={phase.status} onChange={e => updatePhaseStatus(i, e.target.value)}>
                                            {['À faire', 'En cours', 'Terminé'].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* URL */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <p className="text-sm text-secondary flex-1 truncate">{portalUrl}</p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
                    <button className="btn btn-primary" onClick={createPortal}>
                        {copied ? <><CheckCircle size={16} /> Lien copié !</> : <><Link2 size={16} /> Générer et copier le lien</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Invoices() {
    const { invoices, contacts, addInvoice, updateInvoice, deleteInvoice } = useCRM();
    const [showModal, setShowModal] = useState(false);
    const [editInvoice, setEditInvoice] = useState(null);
    const [portalInvoice, setPortalInvoice] = useState(null);
    const [filterType, setFilterType] = useState('Tous');
    const [filterStatus, setFilterStatus] = useState('Tous');

    const total = invoices.reduce((s, i) => s + i.amount, 0);
    const paid = invoices.filter(i => i.status === 'Payée').reduce((s, i) => s + i.amount, 0);
    const late = invoices.filter(i => i.status === 'En retard').reduce((s, i) => s + i.amount, 0);

    const filtered = invoices.filter(inv => {
        const matchType = filterType === 'Tous' || inv.type === filterType;
        const matchStatus = filterStatus === 'Tous' || inv.status === filterStatus;
        return matchType && matchStatus;
    });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Devis & Factures</h1>
                    <p className="page-subtitle">{invoices.length} documents · {total.toLocaleString()}€ total</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditInvoice(null); setShowModal(true); }}>
                    <Plus size={16} /> Nouveau document
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-3 mb-6">
                <div className="kpi-card green">
                    <div className="kpi-icon green"><FileText size={20} /></div>
                    <p className="kpi-label">Encaissé</p>
                    <p className="kpi-value">{paid.toLocaleString()}€</p>
                </div>
                <div className="kpi-card yellow">
                    <div className="kpi-icon yellow"><FileText size={20} /></div>
                    <p className="kpi-label">En attente</p>
                    <p className="kpi-value">{invoices.filter(i => i.status === 'En attente').reduce((s, i) => s + i.amount, 0).toLocaleString()}€</p>
                </div>
                <div className="kpi-card" style={{ '--hover-color': 'red' }}>
                    <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}><FileText size={20} /></div>
                    <p className="kpi-label">En retard</p>
                    <p className="kpi-value" style={{ color: late > 0 ? 'var(--accent-red)' : undefined }}>{late.toLocaleString()}€</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
                {['Tous', 'Devis', 'Facture'].map(t => (
                    <button key={t} onClick={() => setFilterType(t)} className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-ghost'}`}>{t}</button>
                ))}
                <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
                {['Tous', ...statuses].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>{s}</button>
                ))}
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Référence</th>
                            <th>Client</th>
                            <th>Type</th>
                            <th>Montant</th>
                            <th>Statut</th>
                            <th>Échéance</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(inv => (
                            <tr key={inv.id} onClick={e => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'svg' || e.target.tagName === 'path') return; }}>
                                <td className="font-semibold text-accent">{inv.id}</td>
                                <td>
                                    <p className="font-semibold">{inv.contactName}</p>
                                    <p className="text-xs text-muted">{inv.company}</p>
                                </td>
                                <td><span className="badge badge-gray">{inv.type}</span></td>
                                <td className="font-semibold">{inv.amount.toLocaleString()}€</td>
                                <td><span className={`badge ${statusColor[inv.status] || 'badge-gray'}`}>{inv.status}</span></td>
                                <td className="text-sm text-secondary">{inv.dueDate || '—'}</td>
                                <td>
                                    <div className="flex gap-2">
                                        <button className="btn btn-ghost btn-sm" onClick={() => generatePDF(inv)} title="Télécharger PDF">
                                            <Download size={14} />
                                        </button>
                                        <button className="btn btn-ghost btn-sm" title="Portail client" onClick={() => setPortalInvoice(inv)}>
                                            <Link2 size={14} />
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditInvoice(inv); setShowModal(true); }}>
                                            <Edit2 size={14} />
                                        </button>
                                        <select
                                            className="input" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                                            value={inv.status}
                                            onChange={e => updateInvoice(inv.id, { status: e.target.value })}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {statuses.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                        <button className="btn btn-danger btn-sm" onClick={() => deleteInvoice(inv.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="empty-state"><FileText size={40} /><h3>Aucun document</h3><p>Créez votre premier devis ou facture</p></div>
                )}
            </div>

            {showModal && (
                <InvoiceModal
                    invoice={editInvoice}
                    contacts={contacts}
                    onClose={() => { setShowModal(false); setEditInvoice(null); }}
                    onSave={(data) => {
                        if (editInvoice) { updateInvoice(editInvoice.id, data); }
                        else { addInvoice(data); }
                        setShowModal(false); setEditInvoice(null);
                    }}
                />
            )}
            {portalInvoice && (
                <PortalShareModal
                    invoice={portalInvoice}
                    contact={contacts.find(c => c.id === portalInvoice.contactId)}
                    tasks={[]}
                    onClose={() => setPortalInvoice(null)}
                />
            )}
        </div>
    );
}
