import { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { TrendingUp, DollarSign, AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

// ── TAUX URSSAF 2024 ─────────────────────────────────────────────────────────
const REGIMES = {
    'micro-bnc': {
        label: 'Micro-BNC (Professions libérales)',
        desc: 'Consultants, freelances IT, graphistes, rédacteurs...',
        tauxURSSAF: 0.232,         // 23.2% cotisations sociales
        abattementFiscal: 0.34,    // abattement 34% pour IR
        tauxVersementLiberatoire: 0.022, // 2.2% VFL (option)
        plafond: 77700,
    },
    'micro-bic-services': {
        label: 'Micro-BIC (Prestations de services)',
        desc: 'Développeurs, formateurs, prestataires de services...',
        tauxURSSAF: 0.232,
        abattementFiscal: 0.50,
        tauxVersementLiberatoire: 0.017,
        plafond: 77700,
    },
    'micro-bic-commerce': {
        label: 'Micro-BIC (Vente de marchandises)',
        desc: 'Revendeurs, e-commerce, artisans...',
        tauxURSSAF: 0.129,
        abattementFiscal: 0.71,
        tauxVersementLiberatoire: 0.01,
        plafond: 188700,
    },
};

// Tranches IR 2024
const TRANCHES_IR = [
    { min: 0, max: 11294, taux: 0 },
    { min: 11294, max: 28797, taux: 0.11 },
    { min: 28797, max: 82341, taux: 0.30 },
    { min: 82341, max: 177106, taux: 0.41 },
    { min: 177106, max: Infinity, taux: 0.45 },
];

function calculerIR(revenuImposable) {
    if (revenuImposable <= 0) return 0;
    let impot = 0;
    for (const tranche of TRANCHES_IR) {
        if (revenuImposable <= tranche.min) break;
        const base = Math.min(revenuImposable, tranche.max) - tranche.min;
        impot += base * tranche.taux;
    }
    return Math.round(impot);
}

// Trimestres
const QUARTERS = [
    { label: 'T1 (Jan–Mar)', months: [0, 1, 2] },
    { label: 'T2 (Apr–Jun)', months: [3, 4, 5] },
    { label: 'T3 (Jul–Sep)', months: [6, 7, 8] },
    { label: 'T4 (Oct–Déc)', months: [9, 10, 11] },
];

export default function Fiscalite() {
    const { invoices } = useCRM();
    const [regime, setRegime] = useState('micro-bnc');
    const [annee, setAnnee] = useState(new Date().getFullYear());
    const [optionVFL, setOptionVFL] = useState(false);
    const [autresRevenus, setAutresRevenus] = useState(0);
    const [parts, setParts] = useState(1);
    const [expandedQ, setExpandedQ] = useState(null);

    const regimeData = REGIMES[regime];

    // CA annuel encaissé (factures payées de l'année sélectionnée)
    const caAnnuel = useMemo(() => {
        return invoices
            .filter(inv => inv.type === 'Facture' && inv.status === 'Payée' && inv.date?.startsWith(String(annee)))
            .reduce((s, inv) => s + inv.amount, 0);
    }, [invoices, annee]);

    // CA par trimestre
    const caParTrimestre = useMemo(() => {
        return QUARTERS.map(q => {
            const total = invoices
                .filter(inv => {
                    if (inv.type !== 'Facture' || inv.status !== 'Payée') return false;
                    const date = new Date(inv.date);
                    return date.getFullYear() === annee && q.months.includes(date.getMonth());
                })
                .reduce((s, inv) => s + inv.amount, 0);
            return total;
        });
    }, [invoices, annee]);

    // Calculs principaux
    const urssafAnnuel = Math.round(caAnnuel * regimeData.tauxURSSAF);
    const baseIR = Math.round(caAnnuel * (1 - regimeData.abattementFiscal));
    const revenuImposable = Math.max(0, baseIR + Number(autresRevenus) - urssafAnnuel);
    const revenuParPart = revenuImposable / Number(parts || 1);
    const irParPart = calculerIR(revenuParPart);
    const irTotal = Math.round(irParPart * Number(parts || 1));
    const irVFL = optionVFL ? Math.round(caAnnuel * regimeData.tauxVersementLiberatoire) : null;

    const totalCharges = urssafAnnuel + (optionVFL ? (irVFL ?? 0) : irTotal);
    const netApresCharges = caAnnuel - totalCharges;
    const tauxChargesReel = caAnnuel > 0 ? ((totalCharges / caAnnuel) * 100).toFixed(1) : 0;

    // Par trimestre
    const quarterData = caParTrimestre.map((ca, i) => ({
        ...QUARTERS[i],
        ca,
        urssaf: Math.round(ca * regimeData.tauxURSSAF),
        provisionIR: Math.round(ca * (1 - regimeData.abattementFiscal) * 0.15), // estimation simplifiée
        total: Math.round(ca * (regimeData.tauxURSSAF + 0.15)),
    }));

    // Mise de côté recommandée (sur CA total - simple)
    const mise_de_cote_pct = Math.round((regimeData.tauxURSSAF + 0.12) * 100);
    const mise_de_cote_eur = Math.round(caAnnuel * (mise_de_cote_pct / 100));

    const alertsCouleur = (taux) => taux > 35 ? 'var(--accent-red)' : taux > 25 ? 'var(--accent-yellow)' : 'var(--accent-green)';

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Fiscalité & Charges</h1>
                    <p className="page-subtitle">Estimez vos cotisations URSSAF, impôt sur le revenu et provisions trimestrielles</p>
                </div>
                <div className="flex gap-2 items-center">
                    <select className="input" style={{ width: 'auto' }} value={annee} onChange={e => setAnnee(Number(e.target.value))}>
                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Warning disclaimer */}
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Info size={16} color="var(--accent-yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p className="text-sm" style={{ color: 'var(--accent-yellow)' }}>
                    <strong>Estimations indicatives uniquement</strong> — Basées sur les taux 2024. Consultez un expert-comptable pour votre situation fiscale personnelle.
                </p>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
                {/* Panneau de configuration */}
                <div>
                    <div className="card mb-4">
                        <h3 className="font-semibold mb-4">⚙️ Votre régime fiscal</h3>
                        <div className="flex-col gap-2 mb-4">
                            {Object.entries(REGIMES).map(([key, r]) => (
                                <button
                                    key={key}
                                    onClick={() => setRegime(key)}
                                    style={{
                                        padding: '12px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                                        border: `1.5px solid ${regime === key ? 'var(--accent-primary)' : 'var(--border)'}`,
                                        background: regime === key ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.02)',
                                        transition: 'var(--transition)', marginBottom: 6,
                                    }}
                                >
                                    <p style={{ fontSize: 13, fontWeight: 600, color: regime === key ? 'var(--accent-secondary)' : 'var(--text-primary)', marginBottom: 2 }}>{r.label}</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.desc}</p>
                                </button>
                            ))}
                        </div>

                        <div className="divider" />

                        <div className="input-group mb-3">
                            <label className="input-label">Autres revenus imposables (€/an)</label>
                            <input className="input" type="number" value={autresRevenus} onChange={e => setAutresRevenus(e.target.value)} placeholder="0" />
                            <p className="text-xs text-muted mt-1">Salaires, revenus fonciers, etc.</p>
                        </div>

                        <div className="input-group mb-3">
                            <label className="input-label">Nombre de parts fiscales</label>
                            <select className="input" value={parts} onChange={e => setParts(e.target.value)}>
                                <option value={1}>1 part (célibataire)</option>
                                <option value={1.5}>1,5 parts (parent isolé)</option>
                                <option value={2}>2 parts (couple marié/pacsé)</option>
                                <option value={2.5}>2,5 parts (couple + 1 enfant)</option>
                                <option value={3}>3 parts (couple + 2 enfants)</option>
                            </select>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                            <input type="checkbox" checked={optionVFL} onChange={e => setOptionVFL(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 500 }}>Versement Libératoire (VFL)</p>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(regimeData.tauxVersementLiberatoire * 100).toFixed(1)}% du CA — simplifié si faibles revenus</p>
                            </div>
                        </label>
                    </div>

                    {/* Taux résumé */}
                    <div className="card" style={{ background: 'rgba(108,99,255,0.06)', borderColor: 'rgba(108,99,255,0.2)' }}>
                        <p className="text-xs text-muted mb-3">Taux de cotisations appliqués</p>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm">URSSAF / Sécu</span>
                            <span className="font-semibold text-accent">{(regimeData.tauxURSSAF * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm">Abattement fiscal</span>
                            <span className="font-semibold text-green">{(regimeData.abattementFiscal * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">Plafond CA</span>
                            <span className="font-semibold">{regimeData.plafond.toLocaleString()}€</span>
                        </div>
                        {caAnnuel > regimeData.plafond * 0.9 && (
                            <div className="mt-3 p-2 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <p className="text-xs" style={{ color: 'var(--accent-red)' }}>⚠️ Vous approchez du plafond du régime micro ! Consultez un expert-comptable.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Résultats */}
                <div>
                    {/* KPIs principaux */}
                    <div className="grid grid-3 mb-4">
                        <div className="kpi-card purple">
                            <div className="kpi-icon purple"><DollarSign size={20} /></div>
                            <p className="kpi-label">CA Encaissé {annee}</p>
                            <p className="kpi-value">{caAnnuel.toLocaleString()}€</p>
                            <p className="text-xs" style={{ color: caAnnuel > regimeData.plafond ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                                Plafond: {regimeData.plafond.toLocaleString()}€
                            </p>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}><TrendingUp size={20} /></div>
                            <p className="kpi-label">Total Charges</p>
                            <p className="kpi-value" style={{ color: 'var(--accent-red)' }}>{totalCharges.toLocaleString()}€</p>
                            <p className="text-xs" style={{ color: alertsCouleur(Number(tauxChargesReel)) }}>
                                {tauxChargesReel}% du CA
                            </p>
                        </div>
                        <div className="kpi-card green">
                            <div className="kpi-icon green"><CheckCircle size={20} /></div>
                            <p className="kpi-label">Net après charges</p>
                            <p className="kpi-value">{netApresCharges.toLocaleString()}€</p>
                            <p className="text-xs text-muted">{caAnnuel > 0 ? (100 - Number(tauxChargesReel)).toFixed(1) : 0}% du CA</p>
                        </div>
                    </div>

                    {/* Bloc mise de côté */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(16,185,129,0.05))',
                        border: '1px solid rgba(108,99,255,0.25)',
                        borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
                    }}>
                        <div className="flex items-center gap-3">
                            <div style={{ fontSize: 32 }}>💰</div>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Mettez de côté {mise_de_cote_pct}% de chaque encaissement</p>
                                <p className="text-sm text-secondary">Soit <strong>{mise_de_cote_eur.toLocaleString()}€</strong> sur votre CA annuel — pour couvrir URSSAF + impôts sereinement</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p className="text-xs text-muted mb-1">Pour votre prochain encaissement</p>
                            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-secondary)' }}>{mise_de_cote_pct}%</p>
                        </div>
                    </div>

                    {/* Détail calcul */}
                    <div className="card mb-4">
                        <h3 className="font-semibold mb-4">📊 Détail du calcul {annee}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* URSSAF */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>URSSAF / Sécurité Sociale</p>
                                <div className="flex justify-between mb-2"><span className="text-sm">CA encaissé</span><span className="font-semibold">{caAnnuel.toLocaleString()}€</span></div>
                                <div className="flex justify-between mb-2"><span className="text-sm">Taux cotisations ({(regimeData.tauxURSSAF * 100).toFixed(1)}%)</span><span className="text-red font-semibold">−{urssafAnnuel.toLocaleString()}€</span></div>
                                <div className="divider" style={{ margin: '8px 0' }} />
                                <div className="flex justify-between"><span className="font-semibold">Cotisations dues</span><span className="font-bold" style={{ fontSize: 18, color: 'var(--accent-red)' }}>{urssafAnnuel.toLocaleString()}€</span></div>
                            </div>

                            {/* IR */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                                    Impôt sur le Revenu {optionVFL ? '(VFL)' : '(Barème)'}
                                </p>
                                {optionVFL ? (
                                    <>
                                        <div className="flex justify-between mb-2"><span className="text-sm">CA × {(regimeData.tauxVersementLiberatoire * 100).toFixed(1)}% (VFL)</span><span className="font-semibold">{(irVFL ?? 0).toLocaleString()}€</span></div>
                                        <div className="divider" style={{ margin: '8px 0' }} />
                                        <div className="flex justify-between"><span className="font-semibold">IR libératoire</span><span className="font-bold" style={{ fontSize: 18, color: 'var(--accent-yellow)' }}>{(irVFL ?? 0).toLocaleString()}€</span></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between mb-2"><span className="text-sm">Base fiscal (−{(regimeData.abattementFiscal * 100).toFixed(0)}%)</span><span className="font-semibold">{baseIR.toLocaleString()}€</span></div>
                                        <div className="flex justify-between mb-2"><span className="text-sm">− Cotisations URSSAF</span><span className="font-semibold">−{urssafAnnuel.toLocaleString()}€</span></div>
                                        <div className="flex justify-between mb-2"><span className="text-sm">+ Autres revenus</span><span className="font-semibold">+{Number(autresRevenus).toLocaleString()}€</span></div>
                                        <div className="flex justify-between mb-2"><span className="text-sm text-muted">Revenu imposable / {parts} part(s)</span><span className="text-muted">{Math.round(revenuParPart).toLocaleString()}€</span></div>
                                        <div className="divider" style={{ margin: '8px 0' }} />
                                        <div className="flex justify-between"><span className="font-semibold">IR estimé</span><span className="font-bold" style={{ fontSize: 18, color: 'var(--accent-yellow)' }}>{irTotal.toLocaleString()}€</span></div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tableau par trimestre */}
                    <div className="card">
                        <h3 className="font-semibold mb-4">📅 Provisions trimestrielles {annee}</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Trimestre</th>
                                        <th>CA encaissé</th>
                                        <th>URSSAF à payer</th>
                                        <th>Provision IR</th>
                                        <th>Total à mettre de côté</th>
                                        <th>Net estimé</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quarterData.map((q, i) => {
                                        const isCurrentQ = Math.floor(new Date().getMonth() / 3) === i && new Date().getFullYear() === annee;
                                        return (
                                            <tr key={q.label} style={{ background: isCurrentQ ? 'rgba(108,99,255,0.05)' : 'transparent' }}>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        {isCurrentQ && <span className="badge badge-purple" style={{ fontSize: 10 }}>En cours</span>}
                                                        <span className="font-semibold">{q.label}</span>
                                                    </div>
                                                </td>
                                                <td className="font-semibold">{q.ca.toLocaleString()}€</td>
                                                <td style={{ color: 'var(--accent-red)' }}>{q.urssaf.toLocaleString()}€</td>
                                                <td style={{ color: 'var(--accent-yellow)' }}>{q.provisionIR.toLocaleString()}€</td>
                                                <td>
                                                    <span className="font-bold" style={{ color: 'var(--accent-secondary)' }}>{q.total.toLocaleString()}€</span>
                                                    {q.ca > 0 && <span className="text-xs text-muted ml-2">({Math.round(q.total / q.ca * 100)}%)</span>}
                                                </td>
                                                <td style={{ color: 'var(--accent-green)' }} className="font-semibold">
                                                    {(q.ca - q.total).toLocaleString()}€
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                                        <td>Total {annee}</td>
                                        <td>{caAnnuel.toLocaleString()}€</td>
                                        <td style={{ color: 'var(--accent-red)' }}>{urssafAnnuel.toLocaleString()}€</td>
                                        <td style={{ color: 'var(--accent-yellow)' }}>{quarterData.reduce((s, q) => s + q.provisionIR, 0).toLocaleString()}€</td>
                                        <td style={{ color: 'var(--accent-secondary)' }}>{totalCharges.toLocaleString()}€</td>
                                        <td style={{ color: 'var(--accent-green)' }}>{netApresCharges.toLocaleString()}€</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {caAnnuel === 0 && (
                            <div className="empty-state" style={{ padding: '32px 0' }}>
                                <TrendingUp size={36} />
                                <h3>Aucun encaissement en {annee}</h3>
                                <p>Les calculs se mettront à jour automatiquement à partir de vos factures payées</p>
                                <Link to="/invoices" className="btn btn-primary mt-4">Gérer mes factures</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
