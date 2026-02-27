import React, { createContext, useContext, useState, useEffect } from 'react';
import { callAI as callAIUtil, loadAISettings, saveAISettings } from '../utils/ai.js';

const CRMContext = createContext(null);

const STORAGE_KEY = 'crm_ai_data';

const defaultData = {
    contacts: [
        {
            id: '1',
            name: 'Sophie Martin',
            company: 'Agence Pixel',
            email: 'sophie@agencepixel.fr',
            phone: '+33 6 12 34 56 78',
            stage: 'En discussion',
            tags: ['Design', 'Récurrent'],
            notes: 'Très intéressée par notre offre de refonte UX. Budget autour de 8k€.',
            revenue: 8000,
            createdAt: '2024-01-15',
            lastContact: '2024-02-20',
            emails: [
                { id: 'e1', subject: 'Suite à notre échange', date: '2024-02-20', preview: 'Merci pour votre proposition, nous souhaitons aller plus loin...', direction: 'received' },
                { id: 'e2', subject: 'Proposition de devis', date: '2024-02-18', preview: 'Suite à notre appel, veuillez trouver notre proposition...', direction: 'sent' }
            ],
            todos: ['Envoyer le contrat final', 'Programmer kick-off'],
        },
        {
            id: '2',
            name: 'Thomas Dupont',
            company: 'StartupFlow',
            email: 'thomas@startupflow.io',
            phone: '+33 6 98 76 54 32',
            stage: 'Devis envoyé',
            tags: ['Dev', 'Startup'],
            notes: 'Besoin d\'un MVP en 3 mois. Décision avant fin du mois.',
            revenue: 15000,
            createdAt: '2024-02-01',
            lastContact: '2024-02-22',
            emails: [
                { id: 'e3', subject: 'Re: Devis développement MVP', date: '2024-02-22', preview: 'Je reviens vers vous concernant le devis...', direction: 'received' }
            ],
            todos: ['Relancer pour décision', 'Préparer planning projet'],
        },
        {
            id: '3',
            name: 'Marie Leclerc',
            company: 'BioNature SARL',
            email: 'marie@bionature.fr',
            phone: '+33 6 55 44 33 22',
            stage: 'Gagné',
            tags: ['Branding', 'Récurrent'],
            notes: 'Cliente fidèle depuis 2 ans. Renouvellement annuel.',
            revenue: 12000,
            createdAt: '2023-03-10',
            lastContact: '2024-02-10',
            emails: [],
            todos: [],
        },
        {
            id: '4',
            name: 'Lucas Bernard',
            company: 'ConsultPro',
            email: 'lucas@consultpro.com',
            phone: '+33 6 77 88 99 00',
            stage: 'À contacter',
            tags: ['Conseil'],
            notes: 'Référé par Sophie Martin. Besoin d\'un audit SEO.',
            revenue: 3000,
            createdAt: '2024-02-25',
            lastContact: null,
            emails: [],
            todos: ['Premier appel de découverte'],
        },
        {
            id: '5',
            name: 'Emma Rousseau',
            company: 'MediaVision',
            email: 'emma@mediavision.fr',
            phone: '+33 6 11 22 33 44',
            stage: 'Perdu',
            tags: ['Vidéo'],
            notes: 'Budget insuffisant pour notre prestation. À recontacter dans 6 mois.',
            revenue: 0,
            createdAt: '2024-01-20',
            lastContact: '2024-02-05',
            emails: [],
            todos: [],
        },
    ],
    invoices: [
        {
            id: 'F-2024-001',
            contactId: '3',
            contactName: 'Marie Leclerc',
            company: 'BioNature SARL',
            type: 'Facture',
            amount: 12000,
            status: 'Payée',
            date: '2024-02-01',
            dueDate: '2024-02-28',
            items: [
                { description: 'Identité visuelle complète', quantity: 1, unitPrice: 8000 },
                { description: 'Charte graphique', quantity: 1, unitPrice: 2500 },
                { description: 'Motion design logo', quantity: 1, unitPrice: 1500 },
            ],
        },
        {
            id: 'D-2024-002',
            contactId: '2',
            contactName: 'Thomas Dupont',
            company: 'StartupFlow',
            type: 'Devis',
            amount: 15000,
            status: 'En attente',
            date: '2024-02-20',
            dueDate: '2024-03-05',
            items: [
                { description: 'Développement MVP React', quantity: 1, unitPrice: 10000 },
                { description: 'API Backend Node.js', quantity: 1, unitPrice: 4000 },
                { description: 'Déploiement & CI/CD', quantity: 1, unitPrice: 1000 },
            ],
        },
        {
            id: 'F-2024-003',
            contactId: '1',
            contactName: 'Sophie Martin',
            company: 'Agence Pixel',
            type: 'Facture',
            amount: 4500,
            status: 'En retard',
            date: '2024-01-15',
            dueDate: '2024-02-15',
            items: [
                { description: 'Audit UX / Wireframes', quantity: 1, unitPrice: 3000 },
                { description: 'Maquettes Figma (10 écrans)', quantity: 1, unitPrice: 1500 },
            ],
        },
    ],
    tasks: [
        { id: 't1', text: 'Relancer Thomas Dupont pour décision sur devis', done: false, contactId: '2', priority: 'high', dueDate: '2024-02-28' },
        { id: 't2', text: 'Envoyer facture de relance à Agence Pixel', done: false, contactId: '1', priority: 'high', dueDate: '2024-02-26' },
        { id: 't3', text: 'Premier appel de découverte avec Lucas Bernard', done: false, contactId: '4', priority: 'medium', dueDate: '2024-03-01' },
        { id: 't4', text: 'Préparer proposition pour renouvellement BioNature', done: true, contactId: '3', priority: 'medium', dueDate: '2024-02-10' },
    ],
    projects: [],
    aiSettings: loadAISettings(),
    chatHistory: [],
    appearance: {
        theme: 'dark', // 'dark', 'light', 'midnight', 'high-contrast'
        font: 'inter', // 'inter', 'roboto', 'playfair', 'firacode'
    },
};

export function CRMProvider({ children }) {
    const [data, setData] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return {
                    ...defaultData,
                    ...parsed,
                    // Always load AI settings from the dedicated v2 key
                    aiSettings: loadAISettings(),
                };
            }
        } catch { /* ignore */ }
        return defaultData;
    });

    useEffect(() => {
        // Save CRM data (without aiSettings — those are stored separately)
        const { aiSettings: _ai, ...crmData } = data;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(crmData));
    }, [data]);

    useEffect(() => {
        // Apply theme and font to the document root element
        const root = document.documentElement;
        root.setAttribute('data-theme', data.appearance?.theme || 'dark');
        root.setAttribute('data-font', data.appearance?.font || 'inter');
    }, [data.appearance]);

    const updateContact = (id, updates) => {
        setData(prev => ({
            ...prev,
            contacts: prev.contacts.map(c => c.id === id ? { ...c, ...updates } : c),
        }));
    };

    const addContact = (contact) => {
        const newContact = {
            ...contact,
            id: Date.now().toString(),
            createdAt: new Date().toISOString().split('T')[0],
            lastContact: null,
            emails: [],
            todos: [],
        };
        setData(prev => ({ ...prev, contacts: [...prev.contacts, newContact] }));
        return newContact;
    };

    const deleteContact = (id) => {
        setData(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== id) }));
    };

    const moveContact = (id, stage) => {
        updateContact(id, { stage });
    };

    const addInvoice = (invoice) => {
        const newInvoice = {
            ...invoice,
            id: `${invoice.type === 'Devis' ? 'D' : 'F'}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
            date: new Date().toISOString().split('T')[0],
        };
        setData(prev => ({ ...prev, invoices: [...prev.invoices, newInvoice] }));
        return newInvoice;
    };

    const updateInvoice = (id, updates) => {
        setData(prev => ({
            ...prev,
            invoices: prev.invoices.map(inv => inv.id === id ? { ...inv, ...updates } : inv),
        }));
    };

    const deleteInvoice = (id) => {
        setData(prev => ({ ...prev, invoices: prev.invoices.filter(inv => inv.id !== id) }));
    };

    const addTask = (task) => {
        setData(prev => ({
            ...prev,
            tasks: [...prev.tasks, { ...task, id: 't' + Date.now(), done: false }],
        }));
    };

    const toggleTask = (id) => {
        setData(prev => ({
            ...prev,
            tasks: prev.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t),
        }));
    };

    const updateAISettings = (settings) => {
        const merged = { ...data.aiSettings, ...settings };
        saveAISettings(merged);
        setData(prev => ({ ...prev, aiSettings: merged }));
    };

    const addProject = (project) => {
        const p = { ...project, id: 'proj-' + Date.now(), tasks: project.tasks || [], createdAt: new Date().toISOString().split('T')[0] };
        setData(prev => ({ ...prev, projects: [...(prev.projects || []), p] }));
        return p;
    };

    const updateProject = (id, updates) => {
        setData(prev => ({
            ...prev,
            projects: (prev.projects || []).map(p => p.id === id ? { ...p, ...updates } : p),
        }));
    };

    const deleteProject = (id) => {
        setData(prev => ({ ...prev, projects: (prev.projects || []).filter(p => p.id !== id) }));
    };

    const addChatMessage = (message) => {
        setData(prev => ({
            ...prev,
            chatHistory: [...prev.chatHistory, { ...message, id: Date.now().toString(), timestamp: new Date().toISOString() }],
        }));
    };

    const updateAppearance = (updates) => {
        setData(prev => ({
            ...prev,
            appearance: { ...prev.appearance, ...updates }
        }));
    };

    const getCRMContext = () => {
        const { contacts, invoices, tasks } = data;
        return `
## Données CRM du Freelance

### Contacts & Pipeline (${contacts.length} contacts)
${contacts.map(c => `- **${c.name}** (${c.company}) | Stage: ${c.stage} | CA potentiel: ${c.revenue}€ | Dernière note: "${c.notes?.slice(0, 80)}"`).join('\n')}

### Factures & Devis
${invoices.map(inv => `- ${inv.id}: ${inv.type} ${inv.contactName} — ${inv.amount}€ — Statut: ${inv.status} — Échéance: ${inv.dueDate}`).join('\n')}

### Tâches en cours
${tasks.filter(t => !t.done).map(t => `- [PRIORITÉ: ${t.priority}] ${t.text} (échéance: ${t.dueDate})`).join('\n')}

### Résumé financier
- CA total facturé: ${invoices.filter(i => i.type === 'Facture').reduce((s, i) => s + i.amount, 0)}€
- Factures en retard: ${invoices.filter(i => i.status === 'En retard').reduce((s, i) => s + i.amount, 0)}€
- Devis en attente: ${invoices.filter(i => i.status === 'En attente').reduce((s, i) => s + i.amount, 0)}€
    `.trim();
    };

    const callAI = async (messages, systemPrompt = '') => {
        return callAIUtil(data.aiSettings, messages, systemPrompt);
    };

    return (
        <CRMContext.Provider value={{
            ...data,
            updateContact, addContact, deleteContact, moveContact,
            addInvoice, updateInvoice, deleteInvoice,
            addTask, toggleTask,
            addProject, updateProject, deleteProject,
            updateAISettings,
            addChatMessage,
            updateAppearance,
            getCRMContext,
            callAI,
        }}>
            {children}
        </CRMContext.Provider>
    );
}

export function useCRM() {
    const ctx = useContext(CRMContext);
    if (!ctx) throw new Error('useCRM must be used within CRMProvider');
    return ctx;
}
