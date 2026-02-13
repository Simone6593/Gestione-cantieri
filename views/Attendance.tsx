
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/Shared';
import { Clock, MapPin, AlertCircle, CheckCircle2, HelpCircle, ChevronRight, X } from 'lucide-react';
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

    // Controllo basato sulla data di INIZIO del turno
    const shiftDate = getLocalDateString(activeRecord.startTime);
    const reportExists = reports.some(r => r.siteId === activeRecord.siteId && r.date === shiftDate);
    
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
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-inner ${activeRecord ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
              <Clock size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Ciao, {user.firstName}!</h2>
            <p className="text-slate-500 mt-1 font-medium">
              {activeRecord 
                ? `Operativo presso: ${activeRecord.siteName}` 
                : assignedSite 
                  ? `Oggi sei assegnato a: ${assignedSite.client}`
                  : "Nessuna assegnazione trovata per oggi."}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            {!activeRecord ? (
              <Button 
                onClick={() => {
                  if (!currentCoords) { alert("Attendi il segnale GPS..."); return; }
                  if (!assignedSiteId) { alert("Non hai cantieri assegnati oggi."); return; }
                  onClockIn(assignedSiteId, currentCoords);
                }}
                disabled={!assignedSiteId}
                className="w-full max-w-sm h-14 text-lg shadow-lg"
              >
                Inizio Lavori
              </Button>
            ) : (
              <Button 
                onClick={handleClockOutAttempt}
                className="w-full max-w-sm h-14 text-lg shadow-lg bg-amber-600"
              >
                Fine Lavori
              </Button>
            )}
            
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <MapPin size={14} className={currentCoords ? "text-green-500" : "text-slate-300"} />
              {currentCoords ? `GPS ATTIVO` : "Rilevamento posizione..."}
            </div>
          </div>
        </div>
      </Card>

      {promptState !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 relative animate-in zoom-in duration-300 overflow-visible">
            <button onClick={() => setPromptState('none')} className="absolute -top-2 -right-2 bg-white text-slate-400 p-1.5 rounded-full shadow-lg border hover:text-slate-600">
              <X size={20} />
            </button>

            {promptState === 'confirm_simple' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Confermi l'uscita?</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">
                  Il rapportino giornaliero per questo cantiere è già stato inviato correttamente.
                </p>
                <div className="space-y-2">
                  <Button onClick={executeClockOut} className="w-full h-12">Si, Timbra Uscita</Button>
                  <Button variant="ghost" onClick={() => setPromptState('none')} className="w-full">Annulla</Button>
                </div>
              </div>
            )}

            {promptState === 'ask_delegate' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HelpCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Rapportino Mancante</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">
                  Nessuno ha ancora inviato il rapporto di oggi. Vuoi compilarlo tu o lo lasci fare ai colleghi che restano?
                </p>
                <div className="space-y-3">
                  <Button onClick={onGoToReport} className="w-full h-12 bg-amber-600">Sì, lo compilo ora</Button>
                  <Button variant="secondary" onClick={executeClockOut} className="w-full h-12">Delego ai colleghi ed Esco</Button>
                </div>
              </div>
            )}

            {promptState === 'force_report' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Azione Obbligatoria</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">
                  Sei l'ultimo a lasciare il cantiere oggi. Devi obbligatoriamente inviare il rapportino prima di poter timbrare l'uscita.
                </p>
                <div className="space-y-2">
                  <Button onClick={onGoToReport} className="w-full h-12 bg-red-600">
                    Vai al Rapportino <ChevronRight size={18} />
                  </Button>
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
