
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { Site, User, UserRole, AttendanceRecord, PaySlip, MaterialCost } from '../types';
import { MapPin, Plus, Construction, Edit2, Trash2, Map as MapIcon, X, FileUp, Layers, Navigation, Search, Loader2, Calculator, Info, ShoppingCart, TrendingDown } from 'lucide-react';
import maplibregl from 'maplibre-gl';

interface SitesProps {
  currentUser: User;
  sites: Site[];
  attendance?: AttendanceRecord[];
  paySlips?: PaySlip[];
  materialCosts?: MaterialCost[];
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
        mapRef.current.flyTo({ center: [newLon, newLat], zoom: 16, essential: true });
        setSelectedPos({ lat: newLat, lng: newLon });
        if (markerRef.current) markerRef.current.setLngLat([newLon, newLat]);
        else markerRef.current = new maplibregl.Marker({ color: "#2563eb" }).setLngLat([newLon, newLat]).addTo(mapRef.current);
      }
    } catch (error) { console.error(error); } finally { setIsSearching(false); }
  };

  useEffect(() => {
    if (isOpen && mapContainerRef.current && !mapRef.current) {
      const initialLat = initialCoords?.latitude || 45.4642; 
      const initialLng = initialCoords?.longitude || 9.1900;
      mapRef.current = new maplibregl.Map({ container: mapContainerRef.current, style: MAP_STYLE, center: [initialLng, initialLat], zoom: initialCoords ? 15 : 12, antialias: true, trackResize: true });
      mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      const resizer = new ResizeObserver(() => mapRef.current?.resize());
      resizer.observe(mapContainerRef.current);
      if (initialCoords) markerRef.current = new maplibregl.Marker({ color: "#2563eb" }).setLngLat([initialLng, initialLat]).addTo(mapRef.current);
      mapRef.current.on('click', (e: maplibregl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        setSelectedPos({ lat, lng });
        if (markerRef.current) markerRef.current.setLngLat([lng, lat]);
        else markerRef.current = new maplibregl.Marker({ color: "#2563eb" }).setLngLat([lng, lat]).addTo(mapRef.current!);
      });
      return () => resizer.disconnect();
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><MapIcon size={18} /></div>
            <h3 className="font-bold text-slate-800">Localizza Cantiere</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="flex-1 relative min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
          <div className="absolute top-4 left-4 right-14 z-10 max-w-md">
            <form onSubmit={handleAddressSearch} className="flex gap-2 bg-white/95 backdrop-blur p-1.5 rounded-xl shadow-lg border border-slate-200">
              <input type="text" placeholder="Cerca via o città..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-3 py-2 text-sm outline-none bg-transparent" />
              <Button type="submit" className="h-9 w-9 p-0 flex items-center justify-center shrink-0" disabled={isSearching}>{isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}</Button>
            </form>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-xs px-4">
            <Button className="w-full shadow-2xl h-12 text-lg font-bold" disabled={!selectedPos} onClick={() => selectedPos && onConfirm(selectedPos.lat, selectedPos.lng)}>Conferma Posizione</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sites: React.FC<SitesProps> = ({ currentUser, sites, attendance = [], paySlips = [], materialCosts = [], onAddSite, onUpdateSite, onRemoveSite, showActive }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [showGlobalMap, setShowGlobalMap] = useState(true);
  const globalMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [formData, setFormData] = useState({ client: '', address: '', budget: 0, estimatedDays: 0, quoteUrl: '', coords: undefined as { latitude: number; longitude: number } | undefined });

  const canEdit = currentUser.role === UserRole.ADMIN;
  const filteredSites = sites.filter(s => s.isActive === showActive);

  // Calcolo costi per cantiere (Personale + Materiali)
  const siteCosts = useMemo(() => {
    const costs: Record<string, { labor: number, materials: number, total: number, hours: number }> = {};
    sites.forEach(site => {
      let laborTotal = 0;
      let totalHours = 0;
      
      // Calcolo costi personale
      const siteAttendance = attendance.filter(a => a.siteId === site.id && a.endTime);
      siteAttendance.forEach(a => {
        const hours = (new Date(a.endTime!).getTime() - new Date(a.startTime).getTime()) / (1000 * 60 * 60);
        const recordDate = new Date(a.startTime);
        const monthKey = `${(recordDate.getMonth() + 1).toString().padStart(2, '0')}/${recordDate.getFullYear()}`;
        const ps = paySlips.find(p => p.userId === a.userId && p.month === monthKey);
        if (ps && ps.costoOrarioReale) laborTotal += hours * ps.costoOrarioReale;
        totalHours += hours;
      });

      // Calcolo costi materiali (con supporto spesa condivisa)
      const siteMaterials = materialCosts.filter(m => m.siteIds.includes(site.id));
      const materialTotal = siteMaterials.reduce((sum, m) => sum + (m.taxableAmount / m.siteIds.length), 0);

      costs[site.id] = { 
        labor: laborTotal, 
        materials: materialTotal, 
        total: laborTotal + materialTotal, 
        hours: totalHours 
      };
    });
    return costs;
  }, [sites, attendance, paySlips, materialCosts]);

  useEffect(() => {
    if (showGlobalMap && globalMapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = new maplibregl.Map({ container: globalMapRef.current, style: MAP_STYLE, center: [12.5674, 41.8719], zoom: 5, antialias: true, trackResize: true });
      mapInstanceRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      const resizer = new ResizeObserver(() => mapInstanceRef.current?.resize());
      resizer.observe(globalMapRef.current);
      return () => resizer.disconnect();
    }
    if (mapInstanceRef.current) {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      const bounds = new maplibregl.LngLatBounds();
      let hasCoords = false;
      filteredSites.forEach(site => {
        if (site.coords) {
          hasCoords = true;
          const marker = new maplibregl.Marker({ color: site.isActive ? "#2563eb" : "#94a3b8" }).setLngLat([site.coords.longitude, site.coords.latitude]).addTo(mapInstanceRef.current!);
          markersRef.current.push(marker);
          bounds.extend([site.coords.longitude, site.coords.latitude]);
        }
      });
      if (hasCoords) mapInstanceRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [showGlobalMap, filteredSites]);

  const resetForm = () => { setIsAdding(false); setEditingSiteId(null); setFormData({ client: '', address: '', budget: 0, estimatedDays: 0, quoteUrl: '', coords: undefined }); };
  const handleEdit = (site: Site) => { setFormData({ client: site.client, address: site.address, budget: site.budget, estimatedDays: site.estimatedDays, quoteUrl: site.quoteUrl || '', coords: site.coords }); setEditingSiteId(site.id); setIsAdding(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!formData.client || !formData.address || !formData.coords) { alert("Dati mancanti."); return; } editingSiteId ? onUpdateSite(editingSiteId, formData) : onAddSite({ ...formData, isActive: true, actualDays: 0 }); resetForm(); };
  const handleMapConfirm = (lat: number, lng: number) => { setIsMapPickerOpen(false); setFormData({ ...formData, coords: { latitude: lat, longitude: lng } }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800">{showActive ? 'Cantieri Operativi' : 'Cantieri Archiviati'}</h2><p className="text-sm text-slate-500">Gestione logistica e analisi economica.</p></div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={() => setShowGlobalMap(!showGlobalMap)}><Layers size={18} /> {showGlobalMap ? 'Nascondi Mappa' : 'Mappa Globale'}</Button>
          {showActive && canEdit && <Button onClick={() => { resetForm(); setIsAdding(true); }}><Plus size={18} /> Nuovo</Button>}
        </div>
      </div>

      <MapPickerModal isOpen={isMapPickerOpen} onClose={() => setIsMapPickerOpen(false)} initialCoords={formData.coords} onConfirm={handleMapConfirm} />

      {showGlobalMap && <Card className="h-80 md:h-[400px] relative overflow-hidden shadow-xl"><div ref={globalMapRef} className="absolute inset-0 w-full h-full" /></Card>}

      {isAdding && (
        <Card className="p-6 border-blue-200 bg-blue-50/50 shadow-lg animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-blue-100">
            <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2"><Construction size={20} />{editingSiteId ? 'Modifica Cantiere' : 'Registrazione Cantiere'}</h3>
            <button onClick={resetForm} className="text-blue-400 p-1"><X size={24} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Input label="Cliente *" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} required />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Indirizzo e GPS *</label>
                <div className="relative"><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required className="w-full px-4 py-2 border rounded-lg pr-12" /><button type="button" onClick={() => setIsMapPickerOpen(true)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md ${formData.coords ? 'text-green-600' : 'text-blue-600'}`}><MapPin size={20} /></button></div>
              </div>
              <Input label="Budget Lavori (€)" type="number" value={formData.budget.toString()} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
              <Input label="Giornate Previste" type="number" value={formData.estimatedDays.toString()} onChange={e => setFormData({...formData, estimatedDays: Number(e.target.value)})} />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t"><Button variant="ghost" onClick={resetForm}>Annulla</Button><Button type="submit">Salva</Button></div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredSites.map(site => {
          const stats = siteCosts[site.id] || { labor: 0, materials: 0, total: 0, hours: 0 };
          const budgetUsedPercent = site.budget > 0 ? (stats.total / site.budget) * 100 : 0;

          return (
            <Card key={site.id} className="p-6 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex gap-4 min-w-0">
                  <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100 transition-all"><Construction size={28} /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-slate-800 truncate">{site.client}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1"><MapPin size={14} className="text-blue-400" /><span className="truncate">{site.address}</span></div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-50">
                      <div className="space-y-1">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget Totale</p>
                         <p className="text-sm font-bold text-slate-700">€ {site.budget.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1"><Calculator size={10}/> Spesa Tot.</p>
                         <p className="text-sm font-bold text-blue-600">€ {stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ore Reg.</p>
                         <p className="text-sm font-bold text-slate-700">{stats.hours.toFixed(1)}h</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calculator size={14} className="text-blue-500" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Costo Personale</span>
                          <span className="text-xs font-bold text-slate-700">€ {stats.labor.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={14} className="text-amber-500" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Costo Materiali</span>
                          <span className="text-xs font-bold text-slate-700">€ {stats.materials.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleEdit(site)} className="p-2 text-slate-300 hover:text-blue-600 rounded-xl"><Edit2 size={18} /></button>
                    <button onClick={() => onRemoveSite(site.id)} className="p-2 text-slate-300 hover:text-red-600 rounded-xl"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                 <div className="flex justify-between items-end">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assorbimento Budget</span>
                     <span className={`text-xl font-bold ${budgetUsedPercent > 90 ? 'text-red-600' : 'text-blue-600'}`}>{budgetUsedPercent.toFixed(1)}%</span>
                   </div>
                   <div className="flex flex-col text-right">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget Residuo</span>
                     <span className={`text-xl font-bold ${site.budget - stats.total < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        € {(site.budget - stats.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                     </span>
                   </div>
                 </div>
                 <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${budgetUsedPercent > 100 ? 'bg-red-500' : budgetUsedPercent > 80 ? 'bg-amber-500' : 'bg-blue-600'}`} 
                      style={{ width: `${Math.min(100, budgetUsedPercent)}%` }}
                    />
                 </div>
              </div>
            </Card>
          );
        })}

        {filteredSites.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
            <h3 className="text-xl font-bold text-slate-400">Nessun cantiere trovato</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sites;
