
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from '../components/Shared';
import { User, Site, DailyReport, DailySchedule } from '../types';
import { Camera, Send, Plus, Users, Clipboard, X, MapPin } from 'lucide-react';

interface DailyReportFormProps {
  user: User;
  activeSite?: Site;
  allWorkers: User[];
  schedules: Record<string, DailySchedule>;
  onSubmit: (report: Partial<DailyReport>) => void;
}

const DailyReportForm: React.FC<DailyReportFormProps> = ({ user, activeSite, allWorkers, schedules, onSubmit }) => {
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number, lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation error in report form", err)
      );
    }

    // WORKERS automatically loaded from schedule
    if (activeSite && schedules[todayStr]) {
      const assignedIds = schedules[todayStr].siteAssignments[activeSite.id] || [];
      setSelectedWorkers(assignedIds);
    } else {
      setSelectedWorkers([user.id]);
    }
  }, [activeSite, schedules, todayStr, user.id]);

  if (!activeSite) {
    return (
      <Card className="p-12 text-center bg-slate-50 border-dashed border-slate-300">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Nessun Cantiere Attivo</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Devi timbrare l'inizio in un cantiere prima di poter compilare il rapportino giornaliero.
        </p>
      </Card>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert("Inserisci una descrizione delle lavorazioni.");
      return;
    }
    
    if (!currentCoords) {
      alert("Attendi il rilevamento GPS per inviare il rapportino.");
      return;
    }

    const workerNames = allWorkers
      .filter(w => selectedWorkers.includes(w.id))
      .map(w => `${w.firstName} ${w.lastName}`);

    onSubmit({
      siteId: activeSite.id,
      siteName: activeSite.client,
      compilerId: user.id,
      compilerName: `${user.firstName} ${user.lastName}`,
      workerIds: selectedWorkers,
      workerNames: workerNames,
      date: todayStr,
      description,
      notes,
      photoUrl: photoUrl,
      timestamp: new Date().toISOString(),
      coords: currentCoords
    });

    setDescription('');
    setNotes('');
    setPhotoUrl(undefined);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <Clipboard size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Nuovo Rapportino</h2>
            <p className="text-sm text-slate-500">Cantiere: <span className="font-semibold text-blue-600">{activeSite.client}</span></p>
            <p className="text-[10px] text-slate-400 mt-1">Gli operai presenti verranno caricati automaticamente dal programma del giorno.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Descrizione Lavorazioni</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Cosa avete fatto oggi?"
              className="w-full h-40 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Note (opzionale)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Note su materiali o altro..."
              className="w-full h-20 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Foto</label>
            <div className="flex flex-wrap gap-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment"
                onChange={handlePhotoUpload} 
              />
              
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-24 w-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all bg-slate-50 overflow-hidden relative"
              >
                {photoUrl ? (
                  <img src={photoUrl} className="w-full h-full object-cover" alt="Anteprima" />
                ) : (
                  <>
                    <Camera size={24} />
                    <span className="text-[10px]">Scatta/Carica</span>
                  </>
                )}
              </button>

              {photoUrl && (
                <button type="button" onClick={() => setPhotoUrl(undefined)} className="text-red-500">
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <MapPin size={12} />
              {currentCoords ? `Posizione rilevata: ${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : "Rilevamento posizione in corso..."}
            </div>
            
            <Button type="submit" className="w-full h-12 text-lg shadow-md group">
              <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Invia e Timbra Fine Turno
            </Button>
            <p className="text-[10px] text-slate-400 text-center italic">
              Nota: l'invio del rapportino effettuerà automaticamente la timbratura d'uscita (Clock Out) per te.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default DailyReportForm;
