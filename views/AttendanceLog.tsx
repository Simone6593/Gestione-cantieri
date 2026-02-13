
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
      const recordMonth = recordDate.getMonth() + 1;
      const recordYear = recordDate.getFullYear();
      const monthKey = `${recordMonth.toString().padStart(2, '0')}/${recordYear}`;
      
      const ps = paySlips.find(p => p.userId === record.userId && p.month === monthKey);
      
      if (ps && ps.costoOrarioReale) {
        analysisMap[record.id] = {
          totalHours: hours,
          realHourlyRate: ps.costoOrarioReale,
          totalRealCost: hours * ps.costoOrarioReale
        };
      }
    });

    return analysisMap;
  }, [filteredAttendance, paySlips]);

  const renderGpsIndicator = (workerCoords?: { lat: number, lng: number }) => {
    if (!workerCoords) return <div className="w-3 h-3 rounded-full bg-slate-200" title="GPS non disponibile" />;
    return (
      <span title="GPS OK">
        <CheckCircle2 size={12} className="text-green-500" />
      </span>
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

      // Se è la prima modifica manuale, salviamo gli orari originali dell'app
      if (!originalRecord.originalStartTime) {
        updates.originalStartTime = originalRecord.startTime;
      }
      if (originalRecord.endTime && !originalRecord.originalEndTime) {
        updates.originalEndTime = originalRecord.endTime;
      }

      await onUpdateRecord(editingId, updates);
      setEditingId(null);
    } catch (e) {
      alert("Errore durante l'aggiornamento della timbratura.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Registro Timbrature</h2>
          <p className="text-sm text-slate-500">Log cronologico con analisi costi per commessa.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {canEdit && (
            <Button 
              onClick={() => setShowCostAnalysis(!showCostAnalysis)} 
              variant={showCostAnalysis ? "primary" : "secondary"}
              className="border border-slate-200"
            >
              <Calculator size={18} /> {showCostAnalysis ? "Nascondi Costi" : "Analisi Costi"}
            </Button>
          )}

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
          
          <input 
            type="date" 
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAttendance.map(record => {
          const report = getLinkedReport(record);
          const hours = calculateHours(record.startTime, record.endTime);
          const analysis = costAnalysis ? costAnalysis[record.id] : null;
          const isEditing = editingId === record.id;
          const hasBeenEdited = !!record.originalStartTime;
          
          return (
            <Card key={record.id} className={`p-4 bg-white hover:border-blue-200 transition-all border-l-4 ${isEditing ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-blue-600'}`}>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/4">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase mb-1">
                    <Calendar size={14} />
                    {new Date(record.startTime).toLocaleDateString('it-IT')}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">{record.userName}</h3>
                  <p className="text-sm text-slate-500 font-medium truncate">{record.siteName}</p>
                  
                  <div className="mt-3 flex flex-col gap-1">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      Ore: <span className="text-slate-800">{hours.toFixed(2)}h</span>
                      {hasBeenEdited && (
                        <span title="Modificato manualmente">
                          <History size={12} className="text-amber-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  {showCostAnalysis && analysis && (
                    <div className="mt-4 p-2 bg-blue-50 rounded border border-blue-100 animate-in fade-in duration-300">
                      <div className="flex justify-between text-[10px] text-blue-600 font-bold uppercase mb-1">
                        <span>Costo Orario</span>
                        <span>€ {analysis.realHourlyRate.toFixed(2)}/h</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-800 font-bold">
                        <span>Costo Commessa</span>
                        <span>€ {analysis.totalRealCost.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {canEdit && !isEditing && (
                    <div className="mt-4 flex gap-3">
                      <button onClick={() => startEditing(record)} className="text-[10px] text-blue-600 uppercase font-bold tracking-widest hover:underline flex items-center gap-1">
                        <Edit2 size={12} /> Modifica
                      </button>
                      <button onClick={() => confirm("Eliminare?") && onRemoveRecord(record.id)} className="text-[10px] text-red-500 uppercase font-bold tracking-widest hover:underline flex items-center gap-1">
                        <Trash2 size={12} /> Elimina
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`space-y-1 p-3 rounded-lg border ${isEditing ? 'bg-white border-amber-200 ring-2 ring-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <span className="flex items-center gap-1">Inizio {hasBeenEdited && <span className="text-[8px] text-amber-600">(MOD)</span>}</span>
                      {renderGpsIndicator(record.startCoords)}
                    </div>
                    {isEditing ? (
                      <input type="datetime-local" value={editData.startTime} onChange={e => setEditData({...editData, startTime: e.target.value})} className="w-full text-sm font-bold bg-transparent outline-none text-slate-800" />
                    ) : (
                      <div className="flex flex-col">
                        <div className="text-lg font-bold text-slate-800">{formatTime(record.startTime)}</div>
                        {record.originalStartTime && <div className="text-[9px] text-slate-400 font-mono italic">Orig: {formatTime(record.originalStartTime)}</div>}
                      </div>
                    )}
                  </div>

                  <div className={`space-y-1 p-3 rounded-lg border ${isEditing ? 'bg-white border-amber-200 ring-2 ring-amber-100' : (record.endTime ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-100')}`}>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <span className="flex items-center gap-1">Fine {hasBeenEdited && <span className="text-[8px] text-amber-600">(MOD)</span>}</span>
                      {renderGpsIndicator(record.endCoords)}
                    </div>
                    {isEditing ? (
                      <input type="datetime-local" value={editData.endTime} onChange={e => setEditData({...editData, endTime: e.target.value})} className="w-full text-sm font-bold bg-transparent outline-none text-slate-800" />
                    ) : (
                      <div className="flex flex-col">
                        <div className="text-lg font-bold text-slate-800">{formatTime(record.endTime)}</div>
                        {record.originalEndTime && <div className="text-[9px] text-slate-400 font-mono italic">Orig: {formatTime(record.originalEndTime)}</div>}
                      </div>
                    )}
                  </div>

                  <div className={`space-y-1 p-3 rounded-lg border ${isEditing ? 'flex items-center justify-center bg-amber-500 text-white' : (report ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-60')}`}>
                    {isEditing ? (
                      <div className="flex gap-2 w-full">
                        <button onClick={() => handleSaveEdit(record)} className="flex-1 bg-white text-amber-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm"><Save size={14} /> Salva</button>
                        <button onClick={() => setEditingId(null)} className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-bold text-xs">Annulla</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                          <span>Rapportino</span>
                          {renderGpsIndicator(report?.coords)}
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
