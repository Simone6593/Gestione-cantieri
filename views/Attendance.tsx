
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/Shared';
import { Clock, MapPin, AlertCircle, CheckCircle2, HelpCircle, ChevronRight, X, ListTodo, History, Construction } from 'lucide-react';
import { AttendanceRecord, Site, User, DailySchedule, DailyReport } from '../types';

interface AttendanceProps {
  user: User;
  sites: Site[];
  attendance: AttendanceRecord[];
  schedules: Record<string, DailySchedule>;
  reports: DailyReport[];
  onClockIn: (siteId: string, coords: { lat: number, lng: number }) => void;
  onClockOut: (recordId: string, coords: { lat: number, lng: number }) => void;
  onGoToReport: () => void;
}

const getLocalDateString = (dateInput?: string | Date) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Attendance: React.FC<AttendanceProps> = ({ 
  user, 
  sites, 
  attendance, 
  schedules, 
  reports,
  onClockIn, 
  onClockOut, 
  onGoToReport 
}) => {
  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [promptState, setPromptState] = useState<'none' | 'confirm_simple' | 'ask_delegate' | 'force_report'>('none');

  const todayStr = getLocalDateString();
  
  // Trova TUTTI i cantieri assegnati all'utente per oggi
  const assignedSiteIds = useMemo(() => {
    const todaySchedule = schedules[todayStr];
    if (!todaySchedule) return [];
    const siteIds: string[] = [];
    for (const [siteId, workerIds] of Object.entries(todaySchedule.siteAssignments)) {
      if ((workerIds as string[]).includes(user.id)) siteIds.push(siteId);
    }
    return siteIds;
  }, [schedules, todayStr, user.id]);

  // Timbratura attiva (se presente)
  const activeRecord = attendance.find(a => a.userId === user.id && !a.endTime);

  // Lista dei lavori completati oggi (con rapportino o chiusi)
  const completedToday = useMemo(() => {
    return attendance
      .filter(a => a.userId === user.id && a.endTime && a.startTime.includes(todayStr))
      .map(a => a.siteId);
  }, [attendance, user.id, todayStr]);

  // Prossimo cantiere da timbrare
  const nextSiteId = useMemo(() => {
    if (activeRecord) return activeRecord.siteId;
    return assignedSiteIds.find(id => !completedToday.includes(id)) || '';
  }, [assignedSiteIds, completedToday, activeRecord]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation error", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleClockOutAttempt = () => {
    if (!activeRecord || !currentCoords) return;

    const shiftDate = getLocalDateString(activeRecord.startTime);
    const reportExists = reports.some(r => r.siteId === activeRecord.siteId && r.date === shiftDate && r.compilerId === user.id);
    
    if (reportExists) {
      setPromptState('confirm_simple');
      return;
    }

    const otherWorkersStillIn = attendance.filter(a => !a.endTime && a.siteId === activeRecord.siteId && a.userId !== user.id);

    if (otherWorkersStillIn.length > 0) {
      setPromptState('ask_delegate');
    } else {
      setPromptState('force_report');
    }
  };

  const executeClockOut = () => {
    if (activeRecord && currentCoords) {
      onClockOut(activeRecord.id, currentCoords);
      setPromptState('none');
    }
  };

  const nextSite = sites.find(s => s.id === nextSiteId);

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-10">
      <Card className="p-8 text-center bg-white relative overflow-hidden shadow-xl border-slate-200">
        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Clock size={140} /></div>
        <div className="relative z-10">
          <div className="mb-6">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-lg transition-transform hover:scale-105 ${activeRecord ? 'bg-amber-100 text-amber-600' : 'bg-blue-600 text-white'}`}>
              <Clock size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Buongiorno, {user.firstName}!</h2>
            <p className="text-slate-500 mt-2 font-medium text-sm">
              {activeRecord 
                ? `In servizio presso: ${activeRecord.siteName}` 
                : nextSite 
                  ? `Prossimo cantiere: ${nextSite.client}`
                  : "Nessuna attività programmata."}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            {!activeRecord ? (
              <Button 
                onClick={() => {
                  if (!currentCoords) { alert("Attendi il segnale GPS..."); return; }
                  if (!nextSiteId) { alert("Non hai altri cantieri assegnati oggi."); return; }
                  onClockIn(nextSiteId, currentCoords);
                }}
                disabled={!nextSiteId || !currentCoords}
                className="w-full h-16 text-xl shadow-xl shadow-blue-500/20 active:scale-[0.98]"
              >
                Inizia Turno
              </Button>
            ) : (
              <Button 
                onClick={handleClockOutAttempt}
                className="w-full h-16 text-xl shadow-xl shadow-amber-500/20 bg-amber-600 active:scale-[0.98]"
              >
                Termina Turno
              </Button>
            )}
            
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <MapPin size={12} className={currentCoords ? "text-green-500" : "text-slate-300"} />
              {currentCoords ? `GPS ATTIVO` : "Ricerca posizione..."}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabella di marcia giornaliera (Cantiere Multiplo) */}
      <Card className="p-5 shadow-sm border-slate-200">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <ListTodo size={14} className="text-blue-500" /> Tabella di Marcia Odierna
        </h3>
        <div className="space-y-3">
          {assignedSiteIds.map((id, index) => {
            const site = sites.find(s => s.id === id);
            const isCompleted = completedToday.includes(id);
            const isActive = activeRecord?.siteId === id;
            const isPending = !isCompleted && !isActive;

            return (
              <div key={id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : isCompleted ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isCompleted ? 'bg-green-100 text-green-600' : isActive ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                  {isCompleted ? <CheckCircle2 size={16} /> : index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-sm truncate">{site?.client}</div>
                  <div className="text-[10px] text-slate-400 font-medium truncate uppercase">{site?.address}</div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-tighter">
                  {isCompleted ? <span className="text-green-600">Fatto</span> : isActive ? <span className="text-blue-600">In corso</span> : <span className="text-slate-400">In attesa</span>}
                </div>
              </div>
            );
          })}
          {assignedSiteIds.length === 0 && (
            <div className="py-6 text-center text-slate-400 italic text-sm">Nessuna assegnazione per oggi.</div>
          )}
        </div>
      </Card>

      {/* Modali di Chiusura Turno */}
      {promptState !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm p-6 relative animate-in zoom-in duration-300 overflow-visible shadow-2xl">
            <button onClick={() => setPromptState('none')} className="absolute -top-2 -right-2 bg-white text-slate-400 p-1.5 rounded-full shadow-lg border hover:text-slate-600">
              <X size={20} />
            </button>

            {promptState === 'confirm_simple' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
                <h3 className="text-xl font-bold text-slate-800">Confermi la chiusura?</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">Il rapporto per questo cantiere è già stato inviato correttamente.</p>
                <div className="space-y-2">
                  <Button onClick={executeClockOut} className="w-full h-12">Si, Timbra Uscita</Button>
                  <Button variant="ghost" onClick={() => setPromptState('none')} className="w-full">Annulla</Button>
                </div>
              </div>
            )}

            {promptState === 'ask_delegate' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><HelpCircle size={32} /></div>
                <h3 className="text-xl font-bold text-slate-800">Rapporto Mancante</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">Nessuno ha inviato il rapporto per questo cantiere. Lo compili tu o deleghi ai colleghi che restano?</p>
                <div className="space-y-3">
                  <Button onClick={onGoToReport} className="w-full h-12 bg-amber-600">Lo compilo ora</Button>
                  <Button variant="secondary" onClick={executeClockOut} className="w-full h-12">Delego ed Esco</Button>
                </div>
              </div>
            )}

            {promptState === 'force_report' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} /></div>
                <h3 className="text-xl font-bold text-slate-800">Azione Richiesta</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">Sei l'ultimo a lasciare il cantiere. Devi inviare il rapportino per chiudere il turno.</p>
                <div className="space-y-2">
                  <Button onClick={onGoToReport} className="w-full h-12 bg-red-600">Vai al Rapportino <ChevronRight size={18} /></Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Attendance;
