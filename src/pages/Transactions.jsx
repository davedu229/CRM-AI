import { useState, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { Upload, Plus, Link2, CheckCircle, X, AlertCircle, CreditCard, TrendingDown, Download } from 'lucide-react';

// Parse CSV de relevé bancaire (Qonto, Revolut, N26, Shine...)
function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(/[,;]/).map(h => h.trim().replace(/"/g, '').toLowerCase());

    // Mapping des colonnes communes
    const colMap = {
        date: ['date', 'date opération', 'date_operation', 'transaction date', 'date de valeur'],
        label: ['libellé', 'label', 'description', 'référence', 'motif', 'transaction', 'merchant'],
        amount: ['montant', 'amount', 'credit', 'crédit', 'debit', 'débit', 'net amount'],
    };

    const findCol = (variants) => {
        const idx = headers.findIndex(h => variants.some(v => h.includes(v)));
        return idx >= 0 ? idx : -1;
    };

    const dateIdx = findCol(colMap.date);
    const labelIdx = findCol(colMap.label);
    const amountIdx = findCol(colMap.amount);

    return lines.slice(1).map((line, i) => {
        const cols = line.split(/[,;]/).map(c => c.trim().replace(/"/g, ''));
        const rawAmount = amountIdx >= 0 ? cols[amountIdx] : '0';
        const amount = parseFloat(rawAmount.replace(/\s/g, '').replace(',', '.')) || 0;
        return {
            id: 't_' + i,
            date: dateIdx >= 0 ? cols[dateIdx] : '',
            label: labelIdx >= 0 ? cols[labelIdx] : `Transaction ${i + 1}`,
            amount: Math.abs(amount),
            type: amount >= 0 ? 'credit' : 'debit',
            matched: false,
            invoiceId: null,
        };
    }).filter(t => t.amount > 0 && t.type === 'credit');
}

// Cherche la meilleure facture correspondante
function findBestMatch(transaction, invoices) {
    const pending = invoices.filter(inv => inv.type === 'Facture' && ['En attente', 'En retard'].includes(inv.status));
    let best = null;
    let bestScore = 0;

    for (const inv of pending) {
        let score = 0;
        // Correspondance exacte de montant (±5€)
        if (Math.abs(inv.amount - transaction.amount) <= 5) score += 60;
        else if (Math.abs(inv.amount - transaction.amount) / inv.amount < 0.05) score += 40;
        // Correspondance nom dans le libellé
        const labelLower = transaction.label.toLowerCase();
        if (inv.contactName && labelLower.includes(inv.contactName.split(' ')[0].toLowerCase())) score += 30;
        if (inv.company && labelLower.includes(inv.company.toLowerCase().split(' ')[0])) score += 20;
        if (score > bestScore) { bestScore = score; best = inv; }
    }
    return bestScore > 30 ? { invoice: best, score: bestScore } : null;
}

const MANUAL_FORM_DEFAULT = { date: new Date().toISOString().split('T')[0], label: '', amount: '' };

export default function Transactions() {
    const { invoices, updateInvoice } = useCRM();
    const [transactions, setTransactions] = useState([]);
    const [manualForm, setManualForm] = useState(MANUAL_FORM_DEFAULT);
    const [activeTab, setActiveTab] = useState('transactions'); // transactions | pending
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);
    const [importMsg, setImportMsg] = useState('');

    // Auto-suggest matches
    const withSuggestions = transactions.map(t => ({
        ...t,
        suggestion: !t.matched ? findBestMatch(t, invoices) : null,
    }));

    const handleCSV = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const parsed = parseCSV(e.target.result);
            setTransactions(prev => [...prev, ...parsed]);
            setImportMsg(`✅ ${parsed.length} transaction(s) crédit importées`);
            setTimeout(() => setImportMsg(''), 3000);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const addManual = () => {
        if (!manualForm.amount || !manualForm.label) return;
        setTransactions(prev => [{
            id: 't_' + Date.now(),
            ...manualForm,
            amount: parseFloat(manualForm.amount),
            type: 'credit', matched: false, invoiceId: null,
        }, ...prev]);
        setManualForm(MANUAL_FORM_DEFAULT);
    };

    const matchToInvoice = (txId, invoiceId) => {
        setTransactions(prev => prev.map(t => t.id === txId ? { ...t, matched: true, invoiceId } : t));
        updateInvoice(invoiceId, { status: 'Payée' });
    };

    const unmatch = (txId) => {
        const tx = transactions.find(t => t.id === txId);
        if (tx?.invoiceId) updateInvoice(tx.invoiceId, { status: 'En attente' });
        setTransactions(prev => prev.map(t => t.id === txId ? { ...t, matched: false, invoiceId: null } : t));
    };

    const deleteTx = (id) => setTransactions(prev => prev.filter(t => t.id !== id));

    const totalEncaisse = transactions.filter(t => t.matched).reduce((s, t) => s + t.amount, 0);
    const totalNonRapproche = transactions.filter(t => !t.matched).reduce((s, t) => s + t.amount, 0);
    const pendingInvoices = invoices.filter(inv => inv.type === 'Facture' && ['En attente', 'En retard'].includes(inv.status));

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Transactions & Rapprochement</h1>
                    <p className="page-subtitle">Importez vos relevés bancaires — les factures se marquent automatiquement "Payée"</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                        <Upload size={16} /> Importer CSV
                    </button>
                    <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleCSV(e.target.files[0])} />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-3 mb-6">
                <div className="kpi-card green">
                    <div className="kpi-icon green"><CheckCircle size={20} /></div>
                    <p className="kpi-label">Encaissé & rapproché</p>
                    <p className="kpi-value">{totalEncaisse.toLocaleString()}€</p>
                    <p className="text-xs text-muted">{transactions.filter(t => t.matched).length} transactions</p>
                </div>
                <div className="kpi-card yellow">
                    <div className="kpi-icon yellow"><CreditCard size={20} /></div>
                    <p className="kpi-label">Non rapproché</p>
                    <p className="kpi-value">{totalNonRapproche.toLocaleString()}€</p>
                    <p className="text-xs text-muted">{transactions.filter(t => !t.matched).length} transactions</p>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}>
                        <TrendingDown size={20} />
                    </div>
                    <p className="kpi-label">Factures en attente</p>
                    <p className="kpi-value" style={{ color: pendingInvoices.length > 0 ? 'var(--accent-red)' : undefined }}>
                        {pendingInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}€
                    </p>
                    <p className="text-xs text-muted">{pendingInvoices.length} factures</p>
                </div>
            </div>

            {importMsg && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <CheckCircle size={16} color="var(--accent-green)" />
                    <p className="text-sm" style={{ color: 'var(--accent-green)' }}>{importMsg}</p>
                </div>
            )}

            {/* Import zone + saisie manuelle */}
            <div className="grid grid-2 gap-4 mb-6">
                {/* Drop zone CSV */}
                <div
                    style={{
                        border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)', padding: 24, textAlign: 'center',
                        background: dragOver ? 'rgba(108,99,255,0.06)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleCSV(f); }}
                    onClick={() => fileRef.current?.click()}
                >
                    <Upload size={28} color="var(--accent-secondary)" style={{ margin: '0 auto 12px' }} />
                    <p className="font-semibold text-secondary">Glissez votre relevé bancaire (CSV)</p>
                    <p className="text-xs text-muted mt-2">Compatible : Qonto · Revolut Business · N26 · Shine · Boursorama · LCL</p>
                    <p className="text-xs text-muted mt-1">Colonnes attendues: Date, Libellé, Montant</p>
                </div>

                {/* Saisie manuelle */}
                <div className="card">
                    <h3 className="font-semibold mb-3">+ Saisie manuelle</h3>
                    <div className="grid grid-2 gap-2 mb-2">
                        <div className="input-group">
                            <label className="input-label">Date</label>
                            <input className="input" type="date" value={manualForm.date} onChange={e => setManualForm(p => ({ ...p, date: e.target.value }))} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Montant (€)</label>
                            <input className="input" type="number" value={manualForm.amount} onChange={e => setManualForm(p => ({ ...p, amount: e.target.value }))} placeholder="1500" />
                        </div>
                    </div>
                    <div className="input-group mb-3">
                        <label className="input-label">Libellé / Référence</label>
                        <input className="input" value={manualForm.label} onChange={e => setManualForm(p => ({ ...p, label: e.target.value }))} placeholder="Virement Martin Sophie — Projet UX" onKeyDown={e => e.key === 'Enter' && addManual()} />
                    </div>
                    <button className="btn btn-primary w-full" onClick={addManual} disabled={!manualForm.amount || !manualForm.label}>
                        <Plus size={16} /> Ajouter l'encaissement
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 mb-4">
                <div className="tabs">
                    <button className={`tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
                        Transactions ({transactions.length})
                    </button>
                    <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                        Factures en attente ({pendingInvoices.length})
                    </button>
                </div>
            </div>

            {/* Transactions list */}
            {activeTab === 'transactions' && (
                <>
                    {withSuggestions.length === 0 ? (
                        <div className="empty-state">
                            <CreditCard size={48} />
                            <h3>Aucune transaction</h3>
                            <p>Importez un relevé CSV ou ajoutez manuellement un encaissement</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Libellé</th>
                                        <th>Montant</th>
                                        <th>Statut</th>
                                        <th>Facture liée / Suggestion</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {withSuggestions.map(tx => {
                                        const linkedInv = tx.invoiceId ? invoices.find(i => i.id === tx.invoiceId) : null;
                                        return (
                                            <tr key={tx.id}>
                                                <td className="text-sm text-muted">{tx.date}</td>
                                                <td className="font-semibold">{tx.label}</td>
                                                <td className="font-bold" style={{ color: 'var(--accent-green)' }}>+{tx.amount.toLocaleString()}€</td>
                                                <td>
                                                    {tx.matched
                                                        ? <span className="badge badge-green">✓ Rapproché</span>
                                                        : tx.suggestion
                                                            ? <span className="badge badge-yellow">💡 Suggestion</span>
                                                            : <span className="badge badge-gray">En attente</span>
                                                    }
                                                </td>
                                                <td>
                                                    {tx.matched && linkedInv ? (
                                                        <span className="text-sm text-accent">{linkedInv.id} — {linkedInv.contactName} ({linkedInv.amount.toLocaleString()}€)</span>
                                                    ) : tx.suggestion ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-secondary">{tx.suggestion.invoice.id} — {tx.suggestion.invoice.contactName} ({tx.suggestion.invoice.amount.toLocaleString()}€)</span>
                                                            <button className="btn btn-success btn-sm" onClick={() => matchToInvoice(tx.id, tx.suggestion.invoice.id)}>
                                                                ✓ Confirmer
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <select className="input" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                                                            onChange={e => e.target.value && matchToInvoice(tx.id, e.target.value)}
                                                            defaultValue="">
                                                            <option value="">Lier à une facture...</option>
                                                            {pendingInvoices.map(inv => (
                                                                <option key={inv.id} value={inv.id}>{inv.id} — {inv.contactName} ({inv.amount.toLocaleString()}€)</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        {tx.matched && <button className="btn btn-ghost btn-sm" onClick={() => unmatch(tx.id)}>Délier</button>}
                                                        <button className="btn btn-danger btn-sm" onClick={() => deleteTx(tx.id)}><X size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Pending invoices */}
            {activeTab === 'pending' && (
                <div className="table-container">
                    {pendingInvoices.length === 0 ? (
                        <div className="empty-state">
                            <CheckCircle size={48} color="var(--accent-green)" />
                            <h3>Toutes les factures sont à jour !</h3>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr><th>Référence</th><th>Client</th><th>Montant</th><th>Statut</th><th>Échéance</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {pendingInvoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td className="font-semibold text-accent">{inv.id}</td>
                                        <td><p className="font-semibold">{inv.contactName}</p><p className="text-xs text-muted">{inv.company}</p></td>
                                        <td className="font-bold">{inv.amount.toLocaleString()}€</td>
                                        <td><span className={`badge ${inv.status === 'En retard' ? 'badge-red' : 'badge-yellow'}`}>{inv.status}</span></td>
                                        <td className="text-sm text-muted">{inv.dueDate || '—'}</td>
                                        <td>
                                            <button className="btn btn-success btn-sm" onClick={() => updateInvoice(inv.id, { status: 'Payée' })}>
                                                <CheckCircle size={14} /> Marquer Payée
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
