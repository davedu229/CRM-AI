import { useState } from 'react';
import { useLicense } from '../context/LicenseContext';
import { Key, Unlock as UnlockIcon, Loader, ShieldCheck, ArrowRight, ExternalLink, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Unlock() {
    const { activateLicense, isLocked } = useLicense();
    const navigate = useNavigate();

    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // If already unlocked, redirect to dashboard
    if (!isLocked && !success) {
        navigate('/dashboard', { replace: true });
        return null;
    }

    const handleActivate = async (e) => {
        e.preventDefault();
        if (!key.trim()) {
            setError('Veuillez entrer une clé de licence.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await activateLicense(key);
            setSuccess(true);
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const externalBuyLink = "https://lemonsqueezy.com/"; // Replace with your actual checkout link later

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-body)',
            padding: 24,
            position: 'relative',
        }}>
            {/* Background effects */}
            <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(108,99,255,0.15)', filter: 'blur(100px)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: 400, height: 400, background: 'rgba(59,130,246,0.1)', filter: 'blur(120px)', borderRadius: '50%' }} />

            <div className="card" style={{
                maxWidth: 480,
                width: '100%',
                padding: '40px 32px',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                position: 'relative',
                zIndex: 1,
                border: '1px solid rgba(255,255,255,0.05)',
            }}>

                {/* Logo / Header */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 25px rgba(108,99,255,0.3)',
                    }}>
                        <ShieldCheck size={36} color="white" />
                    </div>
                    <h1 className="font-bold mb-2" style={{ fontSize: 26, background: 'linear-gradient(90deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Activation Requise
                    </h1>
                    <p className="text-secondary" style={{ lineHeight: 1.6 }}>
                        Entrez votre clé de licence pour déverrouiller CRM AI et accéder à toutes les fonctionnalités premium.
                    </p>
                </div>

                {success ? (
                    <div style={{ padding: '24px 0', animation: 'fadeIn 0.5s ease' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <UnlockIcon size={28} color="var(--accent-green)" />
                        </div>
                        <h2 className="font-bold text-xl mb-2" style={{ color: 'var(--accent-green)' }}>Licence Activée !</h2>
                        <p className="text-secondary">Redirection vers votre espace...</p>
                    </div>
                ) : (
                    <form onSubmit={handleActivate}>
                        <div className="input-group mb-5" style={{ textAlign: 'left' }}>
                            <label className="input-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Key size={14} color="var(--accent-secondary)" /> Clé de Licence
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder="ex: PRO-XXXX-XXXX-XXXX"
                                value={key}
                                onChange={e => setKey(e.target.value)}
                                style={{ padding: '14px 16px', fontSize: 16, fontFamily: 'monospace', letterSpacing: 1 }}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div style={{
                                padding: '12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red)',
                                fontSize: 13, marginBottom: 20, textAlign: 'left',
                                display: 'flex', alignItems: 'flex-start', gap: 8
                            }}>
                                <span>⚠️</span> <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={!key.trim() || loading}
                            style={{ padding: '16px', fontSize: 16, justifyContent: 'center', marginBottom: 24 }}
                        >
                            {loading ? (
                                <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Vérification...</>
                            ) : (
                                <><UnlockIcon size={18} /> Déverrouiller l'Application <ArrowRight size={16} /></>
                            )}
                        </button>

                        <div className="divider mb-4" />

                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                            <p style={{ marginBottom: 12 }}>Vous n'avez pas encore de licence ?</p>
                            <a href={externalBuyLink} target="_blank" rel="noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '8px 16px', background: 'rgba(255,255,255,0.05)',
                                    borderRadius: 8, color: 'white', textDecoration: 'none',
                                    border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <Zap size={14} color="var(--accent-yellow)" />
                                Obtenir une licence PRO
                                <ExternalLink size={12} color="var(--text-muted)" style={{ marginLeft: 4 }} />
                            </a>
                        </div>
                    </form>
                )}
            </div>

            {/* Little info footer */}
            <div style={{ position: 'absolute', bottom: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                CRM AI Desktop Edition · Ver 2.0.0
            </div>
        </div>
    );
}
