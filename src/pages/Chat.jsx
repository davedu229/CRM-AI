import { useState, useRef, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { Send, Sparkles, MessageSquare, Link } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import AIMarkdown from '../components/AIMarkdown';

const SUGGESTIONS = [
    "Qui dois-je relancer cette semaine ?",
    "Quel est mon CA total encaissé ce mois ?",
    "Quelles factures sont en retard ?",
    "Résume mes contacts en discussion",
    "Quels sont mes 3 deals les plus importants ?",
    "Qui est mon client le plus rentable ?",
];

export default function Chat() {
    const { chatHistory, addChatMessage, callAI, getCRMContext, aiSettings } = useCRM();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);

    const [messages, setMessages] = useState(chatHistory.length > 0 ? chatHistory : [
        {
            id: 'welcome',
            role: 'ai',
            content: '👋 Bonjour ! Je suis votre copilote CRM. Je connais tous vos contacts, deals, factures et tâches.\n\nPosez-moi n\'importe quelle question en langage naturel !',
            timestamp: new Date().toISOString(),
        }
    ]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async () => {
        if (!input.trim() || loading) return;
        const userMsg = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        addChatMessage(userMsg);
        setInput('');
        setLoading(true);

        try {
            const crmCtx = getCRMContext();
            const history = messages.filter(m => m.id !== 'welcome').slice(-10).map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.content,
            }));

            const systemPrompt = `Tu es le copilote IA d'un CRM pour freelance. Tu as accès à toutes les données du CRM de l'utilisateur.
      
Réponds toujours en français, de manière experte et actionnable. 
ATTENTION : Tu dois formater tes réponses en **Markdown riche** pour que ce soit magnifique à lire (utilise des titres en gras, des listes à puces esthétiques, des emojis, et met en **gras** les mots clés et chiffres importants).

DONNÉES CRM ACTUELLES:
${crmCtx}`;

            const response = await callAI([...history, { role: 'user', content: input.trim() }], systemPrompt);
            const aiMsg = { id: (Date.now() + 1).toString(), role: 'ai', content: response, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, aiMsg]);
            addChatMessage(aiMsg);
        } catch (err) {
            const errMsg = { id: (Date.now() + 1).toString(), role: 'ai', content: `❌ ${err.message}`, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Chat CRM</h1>
                    <p className="page-subtitle">Posez n'importe quelle question sur vos données en langage naturel</p>
                </div>
                {!aiSettings.apiKey && (
                    <RouterLink to="/settings" className="btn btn-ghost">⚙️ Configurer l'IA</RouterLink>
                )}
            </div>

            <div className="chat-container">
                {/* Suggestions */}
                {messages.length <= 1 && (
                    <div className="mb-4">
                        <p className="text-xs text-muted mb-3">Suggestions :</p>
                        <div className="flex gap-2 flex-wrap">
                            {SUGGESTIONS.map(s => (
                                <button key={s} className="btn btn-ghost btn-sm" onClick={() => { setInput(s); textareaRef.current?.focus(); }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="chat-messages">
                    {messages.map(msg => (
                        <div key={msg.id} className={`chat-message ${msg.role}`}>
                            <div className={`chat-avatar ${msg.role}`}>
                                {msg.role === 'ai' ? <Sparkles size={16} color="white" /> : '🧑'}
                            </div>
                            <div className="chat-bubble" style={msg.role === 'user' ? { whiteSpace: 'pre-wrap' } : {}}>
                                {msg.role === 'ai' ? <AIMarkdown content={msg.content} /> : msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="chat-message ai">
                            <div className="chat-avatar ai"><Sparkles size={16} color="white" /></div>
                            <div className="chat-bubble">
                                <div className="loading-dots"><span /><span /><span /></div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                <div className="chat-input-area">
                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Posez votre question... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
                        rows={1}
                    />
                    <button className="chat-send-btn" onClick={send} disabled={loading || !input.trim()}>
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
