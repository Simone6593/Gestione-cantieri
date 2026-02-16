
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button } from '../components/Shared';
import { Clock, MapPin, AlertCircle, CheckCircle2, HelpCircle, ChevronRight, X, ListTodo, Navigation, Map as MapIcon, Loader2 } from 'lucide-react';
import { AttendanceRecord, Site, User, DailySchedule, DailyReport } from '../types';
import maplibregl from 'maplibre-gl';

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

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
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [promptState, setPromptState] = useState<'none' | 'confirm_simple' | 'ask_delegate' | 'force_report'>('none');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  const todayStr = getLocalDateString();
  
  const assignedSiteIds = useMemo(() => {
    const todaySchedule = schedules[todayStr];
    if (!todaySchedule) return [];
    const siteIds: string[] = [];
    for (const [siteId, workerIds] of Object.entries(todaySchedule.siteAssignments)) {
      if ((workerIds as string[]).includes(user.id)) siteIds.push(siteId);
    }
    return siteIds;
  }, [schedules, todayStr, user.id]);

  const activeRecord = attendance.find(a => a.userId === user.id && !a.endTime);

  const completedToday = useMemo(() => {
    return attendance
      .filter(a => a.userId === user.id && a.endTime && a.startTime.includes(todayStr))
      .map(a => a.siteId);
  }, [attendance, user.id, todayStr]);

  const nextSiteId = selectedSiteId || assignedSiteIds.find(id => !completedToday.includes(id)) || '';

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentCoords(coords);
        },
        (err) => console.error("Geolocation error", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && assignedSiteIds.length > 0) {
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: [12.5674, 41.8719],
        zoom: 12,
        antialias: true
      });
      mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    }

    if (mapRef.current) {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const bounds = new maplibregl.LngLatBounds();
      let hasPoints = false;

      assignedSiteIds.forEach((id, index) => {
        const site = sites.find(s => s.id === id);
        if (site?.coords) {
          hasPoints = true;
          const isCompleted = completedToday.includes(id);
          const isActive = activeRecord?.siteId === id;
          
          const el = document.createElement('div');
          el.className = `w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-bold text-xs text-white transition-all cursor-pointer z-10 ${
            isActive ? 'bg-blue-600 scale-125 animate-pulse' : isCompleted ? 'bg-green-500' : 'bg-slate-400'
          }`;
          el.innerText = (index + 1).toString();
          el.onclick = () => !isActive && !isCompleted && setSelectedSiteId(id);

          const marker = new maplibregl.Marker(el)
            .setLngLat([site.coords.longitude, site.coords.latitude])
            .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<b>${site.client}</b>`))
            .addTo(mapRef.current!);
          
          markersRef.current.push(marker);
          bounds.extend([site.coords.longitude, site.coords.latitude]);
        }
      });

      if (currentCoords) {
        hasPoints = true;
        if (userMarkerRef.current) userMarkerRef.current.remove();

        const userMarkerContainer = document.createElement('div');
        userMarkerContainer.className = 'relative flex flex-col items-center';
        
        // Etichetta "Io sono qui"
        const label = document.createElement('div');
        label.className = 'absolute -top-8 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap animate-bounce';
        label.innerText = 'Io sono qui';
        userMarkerContainer.appendChild(label);

        // Freccia di navigazione con pulsazione
        const arrowEl = document.createElement('div');
        arrowEl.className = 'relative w-6 h-6 flex items-center justify-center';
        arrowEl.innerHTML = `
          <div class="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
          <div class="relative z-20 text-blue-600">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" class="drop-shadow-md">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
        `;
        userMarkerContainer.appendChild(arrowEl);

        userMarkerRef.current = new maplibregl.Marker(userMarkerContainer)
          .setLngLat([currentCoords.lng, currentCoords.lat])
          .addTo(mapRef.current!);
        
        bounds.extend([currentCoords.lng, currentCoords.lat]);
      }

      if (hasPoints) {
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      }
    }
  }, [assignedSiteIds, sites, completedToday, activeRecord, currentCoords]);

  const handleClockOutAttempt = () => {
    if (!activeRecord || !currentCoords) return;
    const shiftDate = getLocalDateString(activeRecord.startTime);
    const reportExists = reports.some(r => r.siteId === activeRecord.siteId && r.date === shiftDate && r.compilerId === user.id);
    if (reportExists) { setPromptState('confirm_simple'); return; }
    const otherWorkersStillIn = attendance.filter(a => !a.endTime && a.siteId === activeRecord.siteId && a.userId !== user.id);
    setPromptState(otherWorkersStillIn.length > 0 ? 'ask_delegate' : 'force_report');
  };

  const executeClockOut = () => {
    if (activeRecord && currentCoords) {
      onClockOut(activeRecord.id, currentCoords);
      setPromptState('none');
      setSelectedSiteId(null);
    }
  };

  const currentNextSite = sites.find(s => s.id === nextSiteId);

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-10">
      <Card className="h-64 relative overflow-hidden shadow-md border-slate-200">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 z-30">
          <MapIcon size={14} className="text-blue-600" />
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Mappa Cantieri</span>
        </div>
        {!currentCoords && (
          <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[2px] flex items-center justify-center z-40">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider">Acquisizione GPS...</span>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-8 text-center bg-white relative overflow-hidden shadow-xl border-slate-200">
        <div className="relative z-10">
          <div className="mb-6">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-lg transition-transform hover:scale-105 ${activeRecord ? 'bg-amber-100 text-amber-600' : 'bg-blue-600 text-white'}`}>
              <Clock size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Buongiorno, {user.firstName}!</h2>
            <p className="text-slate-500 mt-2 font-medium text-sm">
              {activeRecord 
                ? `In servizio presso: ${activeRecord.siteName}` 
                : currentNextSite 
                  ? `Selezionato: ${currentNextSite.client}`
                  : "Scegli un cantiere dalla lista"}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            {!activeRecord ? (
              <Button 
                onClick={() => {
                  if (!currentCoords) { alert("Attendi il segnale GPS..."); return; }
                  if (!nextSiteId) { alert("Seleziona un cantiere dalla lista sotto."); return; }
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

      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
          <ListTodo size={14} className="text-blue-500" /> Scegli cantiere da iniziare
        </h3>
        {assignedSiteIds.map((id, index) => {
          const site = sites.find(s => s.id === id);
          const isCompleted = completedToday.includes(id);
          const isActive = activeRecord?.siteId === id;
          const isSelected = nextSiteId === id && !isActive;

          return (
            <button
              key={id}
              disabled={isCompleted || isActive}
              onClick={() => setSelectedSiteId(id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left shadow-sm ${
                isActive ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200' : 
                isCompleted ? 'bg-slate-50 border-slate-100 opacity-60' : 
                isSelected ? 'bg-white border-blue-500 ring-2 ring-blue-500/10' :
                'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                isCompleted ? 'bg-green-100 text-green-600' : 
                isActive ? 'bg-white/20 text-white' : 
                isSelected ? 'bg-blue-600 text-white' :
                'bg-slate-100 text-slate-500'
              }`}>
                {isCompleted ? <CheckCircle2 size={20} /> : index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                  {site?.client}
                </div>
                <div className={`text-[10px] font-medium truncate uppercase ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  {site?.address}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'text-white' : isCompleted ? 'text-green-600' : isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                  {isCompleted ? "Completato" : isActive ? "In Corso" : isSelected ? "Selezionato" : "In attesa"}
                </div>
                {!isCompleted && !isActive && site?.coords && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${site.coords!.latitude},${site.coords!.longitude}`, '_blank');
                    }}
                    className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Naviga"
                  >
                    <Navigation size={14} />
                  </button>
                )}
              </div>
            </button>
          );
        })}
        {assignedSiteIds.length === 0 && (
          <div className="py-10 text-center text-slate-400 italic text-sm bg-white rounded-2xl border border-dashed border-slate-200">
            Nessuna assegnazione per oggi.
          </div>
        )}
      </div>

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
                <p className="text-sm text-slate-500 mt-2 mb-6">Nessuno ha inviato il rapporto per questo cantiere. Lo compili tu o deleghi ai colleghi?</p>
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
