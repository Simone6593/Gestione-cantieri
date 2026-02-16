
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from '../components/Shared';
import { User, Site, DailySchedule, UserRole } from '../types';
import { Users, Construction, Heart, Umbrella, Send, Bell, ChevronLeft, ChevronRight, Calendar, ArrowLeftRight, Trash2, Eye, Layers } from 'lucide-react';
import { notifyNewAssignment } from '../services/notificationService';

interface ScheduleProps {
  currentUser: User;
  sites: Site[];
  workers: User[];
  schedules: Record<string, DailySchedule>;
  onUpdateSchedule: (date: string, schedule: DailySchedule) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ currentUser, sites, workers, schedules, onUpdateSchedule }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggingWorkerId, setDraggingWorkerId] = useState<string | null>(null);
  const [multiMode, setMultiMode] = useState(true); // Default true per permettere cantiere multiplo
  const touchStartX = useRef<number | null>(null);

  const isReadOnly = currentUser.role === UserRole.WORKER;
  const dateKey = currentDate.toISOString().split('T')[0];
  
  const currentSchedule: DailySchedule = schedules[dateKey] || {
    aziendaId: currentUser.aziendaId,
    date: dateKey,
    siteAssignments: {},
    offDuty: { holidays: [] as string[], sickness: [] as string[] },
    notes: {}
  };

  const activeSites = sites.filter(s => s.isActive);

  const navigateDate = (days: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + days);
    setCurrentDate(nextDate);
  };

  const handleDragStart = (e: React.DragEvent, workerId: string, sourceId?: string) => {
    if (isReadOnly) return;
    setDraggingWorkerId(workerId);
    e.dataTransfer.setData('workerId', workerId);
    if (sourceId) e.dataTransfer.setData('sourceId', sourceId);
    e.dataTransfer.effectAllowed = 'move';
    
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggingWorkerId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (isReadOnly) return;
    e.preventDefault();
    const workerId = e.dataTransfer.getData('workerId') || draggingWorkerId;
    const sourceId = e.dataTransfer.getData('sourceId');
    if (!workerId) return;

    const newAssignments = { ...currentSchedule.siteAssignments };
    const newOffDuty = { ...currentSchedule.offDuty };

    // Se stiamo spostando da un cantiere o se NON siamo in multiMode, rimuoviamo le altre assegnazioni
    if (sourceId || !multiMode || targetId === 'available' || targetId === 'ferie' || targetId === 'malattia') {
      Object.keys(newAssignments).forEach(key => {
        newAssignments[key] = (newAssignments[key] || []).filter(id => id !== workerId);
      });
      newOffDuty.holidays = (newOffDuty.holidays || []).filter(id => id !== workerId);
      newOffDuty.sickness = (newOffDuty.sickness || []).filter(id => id !== workerId);
    }

    if (targetId === 'ferie') {
      newOffDuty.holidays = [...(newOffDuty.holidays || []), workerId];
    } else if (targetId === 'malattia') {
      newOffDuty.sickness = [...(newOffDuty.sickness || []), workerId];
    } else if (targetId !== 'available') {
      // Aggiungi al cantiere target se non già presente
      const currentList = newAssignments[targetId] || [];
      if (!currentList.includes(workerId)) {
        newAssignments[targetId] = [...currentList, workerId];
      }
    }

    onUpdateSchedule(dateKey, {
      ...currentSchedule,
      siteAssignments: newAssignments,
      offDuty: newOffDuty
    });
    
    setDraggingWorkerId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const getWorkerAssignmentLocations = (workerId: string) => {
    const locations: string[] = [];
    for (const [siteId, workerIds] of Object.entries(currentSchedule.siteAssignments)) {
      if ((workerIds as string[]).includes(workerId)) {
        const site = sites.find(s => s.id === siteId);
        if (site) locations.push(site.client);
      }
    }
    if (currentSchedule.offDuty.holidays.includes(workerId)) locations.push('Ferie');
    if (currentSchedule.offDuty.sickness.includes(workerId)) locations.push('Malattia');
    return locations;
  };

  const shareOnWhatsApp = () => {
    let text = `*Programma CostruGest - ${currentDate.toLocaleDateString('it-IT')}*\n\n`;
    activeSites.forEach(site => {
      const assigned = workers.filter(w => (currentSchedule.siteAssignments[site.id] || []).includes(w.id));
      if (assigned.length > 0) {
        text += `🏗️ *${site.client}*:\n`;
        assigned.forEach(w => text += `  - ${w.firstName} ${w.lastName}\n`);
        if (currentSchedule.notes[site.id]) text += `  📝 Note: ${currentSchedule.notes[site.id]}\n`;
        text += "\n";
      }
    });

    const offDuty = [...(currentSchedule.offDuty.holidays || []), ...(currentSchedule.offDuty.sickness || [])];
    if (offDuty.length > 0) {
      text += "🏠 *Assenti*:\n";
      workers.filter(w => offDuty.includes(w.id)).forEach(w => text += `  - ${w.firstName} ${w.lastName}\n`);
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 select-none pb-20">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigateDate(-1)} className="p-2">
            <ChevronLeft size={24} />
          </Button>
          <div className="flex flex-col items-center min-w-[200px]">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={12} /> Programmazione
            </span>
            <span className="text-lg font-bold text-slate-800">
              {currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <Button variant="ghost" onClick={() => navigateDate(1)} className="p-2">
            <ChevronRight size={24} />
          </Button>
        </div>

        {!isReadOnly && (
          <div className="flex gap-2">
            <Button 
              variant={multiMode ? "primary" : "secondary"} 
              onClick={() => setMultiMode(!multiMode)}
              className="text-xs"
              title="Permette di assegnare un operaio a più cantieri trascinandolo dalla lista"
            >
              <Layers size={16} /> {multiMode ? "Multi-Cantiere Attivo" : "Modalità Singola"}
            </Button>
            <Button onClick={shareOnWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
              <Send size={18} /> WhatsApp
            </Button>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 ${isReadOnly ? '' : 'lg:grid-cols-4'} gap-6`}>
        {!isReadOnly && (
          <div className="lg:col-span-1 space-y-4">
            <Card 
              className={`p-4 bg-slate-900 text-white min-h-[500px] transition-all border-2 ${draggingWorkerId ? 'border-blue-500 border-dashed bg-slate-800' : 'border-transparent'}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'available')}
            >
              <h3 className="font-bold flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                <Users size={18} className="text-blue-400" /> 
                {draggingWorkerId ? 'Rimuovi Assegnazioni' : 'Operai'}
              </h3>
              <div className="space-y-2">
                {workers.map(worker => {
                  const assignedLocations = getWorkerAssignmentLocations(worker.id);
                  const isMulti = assignedLocations.length > 1;
                  
                  return (
                    <div
                      key={worker.id}
                      draggable={!isReadOnly}
                      onDragStart={(e) => handleDragStart(e, worker.id)}
                      onDragEnd={handleDragEnd}
                      className={`
                        p-3 rounded-lg text-left transition-all border
                        ${assignedLocations.length > 0 
                          ? 'bg-slate-800/80 border-slate-700 text-slate-300' 
                          : 'bg-slate-800 border-slate-700 shadow-sm'}
                        ${!isReadOnly ? 'cursor-grab active:cursor-grabbing hover:bg-slate-750 hover:border-blue-500' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 truncate">
                          <p className="font-bold text-sm truncate">{worker.firstName} {worker.lastName}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {assignedLocations.map((loc, i) => (
                              <span key={i} className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${isMulti ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                {loc}
                              </span>
                            ))}
                            {assignedLocations.length === 0 && <span className="text-[9px] text-green-500 font-bold uppercase tracking-tighter">Libero</span>}
                          </div>
                        </div>
                        {assignedLocations.length === 0 && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mt-1" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        <div className={`${isReadOnly ? 'w-full' : 'lg:col-span-3'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
          {activeSites.map(site => (
            <Card 
              key={site.id} 
              className={`p-4 border-2 transition-all min-h-[220px] flex flex-col ${draggingWorkerId ? 'border-blue-300 border-dashed bg-blue-50/50' : 'border-slate-100 bg-white shadow-sm'}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, site.id)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                  <Construction size={18} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="font-bold text-slate-800 leading-tight truncate">{site.client}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{site.address}</p>
                </div>
              </div>
              
              <div className="flex-1 flex flex-wrap gap-2 mb-4 content-start">
                {(currentSchedule.siteAssignments[site.id] || []).map((wId, idx) => {
                  const worker = workers.find(w => w.id === wId);
                  if (!worker) return null;
                  const otherSites = getWorkerAssignmentLocations(worker.id).filter(l => l !== site.client);
                  
                  return (
                    <div 
                      key={wId} 
                      draggable={!isReadOnly}
                      onDragStart={(e) => handleDragStart(e, worker.id, site.id)}
                      onDragEnd={handleDragEnd}
                      className={`group relative bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition-all ${!isReadOnly ? 'cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md' : ''}`}
                    >
                      <span className="text-[10px] text-slate-300 font-bold">{idx + 1}</span>
                      {worker.firstName} {worker.lastName}
                      {otherSites.length > 0 && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" title={`Anche in: ${otherSites.join(', ')}`} />}
                    </div>
                  );
                })}
                {(currentSchedule.siteAssignments[site.id] || []).length === 0 && (
                  <div className="w-full h-20 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase">
                    Trascina qui operai
                  </div>
                )}
              </div>

              <textarea 
                placeholder={isReadOnly ? "" : "Istruzioni per oggi..."}
                value={currentSchedule.notes[site.id] || ''}
                readOnly={isReadOnly}
                onChange={e => {
                  if (isReadOnly) return;
                  const newNotes = { ...currentSchedule.notes, [site.id]: e.target.value };
                  onUpdateSchedule(dateKey, { ...currentSchedule, notes: newNotes });
                }}
                className={`w-full bg-slate-50/50 p-2 text-xs rounded border border-slate-200 outline-none h-16 resize-none transition-all ${!isReadOnly ? 'focus:bg-white focus:ring-1 focus:ring-blue-500' : 'cursor-default'}`}
              />
            </Card>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
            <Card 
              className={`p-4 border-2 min-h-[140px] flex flex-col ${draggingWorkerId ? 'border-amber-300 border-dashed bg-amber-50/50' : 'border-slate-100 bg-white'}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'ferie')}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded flex items-center justify-center">
                  <Umbrella size={18} />
                </div>
                <h4 className="font-bold text-slate-800">Ferie</h4>
              </div>
              <div className="flex-1 flex flex-wrap gap-2 content-start">
                {(currentSchedule.offDuty.holidays || []).map(wId => {
                   const worker = workers.find(w => w.id === wId);
                   return worker ? (
                    <div 
                      key={wId} 
                      draggable={!isReadOnly}
                      onDragStart={(e) => handleDragStart(e, worker.id, 'ferie')}
                      onDragEnd={handleDragEnd}
                      className={`bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 shadow-sm transition-colors ${!isReadOnly ? 'cursor-grab active:cursor-grabbing hover:bg-amber-100' : ''}`}
                    >
                      {worker.firstName} {worker.lastName}
                    </div>
                   ) : null;
                })}
              </div>
            </Card>

            <Card 
              className={`p-4 border-2 min-h-[140px] flex flex-col ${draggingWorkerId ? 'border-red-300 border-dashed bg-red-50/50' : 'border-slate-100 bg-white'}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'malattia')}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-red-100 text-red-600 rounded flex items-center justify-center">
                  <Heart size={18} />
                </div>
                <h4 className="font-bold text-slate-800">Malattia</h4>
              </div>
              <div className="flex-1 flex flex-wrap gap-2 content-start">
                {(currentSchedule.offDuty.sickness || []).map(wId => {
                   const worker = workers.find(w => w.id === wId);
                   return worker ? (
                    <div 
                      key={wId} 
                      draggable={!isReadOnly}
                      onDragStart={(e) => handleDragStart(e, worker.id, 'malattia')}
                      onDragEnd={handleDragEnd}
                      className={`bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-800 shadow-sm transition-colors ${!isReadOnly ? 'cursor-grab active:cursor-grabbing hover:bg-red-100' : ''}`}
                    >
                      {worker.firstName} {worker.lastName}
                    </div>
                   ) : null;
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      <p className="text-center text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
        {isReadOnly ? "💡 Fai swipe per cambiare data" : "💡 Trascina dalla lista operai ai cantieri. In modalità Multi puoi aggiungerli a più siti."}
      </p>
    </div>
  );
};

export default Schedule;
