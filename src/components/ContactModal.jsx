import { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { X } from 'lucide-react';

const stages = ['À contacter', 'En discussion', 'Devis envoyé', 'Gagné', 'Perdu'];

export default function ContactModal({ onClose, onSave, contact }) {
    const [form, setForm] = useState({
        name: contact?.name || '',
        company: contact?.company || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
        stage: contact?.stage || 'À contacter',
        revenue: contact?.revenue || '',
        notes: contact?.notes || '',
        tags: contact?.tags?.join(', ') || '',
    });

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...form,
            revenue: Number(form.revenue) || 0,
            tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        });
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h2 className="modal-title">{contact ? 'Modifier le contact' : 'Nouveau contact'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-2 gap-3 mb-3">
                        <div className="input-group">
                            <label className="input-label">Nom *</label>
                            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Prénom Nom" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Entreprise</label>
                            <input className="input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Nom de l'entreprise" />
                        </div>
                    </div>
                    <div className="grid grid-2 gap-3 mb-3">
                        <div className="input-group">
                            <label className="input-label">Email</label>
                            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemple.fr" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Téléphone</label>
                            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+33 6 ..." />
                        </div>
                    </div>
                    <div className="grid grid-2 gap-3 mb-3">
                        <div className="input-group">
                            <label className="input-label">Statut pipeline</label>
                            <select className="input" value={form.stage} onChange={e => set('stage', e.target.value)}>
                                {stages.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">CA potentiel (€)</label>
                            <input className="input" type="number" value={form.revenue} onChange={e => set('revenue', e.target.value)} placeholder="5000" />
                        </div>
                    </div>
                    <div className="input-group mb-3">
                        <label className="input-label">Tags (séparés par des virgules)</label>
                        <input className="input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Design, Récurrent, Startup..." />
                    </div>
                    <div className="input-group mb-4">
                        <label className="input-label">Notes</label>
                        <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations importantes, contexte..." rows={3} />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
                        <button type="submit" className="btn btn-primary">
                            {contact ? 'Enregistrer' : 'Créer le contact'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
