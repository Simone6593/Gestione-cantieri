import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { Site, User, UserRole } from '../types';
import { MapPin, Plus, Construction, Edit2, Trash2, Map as MapIcon, X, FileUp } from 'lucide-react';
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
            Posizione Cantiere
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.address || !formData.coords) {
      alert("Cliente, Indirizzo e Posizione sono obbligatori.");
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
        <h2 className="text-xl font-bold text-slate-800">
          {showActive ? 'Cantieri Attivi' : 'Cantieri Conclusi'}
        </h2>
        {showActive && canEdit && (
          <Button onClick={() => { resetForm(); setIsAdding(true); }}>
            <Plus size={18} /> Nuovo
          </Button>
        )}
      </div>

      <MapPickerModal 
        isOpen={isMapPickerOpen} 
        onClose={() => setIsMapPickerOpen(false)}
        initialCoords={formData.coords}
        onConfirm={handleMapConfirm}
      />

      {isAdding && (
        <Card className="p-6 border-blue-200 bg-blue-50">
          <h3 className="text-lg font-bold text-blue-900 mb-4">
            {editingSiteId ? 'Modifica Cantiere' : 'Nuovo Cantiere'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="Cliente *" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} required />
              <Input 
                label="Indirizzo *" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required 
                suffix={<button type="button" onClick={() => setIsMapPickerOpen(true)} className="p-1 text-blue-600"><MapPin size={18} /></button>}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Preventivo (PDF/IMG)</label>
                <Button variant="secondary" type="button" className="bg-white" onClick={() => fileInputRef.current?.click()}>
                   <FileUp size={16} /> {formData.quoteUrl ? 'Caricato' : 'Carica'}
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,image/*" />
              </div>
              <Input label="Importo (€)" type="number" value={formData.budget.toString()} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
              <Input label="Giornate Previste" type="number" value={formData.estimatedDays.toString()} onChange={e => setFormData({...formData, estimatedDays: Number(e.target.value)})} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={resetForm}>Annulla</Button>
              <Button type="submit">Salva</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredSites.map(site => (
          <Card key={site.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Construction size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{site.client}</h3>
                  <div className="flex items-center gap-1 text-slate-500 text-sm">
                    <MapPin size={14} /> {site.address}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Budget: €{site.budget.toLocaleString()} | Giorni: {site.actualDays}/{site.estimatedDays}</p>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(site)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={18} /></button>
                  <button onClick={() => onRemoveSite(site.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                </div>
              )}
            </div>
          </Card>
        ))}
        {filteredSites.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed rounded-xl">Nessun cantiere in questa sezione.</div>
        )}
      </div>
    </div>
  );
};

export default Sites;