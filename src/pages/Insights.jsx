import { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { getActiveKey } from '../utils/ai.js';
import { TrendingUp, Sparkles, Calendar, DollarSign, BarChart2, AlertCircle, Target } from 'lucide-react';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function Insights() {
    const { contacts, invoices, callAI, aiSettings } = useCRM();
    const [aiInsight, setAiInsight] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);

    // ── Analyse des devis par jour de la semaine ──────────────────────────────
    const devisByDay = useMemo(() => {
        const stats = DAYS.map((d, i) => ({ day: d, idx: i, sent: 0, won: 0, rate: 0 }));
        invoices.filter(inv => inv.type === 'Devis' && inv.date).forEach(inv => {
            const dow = new Date(inv.date).getDay();
            stats[dow].sent++;
            if (inv.status === 'Accepté' || contacts.find(c => c.id === inv.contactId && c.stage === 'Gagné')) {
                stats[dow].won++;
            }
        });
        stats.forEach(s => { s.rate = s.sent > 0 ? Math.round((s.won / s.sent) * 100) : 0; });
        return stats.filter(s => s.sent > 0).sort((a, b) => b.rate - a.rate);
    }, [invoices, contacts]);

    const bestDay = devisByDay[0];

    // ── Analyse par tranche de prix ────────────────────────────────────────────
    const byPriceBracket = useMemo(() => {
        const brackets = [
            { label: '< 1k€', min: 0, max: 1000, sent: 0, won: 0 },
            { label: '1–3k€', min: 1000, max: 3000, sent: 0, won: 0 },
            { label: '3–5k€', min: 3000, max: 5000, sent: 0, won: 0 },
            { label: '5–10k€', min: 5000, max: 10000, sent: 0, won: 0 },
            { label: '> 10k€', min: 10000, max: Infinity, sent: 0, won: 0 },
        ];
        invoices.filter(inv => inv.type === 'Devis').forEach(inv => {
            const b = brackets.find(br => inv.amount >= br.min && inv.amount < br.max);
            if (b) {
                b.sent++;
                if (contacts.find(c => c.id === inv.contactId && c.stage === 'Gagné')) b.won++;
            }
        });
        return brackets.filter(b => b.sent > 0).map(b => ({ ...b, rate: Math.round((b.won / b.sent) * 100) }));
    }, [invoices, contacts]);

    // ── CA par mois ────────────────────────────────────────────────────────────
    const caByMonth = useMemo(() => {
        const year = new Date().getFullYear();
        const months = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS[i], idx: i, ca: 0, count: 0 }));
        invoices.filter(v => v.type === 'Facture' && v.status === 'Payée' && v.date?.startsWith(String(year))).forEach(inv => {
            const m = new Date(inv.date).getMonth();
            months[m].ca += inv.amount;
            months[m].count++;
        });
        return months.filter(m => m.ca > 0);
    }, [invoices]);

    const maxCA = Math.max(...caByMonth.map(m => m.ca), 1);

    // ── Taux de conversion global ──────────────────────────────────────────────
    const conversionRate = useMemo(() => {
        const total = contacts.length;
        const won = contacts.filter(c => c.stage === 'Gagné').length;
        return total > 0 ? Math.round((won / total) * 100) : 0;
    }, [contacts]);

    const avgDealSize = useMemo(() => {
        const paid = invoices.filter(i => i.type === 'Facture' && i.status === 'Payée');
        return paid.length > 0 ? Math.round(paid.reduce((s, i) => s + i.amount, 0) / paid.length) : 0;
    }, [invoices]);

    const avgTimeToClose = useMemo(() => {
        const won = contacts.filter(c => c.stage === 'Gagné' && c.createdAt && c.lastContact);
        if (!won.length) return 0;
        const avg = won.reduce((s, c) => {
            const diff = (new Date(c.lastContact) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24);
            return s + diff;
        }, 0) / won.length;
        return Math.round(avg);
    }, [contacts]);

    // ── AI Insights ────────────────────────────────────────────────────────────
    const getAIInsights = async () => {
        if (!getActiveKey(aiSettings)) return;
        setLoadingAI(true);
        try {
            const summary = `
Données CRM:
- CA moyen par facture: ${avgDealSize}€
- Taux de conversion global: ${conversionRate}%
- Délai moyen de closing: ${avgTimeToClose} jours
- Meilleur jour pour envoyer un devis: ${bestDay?.day || 'indéterminé'} (${bestDay?.rate || 0}% de succès)
- Tranches de prix: ${byPriceBracket.map(b => `${b.label}: ${b.rate}% (${b.sent} devis)`).join(', ')}
- CA mensuel: ${caByMonth.map(m => `${m.month}: ${m.ca}€`).join(', ')}
- Contacts: ${contacts.length} dont ${contacts.filter(c => c.stage === 'Gagné').length} gagnés et ${contacts.filter(c => c.stage === 'Perdu').length} perdus
`;
            const raw = await callAI(
                [{ role: 'user', content: `Analyse ces données commerciales d'un freelance et donne 3-4 recommandations concrètes et actionnables pour améliorer ses performances.\n\n${summary}` }],
                'Tu es un conseiller commercial expert pour les freelances. Sois direct, concret et donne des conseils actionnables basés sur les données. Utilise des emojis pour structurer ta réponse. Réponds en français.'
            );
            setAiInsight(raw);
        } catch (e) {
            setAiInsight('Erreur : ' + e.message);
        }
        setLoadingAI(false);
    };

    const hasData = contacts.length > 0 || invoices.length > 0;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Insights & Pricing</h1>
                    <p className="page-subtitle">Analysez vos performances commerciales et optimisez votre stratégie de pricing</p>
                </div>
                <button className="btn btn-primary" onClick={getAIInsights} disabled={loadingAI || !getActiveKey(aiSettings)}>
                    {loadingAI ? <><span className="spinner" /> Analyse...</> : <><Sparkles size={16} /> Recommandations IA</>}
                </button>
            </div>

            {!hasData && (
                <div className="empty-state">
                    <BarChart2 size={48} />
                    <h3>Pas encore de données</h3>
                    <p>Ajoutez des contacts et des factures pour voir apparaître vos insights</p>
                </div>
            )}

            {hasData && (
                <>
                    {/* KPIs */}
                    <div className="grid grid-3 mb-6">
                        <div className="kpi-card purple">
                            <div className="kpi-icon purple"><Target size={20} /></div>
                            <p className="kpi-label">Taux de conversion</p>
                            <p className="kpi-value">{conversionRate}%</p>
                            <p className="text-xs text-muted">{contacts.filter(c => c.stage === 'Gagné').length} / {contacts.length} contacts</p>
                        </div>
                        <div className="kpi-card green">
                            <div className="kpi-icon green"><DollarSign size={20} /></div>
                            <p className="kpi-label">Taille moyenne des deals</p>
                            <p className="kpi-value">{avgDealSize.toLocaleString()}€</p>
                            <p className="text-xs text-muted">{invoices.filter(i => i.status === 'Payée').length} factures payées</p>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><Calendar size={20} /></div>
                            <p className="kpi-label">Délai moyen de closing</p>
                            <p className="kpi-value">{avgTimeToClose} j</p>
                            <p className="text-xs text-muted">de la création au closing</p>
                        </div>
                    </div>

                    {/* AI Insight box */}
                    {aiInsight && (
                        <div className="card mb-6" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(167,139,250,0.04))', borderColor: 'rgba(108,99,255,0.25)' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="ai-badge">✨ IA</span>
                                <p className="font-semibold">Recommandations personnalisées</p>
                            </div>
                            <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{aiInsight}</p>
                        </div>
                    )}

                    {!getActiveKey(aiSettings) && (
                        <div className="flex items-center gap-2 mb-6 p-3 rounded" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <AlertCircle size={16} color="var(--accent-yellow)" />
                            <p className="text-sm" style={{ color: 'var(--accent-yellow)' }}>Configurez votre clé API dans Paramètres pour obtenir des recommandations IA personnalisées</p>
                        </div>
                    )}

                    <div className="grid grid-2 gap-6">
                        {/* Meilleur jour pour envoyer un devis */}
                        <div className="card">
                            <h3 className="font-semibold mb-4">📅 Taux de succès par jour d'envoi</h3>
                            {devisByDay.length === 0 ? (
                                <p className="text-secondary text-sm">Données insuffisantes — envoyez des devis pour voir les stats</p>
                            ) : (
                                <>
                                    {bestDay && (
                                        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                                            <p className="text-xs text-muted mb-1">💡 Meilleur jour pour envoyer</p>
                                            <p style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: 16 }}>
                                                {bestDay.day} — {bestDay.rate}% de taux de conversion
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex-col gap-2">
                                        {[...devisByDay].sort((a, b) => a.idx - b.idx).map(d => (
                                            <div key={d.day} className="flex items-center gap-3">
                                                <span style={{ width: 80, fontSize: 13 }}>{d.day}</span>
                                                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${d.rate}%`,
                                                        height: '100%',
                                                        background: d.rate >= (bestDay?.rate || 0) * 0.8
                                                            ? 'linear-gradient(90deg, var(--accent-green), #34d399)'
                                                            : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                                                        borderRadius: 99,
                                                        transition: 'width 0.6s ease',
                                                    }} />
                                                </div>
                                                <span style={{ width: 48, fontSize: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{d.rate}%</span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.sent} envois</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Taux par tranche de prix */}
                        <div className="card">
                            <h3 className="font-semibold mb-4">💰 Conversion par tranche de prix</h3>
                            {byPriceBracket.length === 0 ? (
                                <p className="text-secondary text-sm">Données insuffisantes</p>
                            ) : (
                                <div className="flex-col gap-3">
                                    {byPriceBracket.map(b => (
                                        <div key={b.label}>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm font-semibold">{b.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted">{b.won}/{b.sent}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: b.rate > 50 ? 'var(--accent-green)' : b.rate > 25 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>{b.rate}%</span>
                                                </div>
                                            </div>
                                            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                                                <div style={{
                                                    width: `${b.rate}%`, height: '100%',
                                                    background: b.rate > 50
                                                        ? 'linear-gradient(90deg, var(--accent-green), #34d399)'
                                                        : b.rate > 25
                                                            ? 'linear-gradient(90deg, var(--accent-yellow), #fbbf24)'
                                                            : 'linear-gradient(90deg, var(--accent-red), #f87171)',
                                                    borderRadius: 99, transition: 'width 0.6s ease',
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                    {byPriceBracket.length > 0 && (
                                        <p className="text-xs text-muted mt-2">
                                            💡 Meilleure tranche: <strong>{byPriceBracket.reduce((a, b) => a.rate >= b.rate ? a : b).label}</strong>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* CA mensuel */}
                        <div className="card" style={{ gridColumn: '1 / -1' }}>
                            <h3 className="font-semibold mb-4">📈 Chiffre d'affaires mensuel ({new Date().getFullYear()})</h3>
                            {caByMonth.length === 0 ? (
                                <p className="text-secondary text-sm">Aucune facture payée cette année</p>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const m = caByMonth.find(x => x.idx === i);
                                        const h = m ? Math.round((m.ca / maxCA) * 120) : 0;
                                        const isCurrentMonth = i === new Date().getMonth();
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                {m && (
                                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                        {m.ca >= 1000 ? (m.ca / 1000).toFixed(1) + 'k' : m.ca}€
                                                    </span>
                                                )}
                                                <div style={{
                                                    width: '100%', height: h || 4,
                                                    background: isCurrentMonth
                                                        ? 'linear-gradient(180deg, var(--accent-primary), var(--accent-secondary))'
                                                        : (m ? 'rgba(108,99,255,0.4)' : 'rgba(255,255,255,0.04)'),
                                                    borderRadius: '4px 4px 0 0',
                                                    transition: 'height 0.4s ease',
                                                    boxShadow: isCurrentMonth ? '0 0 12px rgba(108,99,255,0.4)' : 'none',
                                                }} />
                                                <span style={{ fontSize: 10, color: isCurrentMonth ? 'var(--accent-secondary)' : 'var(--text-muted)', fontWeight: isCurrentMonth ? 600 : 400 }}>
                                                    {MONTHS[i]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Pipeline funnel */}
                        <div className="card">
                            <h3 className="font-semibold mb-4">🎯 Entonnoir de conversion</h3>
                            {(['À contacter', 'En discussion', 'Devis envoyé', 'Gagné', 'Perdu']).map((stage, i) => {
                                const count = contacts.filter(c => c.stage === stage).length;
                                const pct = contacts.length > 0 ? Math.round((count / contacts.length) * 100) : 0;
                                const colors = ['rgba(148,163,184,0.4)', 'rgba(59,130,246,0.5)', 'rgba(245,158,11,0.5)', 'rgba(16,185,129,0.5)', 'rgba(239,68,68,0.4)'];
                                return (
                                    <div key={stage} className="flex items-center gap-3 mb-2">
                                        <span style={{ fontSize: 13, width: 120, color: 'var(--text-secondary)' }}>{stage}</span>
                                        <div style={{ flex: 1, height: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: colors[i], transition: 'width 0.5s ease' }} />
                                            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 600 }}>{count}</span>
                                        </div>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Top clients par CA */}
                        <div className="card">
                            <h3 className="font-semibold mb-4">🏆 Top clients par CA</h3>
                            {contacts.filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((c, i) => (
                                <div key={c.id} className="flex items-center gap-3 mb-3">
                                    <span style={{ fontSize: 18, width: 24 }}>{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</span>
                                    <div style={{ flex: 1 }}>
                                        <p className="font-semibold text-sm">{c.name}</p>
                                        <p className="text-xs text-muted">{c.company}</p>
                                    </div>
                                    <span className="font-bold" style={{ color: 'var(--accent-green)' }}>{c.revenue.toLocaleString()}€</span>
                                </div>
                            ))}
                            {contacts.filter(c => c.revenue > 0).length === 0 && (
                                <p className="text-secondary text-sm">Aucun client avec CA renseigné</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
