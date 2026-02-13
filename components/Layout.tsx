
import React, { useState } from 'react';
import { UserRole, Company } from '../types';
import { 
  Users, Construction, Archive, Clock, ClipboardCheck, CalendarDays, LogOut, Menu, X, User as UserIcon, ListFilter, HelpCircle, Info, Settings, FileText
} from 'lucide-react';
import { Card, Button } from './Shared';

interface LayoutProps {
  user: any;
  company: Company;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, company, onLogout, children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Protezione contro user null o indefinito
  if (!user || !user.role) return null;

  const navItems = [
    { id: 'attendance', label: 'Timbratura', icon: Clock, roles: [UserRole.WORKER] },
    { id: 'daily-report', label: 'Rapportino', icon: ClipboardCheck, roles: [UserRole.WORKER, UserRole.SUPERVISOR] }, 
    { id: 'attendance-log', label: 'Registro Timbrature', icon: ListFilter, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { id: 'worker-pay-slips', label: 'Le mie Buste Paga', icon: FileText, roles: [UserRole.WORKER] },
    { id: 'admin-pay-slips', label: 'Gestione Buste Paga', icon: FileText, roles: [UserRole.ADMIN] },
    { id: 'resources', label: 'Gestione Dipendenti', icon: Users, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { id: 'active-sites', label: 'Cantieri Attivi', icon: Construction, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { id: 'completed-sites', label: 'Cantieri Conclusi', icon: Archive, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { id: 'archived-reports', label: 'Archivio Rapportini', icon: Archive, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { id: 'schedule', label: 'Programma', icon: CalendarDays, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.WORKER] },
    { id: 'options', label: 'Opzioni', icon: Settings, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.WORKER] },
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(user.role));

  const getGuide = () => {
    const guides: Record<string, {title: string, steps: string[]}> = {
      attendance: { title: "Timbratura GPS", steps: ["Clicca 'Inizio' per timbrare l'entrata.", "Assicurati di avere il GPS attivo.", "Al termine, clicca 'Fine' e segui le istruzioni per il rapportino."] },
      'daily-report': { title: "Compilazione Rapportino", steps: ["Seleziona i colleghi presenti con te.", "Descrivi le lavorazioni principali.", "Scatta almeno una foto del lavoro svolto.", "Invia per chiudere la giornata."] },
      schedule: { title: "Programma Lavori", steps: ["Trascina i nomi dai disponibili ai cantieri.", "Invia il riepilogo al gruppo WhatsApp aziendale."] },
    };
    return guides[activeTab] || { title: "Navigazione", steps: ["Usa il menu a sinistra per cambiare sezione.", "Contatta l'admin per permessi aggiuntivi."] };
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-white transform transition-transform z-50 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          {company.logoUrl ? <img src={company.logoUrl} className="w-10 h-10 object-contain bg-white rounded p-1" /> : <div className="w-10 h-10 bg-[var(--primary-color)] rounded-lg flex items-center justify-center font-bold uppercase">{company.name[0]}</div>}
          <span className="font-bold truncate">{company.name}</span>
        </div>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {visibleItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-[var(--primary-color)] text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <item.icon size={20} /> <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-4 text-center">
           <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-95"><LogOut size={20} /> Logout</button>
           <p className="text-[9px] font-bold text-slate-600 tracking-widest uppercase mt-2">powered by Simone Barni</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30">
          <button className="lg:hidden text-slate-600" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          <h1 className="text-lg font-bold text-slate-800">{navItems.find(i => i.id === activeTab)?.label}</h1>
          <button onClick={() => setIsGuideOpen(true)} className="p-2 text-slate-400 hover:text-[var(--primary-color)]"><HelpCircle size={24} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto min-h-full">
            {children}
          </div>
        </div>

        {isGuideOpen && (
          <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-6 backdrop-blur-sm">
            <Card className="w-full max-w-sm p-6 relative animate-in zoom-in duration-200">
              <button onClick={() => setIsGuideOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
              <div className="flex items-center gap-3 mb-4 text-blue-600"><Info /> <h3 className="font-bold text-xl">{getGuide().title}</h3></div>
              <ul className="space-y-3">{getGuide().steps.map((s, i) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="font-bold text-blue-600">{i+1}.</span> {s}</li>)}</ul>
              <Button onClick={() => setIsGuideOpen(false)} className="w-full mt-6">Ho Capito</Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Layout;
