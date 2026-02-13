
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/Shared';
import { Clock, MapPin, AlertCircle, CheckCircle2, Info, HelpCircle, ChevronRight } from 'lucide-react';
import { AttendanceRecord, Site, UserRole, User, DailySchedule, DailyReport } from '../types';

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

  const todayStr = new Date().toISOString().split('T')[0];
  
  const assignedSiteId = useMemo(() => {
    const todaySchedule = schedules[todayStr];
    if (!todaySchedule) return '';
    for (const [siteId, workerIds] of Object.entries(todaySchedule.siteAssignments)) {
      if ((workerIds as string[]).includes(user.id)) return siteId;
    }
    return '';
  }, [schedules, todayStr, user.id]);

  const activeRecord = attendance.find(a => a.userId === user.id && !a.endTime);

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

    const reportExists = reports.some(r => r.siteId === activeRecord.siteId && r.date === todayStr);
    if (reportExists) {
      setPromptState('confirm_simple');
      return;
    }

    const workersStillIn = attendance.filter(a => !a.endTime && a.siteId === activeRecord.siteId);
    if (workersStillIn.length > 1) {
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

  const assignedSite = sites.find(s => s.id === assignedSiteId);

  return (
    <div className="space-y-6">
      <Card className="p-8 text-center bg-gradient-to-br from-white to-slate-50 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={120} /></div>
        <div className="relative z-10">
          <div className="mb-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-inner ${activeRecord ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}><Clock size={40} /></div>
            <h2 className="text-2xl font-bold text-slate-800">Ciao, {user.firstName}!</h2>
            <p className="text-slate-500 mt-1 font-medium">{activeRecord ? `Operativo presso: ${activeRecord.siteName}` : assignedSite ? `Oggi sei assegnato a: ${assignedSite.client}` : "Nessuna assegnazione trovata per oggi."}</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            {!activeRecord ? (
              <Button onClick={() => { if (!currentCoords) { alert("Attendi il segnale GPS..."); return; } if (!assignedSiteId) { alert("Non hai cantieri assegnati oggi."); return; } onClockIn(assignedSiteId, currentCoords); }} disabled={!assignedSiteId} className="w-full max-w-sm h-14 text-lg shadow-lg bg-blue-600">Inizio Lavori</Button>
            ) : (
              <Button onClick={handleClockOutAttempt} className="w-full max-w-sm h-14 text-lg shadow-lg bg-amber-600">Fine Lavori</Button>
            )}
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><MapPin size={14} className={currentCoords ? "text-green-500" : "text-slate-300"} />{currentCoords ? `GPS ATTIVO: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}` : "Rilevamento posizione..."}</div>
          </div>
        </div>
      </Card>

      {promptState === 'confirm_simple' && (
        <Card className="p-6 border-l-4 border-blue-500 bg-blue-50 animate-in slide-in-from-top-4 shadow-md">
          <div className="flex gap-4"><CheckCircle2 size={32} className="text-blue-600 shrink-0" /><div><h3 className="font-bold text-blue-900">Chiudi il turno?</h3><p className="text-sm text-blue-800 mb-4">Il rapportino di oggi è già stato inviato da un tuo collega.</p><div className="flex gap-2"><Button onClick={executeClockOut}>Conferma Uscita</Button><Button variant="ghost" onClick={() => setPromptState('none')}>Annulla</Button></div></div></div>
        </Card>
      )}

      {promptState === 'ask_delegate' && (
        <Card className="p-6 border-l-4 border-amber-500 bg-amber-50 animate-in slide-in-from-top-4 shadow-md">
          <div className="flex gap-4"><HelpCircle size={32} className="text-amber-600 shrink-0" /><div><h3 className="font-bold text-amber-900">Rapportino mancante</h3><p className="text-sm text-amber-800 mb-4">Nessuno ha ancora inviato il rapporto di oggi. Vuoi compilarlo tu prima di andare via?</p><div className="flex flex-wrap gap-2"><Button onClick={onGoToReport} className="bg-amber-600">Sì, lo faccio ora</Button><Button variant="secondary" onClick={executeClockOut}>No, delego a chi resta</Button><Button variant="ghost" onClick={() => setPromptState('none')}>Annulla</Button></div></div></div>
        </Card>
      )}

      {promptState === 'force_report' && (
        <Card className="p-6 border-l-4 border-red-500 bg-red-50 animate-in slide-in-from-top-4 shadow-md">
          <div className="flex gap-4"><AlertCircle size={32} className="text-red-600 shrink-0" /><div><h3 className="font-bold text-red-900">Azione Obbligatoria</h3><p className="text-sm text-red-800 mb-4">Sei l'ultimo a lasciare il cantiere. Devi obbligatoriamente compilare il rapportino giornaliero prima di poter timbrare l'uscita.</p><div className="flex gap-2"><Button onClick={onGoToReport} className="bg-red-600">Vai al Rapportino <ChevronRight size={16}/></Button><Button variant="ghost" onClick={() => setPromptState('none')}>Annulla</Button></div></div></div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-[10px] tracking-widest text-slate-400"><Clock size={16} /> Movimenti Odierni</h3>
          <div className="space-y-3">
            {attendance.filter(a => a.userId === user.id && a.startTime.includes(todayStr)).map(record => (
              <div key={record.id} className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div><p className="font-bold text-slate-700">{record.siteName}</p><p className="text-[10px] text-slate-500">INGRESSO: {new Date(record.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                <div className="text-right"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${record.endTime ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'}`}>{record.endTime ? 'Chiuso' : 'In Corso'}</span>{record.endTime && <p className="text-slate-400 text-[9px] mt-1 font-bold">USCITA: {new Date(record.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Attendance;
