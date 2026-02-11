
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { Site, User, UserRole } from '../types';
import { MapPin, Plus, Construction, Edit2, Trash2, Map as MapIcon, X, FileUp, Layers } from 'lucide-react';
import L from 'leaflet';

interface SitesProps {
  currentUser: User;
  sites: Site[];
  onAddSite: (site: Partial<Site>) => void;
  onUpdateSite: (id: string, updates: Partial<Site>) => void;
  onRemoveSite: (id: string) => void;
  showActive: boolean;
}

const MapPickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialCoords?: { latitude: number; longitude: number };
}> = ({ isOpen, onClose, onConfirm, initialCoords }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ lat: number, lng: number } | null>(
    initialCoords ? { lat: initialCoords.latitude, lng: initialCoords.longitude } : null
  );

  useEffect(() => {
    if (isOpen && mapContainerRef.current && !mapRef.current) {
      const initialLat = initialCoords?.latitude || 45.4642; 
      const initialLng = initialCoords?.longitude || 9.1900;

      mapRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);

      if (initialCoords) {
        markerRef.current = L.marker([initialLat, initialLng]).addTo(mapRef.current);
      }

      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setSelectedPos({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          markerRef.current = L.marker(e.latlng).addTo(mapRef.current!);
        }
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MapIcon size={20} className="text-blue-600" />
            Seleziona Posizione Cantiere
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="absolute inset-0" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-xs px-4">
            <Button 
              className="w-full shadow-2xl h-12 text-lg" 
              disabled={!selectedPos}
              onClick={() => {
                if (selectedPos) onConfirm(selectedPos.lat, selectedPos.lng);
              }}
            >
              Conferma Posizione
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sites: React.FC<SitesProps> = ({ currentUser, sites, onAddSite, onUpdateSite, onRemoveSite, showActive }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [showGlobalMap, setShowGlobalMap] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const globalMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [formData, setFormData] = useState({
    client: '',
    address: '',
    budget: 0,
    estimatedDays: 0,
    quoteUrl: '',
    coords: undefined as { latitude: number; longitude: number } | undefined
  });

  const canEdit = currentUser.role === UserRole.ADMIN;
  const filteredSites = sites.filter(s => s.isActive === showActive);

  // Gestione Mappa Globale
  useEffect(() => {
    if (showGlobalMap && globalMapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(globalMapRef.current).setView([45.4642, 9.1900], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
      markersGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    if (mapInstanceRef.current && markersGroupRef.current) {
      markersGroupRef.current.clearLayers();
      const bounds: L.LatLngTuple[] = [];

      filteredSites.forEach(site => {
        if (site.coords) {
          const marker = L.marker([site.coords.latitude, site.coords.longitude])
            .bindPopup(`<b>${site.client}</b><br>${site.address}<br><small>Budget: €${site.budget}</small>`);
          markersGroupRef.current?.addLayer(marker);
          bounds.push([site.coords.latitude, site.coords.longitude]);
        }
      });

      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
      }
    }

    return () => {
      // Non distruggiamo la mappa per evitare glitch durante i re-render di React, 
      // a meno che il componente non venga smontato del tutto
    };
  }, [showGlobalMap, filteredSites]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingSiteId(null);
    setFormData({ client: '', address: '', budget: 0, estimatedDays: 0, quoteUrl: '', coords: undefined });
  };

  const handleEdit = (site: Site) => {
    setFormData({
      client: site.client,
      address: site.address,
      budget: site.budget,
      estimatedDays: site.estimatedDays,
      quoteUrl: site.quoteUrl || '',
      coords: site.coords
    });
    setEditingSiteId(site.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.address || !formData.coords) {
      alert("Cliente, Indirizzo e Posizione sulla mappa sono obbligatori.");
      return;
    }

    if (editingSiteId) {
      onUpdateSite(editingSiteId, formData);
    } else {
      onAddSite({ ...formData, isActive: true, actualDays: 0 });
    }
    resetForm();
  };

  const handleMapConfirm = (lat: number, lng: number) => {
    setIsMapPickerOpen(false);
    setFormData({ 
      ...formData, 
      coords: { latitude: lat, longitude: lng }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, quoteUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {showActive ? 'Cantieri Attivi' : 'Cantieri Conclusi'}
          </h2>
          <p className="text-sm text-slate-500">Gestione operativa e geolocalizzazione dei lavori.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowGlobalMap(!showGlobalMap)}>
            <Layers size={18} /> {showGlobalMap ? 'Nascondi Mappa' : 'Mostra Mappa'}
          </Button>
          {showActive && canEdit && (
            <Button onClick={() => { resetForm(); setIsAdding(true); }}>
              <Plus size={18} /> Nuovo Cantiere
            </Button>
          )}
        </div>
      </div>

      <MapPickerModal 
        isOpen={isMapPickerOpen} 
        onClose={() => setIsMapPickerOpen(false)}
        initialCoords={formData.coords}
        onConfirm={handleMapConfirm}
      />

      {showGlobalMap && (
        <Card className="h-80 md:h-[400px] relative overflow-hidden animate-in fade-in duration-500 border-blue-100 shadow-md">
           <div ref={globalMapRef} className="absolute inset-0 z-10" />
           <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Live Tracker Cantieri
           </div>
        </Card>
      )}

      {isAdding && (
        <Card className="p-6 border-blue-200 bg-blue-50 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-blue-100">
            <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
              <Construction size={20} />
              {editingSiteId ? 'Modifica Dati Cantiere' : 'Registrazione Nuovo Cantiere'}
            </h3>
            <button onClick={resetForm} className="text-blue-400 hover:text-blue-600">
               <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Input label="Cliente / Committente *" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} required placeholder="es. Condominio Italia" />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Indirizzo e Geolocalizzazione *</label>
                <div className="relative">
                   <input 
                      type="text" 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})} 
                      required 
                      placeholder="Indirizzo completo"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg pr-12 outline-none focus:ring-2 focus:ring-blue-500"
                   />
                   <button 
                      type="button" 
                      onClick={() => setIsMapPickerOpen(true)} 
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${formData.coords ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                      title="Apri mappa per posizionare"
                   >
                     <MapPin size={20} />
                   </button>
                </div>
                {formData.coords && <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight">✓ Posizione impostata correttamente</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Documento Preventivo (PDF/IMG)</label>
                <div className="flex gap-2">
                  <Button variant="secondary" type="button" className="bg-white flex-1" onClick={() => fileInputRef.current?.click()}>
                    <FileUp size={16} /> {formData.quoteUrl ? 'Cambia File' : 'Seleziona File'}
                  </Button>
                  {formData.quoteUrl && <div className="p-2 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"><Layers size={16}/></div>}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,image/*" />
              </div>

              <Input label="Importo Complessivo (€)" type="number" value={formData.budget.toString()} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} placeholder="0.00" />
              <Input label="Giornate Uomo Previste" type="number" value={formData.estimatedDays.toString()} onChange={e => setFormData({...formData, estimatedDays: Number(e.target.value)})} placeholder="es. 10" />
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t border-blue-100">
              <Button variant="ghost" onClick={resetForm}>Annulla</Button>
              <Button type="submit" className="px-8 shadow-md">
                {editingSiteId ? 'Aggiorna Cantiere' : 'Crea Cantiere'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredSites.map(site => (
          <Card key={site.id} className="p-6 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all group overflow-visible">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 min-w-0">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                  <Construction size={28} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-800 truncate">{site.client}</h3>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
                    <MapPin size={14} className="text-blue-400" /> 
                    <span className="truncate">{site.address}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avanzamento</p>
                       <p className="text-sm font-bold text-slate-700">{site.actualDays} / {site.estimatedDays} <span className="text-xs text-slate-400 font-normal">Giorni</span></p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget</p>
                       <p className="text-sm font-bold text-slate-700">€ {site.budget.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex gap-1 ml-2">
                  <button 
                    onClick={() => handleEdit(site)} 
                    className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Modifica"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => onRemoveSite(site.id)} 
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Elimina"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {site.isActive && (
              <div className="mt-6">
                 <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (site.actualDays / (site.estimatedDays || 1)) * 100)}%` }}
                    />
                 </div>
              </div>
            )}
          </Card>
        ))}

        {filteredSites.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <Construction size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-400">Nessun cantiere trovato</h3>
            <p className="text-sm text-slate-400">Usa il tasto in alto per registrare il tuo primo cantiere.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sites;
