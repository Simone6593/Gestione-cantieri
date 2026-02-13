
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/Shared';
import { Clock, MapPin, AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';
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
  const [promptState, setPromptState] = useState<'none' | 'confirm_standard' | 'ask_report' | 'force_report'>('none');

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

    // 1. Verifica se il rapportino esiste già per questo cantiere oggi
    const reportExists = reports.some(r => r.siteId === activeRecord.siteId && r.date === todayStr);

    if (reportExists) {
      setPromptState('confirm_standard');
      return;
    }

    // 2. Se non esiste, controlla quanti operai sono ancora in cantiere
    const workersStillIn = attendance.filter(a => 
      !a.endTime && a.siteId === activeRecord.siteId
    );

    if (workersStillIn.length > 1) {
      setPromptState('ask_report');
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
      <Card className="p-8 text-center bg-gradient-to-br from-white to-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Clock size={120} />
        </div>

        <div className="relative z-10">
          <div className="mb-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-inner ${activeRecord ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
              <Clock size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Ciao, {user.firstName}!</h2>
            <p className="text-slate-500 mt-1">
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
                  if (!currentCoords) { alert("Attendi il GPS..."); return; }
                  if (!assignedSiteId) { alert("Non assegnato a nessun cantiere oggi."); return; }
                  onClockIn(assignedSiteId, currentCoords);
                }}
                disabled={!assignedSiteId}
                className="w-full max-w-sm h-14 text-lg shadow-lg bg-blue-600 hover:bg-blue-700"
              >
                Inizio Lavori (Clock In)
              </Button>
            ) : (
              <Button 
                onClick={handleClockOutAttempt}
                className="w-full max-w-sm h-14 text-lg shadow-lg bg-amber-600 hover:bg-amber-700"
              >
                Fine Lavori (Clock Out)
              </Button>
            )}
            
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin size={14} className={currentCoords ? "text-green-500" : "text-slate-300"} />
              {currentCoords ? `GPS OK: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}` : "Rilevamento posizione..."}
            </div>
          </div>
        </div>
      </Card>

      {/* MODALI DI CONTROLLO CLOCK-OUT */}
      {promptState === 'confirm_standard' && (
        <Card className="p-6 border-blue-200 bg-blue-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex gap-4">
            <CheckCircle2 size={24} className="text-blue-600 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-blue-900">Conferma Fine Turno</h3>
              <p className="text-sm text-blue-800 mb-4">Il rapportino è già stato inviato per oggi. Vuoi registrare il clock-out?</p>
              <div className="flex gap-3">
                <Button onClick={executeClockOut}>Conferma</Button>
                <Button variant="secondary" onClick={() => setPromptState('none')}>Annulla</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {promptState === 'ask_report' && (
        <Card className="p-6 border-amber-200 bg-amber-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex gap-4">
            <HelpCircle size={24} className="text-amber-600 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-900">Rapportino non compilato</h3>
              <p className="text-sm text-amber-800 mb-4">Ci sono ancora colleghi in cantiere, ma il rapportino non è stato fatto. Vuoi compilarlo tu prima di andare?</p>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={onGoToReport} className="bg-amber-600">Sì, compila ora</Button>
                <Button variant="secondary" onClick={executeClockOut}>No, delega ai colleghi</Button>
                <Button variant="ghost" onClick={() => setPromptState('none')}>Annulla</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {promptState === 'force_report' && (
        <Card className="p-6 border-red-200 bg-red-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex gap-4">
            <AlertCircle size={24} className="text-red-600 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900">Ultimo operaio in cantiere</h3>
              <p className="text-sm text-red-800 mb-4">Sei l'ultimo a lasciare il cantiere. È obbligatorio compilare il rapportino per poter fare il clock-out.</p>
              <div className="flex gap-3">
                <Button onClick={onGoToReport} className="bg-red-600">Vai al Rapportino</Button>
                <Button variant="secondary" onClick={() => setPromptState('none')}>Indietro</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500" />
            Riepilogo Oggi
          </h3>
          <div className="space-y-4">
            {attendance.filter(a => a.userId === user.id && a.startTime.includes(todayStr)).map(record => (
              <div key={record.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0">
                <div>
                  <p className="font-semibold">{record.siteName}</p>
                  <p className="text-slate-500 text-xs">Inizio: {new Date(record.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${record.endTime ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'}`}>
                    {record.endTime ? 'Completato' : 'In corso'}
                  </span>
                  {record.endTime && (
                    <p className="text-slate-400 text-[10px] mt-1">
                      Fine: {new Date(record.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Attendance;
