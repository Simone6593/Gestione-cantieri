
import React, { useState, useMemo } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { AttendanceRecord, DailyReport, User, UserRole, Site, PaySlip, Company } from '../types';
import { Clock, MapPin, Calendar, Trash2, Search, CheckCircle2, Calculator, Info, Edit2, Save, History } from 'lucide-react';

interface AttendanceLogProps {
  currentUser: User;
  attendance: AttendanceRecord[];
  reports: DailyReport[];
  sites: Site[];
  onRemoveRecord: (id: string) => void;
  onUpdateRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  company?: Company;
  paySlips?: PaySlip[];
}

const AttendanceLog: React.FC<AttendanceLogProps> = ({ 
  currentUser, attendance, reports, sites, onRemoveRecord, onUpdateRecord, company, paySlips = [] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showCostAnalysis, setShowCostAnalysis] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ startTime: string, endTime: string }>({ startTime: '', endTime: '' });
  
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

  const calculateHours = (start: string, end?: string) => {
    if (!end) return 0;
    return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
  };

  const costAnalysis = useMemo(() => {
    const analysisMap: Record<string, { totalHours: number, realHourlyRate: number, totalRealCost: number }> = {};
    filteredAttendance.forEach(record => {
      if (!record.endTime) return;
      const hours = calculateHours(record.startTime, record.endTime);
      const recordDate = new Date(record.startTime);
      const monthKey = `${(recordDate.getMonth() + 1).toString().padStart(2, '0')}/${recordDate.getFullYear()}`;
      const ps = paySlips.find(p => p.userId === record.userId && p.month === monthKey);
      if (ps && ps.costoOrarioReale) {
        analysisMap[record.id] = { totalHours: hours, realHourlyRate: ps.costoOrarioReale, totalRealCost: hours * ps.costoOrarioReale };
      }
    });
    return analysisMap;
  }, [filteredAttendance, paySlips]);

  const renderGpsStatus = (label: string, coords?: { lat: number, lng: number }) => {
    if (!coords) return <div className="text-[9px] text-slate-300 font-bold uppercase flex items-center gap-1"><MapPin size={10}/> {label} No-GPS</div>;
    return (
      <div className="text-[9px] text-green-500 font-bold uppercase flex items-center gap-1" title={`Lat: ${coords.lat}, Lng: ${coords.lng}`}>
        <CheckCircle2 size={10}/> {label} GPS OK
      </div>
    );
  };

  const formatTime = (isoString?: string) => isoString ? new Date(isoString).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '---';

  const startEditing = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setEditData({
      startTime: new Date(record.startTime).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
      endTime: record.endTime ? new Date(record.endTime).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16) : ''
    });
  };

  const handleSaveEdit = async (originalRecord: AttendanceRecord) => {
    if (!editingId) return;
    try {
      const updates: Partial<AttendanceRecord> = {
        startTime: new Date(editData.startTime).toISOString(),
        endTime: editData.endTime ? new Date(editData.endTime).toISOString() : undefined,
      };

      // Se è la prima modifica manuale, salviamo gli orari originali dell'app operaio
      if (!originalRecord.originalStartTime) updates.originalStartTime = originalRecord.startTime;
      if (originalRecord.endTime && !originalRecord.originalEndTime) updates.originalEndTime = originalRecord.endTime;

      await onUpdateRecord(editingId, updates);
      setEditingId(null);
    } catch (e) { alert("Errore modifica."); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Registro Timbrature</h2>
          <p className="text-sm text-slate-500">Monitoraggio orari reali vs modificati con log GPS.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {canEdit && (
            <Button onClick={() => setShowCostAnalysis(!showCostAnalysis)} variant={showCostAnalysis ? "primary" : "secondary"}>
              <Calculator size={18} /> {showCostAnalysis ? "Nascondi Costi" : "Analisi Costi"}
            </Button>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cerca..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAttendance.map(record => {
          const report = getLinkedReport(record);
          const hours = calculateHours(record.startTime, record.endTime);
          const analysis = costAnalysis[record.id];
          const isEditing = editingId === record.id;
          const hasManualMod = !!record.originalStartTime;
          
          return (
            <Card key={record.id} className={`p-4 border-l-4 transition-all ${isEditing ? 'border-amber-500 bg-amber-50' : 'border-blue-600 bg-white'}`}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="lg:w-1/4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase mb-1">
                    <Calendar size={12}/> {new Date(record.startTime).toLocaleDateString('it-IT')}
                  </div>
                  <h3 className="font-bold text-slate-800">{record.userName}</h3>
                  <p className="text-xs text-slate-500 truncate">{record.siteName}</p>
                  
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{hours.toFixed(2)}h totali</span>
                    {hasManualMod && (
                      <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1" title="Orario modificato da amministratore">
                        <History size={10}/> MOD
                      </span>
                    )}
                  </div>

                  {showCostAnalysis && analysis && (
                    <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100 text-xs">
                      <div className="flex justify-between font-bold text-blue-700"><span>Costo Commessa:</span> <span>€ {analysis.totalRealCost.toFixed(2)}</span></div>
                    </div>
                  )}

                  {canEdit && !isEditing && (
                    <div className="mt-3 flex gap-4">
                      <button onClick={() => startEditing(record)} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">Modifica</button>
                      <button onClick={() => confirm("Eliminare?") && onRemoveRecord(record.id)} className="text-[10px] font-bold text-red-500 uppercase hover:underline">Elimina</button>
                    </div>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* INIZIO */}
                  <div className={`p-3 rounded-lg border ${isEditing ? 'bg-white' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Inizio</span>
                      {renderGpsStatus("App", record.startCoords)}
                    </div>
                    {isEditing ? (
                      <input type="datetime-local" value={editData.startTime} onChange={e => setEditData({...editData, startTime: e.target.value})} className="w-full text-xs font-bold bg-transparent" />
                    ) : (
                      <div>
                        <div className="text-lg font-bold text-slate-800">{formatTime(record.startTime)}</div>
                        {record.originalStartTime && <div className="text-[8px] text-slate-400 font-mono italic">Originale: {formatTime(record.originalStartTime)}</div>}
                      </div>
                    )}
                  </div>

                  {/* FINE */}
                  <div className={`p-3 rounded-lg border ${isEditing ? 'bg-white' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Fine</span>
                      {renderGpsStatus("App", record.endCoords)}
                    </div>
                    {isEditing ? (
                      <input type="datetime-local" value={editData.endTime} onChange={e => setEditData({...editData, endTime: e.target.value})} className="w-full text-xs font-bold bg-transparent" />
                    ) : (
                      <div>
                        <div className="text-lg font-bold text-slate-800">{formatTime(record.endTime)}</div>
                        {record.originalEndTime && <div className="text-[8px] text-slate-400 font-mono italic">Originale: {formatTime(record.originalEndTime)}</div>}
                      </div>
                    )}
                  </div>

                  {/* RAPPORTINO */}
                  <div className={`p-3 rounded-lg border ${isEditing ? 'bg-amber-100' : (report ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-60')}`}>
                    {isEditing ? (
                      <div className="h-full flex flex-col gap-2">
                        <Button onClick={() => handleSaveEdit(record)} className="py-1 text-[10px] h-auto bg-amber-600">Salva</Button>
                        <Button variant="ghost" onClick={() => setEditingId(null)} className="py-1 text-[10px] h-auto">Annulla</Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Rapportino</span>
                          {renderGpsStatus("Rep", report?.coords)}
                        </div>
                        <div className="text-lg font-bold text-slate-800">{report ? formatTime(report.timestamp) : '---'}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceLog;
