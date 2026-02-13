
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/Shared';
import { Clock, MapPin, AlertCircle, CheckCircle2, Info } from 'lucide-react';
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
  const [showReportPrompt, setShowReportPrompt] = useState(false);
  const [blockingMessage, setBlockingMessage] = useState<string | null>(null);

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
        (err) => console.error("Geolocation error", err)
      );
    }
  }, []);

  const handleAction = () => {
    if (!currentCoords) {
      alert("Attendi che il GPS rilevi la posizione prima di timbrare.");
      return;
    }

    if (activeRecord) {
      // CLOCK OUT WITH CONFIRMATION
      if (!confirm("Sei sicuro di voler terminare il turno di lavoro ora?")) {
        return;
      }

      const reportExists = reports.some(r => r.siteId === activeRecord.siteId && r.date === todayStr);
      
      if (reportExists) {
        onClockOut(activeRecord.id, currentCoords);
        return;
      }

      const todaySchedule = schedules[todayStr];
      const assignedWorkerIds = (todaySchedule?.siteAssignments[activeRecord.siteId] || []) as string[];
      
      const workersStillClockedIn = attendance.filter(a => 
        !a.endTime && 
        a.siteId === activeRecord.siteId && 
        assignedWorkerIds.includes(a.userId)
      );

      const isLastWorker = workersStillClockedIn.length <= 1;

      if (isLastWorker) {
        setBlockingMessage("Sei l'ultimo operaio presente. È obbligatorio compilare il rapportino giornaliero prima di timbrare la fine.");
      } else {
        onClockOut(activeRecord.id, currentCoords);
        if (user.role === UserRole.WORKER) {
          setShowReportPrompt(true);
        }
      }
    } else {
      // CLOCK IN
      if (!assignedSiteId) {
        alert("Non risulti assegnato ad alcun cantiere per oggi nel programma giornaliero. Contatta il supervisore.");
        return;
      }
      onClockIn(assignedSiteId, currentCoords);
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

          {!activeRecord && assignedSite && (
            <div className="max-w-xs mx-auto mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3 text-left">
              <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Programma del Giorno</p>
                <p className="text-sm font-semibold text-slate-700">{assignedSite.client}</p>
                <p className="text-xs text-slate-500">{assignedSite.address}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <Button 
              onClick={handleAction}
              disabled={!assignedSiteId && !activeRecord}
              className={`w-full max-w-sm h-14 text-lg shadow-lg active:scale-95 transition-all ${activeRecord ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {activeRecord ? "Fine Lavori (Clock Out)" : "Inizio Lavori (Clock In)"}
            </Button>
            
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin size={14} />
              {currentCoords ? `GPS OK: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}` : "Rilevamento posizione..."}
            </div>
          </div>
        </div>
      </Card>

      {blockingMessage && (
        <Card className="p-6 border-red-200 bg-red-50 animate-in fade-in slide-in-from-top-4">
          <div className="flex gap-4">
            <div className="text-red-600 shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900">Azione Richiesta</h3>
              <p className="text-red-800 mb-4">{blockingMessage}</p>
              <div className="flex gap-3">
                <Button onClick={onGoToReport} className="bg-red-600 hover:bg-red-700">Compila Rapportino</Button>
                <Button onClick={() => setBlockingMessage(null)} variant="secondary">Annulla</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {showReportPrompt && !blockingMessage && (
        <Card className="p-6 border-amber-200 bg-amber-50 animate-in fade-in slide-in-from-top-4">
          <div className="flex gap-4">
            <div className="text-amber-600 shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900">Rapportino Mancante</h3>
              <p className="text-amber-800 mb-4">Hai timbrato la fine, ma nessun collega ha ancora inviato il rapportino. Vuoi scriverlo tu adesso?</p>
              <div className="flex gap-3">
                <Button onClick={onGoToReport} className="bg-amber-600 hover:bg-amber-700">Scrivi Rapportino</Button>
                <Button onClick={() => setShowReportPrompt(false)} variant="secondary">No, lo farà un collega</Button>
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
            {attendance.filter(a => a.userId === user.id && a.startTime.includes(todayStr)).length === 0 && (
              <p className="text-slate-400 text-xs italic text-center py-4">Nessun movimento registrato oggi.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="text-center pb-8 opacity-40">
        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">powered by Simone Barni</p>
      </div>
    </div>
  );
};

export default Attendance;
