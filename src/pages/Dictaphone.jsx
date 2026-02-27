import { useState, useRef, useCallback } from 'react';
import { useCRM } from '../context/CRMContext';
import { getActiveKey } from '../utils/ai.js';
import { Mic, MicOff, Sparkles, CheckCircle, X, Play, Square, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

// Check Web Speech API support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function Dictaphone() {
    const { contacts, updateContact, addTask, callAI, getCRMContext, aiSettings, moveContact } = useCRM();

    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interim, setInterim] = useState('');
    const [duration, setDuration] = useState(0);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [applied, setApplied] = useState(false);

    const recognitionRef = useRef(null);
    const timerRef = useRef(null);

    const startRecording = useCallback(() => {
        if (!SpeechRecognition) { setError('Web Speech API non supportée. Utilisez Chrome ou Edge.'); return; }
        setError('');
        setTranscript('');
        setInterim('');
        setResult(null);
        setApplied(false);
        setDuration(0);

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'fr-FR';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            let final = '';
            let interimRes = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript + ' ';
                } else {
                    interimRes += event.results[i][0].transcript;
                }
            }
            setTranscript(final);
            setInterim(interimRes);
        };

        recognition.onerror = (e) => {
            setError('Erreur micro: ' + e.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
            clearInterval(timerRef.current);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);

        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }, []);

    const stopRecording = useCallback(() => {
        recognitionRef.current?.stop();
        setIsRecording(false);
        clearInterval(timerRef.current);
        setInterim('');
    }, []);

    const formatDuration = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const analyzeWithAI = async () => {
        const text = transcript.trim();
        if (!text) return;
        if (!getActiveKey(aiSettings)) { setError('Clé API requise dans Paramètres.'); return; }
        setAnalyzing(true);
        setError('');

        const crmCtx = getCRMContext();
        const prompt = `Tu es un assistant CRM pour freelance. Analyse cette note vocale de compte-rendu de réunion et extrais des informations structurées.

NOTE VOCALE:
"${text}"

${crmCtx}

Réponds UNIQUEMENT avec un JSON valide sans markdown:
{
  "contactId": "id du contact mentionné ou null",
  "contactName": "nom du contact ou null",
  "resume": "Résumé du RDV en 2-3 phrases claires",
  "sentiment": "positif | neutre | négatif | hésitant",
  "nextStage": "nouveau stage pipeline si changement: À contacter | En discussion | Devis envoyé | Gagné | Perdu | null",
  "todos": ["liste d'actions concrètes à faire"],
  "keyInfos": ["infos importantes à retenir (budget mentionné, délais, concurrents...)"],
  "urgency": "haute | normale | faible"
}`;

        try {
            const raw = await callAI(
                [{ role: 'user', content: prompt }],
                'Tu es un assistant CRM expert. Analyse les notes vocales de réunion et extrais les données structurées. Réponds UNIQUEMENT en JSON valide.'
            );
            const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            setResult(JSON.parse(cleaned));
        } catch (e) {
            setError('Erreur analyse IA: ' + e.message);
        }
        setAnalyzing(false);
    };

    const applyResult = () => {
        if (!result) return;
        const contact = result.contactId ? contacts.find(c => c.id === result.contactId) : null;

        if (contact) {
            // Update notes
            const noteEntry = `\n\n[RDV ${new Date().toLocaleDateString('fr-FR')}] ${result.resume}${result.keyInfos?.length ? '\n• ' + result.keyInfos.join('\n• ') : ''}`;
            updateContact(contact.id, { notes: (contact.notes || '') + noteEntry });
            // Move pipeline stage
            if (result.nextStage) moveContact(contact.id, result.nextStage);
        }

        // Create todos
        result.todos?.forEach(todo => {
            addTask({
                text: todo,
                contactId: result.contactId || null,
                priority: result.urgency === 'haute' ? 'high' : 'medium',
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            });
        });

        setApplied(true);
    };

    const sentimentColor = { positif: 'badge-green', neutre: 'badge-gray', négatif: 'badge-red', hésitant: 'badge-yellow' };
    const sentimentEmoji = { positif: '😊', neutre: '😐', négatif: '😟', hésitant: '🤔' };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dictaphone IA</h1>
                    <p className="page-subtitle">Racontez votre réunion à voix haute — l'IA met à jour le CRM automatiquement</p>
                </div>
            </div>

            {!SpeechRecognition && (
                <div className="flex items-center gap-2 mb-6 p-4 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={18} color="var(--accent-red)" />
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--accent-red)' }}>Web Speech API non supportée</p>
                        <p className="text-sm text-secondary">Utilisez Google Chrome ou Microsoft Edge pour cette fonctionnalité.</p>
                    </div>
                </div>
            )}

            <div style={{ maxWidth: 760, margin: '0 auto' }}>
                {/* Recording button */}
                <div className="card mb-6" style={{ textAlign: 'center', padding: '48px 32px' }}>
                    <div style={{ marginBottom: 32, position: 'relative', display: 'inline-block' }}>
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={!SpeechRecognition}
                            style={{
                                width: 100, height: 100, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: isRecording
                                    ? 'linear-gradient(135deg, #ef4444, #f87171)'
                                    : 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: isRecording
                                    ? '0 0 0 0 rgba(239,68,68,0.4)'
                                    : '0 0 40px rgba(108,99,255,0.4)',
                                animation: isRecording ? 'pulse-ring 1.5s ease-in-out infinite' : 'none',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {isRecording ? <MicOff size={36} color="white" /> : <Mic size={36} color="white" />}
                        </button>
                        {isRecording && (
                            <div style={{
                                position: 'absolute', inset: -8, borderRadius: '50%',
                                border: '3px solid rgba(239,68,68,0.4)',
                                animation: 'pulse 1.5s ease-in-out infinite',
                            }} />
                        )}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        {isRecording ? (
                            <>
                                <p className="font-bold" style={{ fontSize: 18, color: 'var(--accent-red)', marginBottom: 4 }}>
                                    🔴 Enregistrement en cours — {formatDuration(duration)}
                                </p>
                                <p className="text-secondary text-sm">Parlez naturellement de votre réunion. Cliquez pour arrêter.</p>
                            </>
                        ) : (
                            <>
                                <p className="font-bold" style={{ fontSize: 18, marginBottom: 4 }}>
                                    {transcript ? '✓ Mémo enregistré' : 'Appuyez pour commencer'}
                                </p>
                                <p className="text-secondary text-sm">
                                    {transcript ? `${formatDuration(duration)} enregistrées · ${transcript.split(' ').length} mots` : 'Racontez votre RDV, l\'IA s\'occupe du reste'}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Live transcript */}
                    {(transcript || interim) && (
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10, padding: '16px 20px', textAlign: 'left', maxHeight: 200,
                            overflowY: 'auto', lineHeight: 1.7, fontSize: 14,
                        }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{transcript}</span>
                            {interim && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interim}</span>}
                        </div>
                    )}
                </div>

                {/* Prompt examples */}
                {!transcript && !isRecording && (
                    <div className="card mb-6">
                        <p className="font-semibold mb-3">💡 Exemples de ce que vous pouvez dire</p>
                        <div className="grid grid-2 gap-3">
                            {[
                                'J\'ai eu Sophie Martin au téléphone, elle est très intéressée par notre offre, elle veut un devis pour 8000 euros, à envoyer avant vendredi.',
                                'Réunion avec Thomas Dupont de StartupFlow. Il hésite sur le budget. Il faut le relancer la semaine prochaine avec une proposition plus légère.',
                                'Marie Leclerc a confirmé le renouvellement de son contrat annuel pour 12000 euros. Le projet démarre en mars.',
                                'Appel de prospection avec Lucas Bernard de ConsultPro. Il est très ouvert, il a un projet de site e-commerce. À recontacter dans 2 semaines.',
                            ].map((ex, i) => (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 12, border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}
                                    onClick={() => { setTranscript(ex); setDuration(12 + i * 5); }}>
                                    <span style={{ color: 'var(--accent-secondary)', marginRight: 6 }}>»</span>{ex}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 mb-4 p-3 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <AlertCircle size={16} color="var(--accent-red)" />
                        <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</p>
                    </div>
                )}

                {/* Analyze button */}
                {transcript && !isRecording && (
                    <div className="flex gap-3 mb-6">
                        <button className="btn btn-ghost" onClick={() => { setTranscript(''); setResult(null); setApplied(false); setDuration(0); }}>
                            <RefreshCw size={16} /> Recommencer
                        </button>
                        <button className="btn btn-primary flex-1" style={{ justifyContent: 'center' }} onClick={analyzeWithAI} disabled={analyzing || !getActiveKey(aiSettings)}>
                            {analyzing ? <><span className="spinner" /> Analyse en cours...</> : <><Sparkles size={16} /> Analyser avec l'IA</>}
                        </button>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="ai-badge">✨ IA</span>
                                <p className="font-semibold">Analyse du mémo</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {result.contactName && <span className="badge badge-purple">👤 {result.contactName}</span>}
                                <span className={`badge ${sentimentColor[result.sentiment] || 'badge-gray'}`}>
                                    {sentimentEmoji[result.sentiment]} {result.sentiment}
                                </span>
                                {result.urgency === 'haute' && <span className="badge badge-red">🚨 Urgent</span>}
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                            <p className="text-xs text-muted mb-1">Résumé</p>
                            <p className="text-sm" style={{ lineHeight: 1.7 }}>{result.resume}</p>
                        </div>

                        {result.nextStage && (
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm text-secondary">Mouvement pipeline :</span>
                                <span className="badge badge-purple">→ {result.nextStage}</span>
                            </div>
                        )}

                        {result.keyInfos?.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <p className="text-xs text-muted mb-2">Informations clés</p>
                                <div className="flex-col gap-1">
                                    {result.keyInfos.map((info, i) => (
                                        <p key={i} className="text-sm text-secondary">• {info}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.todos?.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                                <p className="text-xs text-muted mb-2">Actions à faire ({result.todos.length})</p>
                                <div className="flex-col gap-2">
                                    {result.todos.map((todo, i) => (
                                        <div key={i} className="flex items-center gap-2 p-2 rounded" style={{ background: 'rgba(108,99,255,0.06)' }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }} />
                                            <p className="text-sm">{todo}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {applied ? (
                            <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <CheckCircle size={18} color="var(--accent-green)" />
                                <div>
                                    <p className="font-semibold text-sm" style={{ color: 'var(--accent-green)' }}>CRM mis à jour !</p>
                                    <p className="text-xs text-muted">Notes et tâches ajoutées{result.nextStage ? ` · Déplacé vers "${result.nextStage}"` : ''}</p>
                                </div>
                                {result.contactId && (
                                    <Link to={`/contacts/${result.contactId}`} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Voir la fiche →</Link>
                                )}
                            </div>
                        ) : (
                            <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={applyResult}>
                                <CheckCircle size={16} /> Appliquer dans le CRM
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
