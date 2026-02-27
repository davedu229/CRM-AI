import { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Plus, RefreshCw, X, Edit2, TrendingUp, DollarSign, Calendar, CheckCircle } from 'lucide-react';

const FREQUENCIES = ['Mensuel', 'Trimestriel', 'Annuel'];
const STATUS_OPTIONS = ['Actif', 'En pause', 'Annulé'];

function monthlyValue(amount, frequency) {
    if (frequency === 'Mensuel') return amount;
    if (frequency === 'Trimestriel') return amount / 3;
    if (frequency === 'Annuel') return amount / 12;
    return amount;
}

const FORM_DEFAULT = {
    contactId: '',
    name: '',
    amount: '',
    frequency: 'Mensuel',
    startDate: new Date().toISOString().split('T')[0],
    nextBillingDate: '',
    status: 'Actif',
    notes: '',
};

export default function MRR() {
    const { contacts } = useCRM();
    const [subscriptions, setSubscriptions] = useState(() => {
        try { return JSON.parse(localStorage.getItem('crm_mrr') || '[]'); } catch { return []; }
    });
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(FORM_DEFAULT);

    const save = (subs) => {
        setSubscriptions(subs);
        localStorage.setItem('crm_mrr', JSON.stringify(subs));
    };

    const handleSubmit = () => {
        if (!form.name || !form.amount) return;
        if (editId) {
            save(subscriptions.map(s => s.id === editId ? { ...s, ...form, amount: Number(form.amount) } : s));
            setEditId(null);
        } else {
            save([...subscriptions, { ...form, id: 'mrr_' + Date.now(), amount: Number(form.amount) }]);
        }
        setForm(FORM_DEFAULT);
        setShowForm(false);
    };

    const deleteSub = (id) => save(subscriptions.filter(s => s.id !== id));

    const editSub = (sub) => {
        setForm({ ...sub, amount: String(sub.amount) });
        setEditId(sub.id);
        setShowForm(true);
    };

    const toggleStatus = (id) => {
        save(subscriptions.map(s => s.id === id ? {
            ...s,
            status: s.status === 'Actif' ? 'En pause' : 'Actif'
        } : s));
    };

    // KPIs
    const active = subscriptions.filter(s => s.status === 'Actif');
    const mrr = active.reduce((sum, s) => sum + monthlyValue(s.amount, s.frequency), 0);
    const arr = mrr * 12;
    const avgContract = active.length > 0 ? Math.round(mrr / active.length) : 0;

    // Upcoming billings (next 30 days)
    const upcoming = subscriptions.filter(s => {
        if (!s.nextBillingDate || s.status !== 'Actif') return false;
        const diff = (new Date(s.nextBillingDate) - new Date()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 30;
    }).sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));

    const statusColor = { 'Actif': 'badge-green', 'En pause': 'badge-yellow', 'Annulé': 'badge-red' };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Revenus Récurrents (MRR)</h1>
                    <p className="page-subtitle">Gérez vos abonnements, maintenances et contrats récurrents</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm(FORM_DEFAULT); setEditId(null); setShowForm(true); }}>
                    <Plus size={16} /> Nouveau contrat
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-3 mb-6">
                <div className="kpi-card green">
                    <div className="kpi-icon green"><TrendingUp size={20} /></div>
                    <p className="kpi-label">MRR (Revenus Mensuels)</p>
                    <p className="kpi-value">{Math.round(mrr).toLocaleString()}€</p>
                    <p className="text-xs text-muted">{active.length} contrat(s) actifs</p>
                </div>
                <div className="kpi-card purple">
                    <div className="kpi-icon purple"><DollarSign size={20} /></div>
                    <p className="kpi-label">ARR (Revenus Annuels)</p>
                    <p className="kpi-value">{Math.round(arr).toLocaleString()}€</p>
                    <p className="text-xs text-muted">MRR × 12</p>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><Calendar size={20} /></div>
                    <p className="kpi-label">Contrat moyen</p>
                    <p className="kpi-value">{avgContract.toLocaleString()}€</p>
                    <p className="text-xs text-muted">par mois</p>
                </div>
            </div>

            {/* Upcoming billings */}
            {upcoming.length > 0 && (
                <div className="card mb-6" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
                    <h3 className="font-semibold mb-3">📅 Facturations à venir (30 jours)</h3>
                    <div className="flex-col gap-2">
                        {upcoming.map(s => {
                            const days = Math.round((new Date(s.nextBillingDate) - new Date()) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div>
                                        <p className="font-semibold text-sm">{s.name}</p>
                                        <p className="text-xs text-muted">{s.nextBillingDate}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`badge ${days <= 7 ? 'badge-red' : 'badge-yellow'}`}>dans {days}j</span>
                                        <span className="font-bold">{s.amount.toLocaleString()}€</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Form modal */}
            {showForm && (
                <div className="modal-backdrop" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editId ? 'Modifier le contrat' : 'Nouveau contrat récurrent'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-2 gap-4">
                                <div className="input-group">
                                    <label className="input-label">Nom du contrat *</label>
                                    <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Maintenance site web" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Client</label>
                                    <select className="input" value={form.contactId} onChange={e => setForm(p => ({ ...p, contactId: e.target.value }))}>
                                        <option value="">Sélectionner...</option>
                                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Montant (€) *</label>
                                    <input className="input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="500" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Fréquence</label>
                                    <select className="input" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Date de début</label>
                                    <input className="input" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Prochaine facturation</label>
                                    <input className="input" type="date" value={form.nextBillingDate} onChange={e => setForm(p => ({ ...p, nextBillingDate: e.target.value }))} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Statut</label>
                                    <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Notes</label>
                                    <input className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Hébergement inclus..." />
                                </div>
                            </div>
                            {form.amount && form.frequency && (
                                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(108,99,255,0.08)', borderRadius: 8, border: '1px solid rgba(108,99,255,0.2)' }}>
                                    <p className="text-sm text-secondary">
                                        Contribution MRR : <strong style={{ color: 'var(--accent-secondary)' }}>{Math.round(monthlyValue(Number(form.amount), form.frequency)).toLocaleString()}€/mois</strong>
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>
                                <CheckCircle size={16} /> {editId ? 'Mettre à jour' : 'Créer le contrat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subscriptions table */}
            {subscriptions.length === 0 ? (
                <div className="empty-state">
                    <RefreshCw size={48} />
                    <h3>Aucun contrat récurrent</h3>
                    <p>Ajoutez vos maintenances, abonnements et retainers clients</p>
                    <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}><Plus size={16} /> Premier contrat</button>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Contrat</th>
                                <th>Client</th>
                                <th>Montant</th>
                                <th>Fréquence</th>
                                <th>MRR contrib.</th>
                                <th>Prochaine fact.</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscriptions.map(s => {
                                const contact = contacts.find(c => c.id === s.contactId);
                                const mrr = Math.round(monthlyValue(s.amount, s.frequency));
                                return (
                                    <tr key={s.id}>
                                        <td>
                                            <p className="font-semibold">{s.name}</p>
                                            {s.notes && <p className="text-xs text-muted">{s.notes}</p>}
                                        </td>
                                        <td>
                                            {contact ? (
                                                <><p className="font-semibold text-sm">{contact.name}</p><p className="text-xs text-muted">{contact.company}</p></>
                                            ) : <span className="text-muted">—</span>}
                                        </td>
                                        <td className="font-bold">{s.amount.toLocaleString()}€</td>
                                        <td className="text-sm text-muted">{s.frequency}</td>
                                        <td>
                                            <span className="font-semibold" style={{ color: s.status === 'Actif' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                                                {s.status === 'Actif' ? `${mrr}€/mois` : '—'}
                                            </span>
                                        </td>
                                        <td className="text-sm text-muted">{s.nextBillingDate || '—'}</td>
                                        <td><span className={`badge ${statusColor[s.status]}`}>{s.status}</span></td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(s.id)}>
                                                    {s.status === 'Actif' ? '⏸' : '▶'}
                                                </button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => editSub(s)}><Edit2 size={14} /></button>
                                                <button className="btn btn-danger btn-sm" onClick={() => deleteSub(s.id)}><X size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {subscriptions.length > 0 && (
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--border)' }}>
                                    <td colSpan={4} style={{ fontWeight: 700, padding: '12px 16px' }}>Total MRR</td>
                                    <td style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent-green)', padding: '12px 16px' }}>{Math.round(mrr).toLocaleString()}€/mois</td>
                                    <td colSpan={3} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}
        </div>
    );
}
