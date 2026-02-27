import { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Plus, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import ContactModal from '../components/ContactModal';

const columns = [
    { id: 'À contacter', color: '#3b82f6', emoji: '📋' },
    { id: 'En discussion', color: '#f59e0b', emoji: '💬' },
    { id: 'Devis envoyé', color: '#a78bfa', emoji: '📄' },
    { id: 'Gagné', color: '#10b981', emoji: '🏆' },
    { id: 'Perdu', color: '#ef4444', emoji: '❌' },
];

function KanbanCard({ contact }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: contact.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

    return (
        <div ref={setNodeRef} style={style} className="kanban-card">
            <div className="flex items-start gap-2">
                <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-muted)', paddingTop: 2 }}>
                    <GripVertical size={14} />
                </div>
                <div className="flex-1">
                    <Link to={`/contacts/${contact.id}`} style={{ textDecoration: 'none' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <div style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 600, flexShrink: 0,
                            }}>
                                {contact.name[0]}
                            </div>
                            <p className="kanban-card-name">{contact.name}</p>
                        </div>
                        <p className="kanban-card-company">{contact.company}</p>
                    </Link>
                    <div className="kanban-card-footer">
                        {contact.revenue > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-green)' }}>
                                {contact.revenue.toLocaleString()}€
                            </span>
                        )}
                        {contact.tags?.slice(0, 1).map(tag => (
                            <span key={tag} className="badge badge-gray" style={{ fontSize: 11 }}>{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Pipeline() {
    const { contacts, moveContact, addContact } = useCRM();
    const [showModal, setShowModal] = useState(false);
    const [defaultStage, setDefaultStage] = useState('À contacter');
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;
        const contact = contacts.find(c => c.id === active.id);
        if (!contact) return;
        const targetColumn = columns.find(col => col.id === over.id);
        if (targetColumn && contact.stage !== targetColumn.id) {
            moveContact(active.id, targetColumn.id);
            return;
        }
        const targetContact = contacts.find(c => c.id === over.id);
        if (targetContact && contact.stage !== targetContact.stage) {
            moveContact(active.id, targetContact.stage);
        }
    };

    const totalRevenue = contacts.filter(c => c.stage === 'Gagné').reduce((s, c) => s + (c.revenue || 0), 0);
    const pipelineValue = contacts.filter(c => !['Perdu', 'Gagné'].includes(c.stage)).reduce((s, c) => s + (c.revenue || 0), 0);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Pipeline</h1>
                    <p className="page-subtitle">
                        <span style={{ color: 'var(--accent-green)' }}>{totalRevenue.toLocaleString()}€ gagnés</span>
                        {' · '}
                        <span style={{ color: 'var(--accent-yellow)' }}>{pipelineValue.toLocaleString()}€ en cours</span>
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => { setDefaultStage('À contacter'); setShowModal(true); }}>
                    <Plus size={16} /> Nouveau contact
                </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
                <div className="kanban-board">
                    {columns.map(col => {
                        const colContacts = contacts.filter(c => c.stage === col.id);
                        return (
                            <div key={col.id} className="kanban-column">
                                <div className="kanban-col-header" style={{ borderTop: `3px solid ${col.color}`, borderRadius: 'var(--radius) var(--radius) 0 0' }}>
                                    <div className="flex items-center gap-2">
                                        <span>{col.emoji}</span>
                                        <span className="kanban-col-title">{col.id}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="kanban-count">{colContacts.length}</span>
                                        <button
                                            className="btn btn-ghost btn-icon"
                                            style={{ padding: 4 }}
                                            onClick={() => { setDefaultStage(col.id); setShowModal(true); }}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                                <SortableContext items={[col.id, ...colContacts.map(c => c.id)]} strategy={verticalListSortingStrategy}>
                                    <div className="kanban-col-body" id={col.id}>
                                        {colContacts.length === 0 && (
                                            <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                                Glissez des contacts ici
                                            </div>
                                        )}
                                        {colContacts.map(contact => (
                                            <KanbanCard key={contact.id} contact={contact} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </div>
                        );
                    })}
                </div>
            </DndContext>

            {showModal && (
                <ContactModal
                    onClose={() => setShowModal(false)}
                    onSave={(data) => { addContact({ ...data, stage: defaultStage }); setShowModal(false); }}
                    contact={{ stage: defaultStage }}
                />
            )}
        </div>
    );
}
