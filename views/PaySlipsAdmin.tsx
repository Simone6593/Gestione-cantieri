
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, UserRole, PaySlip, Company, AttendanceRecord } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import { Upload, FileText, Trash2, User as UserIcon, AlertTriangle, Calculator, Info, ClockAlert, Lock, LockOpen, Edit3 } from 'lucide-react';

interface PaySlipsAdminProps {
  currentUser: User;
  users: User[];
}

const PaySlipsAdmin: React.FC<PaySlipsAdminProps> = ({ currentUser, users }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [companyParams, setCompanyParams] = useState<any>(null);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  
  // Dati LUL per calcolo costi
  const [competenzeLorde, setCompetenzeLorde] = useState('');
  const [imponibileInps, setImponibileInps] = useState('');
  const [imponibileInail, setImponibileInail] = useState('');
  const [oreRetribuite, setOreRetribuite] = useState('');
  
  // Stato per l'editing manuale
  const [isManualEdit, setIsManualEdit] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [paySlips, setPaySlips] = useState<PaySlip[]>([]);

  const workers = users.filter(u => u.role === UserRole.WORKER);
  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    const fetchInitialData = async () => {
      const docRef = doc(db, 'aziende', currentUser.aziendaId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setCompanyParams((snap.data() as Company).costParameters);
      }

      const qAtt = query(collection(db, 'timbrature'), where('aziendaId', '==', currentUser.aziendaId));
      const attSnap = await getDocs(qAtt);
      setAllAttendance(attSnap.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord)));
    };
    fetchInitialData();

    const qPs = query(collection(db, 'pay_slips_data'), where('aziendaId', '==', currentUser.aziendaId));
    const unsubscribe = onSnapshot(qPs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaySlip));
      data.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
      setPaySlips(data);
    });

    return () => unsubscribe();
  }, [currentUser.aziendaId]);

  const appHoursForMonth = useMemo(() => {
    if (!selectedUser) return 0;
    const monthStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
    return allAttendance
      .filter(a => a.userId === selectedUser && a.startTime.includes(monthStr) && a.endTime)
      .reduce((sum, a) => {
        const h = (new Date(a.endTime!).getTime() - new Date(a.startTime).getTime()) / (1000 * 60 * 60);
        return sum + h;
      }, 0);
  }, [selectedUser, selectedMonth, selectedYear, allAttendance]);

  const showHoursAlert = useMemo(() => {
    const retribuite = Number(oreRetribuite) || 0;
    if (retribuite === 0 || appHoursForMonth === 0) return false;
    const diff = Math.abs(retribuite - appHoursForMonth);
    return (diff / retribuite) > 0.10;
  }, [oreRetribuite, appHoursForMonth]);

  const calculations = useMemo(() => {
    if (!companyParams) return { cassaEdile: 0, altriCosti: 0, costoTotale: 0, costoOrario: 0 };
    
    const lordo = Number(competenzeLorde) || 0;
    const inpsBase = Number(imponibileInps) || 0;
    const inailBase = Number(imponibileInail) || 0;

    const cassaEdile = inpsBase * (companyParams.cassaEdileRate / 100);
    const inpsAzienda = inpsBase * (companyParams.inpsRate / 100);
    const inailAzienda = inailBase * (companyParams.inailRate / 100);
    const tfr = lordo / (companyParams.tfrDivisor || 13.5);

    const costoExtra = inpsAzienda + inailAzienda + tfr + cassaEdile;
    const costoTotale = lordo + costoExtra;
    const costoOrario = appHoursForMonth > 0 ? costoTotale / appHoursForMonth : 0;

    return {
      cassaEdile,
      altriCosti: inpsAzienda + inailAzienda + tfr,
      costoTotale,
      costoOrario
    };
  }, [competenzeLorde, imponibileInps, imponibileInail, companyParams, appHoursForMonth]);

  // Simula l'estrazione dati dal PDF
  const simulateExtraction = (file: File) => {
    setIsExtracting(true);
    // In un'app reale qui useremmo pdf.js o un servizio OCR
    setTimeout(() => {
      // Valori di esempio simulati basati su un'estrazione tipica
      setCompetenzeLorde("2823.08");
      setImponibileInps("2534.00");
      setImponibileInail("2533.96");
      setOreRetribuite("160");
      setIsExtracting(false);
      setIsManualEdit(false); // Blocca editing dopo estrazione
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile) {
      simulateExtraction(selectedFile);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (!selectedUser || !file) {
      alert("Seleziona dipendente e file PDF.");
      return;
    }

    setIsUploading(true);
    try {
      const worker = users.find(u => u.id === selectedUser);
      const base64Data = await fileToBase64(file);
      const monthStr = `${selectedMonth.toString().padStart(2, '0')}/${selectedYear}`;
      const fileName = `${monthStr.replace('/', '-')}_${worker?.lastName}.pdf`;

      await addDoc(collection(db, 'pay_slips_data'), {
        aziendaId: currentUser.aziendaId,
        userId: selectedUser,
        userName: `${worker?.firstName} ${worker?.lastName}`,
        month: monthStr,
        fileName,
        fileData: base64Data,
        competenzeLorde: Number(competenzeLorde) || 0,
        imponibileInps: Number(imponibileInps) || 0,
        imponibileInail: Number(imponibileInail) || 0,
        oreRetribuite: Number(oreRetribuite) || 0,
        costoOrarioReale: calculations.costoOrario,
        uploadDate: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        acceptedDate: null,
        status: 'In attesa'
      });

      alert("Busta paga archiviata con successo!");
      setCompetenzeLorde('');
      setImponibileInps('');
      setImponibileInail('');
      setOreRetribuite('');
      setFile(null);
    } catch (error: any) {
      alert("Errore salvataggio: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Eliminare questa busta paga?")) {
      await deleteDoc(doc(db, 'pay_slips_data', id));
    }
  };

  const openPdf = (base64Data?: string) => {
    if (!base64Data) return;
    const win = window.open();
    if (win) win.document.write(`<iframe src="${base64Data}" frameborder="0" style="border:0; width:100%; height:100%;"></iframe>`);
  };

  // Helper per visualizzare i box dati nello stile richiesto
  const DataBox = ({ label, value, prefix = '€' }: { label: string, value: string | number, prefix?: string }) => (
    <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-center animate-in fade-in duration-500">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="font-mono font-bold text-slate-700 text-lg">
        {prefix} {typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </div>
  );

  return (
    <div className="space-y-8">
      {showHoursAlert && (
        <Card className="p-4 bg-amber-50 border-amber-200 flex items-start gap-4 animate-in slide-in-from-top-2">
          <ClockAlert className="text-amber-600 shrink-0" size={24} />
          <div>
            <h4 className="font-bold text-amber-900">Alert Coerenza Ore</h4>
            <p className="text-sm text-amber-800">
              Le ore in busta paga ({oreRetribuite}h) differiscono significativamente dalle timbrature registrate ({appHoursForMonth.toFixed(2)}h). 
              Verificare i dati prima di procedere.
            </p>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Upload className="text-blue-600" /> Caricamento LUL & Calcolo Costi
        </h3>
        
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Dipendente</label>
              <select 
                value={selectedUser} 
                onChange={e => setSelectedUser(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              >
                <option value="">Seleziona...</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Mese</label>
              <select 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Anno</label>
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calculator size={14} /> Dati LUL (Estratti Automaticamente)
              </h4>
              <div className="flex items-center gap-4">
                {selectedUser && (
                  <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Ore App: {appHoursForMonth.toFixed(2)}h
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => setIsManualEdit(!isManualEdit)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isManualEdit ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  {isManualEdit ? <LockOpen size={14} /> : <Lock size={14} />}
                  {isManualEdit ? 'Editing Attivo' : 'Abilita Modifica'}
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Box dei dati estratti/editabili */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {isManualEdit ? (
                  <>
                    <Input label="Lordo (€)" type="number" value={competenzeLorde} onChange={e => setCompetenzeLorde(e.target.value)} required />
                    <Input label="Imp. INPS (€)" type="number" value={imponibileInps} onChange={e => setImponibileInps(e.target.value)} required />
                    <Input label="Imp. INAIL (€)" type="number" value={imponibileInail} onChange={e => setImponibileInail(e.target.value)} required />
                    <Input label="Ore LUL" type="number" value={oreRetribuite} onChange={e => setOreRetribuite(e.target.value)} required />
                  </>
                ) : (
                  <>
                    <DataBox label="Compenso Lordo" value={competenzeLorde || '0.00'} />
                    <DataBox label="Imponibile INPS" value={imponibileInps || '0.00'} />
                    <DataBox label="Imponibile INAIL" value={imponibileInail || '0.00'} />
                    <DataBox label="Ore Retribuite" value={oreRetribuite || '0'} prefix="h" />
                  </>
                )}
              </div>

              {/* Box dei costi calcolati/stati */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cassa Edile (Ditta)</span>
                  <span className="font-mono font-bold text-slate-700 text-lg">€ {calculations.cassaEdile.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Oneri Riflessi & TFR</span>
                  <span className="font-mono font-bold text-slate-700 text-lg">€ {calculations.altriCosti.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-blue-600 rounded-xl border border-blue-700 flex flex-col justify-center text-white shadow-md">
                  <span className="text-[9px] font-bold text-blue-100 uppercase tracking-widest">Costo Orario Reale</span>
                  <span className="font-mono font-bold text-2xl">€ {calculations.costoOrario.toFixed(2)}/h</span>
                </div>
              </div>
            </div>

            {isExtracting && (
              <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-center gap-3 animate-pulse">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-blue-700">Analisi PDF ed estrazione dati LUL in corso...</span>
              </div>
            )}
            
            {!companyParams && (
              <p className="mt-3 text-[10px] text-amber-600 flex items-center gap-1 font-bold">
                <Info size={12}/> Configura i parametri costo in 'Opzioni' per l'analisi completa.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">File PDF Cedolino</label>
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handleFileChange}
                className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>
            <Button type="submit" disabled={isUploading || isExtracting} className="w-full h-11">
              {isUploading ? "Salvataggio..." : "Archivia Busta Paga e Costi"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> Registro Storico Costi
        </h3>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-600">Dipendente</th>
                <th className="p-4 font-bold text-slate-600">Mese</th>
                <th className="p-4 font-bold text-slate-600 text-center">Ore LUL/App</th>
                <th className="p-4 font-bold text-slate-600">Costo Orario</th>
                <th className="p-4 font-bold text-slate-600 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paySlips.map((ps) => (
                <tr key={ps.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-semibold text-slate-700">{ps.userName}</td>
                  <td className="p-4 font-mono text-slate-600">{ps.month}</td>
                  <td className="p-4 text-center">
                    <span className="text-[10px] font-bold text-slate-500">{ps.oreRetribuite}h</span>
                  </td>
                  <td className="p-4 font-bold text-blue-600">€ {ps.costoOrarioReale?.toFixed(2)}/h</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openPdf(ps.fileData)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><FileText size={16} /></button>
                      <button onClick={() => handleDelete(ps.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaySlipsAdmin;
