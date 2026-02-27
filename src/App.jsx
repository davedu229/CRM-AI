import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CRMProvider } from './context/CRMContext';
import { LicenseProvider } from './context/LicenseContext';
import LicenseGuard from './components/LicenseGuard';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Pipeline from './pages/Pipeline';
import Invoices from './pages/Invoices';
import Chat from './pages/Chat';
import AIAssistant from './pages/AIAssistant';
import BriefToDevis from './pages/BriefToDevis';
import Fiscalite from './pages/Fiscalite';
import Transactions from './pages/Transactions';
import EmailSync from './pages/EmailSync';
import Insights from './pages/Insights';
import MRR from './pages/MRR';
import Dictaphone from './pages/Dictaphone';
import Settings from './pages/Settings';
import ClientPortal from './pages/ClientPortal';
import Projects from './pages/Projects';
import Unlock from './pages/Unlock';

export default function App() {
  return (
    <LicenseProvider>
      <CRMProvider>
        <HashRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/unlock" element={<Unlock />} />
            <Route path="/portal/:token" element={<ClientPortal />} />

            {/* Protected Routes */}
            <Route element={<LicenseGuard />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="contacts/:id" element={<ContactDetail />} />
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="chat" element={<Chat />} />
                <Route path="assistant" element={<AIAssistant />} />
                <Route path="brief-to-devis" element={<BriefToDevis />} />
                <Route path="fiscalite" element={<Fiscalite />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="email" element={<EmailSync />} />
                <Route path="insights" element={<Insights />} />
                <Route path="mrr" element={<MRR />} />
                <Route path="dictaphone" element={<Dictaphone />} />
                <Route path="settings" element={<Settings />} />
                <Route path="projects" element={<Projects />} />
              </Route>
            </Route>
          </Routes>
        </HashRouter>
      </CRMProvider>
    </LicenseProvider>
  );
}
