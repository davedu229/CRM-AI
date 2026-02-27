import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, CreditCard, FileText, Pen, AlertCircle, ExternalLink } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadPortal(token) {
    try { return JSON.parse(localStorage.getItem(`portal_${token}`)); } catch { return null; }
}
function savePortal(token, data) {
    localStorage.setItem(`portal_${token}`, JSON.stringify(data));
}

// ── Signature Pad ─────────────────────────────────────────────────────────────
function SignaturePad({ onSign }) {
    const canvasRef = useRef(null);
    const drawing = useRef(false);
    const [hasSignature, setHasSignature] = useState(false);

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const start = (e) => { e.preventDefault(); drawing.current = true; ctx.beginPath(); const p = getPos(e, canvas); ctx.moveTo(p.x, p.y); };
        const move = (e) => { e.preventDefault(); if (!drawing.current) return; const p = getPos(e, canvas); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasSignature(true); };
        const end = () => { drawing.current = false; };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', end);
        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', move);
            canvas.removeEventListener('mouseup', end);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', move);
            canvas.removeEventListener('touchend', end);
        };
    }, []);

    const clear = () => {
        const canvas = canvasRef.current;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const confirm = () => {
        if (!hasSignature) return;
        onSign(canvasRef.current.toDataURL('image/png'));
    };

    return (
        <div>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>Signez dans le cadre ci-dessous avec votre souris ou votre doigt</p>
            <div style={{ position: 'relative', border: '2px dashed rgba(167,139,250,0.4)', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', marginBottom: 14 }}>
                <canvas ref={canvasRef} width={600} height={160} style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }} />
                {!hasSignature && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.5)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Pen size={16} /> Votre signature ici
                        </p>
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={clear} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
                    ↺ Effacer
                </button>
                <button onClick={confirm} disabled={!hasSignature} style={{
                    flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: hasSignature ? 'pointer' : 'not-allowed',
                    background: hasSignature ? 'linear-gradient(135deg, #6c63ff, #a78bfa)' : 'rgba(255,255,255,0.05)',
                    color: hasSignature ? 'white' : '#64748b', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                    <CheckCircle size={16} /> Signer et accepter le devis
                </button>
            </div>
        </div>
    );
}

// ── Kanban Board ──────────────────────────────────────────────────────────────
function ProjectKanban({ phases }) {
    const columns = ['À faire', 'En cours', 'Terminé'];
    const colColors = { 'À faire': 'rgba(148,163,184,0.15)', 'En cours': 'rgba(59,130,246,0.15)', 'Terminé': 'rgba(16,185,129,0.15)' };
    const colBorders = { 'À faire': 'rgba(148,163,184,0.2)', 'En cours': 'rgba(59,130,246,0.25)', 'Terminé': 'rgba(16,185,129,0.25)' };
    const colAccents = { 'À faire': '#94a3b8', 'En cours': '#60a5fa', 'Terminé': '#34d399' };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {columns.map(col => {
                const items = phases.filter(p => p.status === col);
                return (
                    <div key={col} style={{ background: colColors[col], border: `1px solid ${colBorders[col]}`, borderRadius: 12, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colAccents[col] }} />
                            <p style={{ fontSize: 13, fontWeight: 600, color: colAccents[col] }}>{col}</p>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 99 }}>{items.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {items.map((item, i) => (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', lineHeight: 1.4 }}>{item.label}</p>
                                    {item.days && <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>~{item.days} jour(s)</p>}
                                </div>
                            ))}
                            {items.length === 0 && <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '8px 0' }}>—</p>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Portal Page ──────────────────────────────────────────────────────────
export default function ClientPortal() {
    const { token } = useParams();
    const [portal, setPortal] = useState(null);
    const [section, setSection] = useState('devis');   // devis | signature | paiement | projet
    const [signed, setSigned] = useState(false);
    const [signatureImg, setSignatureImg] = useState('');
    const [signedAt, setSignedAt] = useState('');
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const data = loadPortal(token);
        if (!data) { setNotFound(true); return; }
        setPortal(data);
        setSigned(!!data.signed);
        setSignatureImg(data.signatureImg || '');
        setSignedAt(data.signedAt || '');
    }, [token]);

    const handleSign = (imgData) => {
        const at = new Date().toLocaleString('fr-FR');
        setSignatureImg(imgData);
        setSigned(true);
        setSignedAt(at);
        savePortal(token, { ...portal, signed: true, signatureImg: imgData, signedAt: at });
        setSection('paiement');
    };

    if (notFound) return (
        <div style={{ minHeight: '100vh', background: '#0f0e17', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
                <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Lien introuvable ou expiré</h2>
                <p style={{ fontSize: 14 }}>Ce lien de portail client n'existe pas ou a été supprimé.</p>
            </div>
        </div>
    );

    if (!portal) return (
        <div style={{ minHeight: '100vh', background: '#0f0e17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(108,99,255,0.3)', borderTop: '3px solid #6c63ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
    );

    const inv = portal.invoice;
    const freelancer = portal.freelancer || {};
    const phases = portal.phases || [];
    const navItems = [
        { id: 'devis', label: '📄 Devis' },
        { id: 'signature', label: signed ? '✅ Signé' : '✍️ Signature' },
        { id: 'paiement', label: '💳 Paiement' },
        ...(phases.length > 0 ? [{ id: 'projet', label: '📋 Projet' }] : []),
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#0f0e17', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#e2e8f0' }}>
            {/* Header / Branding */}
            <div style={{ background: 'linear-gradient(135deg, #1a1830, #0f0e17)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 0' }}>
                <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'white' }}>
                            {freelancer.initial || 'F'}
                        </div>
                        <div>
                            <p style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>{freelancer.name || 'Freelance Pro'}</p>
                            <p style={{ fontSize: 12, color: '#64748b' }}>{freelancer.email || ''}</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Document</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa' }}>{inv?.id || 'Devis'}</p>
                    </div>
                </div>
            </div>

            {/* Welcome banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(16,185,129,0.05))', borderBottom: '1px solid rgba(108,99,255,0.1)', padding: '24px 0' }}>
                <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px' }}>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>
                        Bonjour {portal.clientName?.split(' ')[0] || 'là'} 👋
                    </h1>
                    <p style={{ fontSize: 14, color: '#94a3b8' }}>
                        {freelancer.name || 'Votre prestataire'} vous a partagé ce document. Vous pouvez le consulter, le signer et régler en ligne en quelques secondes.
                    </p>
                </div>
            </div>

            {/* Tab navigation */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0f0e17', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4 }}>
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setSection(item.id)} style={{
                            padding: '14px 20px', borderRadius: '0', border: 'none', cursor: 'pointer',
                            background: 'transparent', borderBottom: section === item.id ? '2px solid #6c63ff' : '2px solid transparent',
                            color: section === item.id ? '#a78bfa' : '#64748b', fontWeight: section === item.id ? 600 : 400,
                            fontSize: 14, transition: 'all 0.2s', marginBottom: -1,
                        }}>{item.label}</button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>

                {/* ── DEVIS SECTION ── */}
                {section === 'devis' && (
                    <div>
                        {/* Invoice card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{inv?.type || 'Devis'}</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{inv?.id}</div>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>Émis le {inv?.date} · Échéance le {inv?.dueDate || '—'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>MONTANT TOTAL</div>
                                    <div style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #6c63ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        {inv?.amount?.toLocaleString('fr-FR')}€
                                    </div>
                                    {inv?.notes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{inv.notes}</div>}
                                </div>
                            </div>

                            {/* Line items */}
                            {inv?.items?.length > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            {['Prestation', 'Qté / Jours', 'Prix unitaire', 'Total'].map(h => (
                                                <th key={h} style={{ padding: '10px 24px', textAlign: h === 'Prestation' ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inv.items.map((item, i) => (
                                            <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '14px 24px', fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>{item.description}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'right', fontSize: 14, color: '#94a3b8' }}>{item.quantity}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'right', fontSize: 14, color: '#94a3b8' }}>{(item.unitPrice || 0).toLocaleString('fr-FR')}€</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString('fr-FR')}€</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(108,99,255,0.05)' }}>
                                            <td colSpan={3} style={{ padding: '16px 24px', fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>TOTAL</td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, fontSize: 18, color: '#a78bfa' }}>{inv?.amount?.toLocaleString('fr-FR')}€</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>

                        {/* CTA */}
                        {signed ? (
                            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <CheckCircle size={20} color="#34d399" />
                                <div>
                                    <p style={{ fontWeight: 700, color: '#34d399', fontSize: 14 }}>✅ Devis signé et accepté</p>
                                    <p style={{ fontSize: 12, color: '#64748b' }}>Signé le {signedAt}</p>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setSection('signature')} style={{
                                width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', color: 'white', fontWeight: 700, fontSize: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                boxShadow: '0 4px 24px rgba(108,99,255,0.35)', transition: 'all 0.2s',
                            }}>
                                <Pen size={18} /> Signer le devis →
                            </button>
                        )}
                    </div>
                )}

                {/* ── SIGNATURE SECTION ── */}
                {section === 'signature' && (
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>✍️ Signature électronique</h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
                            En signant, vous acceptez les termes du devis <strong>{inv?.id}</strong> pour un montant de <strong>{inv?.amount?.toLocaleString('fr-FR')}€</strong>.
                        </p>

                        {signed ? (
                            <div>
                                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '20px 24px', textAlign: 'center', marginBottom: 24 }}>
                                    {signatureImg && <img src={signatureImg} alt="Signature" style={{ maxHeight: 80, margin: '0 auto 12px', filter: 'invert(1)' }} />}
                                    <p style={{ fontWeight: 700, color: '#34d399', fontSize: 15 }}>✅ Signé le {signedAt}</p>
                                </div>
                                <button onClick={() => setSection('paiement')} style={{
                                    width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #10b981, #34d399)', color: 'white', fontWeight: 700, fontSize: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                }}>
                                    <CreditCard size={18} /> Passer au paiement →
                                </button>
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                                <SignaturePad onSign={handleSign} />
                                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(108,99,255,0.06)', borderRadius: 8, border: '1px solid rgba(108,99,255,0.15)' }}>
                                    <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                                        🔒 Cette signature a valeur d'accord contractuel entre les parties, conformément à l'article 1366 du Code civil français.
                                        L'IP et la date d'acceptation sont enregistrées.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── PAIEMENT SECTION ── */}
                {section === 'paiement' && (
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>💳 Paiement en ligne</h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
                            Réglez votre acompte ou la totalité en toute sécurité via Stripe.
                        </p>

                        {!signed && (
                            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, marginBottom: 20 }}>
                                <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
                                <p style={{ fontSize: 13, color: '#fbbf24' }}>Veuillez d'abord signer le devis avant de payer.</p>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            {/* Acompte */}
                            {portal.stripeAcompte && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
                                    <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Acompte 30%</p>
                                    <p style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa', marginBottom: 4 }}>
                                        {Math.round(inv?.amount * 0.30).toLocaleString('fr-FR')}€
                                    </p>
                                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Pour démarrer le projet maintenant</p>
                                    <a href={portal.stripeAcompte} target="_blank" rel="noreferrer" style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '12px', borderRadius: 8, textDecoration: 'none',
                                        background: signed ? 'linear-gradient(135deg, #6c63ff, #a78bfa)' : 'rgba(255,255,255,0.05)',
                                        color: signed ? 'white' : '#64748b', fontWeight: 600, fontSize: 14,
                                        pointerEvents: signed ? 'auto' : 'none',
                                    }}>
                                        <CreditCard size={16} /> Payer l'acompte <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}

                            {/* Total */}
                            {portal.stripeTotal && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                                    <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Paiement total</p>
                                    <p style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa', marginBottom: 4 }}>
                                        {inv?.amount?.toLocaleString('fr-FR')}€
                                    </p>
                                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Règlement complet</p>
                                    <a href={portal.stripeTotal} target="_blank" rel="noreferrer" style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '12px', borderRadius: 8, textDecoration: 'none',
                                        background: signed ? 'linear-gradient(135deg, #10b981, #34d399)' : 'rgba(255,255,255,0.05)',
                                        color: signed ? 'white' : '#64748b', fontWeight: 600, fontSize: 14,
                                        pointerEvents: signed ? 'auto' : 'none',
                                    }}>
                                        <CreditCard size={16} /> Payer le total <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}

                            {/* No stripe links configured */}
                            {!portal.stripeAcompte && !portal.stripeTotal && (
                                <div style={{ gridColumn: '1/-1', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 32, textAlign: 'center' }}>
                                    <p style={{ fontSize: 36, marginBottom: 12 }}>🏦</p>
                                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: '#e2e8f0' }}>Coordonnées bancaires</p>
                                    <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>Montant : <strong>{inv?.amount?.toLocaleString('fr-FR')}€</strong></p>
                                    <p style={{ fontSize: 13, color: '#64748b' }}>Référence : <strong>{inv?.id}</strong></p>
                                    <p style={{ fontSize: 12, color: '#475569', marginTop: 12 }}>Pour activer le paiement en ligne Stripe, configurez vos liens dans le CRM</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── PROJET SECTION ── */}
                {section === 'projet' && phases.length > 0 && (
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>📋 Avancement du projet</h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
                            Voici les phases de votre projet et leur état d'avancement en temps réel.
                        </p>
                        <ProjectKanban phases={phases} />
                    </div>
                )}

            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px', textAlign: 'center', marginTop: 48 }}>
                <p style={{ fontSize: 12, color: '#334155' }}>
                    Powered by <strong style={{ color: '#6c63ff' }}>CRM AI</strong> — Portail client sécurisé
                </p>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}
