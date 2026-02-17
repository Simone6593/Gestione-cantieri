
import React, { useState, useMemo } from 'react';
import { UserRole, Company } from '../types';
import { 
  Users, Construction, Archive, Clock, CalendarDays, LogOut, Menu, X, HelpCircle, Info, Settings, FileText, ShoppingCart, Bell, MessageSquare, CheckCircle2, ChevronRight, Check, Trash2, CheckCheck
} from 'lucide-react';
import { Card, Button } from './Shared';

interface LayoutProps {
  user: any;
  company: Company;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications?: any[];
  onMarkNotifRead?: (id: string) => void;
  onDeleteNotif?: (id: string) => void;
  onMarkAllNotifRead?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  user, 
  company, 
  onLogout, 
  children, 
  activeTab, 
  setActiveTab, 
  notifications = [],
  onMarkNotifRead,
  onDeleteNotif,
  onMarkAllNotifRead
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  if (!user || !user.role) return null;

  const isAdminOrSupervisor = user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  // Fix: Declare ListFilter and its dependencies before they are referenced in navItems
  const ListFilterIcon = ({ size }: { size: number }) => <Archive size={size} />;
  const ListFilter = ({ size }: { size: number }) => <ListFilterIcon size={size} />;

  const navItems = [
    { id: 'attendance', label: 'Timbratura', icon: Clock, roles: [UserRole.WORKER] },
    { id: 'attendance-log', label: 'Registro Timbrature', icon: ListFilter, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { id: 'material-costs', label: 'Costi Materiali', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
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
      attendance: { title: "Timbratura GPS", steps: ["Scegli un cantiere dalla lista o dalla mappa.", "Clicca 'Inizia Turno' per timbrare.", "Al termine, compila il rapporto se sei l'ultimo a lasciare il cantiere."] },
      'material-costs': { title: "Costi Materiali", steps: ["Inserisci i dati della fattura.", "Puoi dividere la spesa tra più cantieri.", "Esporta in CSV per la contabilità."] },
      schedule: { title: "Programma Lavori", steps: ["Visualizza le assegnazioni giornaliere.", "Usa il Drag & Drop per spostare il personale."] },
    };
    return guides[activeTab] || { title: "Navigazione", steps: ["Usa il menu laterale per navigare.", "Le notifiche in alto ti avvisano di nuovi eventi."] };
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-white transform transition-transform z-50 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          {company.logoUrl ? (
            <img src={company.logoUrl} className="w-10 h-10 object-contain bg-white rounded p-1" />
          ) : (
            <div className="w-10 h-10 bg-[var(--primary-color)] rounded-lg flex items-center justify-center font-bold uppercase shrink-0">
              {company.name[0]}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold truncate text-sm leading-tight">{company.name}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Azienda</span>
          </div>
        </div>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {visibleItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-[var(--primary-color)] text-white shadow-md shadow-blue-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <item.icon size={20} /> <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-4 text-center">
           <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-95 group">
             <LogOut size={20} className="group-hover:translate-x-1 transition-transform" /> 
             <span className="font-medium">Logout</span>
           </button>
           <p className="text-[9px] font-bold text-slate-600 tracking-widest uppercase mt-2">powered by Simone Barni</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-600" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
              {activeTab === 'daily-report' ? 'Compilazione Rapporto' : (navItems.find(i => i.id === activeTab)?.label || 'Dettaglio')}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {isAdminOrSupervisor && (
              <div className="relative">
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)} 
                  className={`p-2 rounded-full transition-all relative ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-red-500 border-2 border-white rounded-full text-[8px] flex items-center justify-center text-white font-black">{unreadCount}</span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[60]">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">Notifiche Recenti</span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && onMarkAllNotifRead && (
                          <button 
                            onClick={onMarkAllNotifRead}
                            className="text-[9px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase tracking-widest bg-blue-100 px-2 py-1 rounded"
                            title="Segna tutte come lette"
                          >
                            <CheckCheck size={12} /> Letti Tutti
                          </button>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full uppercase">{notifications.length} Tot</span>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-4 border-b border-slate-50 transition-all flex gap-3 relative group ${n.isRead ? 'opacity-60 grayscale-[0.3]' : 'bg-blue-50/30'}`}
                          >
                            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                              n.type === 'attendance' ? 'bg-blue-100 text-blue-600' : 
                              n.type === 'report' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              {n.type === 'attendance' ? <Clock size={16}/> : n.type === 'report' ? <MessageSquare size={16}/> : <ShoppingCart size={16}/>}
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                              <p className="text-xs font-bold text-slate-800 leading-tight">{n.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[9px] text-slate-400 mt-1 font-medium">{n.time}</p>
                            </div>
                            
                            <div className="absolute top-4 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!n.isRead && onMarkNotifRead && (
                                <button 
                                  onClick={() => onMarkNotifRead(n.id)}
                                  className="p-1 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700"
                                  title="Segna come letta"
                                >
                                  <Check size={10} />
                                </button>
                              )}
                              {onDeleteNotif && (
                                <button 
                                  onClick={() => onDeleteNotif(n.id)}
                                  className="p-1 bg-slate-100 text-slate-400 rounded shadow-sm hover:text-red-600 hover:bg-red-50"
                                  title="Cestina"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center text-slate-400">
                          <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                          <p className="text-xs font-medium">Tutto sotto controllo!</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-center border-t border-slate-100 bg-slate-50">
                      <button onClick={() => setIsNotifOpen(false)} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600">Chiudi</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setIsGuideOpen(true)} className="p-2 text-slate-400 hover:text-[var(--primary-color)] transition-colors"><HelpCircle size={22} /></button>
          </div>
        </header>

        {/* Global Activity Ticker per Admin/Supervisori */}
        {isAdminOrSupervisor && notifications.filter(n => !n.isRead).length > 0 && (
          <div className="bg-slate-900 text-white px-6 py-2 overflow-hidden shrink-0 border-b border-white/5 relative group">
            <div className="flex items-center gap-4 animate-in slide-in-from-right duration-1000">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 shrink-0 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                Live Status
              </span>
              <div className="flex gap-6 items-center flex-1 overflow-x-auto no-scrollbar">
                {notifications.filter(n => !n.isRead).slice(0, 3).map((n) => (
                  <div key={n.id} className="flex items-center gap-2 whitespace-nowrap">
                    <div className={`w-1 h-1 rounded-full ${n.type === 'report' ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <span className="text-[10px] font-bold opacity-90">{n.title}:</span>
                    <span className="text-[10px] opacity-60 italic">{n.message}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setIsNotifOpen(true)} className="text-[9px] font-black text-white/40 hover:text-white uppercase tracking-widest flex items-center gap-1 shrink-0">
                Tutte <ChevronRight size={10} />
              </button>
            </div>
          </div>
        )}

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
