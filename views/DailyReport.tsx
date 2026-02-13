
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from '../components/Shared';
import { User, Site, DailyReport, DailySchedule } from '../types';
import { Camera, Send, Plus, Users, Clipboard, X, MapPin, Check, ChevronDown } from 'lucide-react';

interface DailyReportFormProps {
  user: User;
  activeSite?: Site;
  sites: Site[]; // Aggiunto per permettere la selezione manuale
  allWorkers: User[];
  schedules: Record<string, DailySchedule>;
  onSubmit: (report: Partial<DailyReport>) => void;
}

const DailyReportForm: React.FC<DailyReportFormProps> = ({ user, activeSite, sites, allWorkers, schedules, onSubmit }) => {
  const [selectedSiteId, setSelectedSiteId] = useState(activeSite?.id || '');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentSite = sites.find(s => s.id === selectedSiteId);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation error in report form", err)
      );
    }

    // Seleziona automaticamente i lavoratori assegnati al cantiere scelto
    if (selectedSiteId && schedules[todayStr]) {
      const assignedIds = (schedules[todayStr].siteAssignments[selectedSiteId] || []) as string[];
      const initialSelection = assignedIds.includes(user.id) ? assignedIds : [...assignedIds, user.id];
      setSelectedWorkers(initialSelection);
    } else {
      setSelectedWorkers([user.id]);
    }
  }, [selectedSiteId, schedules, todayStr, user.id]);

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
      date: todayStr,
      description,
      notes,
      photoUrls: photoUrls,
      timestamp: new Date().toISOString(),
      coords: currentCoords
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <Clipboard size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800">Nuovo Rapportino</h2>
            {activeSite ? (
              <p className="text-sm text-slate-500">Cantiere: <span className="font-semibold text-blue-600">{activeSite.client}</span></p>
            ) : (
              <div className="relative mt-1">
                <select 
                  value={selectedSiteId} 
                  onChange={e => setSelectedSiteId(e.target.value)}
                  className="w-full pl-3 pr-10 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-blue-600 outline-none appearance-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona cantiere...</option>
                  {sites.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.client}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users size={16} className="text-blue-500" /> Personale Presente Oggi
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
            <label className="text-sm font-semibold text-slate-700">Descrizione Lavorazioni</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Cosa avete fatto oggi?"
              className="w-full h-40 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Note (opzionale)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Eventuali note aggiuntive..."
              className="w-full h-20 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Foto del lavoro</label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {photoUrls.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-xl border border-slate-200 bg-slate-100 relative group overflow-hidden">
                  <img src={url} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all bg-slate-50">
                <Plus size={24} />
                <span className="text-[10px] font-bold">Foto</span>
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" capture="environment" onChange={handlePhotoUpload} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <MapPin size={12} className={currentCoords ? "text-green-500" : ""} />
              {currentCoords ? `Posizione rilevata` : "Rilevamento posizione in corso..."}
            </div>
            <Button type="submit" className="w-full h-12 text-lg shadow-md group">
              <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Invia e Chiudi Turno
            </Button>
            {activeSite && (
              <p className="text-center text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                L'invio confermerà automaticamente la tua uscita dal cantiere.
              </p>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default DailyReportForm;
