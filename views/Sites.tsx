
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { Site, User, UserRole } from '../types';
import { MapPin, Plus, Construction, Edit2, Trash2, Map as MapIcon, X, FileUp, Layers, Navigation, Search, Loader2 } from 'lucide-react';
import maplibregl from 'maplibre-gl';

interface SitesProps {
  currentUser: User;
  sites: Site[];
  onAddSite: (site: Partial<Site>) => void;
  onUpdateSite: (id: string, updates: Partial<Site>) => void;
  onRemoveSite: (id: string) => void;
  showActive: boolean;
}

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const MapPickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number, address?: string) => void;
  initialCoords?: { latitude: number; longitude: number };
}> = ({ isOpen, onClose, onConfirm, initialCoords }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPos, setSelectedPos] = useState<{ lat: number, lng: number } | null>(
    initialCoords ? { lat: initialCoords.latitude, lng: initialCoords.longitude } : null
  );

  // Funzione per cercare indirizzo tramite Nominatim (OpenStreetMap)
  const handleAddressSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLon = parseFloat(lon);

        mapRef.current.flyTo({
          center: [newLon, newLat],
          zoom: 16,
          essential: true
        });

        setSelectedPos({ lat: newLat, lng: newLon });
        
        if (markerRef.current) {
          markerRef.current.setLngLat([newLon, newLat]);
        } else {
          markerRef.current = new maplibregl.Marker({ color: "#2563eb" })
            .setLngLat([newLon, newLat])
            .addTo(mapRef.current);
        }
      } else {
        alert("Indirizzo non trovato. Prova ad essere più specifico.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("Errore durante la ricerca dell'indirizzo.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen && mapContainerRef.current && !mapRef.current) {
      const initialLat = initialCoords?.latitude || 45.4642; 
      const initialLng = initialCoords?.longitude || 9.1900;

      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: [initialLng, initialLat],
        zoom: initialCoords ? 15 : 12,
        antialias: true,
        trackResize: true
      });

      mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Gestione ridimensionamento automatico
      const resizer = new ResizeObserver(() => {
        mapRef.current?.resize();
      });
      resizer.observe(mapContainerRef.current);

      if (initialCoords) {
        markerRef.current = new maplibregl.Marker({ color: "#2563eb" })
          .setLngLat([initialLng, initialLat])
          .addTo(mapRef.current);
      }

      mapRef.current.on('click', (e: maplibregl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        setSelectedPos({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new maplibregl.Marker({ color: "#2563eb" })
            .setLngLat([lng, lat])
            .addTo(mapRef.current!);
        }
      });

      return () => {
        resizer.disconnect();
      };
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-[80vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <MapIcon size={18} />
            </div>
            <h3 className="font-bold text-slate-800">Localizza Cantiere</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <div className="flex-1 relative min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
          
          {/* Barra di ricerca Indirizzo */}
          <div className="absolute top-4 left-4 right-14 z-10 max-w-md">
            <form onSubmit={handleAddressSearch} className="flex gap-2 bg-white/95 backdrop-blur p-1.5 rounded-xl shadow-lg border border-slate-200">
              <input 
                type="text" 
                placeholder="Cerca via o città..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
              />
              <Button 
                type="submit" 
                className="h-9 w-9 p-0 flex items-center justify-center shrink-0" 
                disabled={isSearching}
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </Button>
            </form>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-xs px-4">
            <Button 
              className="w-full shadow-2xl h-12 text-lg font-bold" 
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
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

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

  // Sincronizzazione Mappa Globale
  useEffect(() => {
    if (showGlobalMap && globalMapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = new maplibregl.Map({
        container: globalMapRef.current,
        style: MAP_STYLE,
        center: [12.5674, 41.8719], 
        zoom: 5,
        antialias: true,
        trackResize: true
      });
      mapInstanceRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Resize Observer per la mappa globale
      const resizer = new ResizeObserver(() => {
        mapInstanceRef.current?.resize();
      });
      resizer.observe(globalMapRef.current);

      return () => {
        resizer.disconnect();
      };
    }

    if (mapInstanceRef.current) {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const bounds = new maplibregl.LngLatBounds();
      let hasCoords = false;

      filteredSites.forEach(site => {
        if (site.coords) {
          hasCoords = true;
          const popup = new maplibregl.Popup({ offset: 25 })
            .setHTML(`
              <div style="font-family: 'Inter', sans-serif; padding: 4px;">
                <h4 style="font-weight: bold; color: #1e293b; margin-bottom: 4px; font-size: 14px;">${site.client}</h4>
                <p style="font-size: 11px; color: #64748b; margin: 0;">${site.address}</p>
                <div style="margin-top: 8px; font-weight: bold; color: #2563eb; font-size: 12px;">Budget: € ${site.budget.toLocaleString()}</div>
              </div>
            `);

          const marker = new maplibregl.Marker({ color: site.isActive ? "#2563eb" : "#94a3b8" })
            .setLngLat([site.coords.longitude, site.coords.latitude])
            .setPopup(popup)
            .addTo(mapInstanceRef.current!);
          
          markersRef.current.push(marker);
          bounds.extend([site.coords.longitude, site.coords.latitude]);
        }
      });

      if (hasCoords) {
        mapInstanceRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      }
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {showActive ? 'Cantieri Operativi' : 'Cantieri Archiviati'}
          </h2>
          <p className="text-sm text-slate-500">Isolamento aziendale e logistica georeferenziata.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setShowGlobalMap(!showGlobalMap)}>
            <Layers size={18} /> {showGlobalMap ? 'Nascondi Mappa' : 'Mappa Globale'}
          </Button>
          {showActive && canEdit && (
            <Button className="flex-1 sm:flex-none" onClick={() => { resetForm(); setIsAdding(true); }}>
              <Plus size={18} /> Nuovo
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
        <Card className="h-80 md:h-[450px] relative overflow-hidden animate-in fade-in duration-700 shadow-xl border-slate-200">
           <div ref={globalMapRef} className="absolute inset-0 w-full h-full" />
           <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <Navigation size={12} className="text-blue-600 animate-pulse" />
              Rendering WebGL Attivo
           </div>
        </Card>
      )}

      {isAdding && (
        <Card className="p-6 border-blue-200 bg-blue-50/50 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-blue-100">
            <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
              <Construction size={20} />
              {editingSiteId ? 'Modifica Cantiere' : 'Registrazione Cantiere'}
            </h3>
            <button onClick={resetForm} className="text-blue-400 hover:text-blue-600 p-1">
               <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Input label="Cliente / Committente *" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} required placeholder="es. Condominio Italia" />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Indirizzo e Posizione *</label>
                <div className="relative">
                   <input 
                      type="text" 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})} 
                      required 
                      placeholder="Indirizzo completo"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg pr-12 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                   />
                   <button 
                      type="button" 
                      onClick={() => setIsMapPickerOpen(true)} 
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${formData.coords ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                   >
                     <MapPin size={20} />
                   </button>
                </div>
                {formData.coords && <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight flex items-center gap-1"><MapPin size={10}/> Coordinate acquisite</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Preventivo / Documentazione</label>
                <div className="flex gap-2">
                  <Button variant="secondary" type="button" className="bg-white flex-1 border border-slate-200" onClick={() => fileInputRef.current?.click()}>
                    <FileUp size={16} /> {formData.quoteUrl ? 'File Caricato' : 'Allega File'}
                  </Button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,image/*" />
              </div>

              <Input label="Budget Lavori (€)" type="number" value={formData.budget.toString()} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} placeholder="0.00" />
              <Input label="Giornate Previste" type="number" value={formData.estimatedDays.toString()} onChange={e => setFormData({...formData, estimatedDays: Number(e.target.value)})} placeholder="es. 10" />
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t border-blue-100">
              <Button variant="ghost" onClick={resetForm}>Annulla</Button>
              <Button type="submit" className="px-8 shadow-md">
                {editingSiteId ? 'Salva Modifiche' : 'Conferma Creazione'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredSites.map(site => (
          <Card key={site.id} className="p-6 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all group">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 min-w-0">
                <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100 transition-all">
                  <Construction size={28} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-800 truncate">{site.client}</h3>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                    <MapPin size={14} className="text-blue-400" /> 
                    <span className="truncate">{site.address}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 mt-5 pt-5 border-t border-slate-50">
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avanzamento</p>
                       <p className="text-sm font-bold text-slate-700 flex items-baseline gap-1">
                         {site.actualDays} <span className="text-xs text-slate-400 font-normal">/ {site.estimatedDays}gg</span>
                       </p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Economia</p>
                       <p className="text-sm font-bold text-slate-700">€ {site.budget.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(site)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => onRemoveSite(site.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {site.isActive && (
              <div className="mt-6">
                 <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${Math.min(100, (site.actualDays / (site.estimatedDays || 1)) * 100)}%` }}
                    />
                 </div>
                 <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Progresso Stimato</span>
                    <span className="text-[10px] font-bold text-blue-600">{Math.round((site.actualDays / (site.estimatedDays || 1)) * 100)}%</span>
                 </div>
              </div>
            )}
          </Card>
        ))}

        {filteredSites.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
              <Construction size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-400">Nessun cantiere archiviato</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">I cantieri appariranno qui una volta conclusi o registrati a sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sites;
