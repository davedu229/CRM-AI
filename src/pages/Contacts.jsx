import { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Users } from 'lucide-react';
import ContactModal from '../components/ContactModal';

const stageColor = {
    'À contacter': 'badge-blue',
    'En discussion': 'badge-yellow',
    'Devis envoyé': 'badge-purple',
    'Gagné': 'badge-green',
    'Perdu': 'badge-red',
};

export default function Contacts() {
    const { contacts, addContact } = useCRM();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('Tous');
    const [showModal, setShowModal] = useState(false);

    const stages = ['Tous', 'À contacter', 'En discussion', 'Devis envoyé', 'Gagné', 'Perdu'];

    const filtered = contacts.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.company.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase());
        const matchStage = filter === 'Tous' || c.stage === filter;
        return matchSearch && matchStage;
    });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Contacts</h1>
                    <p className="page-subtitle">{contacts.length} contacts dans votre CRM</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Nouveau contact
                </button>
            </div>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="search-bar">
                    <Search />
                    <input
                        className="input"
                        placeholder="Rechercher un contact..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {stages.map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state">
                    <Users size={48} />
                    <h3>Aucun contact trouvé</h3>
                    <p>Modifiez votre recherche ou ajoutez un nouveau contact</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Contact</th>
                                <th>Entreprise</th>
                                <th>Email</th>
                                <th>Statut</th>
                                <th>CA potentiel</th>
                                <th>Tags</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(contact => (
                                <Link key={contact.id} to={`/contacts/${contact.id}`} style={{ display: 'contents' }}>
                                    <tr>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 14, fontWeight: 600, flexShrink: 0,
                                                }}>
                                                    {contact.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{contact.name}</p>
                                                    <p className="text-xs text-muted">{contact.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-secondary">{contact.company}</td>
                                        <td className="text-secondary text-sm">{contact.email}</td>
                                        <td><span className={`badge ${stageColor[contact.stage] || 'badge-gray'}`}>{contact.stage}</span></td>
                                        <td className="font-semibold">{contact.revenue ? `${contact.revenue.toLocaleString()}€` : '—'}</td>
                                        <td>
                                            <div className="flex gap-2 flex-wrap">
                                                {contact.tags?.map(tag => (
                                                    <span key={tag} className="badge badge-gray">{tag}</span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                </Link>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <ContactModal
                    onClose={() => setShowModal(false)}
                    onSave={(data) => { addContact(data); setShowModal(false); }}
                />
            )}
        </div>
    );
}
