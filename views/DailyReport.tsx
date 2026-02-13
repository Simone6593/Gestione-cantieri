
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from '../components/Shared';
import { User, Site, DailyReport, DailySchedule } from '../types';
import { Camera, Send, Plus, Users, Clipboard, X, MapPin, Check, ChevronDown, Image as ImageIcon } from 'lucide-react';

interface DailyReportFormProps {
  user: User;
  activeSite?: Site;
  sites: Site[]; 
  allWorkers: User[];
  schedules: Record<string, DailySchedule>;
  onSubmit: (report: Partial<DailyReport>) => void;
  // Assumiamo che se richiamato dal clock-out, possiamo passare la data di riferimento
  referenceDate?: string; 
}

const getLocalDateString = (dateInput?: string | Date) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DailyReportForm: React.FC<DailyReportFormProps> = ({ user, activeSite, sites, allWorkers, schedules, onSubmit, referenceDate }) => {
  const [selectedSiteId, setSelectedSiteId] = useState(activeSite?.id || '');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Usa la data di riferimento (inizio turno) o quella odierna locale
  const reportDateStr = referenceDate || getLocalDateString();
  const currentSite = sites.find(s => s.id === selectedSiteId);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation error in report form", err)
      );
    }

    if (selectedSiteId && schedules[reportDateStr]) {
      const assignedIds = (schedules[reportDateStr].siteAssignments[selectedSiteId] || []) as string[];
      const initialSelection = assignedIds.includes(user.id) ? assignedIds : [...assignedIds, user.id];
      setSelectedWorkers(initialSelection);
    } else {
      setSelectedWorkers([user.id]);
    }
  }, [selectedSiteId, schedules, reportDateStr, user.id]);

  const toggleWorker = (id: string) => {
    setSelectedWorkers(prev => 
      prev.includes(id) ? prev.filter(wId => wId !== id) : [...prev, id]
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => setPhotoUrls(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => setPhotoUrls(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) { alert("Seleziona un cantiere."); return; }
    if (!description.trim()) { alert("Inserisci una descrizione delle lavorazioni."); return; }
    if (photoUrls.length === 0) { 
      alert("È obbligatorio allegare almeno una foto del lavoro svolto oggi."); 
      return; 
    }
    if (!currentCoords) { alert("Attendi il rilevamento GPS."); return; }

    const workerNames = allWorkers
      .filter(w => selectedWorkers.includes(w.id))
      .map(w => `${w.firstName} ${w.lastName}`);

    onSubmit({
      siteId: selectedSiteId,
      siteName: currentSite?.client || 'Cantiere Sconosciuto',
      compilerId: user.id,
      compilerName: `${user.firstName} ${user.lastName}`,
      workerIds: selectedWorkers,
      workerNames: workerNames,
      date: reportDateStr, // Cruciale: usiamo la data del turno
      description,
      notes,
      photoUrls: photoUrls,
      timestamp: new Date().toISOString(),
      coords: currentCoords
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Clipboard size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800">Compilazione Rapporto</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Data Turno:</span>
              <span className="text-xs font-bold text-blue-600">{new Date(reportDateStr).toLocaleDateString('it-IT')}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
             <label className="text-sm font-semibold text-slate-700">Cantiere di riferimento</label>
             {activeSite ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div> {activeSite.client}
                </div>
             ) : (
                <div className="relative">
                  <select 
                    value={selectedSiteId} 
                    onChange={e => setSelectedSiteId(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-blue-600 outline-none appearance-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleziona cantiere...</option>
                    {sites.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.client}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users size={16} className="text-blue-500" /> Personale Presente
            </label>
            <div className="flex flex-wrap gap-2">
              {allWorkers.map(worker => (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => toggleWorker(worker.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedWorkers.includes(worker.id) 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {selectedWorkers.includes(worker.id) && <Check size={12} />}
                  {worker.firstName} {worker.lastName}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
               <Clipboard size={16} className="text-blue-500" /> Descrizione Lavorazioni
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Cosa avete fatto oggi? Sii dettagliato..."
              className="w-full h-40 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Note (opzionale)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Eventuali intoppi, materiali mancanti..."
              className="w-full h-20 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <ImageIcon size={16} className="text-blue-500" /> Documentazione Foto
              </label>
              <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded border border-red-100 italic">
                * Richiesta almeno 1 foto
              </span>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {photoUrls.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-xl border border-slate-200 bg-slate-100 relative group overflow-hidden shadow-sm">
                  <img src={url} className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removePhoto(idx)} 
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all bg-slate-50 ${photoUrls.length === 0 ? 'border-red-300 text-red-400 animate-pulse' : 'border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-500'}`}
              >
                <Plus size={24} />
                <span className="text-[10px] font-bold">Foto</span>
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" capture="environment" onChange={handlePhotoUpload} />
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <MapPin size={12} className={currentCoords ? "text-green-500" : "text-slate-300"} />
              {currentCoords ? `GPS ATTIVO` : "Rilevamento posizione..."}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-14 text-lg shadow-xl group"
              disabled={photoUrls.length === 0}
            >
              <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Invia e Chiudi Turno
            </Button>
            
            {photoUrls.length === 0 && (
              <p className="text-center text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100 animate-bounce">
                ⚠️ Scatta o carica una foto per poter terminare.
              </p>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default DailyReportForm;
