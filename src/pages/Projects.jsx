import { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { getActiveKey } from '../utils/ai.js';
import {
    FolderKanban, Plus, Sparkles, CheckSquare, Square, Trash2,
    Calendar, ChevronDown, ChevronUp, X, AlertCircle, Loader,
    Link as LinkIcon, User, Edit2, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AIMarkdown from '../components/AIMarkdown';

const STATUS_OPTIONS = ['En cours', 'Planifié', 'Terminé', 'En pause'];
const PRIORITY_OPTIONS = ['haute', 'normale', 'faible'];

const STATUS_STYLE = {
    'En cours': { badge: 'badge-blue', dot: 'var(--accent-blue)' },
    'Planifié': { badge: 'badge-yellow', dot: 'var(--accent-yellow)' },
    'Terminé': { badge: 'badge-green', dot: 'var(--accent-green)' },
    'En pause': { badge: 'badge-gray', dot: 'var(--text-muted)' },
};

const PRIORITY_STYLE = {
    haute: { color: 'var(--accent-red)', label: '🔴 Haute' },
    normale: { color: 'var(--accent-yellow)', label: '🟡 Normale' },
    faible: { color: 'var(--text-muted)', label: '⚪ Faible' },
};

function formatDate(d) {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(d) {
    if (!d) return false;
    return new Date(d) < new Date(new Date().toDateString());
}

// ─── Project Form Modal ────────────────────────────────────────────────────────
function ProjectModal({ project, contacts, onSave, onClose }) {
    const [form, setForm] = useState(project || {
        name: '', description: '', status: 'En cours',
        contactId: '', dueDate: '', tasks: [],
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
                <div className="modal-header">
                    <h2 className="modal-title">{project ? 'Modifier le projet' : 'Nouveau projet'}</h2>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="input-group mb-3">
                    <label className="input-label">Nom du projet *</label>
                    <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Refonte site e-commerce" autoFocus />
                </div>

                <div className="input-group mb-3">
                    <label className="input-label">Description</label>
                    <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Objectifs, contexte..." />
                </div>

                <div className="grid grid-2 gap-3 mb-3">
                    <div className="input-group">
                        <label className="input-label">Statut</label>
                        <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Date de livraison</label>
                        <input className="input" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
                    </div>
                </div>

                <div className="input-group mb-4">
                    <label className="input-label">Client associé</label>
                    <select className="input" value={form.contactId} onChange={e => set('contactId', e.target.value)}>
                        <option value="">Aucun</option>
                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                    </select>
                </div>

                <div className="flex gap-3 justify-end">
                    <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" onClick={() => form.name.trim() && onSave(form)} disabled={!form.name.trim()}>
                        <Check size={16} /> {project ? 'Mettre à jour' : 'Créer le projet'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Single Project Card ────────────────────────────────────────────────────────
function ProjectCard({ project, contacts, onUpdate, onDelete, onEdit, callAI, aiSettings }) {
    const [expanded, setExpanded] = useState(true);
    const [newTask, setNewTask] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newPriority, setNewPriority] = useState('normale');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const tasks = project.tasks || [];
    const done = tasks.filter(t => t.done).length;
    const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
    const contact = contacts.find(c => c.id === project.contactId);

    const addTask = () => {
        if (!newTask.trim()) return;
        const updated = [...tasks, {
            id: Date.now().toString(),
            text: newTask.trim(),
            done: false,
            dueDate: newDate,
            priority: newPriority,
        }];
        onUpdate(project.id, { tasks: updated });
        setNewTask(''); setNewDate(''); setNewPriority('normale');
    };

    const toggleTask = (id) => {
        const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
        onUpdate(project.id, { tasks: updated });
    };

    const deleteTask = (id) => {
        onUpdate(project.id, { tasks: tasks.filter(t => t.id !== id) });
    };

    const generateAITasks = async () => {
        if (!getActiveKey(aiSettings)) {
            setAiError('Clé API requise dans Paramètres.');
            return;
        }
        setAiLoading(true);
        setAiError('');
        try {
            const prompt = `Tu es un chef de projet expert. Pour ce projet freelance, génère une liste de tâches détaillée et chronologique.

Projet: "${project.name}"
Description: "${project.description || 'Aucune description'}"
Client: "${contact?.name || 'Indéfini'}"
Date de livraison: "${project.dueDate || 'Non définie'}"
Tâches existantes: ${tasks.map(t => t.text).join(', ') || 'Aucune'}

Génère 5 à 8 tâches concrètes et actionnables. Réponds UNIQUEMENT avec un JSON valide (sans markdown):
{
  "tasks": [
    { "text": "Description claire de la tâche", "priority": "haute|normale|faible", "daysFromNow": 3 }
  ],
  "advice": "Un conseil détaillé et stratégique pour ce projet, formaté en **Markdown riche** (utilise du gras, des listes si besoin, et des emojis)."
}`;

            const raw = await callAI([{ role: 'user', content: prompt }], 'Tu es un chef de projet expert pour freelances. Réponds UNIQUEMENT en JSON valide.');
            const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);

            const today = new Date();
            const newTasks = parsed.tasks.map(t => ({
                id: Date.now().toString() + Math.random(),
                text: t.text,
                done: false,
                priority: t.priority || 'normale',
                dueDate: t.daysFromNow
                    ? new Date(today.getTime() + t.daysFromNow * 86400000).toISOString().split('T')[0]
                    : '',
            }));

            onUpdate(project.id, {
                tasks: [...tasks, ...newTasks],
                aiAdvice: parsed.advice,
            });
        } catch (e) {
            setAiError(e.message);
        } finally {
            setAiLoading(false);
        }
    };

    const statusStyle = STATUS_STYLE[project.status] || STATUS_STYLE['En cours'];
    const overdue = isOverdue(project.dueDate) && project.status !== 'Terminé';

    return (
        <div className="card mb-4" style={{ borderColor: overdue ? 'rgba(239,68,68,0.3)' : undefined }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold" style={{ fontSize: 16 }}>{project.name}</h3>
                        <span className={`badge ${statusStyle.badge}`}>{project.status}</span>
                        {overdue && <span className="badge badge-red">⚠️ En retard</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {project.dueDate && (
                            <span className="text-xs text-muted flex items-center gap-1">
                                <Calendar size={11} />
                                {formatDate(project.dueDate)}
                            </span>
                        )}
                        {contact && (
                            <Link to={`/contacts/${contact.id}`} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent-secondary)', textDecoration: 'none' }}>
                                <User size={11} /> {contact.name}
                            </Link>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(project)} title="Modifier">
                        <Edit2 size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onDelete(project.id)} title="Supprimer">
                        <Trash2 size={13} color="var(--accent-red)" />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            {tasks.length > 0 && (
                <div className="mb-3">
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-muted">{done}/{tasks.length} tâche{tasks.length > 1 ? 's' : ''}</span>
                        <span className="text-xs font-semibold" style={{ color: progress === 100 ? 'var(--accent-green)' : 'var(--accent-secondary)' }}>{progress}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                            width: `${progress}%`, height: '100%', borderRadius: 99,
                            background: progress === 100
                                ? 'linear-gradient(90deg, var(--accent-green), #34d399)'
                                : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                            transition: 'width 0.4s ease',
                        }} />
                    </div>
                </div>
            )}

            {expanded && (
                <>
                    {/* Description */}
                    {project.description && (
                        <p className="text-sm text-secondary mb-4" style={{ lineHeight: 1.6 }}>{project.description}</p>
                    )}

                    {/* AI Advice */}
                    {project.aiAdvice && (
                        <div style={{ background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="ai-badge">✨ Copilote</span>
                                <p className="text-xs font-semibold" style={{ color: 'var(--accent-secondary)' }}>Conseil Stratégique IA</p>
                            </div>
                            <AIMarkdown content={project.aiAdvice} />
                        </div>
                    )}

                    {/* Task list */}
                    {tasks.length > 0 && (
                        <div className="mb-4">
                            {tasks.map(task => {
                                const taskOverdue = isOverdue(task.dueDate) && !task.done;
                                return (
                                    <div key={task.id} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
                                        borderRadius: 8, marginBottom: 4,
                                        background: task.done ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${taskOverdue ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`,
                                    }}>
                                        <button onClick={() => toggleTask(task.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: task.done ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>
                                            {task.done ? <CheckSquare size={17} /> : <Square size={17} />}
                                        </button>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p className="text-sm" style={{ textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                                {task.text}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                {task.priority && task.priority !== 'normale' && (
                                                    <span style={{ fontSize: 11, color: PRIORITY_STYLE[task.priority]?.color }}>{PRIORITY_STYLE[task.priority]?.label}</span>
                                                )}
                                                {task.dueDate && (
                                                    <span className="text-xs" style={{ color: taskOverdue ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                                                        {taskOverdue ? '⚠️ ' : ''}{formatDate(task.dueDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
                                            <X size={13} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add task form */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 }}>
                        <input
                            className="input"
                            style={{ flex: 1, minWidth: 160, padding: '8px 12px', fontSize: 13 }}
                            value={newTask}
                            onChange={e => setNewTask(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTask()}
                            placeholder="Nouvelle tâche... (Entrée pour ajouter)"
                        />
                        <input
                            className="input"
                            type="date"
                            style={{ width: 140, padding: '8px 10px', fontSize: 13 }}
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                        />
                        <select className="input" style={{ width: 120, padding: '8px 10px', fontSize: 13 }} value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_STYLE[p].label}</option>)}
                        </select>
                        <button className="btn btn-ghost btn-sm" onClick={addTask} disabled={!newTask.trim()} style={{ padding: '8px 14px', flexShrink: 0 }}>
                            <Plus size={14} /> Ajouter
                        </button>
                    </div>

                    {/* AI generate tasks */}
                    {aiError && (
                        <div className="flex items-center gap-2 mb-2 p-2 rounded" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <AlertCircle size={14} color="var(--accent-red)" />
                            <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{aiError}</p>
                        </div>
                    )}
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={generateAITasks}
                        disabled={aiLoading || !getActiveKey(aiSettings)}
                        style={{ fontSize: 12 }}
                    >
                        {aiLoading
                            ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Génération...</>
                            : <><Sparkles size={13} color="var(--accent-secondary)" /> Générer les tâches avec l'IA</>
                        }
                    </button>
                </>
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Projects() {
    const { projects, addProject, updateProject, deleteProject, contacts, callAI, aiSettings } = useCRM();
    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [filter, setFilter] = useState('Tous');

    const allProjects = projects || [];

    const filtered = filter === 'Tous' ? allProjects : allProjects.filter(p => p.status === filter);
    const stats = {
        total: allProjects.length,
        enCours: allProjects.filter(p => p.status === 'En cours').length,
        termines: allProjects.filter(p => p.status === 'Terminé').length,
        enRetard: allProjects.filter(p => isOverdue(p.dueDate) && p.status !== 'Terminé').length,
    };

    const handleSave = (form) => {
        if (editingProject) {
            updateProject(editingProject.id, form);
        } else {
            addProject(form);
        }
        setShowModal(false);
        setEditingProject(null);
    };

    const handleEdit = (project) => {
        setEditingProject(project);
        setShowModal(true);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Suivi de Projets</h1>
                    <p className="page-subtitle">Gérez vos projets, suivez l'avancement avec l'aide de l'IA</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingProject(null); setShowModal(true); }}>
                    <Plus size={16} /> Nouveau projet
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-4 mb-6">
                {[
                    { label: 'Projets total', value: stats.total, color: 'purple' },
                    { label: 'En cours', value: stats.enCours, color: 'blue' },
                    { label: 'Terminés', value: stats.termines, color: 'green' },
                    { label: 'En retard', value: stats.enRetard, color: 'red' },
                ].map(k => (
                    <div key={k.label} className={`kpi-card ${k.color}`}>
                        <p className="kpi-label">{k.label}</p>
                        <p className="kpi-value">{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {['Tous', ...STATUS_OPTIONS].map(s => (
                    <button
                        key={s}
                        className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setFilter(s)}
                    >
                        {s} {s !== 'Tous' && `(${allProjects.filter(p => p.status === s).length})`}
                    </button>
                ))}
            </div>

            {/* Project list */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <FolderKanban size={48} color="var(--accent-secondary)" style={{ opacity: 0.5 }} />
                    <h3>Aucun projet</h3>
                    <p>Créez votre premier projet pour commencer le suivi</p>
                    <button className="btn btn-primary mt-3" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Créer un projet
                    </button>
                </div>
            ) : (
                filtered.map(project => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        contacts={contacts}
                        onUpdate={updateProject}
                        onDelete={deleteProject}
                        onEdit={handleEdit}
                        callAI={callAI}
                        aiSettings={aiSettings}
                    />
                ))
            )}

            {showModal && (
                <ProjectModal
                    project={editingProject}
                    contacts={contacts}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditingProject(null); }}
                />
            )}
        </div>
    );
}
