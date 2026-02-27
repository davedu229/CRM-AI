import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    LayoutDashboard, Users, KanbanSquare, FileText,
    MessageSquare, Sparkles, Settings, Zap, FileSearch,
    Mail, CreditCard, Calculator, BarChart2, RefreshCw, Mic,
    ChevronLeft, ChevronRight, Sun, Moon, Menu, X, FolderKanban
} from 'lucide-react';

const navItems = [
    {
        section: 'Principal', links: [
            { to: '/dashboard', icon: <LayoutDashboard />, label: 'Tableau de bord' },
            { to: '/contacts', icon: <Users />, label: 'Contacts' },
            { to: '/pipeline', icon: <KanbanSquare />, label: 'Pipeline' },
            { to: '/projects', icon: <FolderKanban />, label: 'Projets' },
            { to: '/invoices', icon: <FileText />, label: 'Devis & Factures' },
        ]
    },
    {
        section: 'Intelligence IA', links: [
            { to: '/chat', icon: <MessageSquare />, label: 'Chat CRM' },
            { to: '/assistant', icon: <Sparkles />, label: 'Assistant IA' },
            { to: '/dictaphone', icon: <Mic />, label: 'Dictaphone' },
            { to: '/brief-to-devis', icon: <FileSearch />, label: 'Brief → Devis' },
            { to: '/insights', icon: <BarChart2 />, label: 'Insights & Pricing' },
        ]
    },
    {
        section: 'Finances', links: [
            { to: '/email', icon: <Mail />, label: 'Emails' },
            { to: '/transactions', icon: <CreditCard />, label: 'Transactions' },
            { to: '/mrr', icon: <RefreshCw />, label: 'Revenus récurrents' },
            { to: '/fiscalite', icon: <Calculator />, label: 'Fiscalité' },
        ]
    },
    {
        section: 'Compte', links: [
            { to: '/settings', icon: <Settings />, label: 'Paramètres' },
        ]
    },
];

export default function Layout() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('theme') !== 'light';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            root.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    // Close sidebar when navigating on mobile
    const handleNavClick = () => {
        if (isMobileOpen) setIsMobileOpen(false);
    };

    const shellClass = [
        'app-shell',
        isCollapsed ? 'collapsed' : '',
        isMobileOpen ? 'mobile-open' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={shellClass}>
            {/* Mobile Header */}
            <header className="mobile-header">
                <button className="hamburger-btn" onClick={() => setIsMobileOpen(!isMobileOpen)}>
                    {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Zap size={16} color="white" />
                    </div>
                    <div className="sidebar-logo-text">CRM<span>AI</span></div>
                </div>
                <button className="theme-toggle" onClick={() => setIsDark(!isDark)} title={isDark ? 'Mode clair' : 'Mode sombre'}>
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                </button>
            </header>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />
            )}

            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">
                            <Zap size={18} color="white" />
                        </div>
                        <div className="sidebar-logo-text">CRM<span>AI</span></div>
                    </div>
                    <div className="sidebar-controls">
                        <button className="theme-toggle" onClick={() => setIsDark(!isDark)} title={isDark ? 'Mode clair' : 'Mode sombre'}>
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        <button className="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
                            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    </div>
                </div>

                <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    {navItems.map(section => (
                        <div key={section.section}>
                            <p className="nav-section-title">{section.section}</p>
                            {section.links.map(link => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                                    title={isCollapsed ? link.label : ''}
                                    onClick={handleNavClick}
                                >
                                    {link.icon}
                                    <span className="nav-label">{link.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">F</div>
                        <div className="sidebar-user-info">
                            <p>Freelance Pro</p>
                            <p>Plan Premium</p>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}


