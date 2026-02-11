
import React, { useState } from 'react';
import { Card, Button } from '../components/Shared';
import { AttendanceRecord, DailyReport, User, UserRole, Site } from '../types';
import { Clock, MapPin, Calendar, ClipboardCheck, Trash2, Search, CheckCircle2, Filter, X } from 'lucide-react';

interface AttendanceLogProps {
  currentUser: User;
  attendance: AttendanceRecord[];
  reports: DailyReport[];
  sites: Site[];
  onRemoveRecord: (id: string) => void;
}

const AttendanceLog: React.FC<AttendanceLogProps> = ({ currentUser, attendance, reports, sites, onRemoveRecord }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const canEdit = currentUser.role === UserRole.ADMIN;

  const filteredAttendance = attendance
    .filter(a => {
      const matchesSearch = a.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           a.siteName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const recordDate = new Date(a.startTime).toISOString().split('T')[0];
      const matchesDate = filterDate ? recordDate === filterDate : true;

      return matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const getLinkedReport = (record: AttendanceRecord) => {
    const recordDate = new Date(record.startTime).toISOString().split('T')[0];
    return reports.find(r => 
      r.siteId === record.siteId && 
      r.compilerId === record.userId && 
      r.date === recordDate
    );
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (workerCoords?: { lat: number, lng: number }, siteId?: string) => {
    if (!workerCoords) return "N/D";
    const site = sites.find(s => s.id === siteId);
    if (!site || !site.coords) return "N/D";

    const distance = getDistance(
      workerCoords.lat, 
      workerCoords.lng, 
      site.coords.latitude, 
      site.coords.longitude
    );

    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  const renderGpsIndicator = (workerCoords?: { lat: number, lng: number }, siteId?: string) => {
    if (!workerCoords) return <div className="w-3 h-3 rounded-full bg-slate-300" title="GPS Non Disponibile" />;
    const site = sites.find(s => s.id === siteId);
    if (!site || !site.coords) return <div className="w-3 h-3 rounded-full bg-slate-300" title="Cantiere non localizzato" />;

    const distance = getDistance(
      workerCoords.lat, 
      workerCoords.lng, 
      site.coords.latitude, 
      site.coords.longitude
    );

    if (distance < 500) {
      return (
        <span className="flex items-center" title={`In cantiere (${Math.round(distance)}m)`}>
          <CheckCircle2 size={12} className="text-green-500" />
        </span>
      );
    } else if (distance < 1000) {
      return <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" title={`Fuori cantiere (${Math.round(distance)}m)`} />;
    } else {
      return <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" title={`Lontano (${(distance / 1000).toFixed(1)}km)`} />;
    }
  };

  const formatCoords = (coords?: { lat: number, lng: number }) => {
    if (!coords) return 'N/D';
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '---';
    return new Date(isoString).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Registro Timbrature</h2>
          <p className="text-sm text-slate-500">Log cronologico con verifica prossimità GPS al cantiere.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cerca operaio o cantiere..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          
          <div className="relative flex-1 sm:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="date" 
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {(searchTerm || filterDate) && (
            <button 
              onClick={clearFilters}
              className="p-2 text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded-lg transition-colors flex items-center justify-center"
              title="Azzera filtri"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAttendance.map(record => {
          const report = getLinkedReport(record);
          
          return (
            <Card key={record.id} className="p-4 bg-white hover:border-blue-200 transition-all border-l-4 border-l-blue-600">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/4">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase mb-1">
                    <Calendar size={14} />
                    {new Date(record.startTime).toLocaleDateString('it-IT')}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">{record.userName}</h3>
                  <p className="text-sm text-slate-500 font-medium truncate">
                    {record.siteName}
                  </p>
                  
                  {canEdit && (
                    <button 
                      onClick={() => confirm("Eliminare questa timbratura?") && onRemoveRecord(record.id)}
                      className="mt-4 text-[10px] text-red-500 uppercase font-bold tracking-widest hover:underline"
                    >
                      Elimina Record
                    </button>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* IN */}
                  <div className="space-y-1 p-3 bg-slate-50 rounded-lg border border-slate-100 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Clock-In</span>
                      {renderGpsIndicator(record.startCoords, record.siteId)}
                    </div>
                    <div className="text-lg font-bold text-slate-800">{formatTime(record.startTime)}</div>
                    <div className="flex justify-between items-center text-[10px] mt-1">
                      <span className="text-slate-400 font-mono truncate">{formatCoords(record.startCoords)}</span>
                      <span className="font-bold text-blue-600">Dist: {formatDistance(record.startCoords, record.siteId)}</span>
                    </div>
                  </div>

                  {/* OUT */}
                  <div className={`space-y-1 p-3 rounded-lg border relative ${record.endTime ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Clock-Out</span>
                      {renderGpsIndicator(record.endCoords, record.siteId)}
                    </div>
                    <div className="text-lg font-bold text-slate-800">{formatTime(record.endTime)}</div>
                    <div className="flex justify-between items-center text-[10px] mt-1">
                      <span className="text-slate-400 font-mono truncate">{formatCoords(record.endCoords)}</span>
                      <span className="font-bold text-blue-600">Dist: {formatDistance(record.endCoords, record.siteId)}</span>
                    </div>
                  </div>

                  {/* RAPPORTINO */}
                  <div className={`space-y-1 p-3 rounded-lg border relative ${report ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Rapportino</span>
                      {renderGpsIndicator(report?.coords, record.siteId)}
                    </div>
                    <div className="text-lg font-bold text-slate-800">{report ? formatTime(report.timestamp) : '---'}</div>
                    <div className="flex justify-between items-center text-[10px] mt-1">
                      <span className="text-slate-400 font-mono truncate">{report ? formatCoords(report.coords) : 'N/D'}</span>
                      <span className="font-bold text-blue-600">Dist: {formatDistance(report?.coords, record.siteId)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredAttendance.length === 0 && (
        <div className="py-24 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Nessuna timbratura trovata</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-1">
            Modifica i filtri di ricerca o la data per visualizzare altri record.
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceLog;
