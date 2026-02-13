
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, UserRole, PaySlip } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Upload, FileText, Trash2, User as UserIcon, AlertTriangle, Calculator } from 'lucide-react';

interface PaySlipsAdminProps {
  currentUser: User;
  users: User[];
}

const PaySlipsAdmin: React.FC<PaySlipsAdminProps> = ({ currentUser, users }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Campi LUL per calcolo costi
  const [competenzeLorde, setCompetenzeLorde] = useState('');
  const [imponibileInps, setImponibileInps] = useState('');
  const [imponibileInail, setImponibileInail] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [paySlips, setPaySlips] = useState<PaySlip[]>([]);

  const workers = users.filter(u => u.role === UserRole.WORKER);
  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    const q = query(
      collection(db, 'pay_slips_data'),
      where('aziendaId', '==', currentUser.aziendaId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaySlip));
      data.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
      setPaySlips(data);
    });

    return () => unsubscribe();
  }, [currentUser.aziendaId]);

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
    
    if (!auth.currentUser) {
      alert("Errore: Utente non autenticato.");
      return;
    }

    if (!selectedUser || !file) {
      alert("Seleziona dipendente e file PDF.");
      return;
    }

    const MAX_SIZE = 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("Il file è troppo grande! Limite 1MB.");
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
        uploadDate: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        acceptedDate: null,
        status: 'In attesa'
      });

      alert("Busta paga archiviata con successo!");
      setSelectedUser('');
      setFile(null);
      setCompetenzeLorde('');
      setImponibileInps('');
      setImponibileInail('');
    } catch (error: any) {
      console.error("ERRORE SALVATAGGIO:", error);
      alert("Errore durante il salvataggio: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questa busta paga?")) {
      await deleteDoc(doc(db, 'pay_slips_data', id));
    }
  };

  const openPdf = (base64Data?: string) => {
    if (!base64Data) return;
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${base64Data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Upload className="text-blue-600" /> Archivia Busta Paga e Dati Costi
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
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Anno</label>
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calculator size={14} /> Dati LUL per Analisi Costi
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Competenze Lorde (€)" type="number" value={competenzeLorde} onChange={e => setCompetenzeLorde(e.target.value)} placeholder="es. 2823.08" />
              <Input label="Imponibile INPS (€)" type="number" value={imponibileInps} onChange={e => setImponibileInps(e.target.value)} placeholder="es. 2534.00" />
              <Input label="Imponibile INAIL (€)" type="number" value={imponibileInail} onChange={e => setImponibileInail(e.target.value)} placeholder="es. 2533.96" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 flex justify-between">
                File PDF (Base64)
                {file && (
                  <span className={`text-[10px] ${file.size > 1024*1024 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                    {(file.size / 1024).toFixed(1)} KB / 1024 KB
                  </span>
                )}
              </label>
              <input 
                type="file" 
                accept="application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>

            <Button type="submit" disabled={isUploading} className="w-full h-11">
              {isUploading ? "Salvataggio..." : "Archivia Documento"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> Storico Buste Paga Archiviate
        </h3>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-600">Dipendente</th>
                <th className="p-4 font-bold text-slate-600">Mese</th>
                <th className="p-4 font-bold text-slate-600">Dati Costi</th>
                <th className="p-4 font-bold text-slate-600">Stato</th>
                <th className="p-4 font-bold text-slate-600 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paySlips.map((ps) => (
                <tr key={ps.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-semibold text-slate-700">{ps.userName}</td>
                  <td className="p-4 font-mono text-slate-600">{ps.month}</td>
                  <td className="p-4">
                    {ps.competenzeLorde ? (
                      <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Presenti</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Assenti</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ps.status === 'Accettata' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ps.status}
                    </span>
                  </td>
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
