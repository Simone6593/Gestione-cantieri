
import React, { useState, useMemo } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { AttendanceRecord, DailyReport, User, UserRole, Site, PaySlip, Company, DailySchedule } from '../types';
import { Clock, MapPin, Calendar, Trash2, Search, CheckCircle2, Calculator, Info, Edit2, Save, History, Map as MapIcon, AlertTriangle, AlertCircle, Users, ClipboardCheck } from 'lucide-react';

interface AttendanceLogProps {
  currentUser: User;
  attendance: AttendanceRecord[];
  reports: DailyReport[];
  sites: Site[];
  schedules: Record<string, DailySchedule>;
  workers: User[];
  onRemoveRecord: (id: string) => void;
  onUpdateRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  company?: Company;
  paySlips?: PaySlip[];
}

const AttendanceLog: React.FC<AttendanceLogProps> = ({ 
  currentUser, attendance, reports, sites, schedules, workers, onRemoveRecord, onUpdateRecord, company, paySlips = [] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCostAnalysis, setShowCostAnalysis] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ startTime: string, endTime: string }>({ startTime: '', endTime: '' });
  
  const canEdit = currentUser.role === UserRole.ADMIN;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; 
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const filteredAttendance = attendance
    .filter(a => {
      const matchesSearch = a.userName.toLowerCase().includes(searchTerm.toLowerCase()) || a.siteName.toLowerCase().includes(searchTerm.toLowerCase());
      const recordDate = new Date(a.startTime).toISOString().split('T')[0];
      const matchesDate = filterDate ? recordDate === filterDate : true;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Logica di Audit: Controlla chi doveva esserci e chi manca
  const auditSummary = useMemo(() => {
    if (!filterDate) return null;
    const schedule = schedules[filterDate];
    if (!schedule) return null;

    const scheduledWorkerIds = new Set<string>();
    Object.values(schedule.siteAssignments).forEach(ids => (ids as string[]).forEach(id => scheduledWorkerIds.add(id)));

    const clockedInWorkerIds = new Set(
      attendance
        .filter(a => new Date(a.startTime).toISOString().split('T')[0] === filterDate)
        .map(a => a.userId)
    );

    const missingClockIns = Array.from(scheduledWorkerIds).filter(id => !clockedInWorkerIds.has(id));
    
    const missingClockOuts = attendance.filter(a => {
      const isToday = new Date(a.startTime).toISOString().split('T')[0] === filterDate;
      if (!isToday || a.endTime) return false;
      const hoursActive = (new Date().getTime() - new Date(a.startTime).getTime()) / (1000 * 60 * 60);
      return hoursActive > 10; 
    });

    return {
      totalScheduled: scheduledWorkerIds.size,
      totalClocked: clockedInWorkerIds.size,
      missingIns: missingClockIns.map(id => workers.find(w => w.id === id)).filter(Boolean) as User[],
      missingOuts: missingClockOuts
    };
  }, [filterDate, schedules, attendance, workers]);

  const getLinkedReport = (record: AttendanceRecord) => {
    const recordDate = new Date(record.startTime).toISOString().split('T')[0];
    return reports.find(r => r.siteId === record.siteId && r.compilerId === record.userId && r.date === recordDate);
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

  const renderGpsInfo = (label: string, recordCoords?: { lat: number, lng: number }, siteCoords?: { latitude: number, longitude: number }) => {
    if (!recordCoords) return <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-[8px] font-bold text-slate-400 uppercase border border-slate-200"><MapPin size={10} /> {label} NO-GPS</div>;

    let distanceText = "Pos. OK";
    let statusClass = "bg-green-50 text-green-600 border-green-200";
    let Icon = CheckCircle2;

    if (siteCoords) {
      const dist = calculateDistance(recordCoords.lat, recordCoords.lng, siteCoords.latitude, siteCoords.longitude);
      distanceText = dist < 1000 ? `${Math.round(dist)}m dal cantiere` : `${(dist/1000).toFixed(1)}km dal cantiere`;
      if (dist > 1000) { statusClass = "bg-red-50 text-red-600 border-red-200"; Icon = AlertTriangle; }
      else if (dist > 250) { statusClass = "bg-amber-50 text-amber-600 border-amber-200"; Icon = Info; }
    }

    return <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${statusClass}`} title={`Coordinate: ${recordCoords.lat.toFixed(6)}, ${recordCoords.lng.toFixed(6)}`}><Icon size={10} /> {label}: {distanceText}</div>;
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
      if (!originalRecord.originalStartTime) updates.originalStartTime = originalRecord.startTime;
      if (originalRecord.endTime && !originalRecord.originalEndTime) updates.originalEndTime = originalRecord.endTime;
      await onUpdateRecord(editingId, updates);
      setEditingId(null);
    } catch (e) { alert("Errore durante la modifica."); }
  };

  return (
    <div className="space-y-6">
      {/* Alert di Consistenza Timbrature per Amministratori */}
      {auditSummary && (auditSummary.missingIns.length > 0 || auditSummary.missingOuts.length > 0) && (
        <Card className="p-5 bg-white border-l-4 border-l-red-500 animate-in slide-in-from-top-4 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-2 rounded-xl text-red-600">
              <AlertCircle size={28} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Verifica Consistenza Turni</h4>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{new Date(filterDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-red-600 uppercase tracking-widest">Copertura</div>
                  <div className="text-2xl font-black text-slate-800">{auditSummary.totalClocked}/{auditSummary.totalScheduled}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {auditSummary.missingIns.length > 0 && (
                  <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                    <div className="flex items-center gap-2 mb-2 text-red-700">
                      <Users size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mancato Ingresso</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {auditSummary.missingIns.map(u => (
                        <span key={u.id} className="text-[11px] font-bold text-red-700 bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-sm">
                          {u.firstName} {u.lastName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {auditSummary.missingOuts.length > 0 && (
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-2 text-amber-700">
                      <Clock size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mancata Uscita (&gt;10h)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {auditSummary.missingOuts.map(a => (
                        <span key={a.id} className="text-[11px] font-bold text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm">
                          {a.userName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {auditSummary && auditSummary.missingIns.length === 0 && auditSummary.missingOuts.length === 0 && auditSummary.totalScheduled > 0 && (
        <Card className="p-4 bg-green-50 border-green-100 flex items-center gap-3 shadow-sm">
          <div className="bg-green-100 p-1.5 rounded-full text-green-600"><ClipboardCheck size={20} /></div>
          <span className="text-xs font-bold text-green-800 uppercase tracking-widest">Tutti i dipendenti programmati hanno timbrato correttamente per oggi.</span>
        </Card>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-xl font-bold text-slate-800">Registro Timbrature</h2><p className="text-sm text-slate-500">Log cronologico con verifica distanza GPS e ricalcolo costi automatico.</p></div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {canEdit && <Button onClick={() => setShowCostAnalysis(!showCostAnalysis)} variant={showCostAnalysis ? "primary" : "secondary"} className="h-10"><Calculator size={18} /> {showCostAnalysis ? "Nascondi Costi" : "Analisi Costi"}</Button>}
          <div className="relative flex-1 sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Cerca operaio o cantiere..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"/></div>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {filteredAttendance.map(record => {
          const report = getLinkedReport(record);
          const hours = calculateHours(record.startTime, record.endTime);
          const analysis = costAnalysis[record.id];
          const isEditing = editingId === record.id;
          const site = sites.find(s => s.id === record.siteId);
          return (
            <Card key={record.id} className={`p-4 border-l-4 transition-all hover:shadow-md ${isEditing ? 'border-amber-500 bg-amber-50/50' : 'border-blue-600 bg-white'}`}>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase mb-2 tracking-widest"><Calendar size={12}/> {new Date(record.startTime).toLocaleDateString('it-IT')}</div>
                  <h3 className="font-bold text-slate-800 text-lg">{record.userName}</h3>
                  <p className="text-xs font-medium text-slate-500 truncate mb-3">{record.siteName}</p>
                  <div className="flex items-center gap-2 mb-4"><span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{hours.toFixed(2)}h totali</span>{record.originalStartTime && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-amber-200"><History size={10}/> MOD</span>}</div>
                  {showCostAnalysis && analysis && <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm animate-in fade-in zoom-in duration-300"><div className="text-[10px] font-bold uppercase text-blue-100 mb-1">Costo Commessa</div><div className="text-lg font-mono font-bold">€ {analysis.totalRealCost.toFixed(2)}</div><div className="text-[9px] opacity-70 mt-1 italic">Basato su LUL del mese</div></div>}
                  {canEdit && !isEditing && <div className="mt-4 flex gap-4"><button onClick={() => startEditing(record)} className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase hover:text-blue-800 transition-colors"><Edit2 size={12} /> Modifica</button><button onClick={() => confirm("Eliminare definitivamente?") && onRemoveRecord(record.id)} className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase hover:text-red-700 transition-colors"><Trash2 size={12} /> Elimina</button></div>}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${isEditing ? 'bg-white border-amber-300' : 'bg-slate-50 border-slate-100'}`}><div><span className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Ingresso</span>{isEditing ? <input type="datetime-local" value={editData.startTime} onChange={e => setEditData({...editData, startTime: e.target.value})} className="w-full text-xs font-bold bg-transparent border-b border-amber-200 py-1 outline-none" /> : <div className="text-xl font-bold text-slate-800">{formatTime(record.startTime)}</div>}</div><div className="mt-3">{renderGpsInfo("App", record.startCoords, site?.coords)}</div></div>
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${isEditing ? 'bg-white border-amber-300' : 'bg-slate-50 border-slate-100'}`}><div><span className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Uscita</span>{isEditing ? <input type="datetime-local" value={editData.endTime} onChange={e => setEditData({...editData, endTime: e.target.value})} className="w-full text-xs font-bold bg-transparent border-b border-amber-200 py-1 outline-none" /> : <div className="text-xl font-bold text-slate-800">{formatTime(record.endTime)}</div>}</div><div className="mt-3">{renderGpsInfo("Out", record.endCoords, site?.coords)}</div></div>
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${isEditing ? 'bg-amber-200' : (report ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-60')}`}>{isEditing ? <div className="h-full flex flex-col gap-2 justify-center"><Button onClick={() => handleSaveEdit(record)} className="py-2 text-[11px] font-bold h-auto bg-amber-600">Salva</Button><Button variant="ghost" onClick={() => setEditingId(null)} className="py-2 text-[11px] font-bold h-auto">Annulla</Button></div> : <><div><span className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Rapportino</span><div className="text-xl font-bold text-slate-800">{report ? formatTime(report.timestamp) : 'Mancante'}</div></div><div className="mt-3">{renderGpsInfo("Rep", report?.coords, site?.coords)}</div></>}</div>
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
