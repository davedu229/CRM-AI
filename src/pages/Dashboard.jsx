import { useCRM } from '../context/CRMContext';
import { TrendingUp, DollarSign, Clock, Users, CheckCircle, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { contacts, invoices, tasks } = useCRM();

    const totalRevenue = invoices.filter(i => i.type === 'Facture' && i.status === 'Payée').reduce((s, i) => s + i.amount, 0);
    const pendingQuotes = invoices.filter(i => i.status === 'En attente').reduce((s, i) => s + i.amount, 0);
    const lateInvoices = invoices.filter(i => i.status === 'En retard');
    const wonDeals = contacts.filter(c => c.stage === 'Gagné').length;
    const totalDeals = contacts.filter(c => c.stage !== 'Perdu').length;
    const conversionRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;
    const pendingTasks = tasks.filter(t => !t.done);
    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high');

    const aiRecs = [
        lateInvoices.length > 0 && {
            icon: '💰', color: 'rgba(239, 68, 68, 0.15)', textColor: 'var(--accent-red)',
            title: `${lateInvoices.length} facture(s) en retard`,
            desc: `${lateInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}€ à relancer d'urgence`,
            link: '/invoices',
        },
        {
            icon: '📞', color: 'rgba(245, 158, 11, 0.15)', textColor: 'var(--accent-yellow)',
            title: 'Relancer Thomas Dupont',
            desc: 'Devis envoyé il y a 6 jours — window de décision critique',
            link: '/contacts/2',
        },
        {
            icon: '🎯', color: 'rgba(108, 99, 255, 0.15)', textColor: 'var(--accent-secondary)',
            title: 'Lucas Bernard à contacter',
            desc: 'Nouveau prospect référé — Premier contact recommandé cette semaine',
            link: '/contacts/4',
        },
        {
            icon: '📋', color: 'rgba(16, 185, 129, 0.15)', textColor: 'var(--accent-green)',
            title: 'Préparer renouvellement BioNature',
            desc: 'Contrat annuel à anticiper — Cliente fidèle depuis 2 ans',
            link: '/contacts/3',
        },
    ].filter(Boolean).slice(0, 4);

    const recentContacts = contacts.slice(0, 5);

    const stageColor = {
        'À contacter': 'badge-blue',
        'En discussion': 'badge-yellow',
        'Devis envoyé': 'badge-purple',
        'Gagné': 'badge-green',
        'Perdu': 'badge-red',
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tableau de bord</h1>
                    <p className="page-subtitle">Bonjour 👋 — Voici votre résumé du jour</p>
                </div>
                <Link to="/assistant" className="btn btn-primary">
                    <Sparkles size={16} />
                    Assistant IA
                </Link>
            </div>

            {/* KPIs */}
            <div className="grid grid-4 mb-6">
                <div className="kpi-card purple">
                    <div className="kpi-icon purple"><DollarSign size={20} /></div>
                    <p className="kpi-label">CA Encaissé</p>
                    <p className="kpi-value">{totalRevenue.toLocaleString()}€</p>
                    <p className="kpi-change up">+12% vs mois dernier</p>
                </div>
                <div className="kpi-card yellow">
                    <div className="kpi-icon yellow"><Clock size={20} /></div>
                    <p className="kpi-label">Devis en attente</p>
                    <p className="kpi-value">{pendingQuotes.toLocaleString()}€</p>
                    <p className="kpi-change">{invoices.filter(i => i.status === 'En attente').length} devis</p>
                </div>
                <div className="kpi-card green">
                    <div className="kpi-icon green"><TrendingUp size={20} /></div>
                    <p className="kpi-label">Taux de conversion</p>
                    <p className="kpi-value">{conversionRate}%</p>
                    <p className="kpi-change">{wonDeals} deals gagnés</p>
                </div>
                <div className="kpi-card blue">
                    <div className="kpi-icon blue"><Users size={20} /></div>
                    <p className="kpi-label">Contacts actifs</p>
                    <p className="kpi-value">{contacts.filter(c => c.stage !== 'Perdu').length}</p>
                    <p className="kpi-change">{contacts.length} au total</p>
                </div>
            </div>

            <div className="grid grid-2">
                {/* Recommandations IA */}
                <div>
                    <div className="ai-section">
                        <div className="ai-section-header">
                            <Sparkles size={18} color="var(--accent-secondary)" />
                            <span className="ai-section-title">Recommandations IA</span>
                            <span className="ai-badge">✨ Proactif</span>
                        </div>
                        {aiRecs.map((rec, i) => (
                            <Link to={rec.link} key={i} style={{ textDecoration: 'none' }}>
                                <div className="rec-item">
                                    <div className="rec-item-icon" style={{ background: rec.color }}>
                                        <span>{rec.icon}</span>
                                    </div>
                                    <div className="rec-item-content flex-1">
                                        <p style={{ color: rec.textColor }}>{rec.title}</p>
                                        <p>{rec.desc}</p>
                                    </div>
                                    <ArrowRight size={14} color="var(--text-muted)" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Tâches prioritaires */}
                <div>
                    <div className="card" style={{ height: '100%' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Tâches prioritaires</h3>
                            <span className="badge badge-red">{highPriorityTasks.length} urgentes</span>
                        </div>
                        {pendingTasks.slice(0, 5).map(task => (
                            <div key={task.id} className="flex items-start gap-3 mb-3">
                                <div style={{
                                    width: 18, height: 18, borderRadius: 4,
                                    border: `2px solid ${task.priority === 'high' ? 'var(--accent-red)' : 'var(--border)'}`,
                                    flexShrink: 0, marginTop: 1,
                                    background: task.priority === 'high' ? 'rgba(239,68,68,0.1)' : 'transparent',
                                }} />
                                <div className="flex-1">
                                    <p className="text-sm">{task.text}</p>
                                    {task.dueDate && <p className="text-xs text-muted mt-1">Échéance: {task.dueDate}</p>}
                                </div>
                                {task.priority === 'high' && <AlertCircle size={14} color="var(--accent-red)" />}
                            </div>
                        ))}
                        <Link to="/assistant" className="btn btn-ghost btn-sm w-full mt-2" style={{ justifyContent: 'center' }}>
                            Ajouter via l'assistant IA
                        </Link>
                    </div>
                </div>
            </div>

            {/* Contacts récents */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Contacts récents</h3>
                    <Link to="/contacts" className="btn btn-ghost btn-sm">Voir tous <ArrowRight size={14} /></Link>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Entreprise</th>
                                <th>Statut</th>
                                <th>CA potentiel</th>
                                <th>Dernière activité</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentContacts.map(contact => (
                                <tr key={contact.id} onClick={() => window.location.href = `/contacts/${contact.id}`}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 13, fontWeight: 600, flexShrink: 0,
                                            }}>
                                                {contact.name[0]}
                                            </div>
                                            <span className="font-semibold">{contact.name}</span>
                                        </div>
                                    </td>
                                    <td className="text-secondary">{contact.company}</td>
                                    <td><span className={`badge ${stageColor[contact.stage] || 'badge-gray'}`}>{contact.stage}</span></td>
                                    <td className="font-semibold">{contact.revenue ? `${contact.revenue.toLocaleString()}€` : '—'}</td>
                                    <td className="text-muted text-sm">{contact.lastContact || 'Jamais'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
