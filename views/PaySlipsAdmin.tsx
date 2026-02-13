
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, UserRole, PaySlip } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Upload, FileText, Trash2, User as UserIcon, AlertTriangle, FileWarning } from 'lucide-react';

interface PaySlipsAdminProps {
  currentUser: User;
  users: User[];
}

const PaySlipsAdmin: React.FC<PaySlipsAdminProps> = ({ currentUser, users }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [month, setMonth] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [paySlips, setPaySlips] = useState<PaySlip[]>([]);

  const workers = users.filter(u => u.role === UserRole.WORKER);

  useEffect(() => {
    // Carichiamo i dati dalla nuova collezione pay_slips_data
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

    if (!selectedUser || !month || !file) {
      alert("Seleziona dipendente, mese e file PDF.");
      return;
    }

    // Limite di 1MB per i documenti Firestore
    const MAX_SIZE = 1024 * 1024; // 1MB in bytes
    if (file.size > MAX_SIZE) {
      alert("Il file è troppo grande! Il limite massimo è 1MB per l'archiviazione diretta in database. Comprimi il PDF o usa un file più piccolo.");
      return;
    }

    setIsUploading(true);
    try {
      const worker = users.find(u => u.id === selectedUser);
      const base64Data = await fileToBase64(file);
      const fileName = `${month.replace('/', '-')}_${worker?.lastName}.pdf`;

      // Salvataggio diretto su Firestore (collezione pay_slips_data)
      await addDoc(collection(db, 'pay_slips_data'), {
        aziendaId: currentUser.aziendaId,
        userId: selectedUser,
        userName: `${worker?.firstName} ${worker?.lastName}`,
        month,
        fileName,
        fileData: base64Data, // Salviamo la stringa Base64
        uploadDate: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        acceptedDate: null,
        status: 'In attesa'
      });

      alert("Busta paga salvata nel database con successo!");
      setSelectedUser('');
      setMonth('');
      setFile(null);
    } catch (error: any) {
      console.error("ERRORE SALVATAGGIO:", error);
      alert("Errore durante il salvataggio nel database: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questa busta paga dal database?")) {
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
          <Upload className="text-blue-600" /> Archivia Busta Paga (Base64)
        </h3>
        
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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

          <Input 
            label="Mese (MM/AAAA)" 
            value={month} 
            onChange={e => setMonth(e.target.value)} 
            placeholder="es. 02/2026"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700 flex justify-between">
              File PDF 
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

          <Button type="submit" disabled={isUploading} className="w-full">
            {isUploading ? "Salvataggio..." : "Archivia in DB"}
          </Button>
        </form>
        <p className="mt-4 text-[10px] text-slate-400 italic flex items-center gap-1">
          <AlertTriangle size={12} /> Nota: I file vengono salvati direttamente nel database Firestore. Limite massimo per file: 1MB.
        </p>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> Database Buste Paga
        </h3>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-600">Dipendente</th>
                <th className="p-4 font-bold text-slate-600">Mese</th>
                <th className="p-4 font-bold text-slate-600">Data Upload</th>
                <th className="p-4 font-bold text-slate-600">Stato</th>
                <th className="p-4 font-bold text-slate-600 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paySlips.map((ps) => (
                <tr key={ps.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                      <UserIcon size={14} className="text-slate-400" />
                      {ps.userName}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-600">{ps.month}</td>
                  <td className="p-4 text-slate-500">{new Date(ps.uploadDate).toLocaleDateString('it-IT')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ps.status === 'Accettata' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ps.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openPdf(ps.fileData)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Vedi PDF (Base64)"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ps.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Elimina"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paySlips.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">Nessuna busta paga archiviata in Firestore.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaySlipsAdmin;
