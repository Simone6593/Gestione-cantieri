
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, UserRole, PaySlip } from '../types';
import { db, storage } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, FileText, CheckCircle, Clock, Trash2, Calendar, User as UserIcon } from 'lucide-react';

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
    const q = query(
      collection(db, 'pay_slips'),
      where('aziendaId', '==', currentUser.aziendaId),
      orderBy('uploadDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPaySlips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaySlip)));
    });

    return () => unsubscribe();
  }, [currentUser.aziendaId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !month || !file) {
      alert("Seleziona utente, mese e file PDF.");
      return;
    }

    setIsUploading(true);
    try {
      const worker = users.find(u => u.id === selectedUser);
      const fileName = `${month.replace('/', '-')}_${Date.now()}.pdf`;
      const storageRef = ref(storage, `pay_slips/${selectedUser}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(snapshot.ref);

      await addDoc(collection(db, 'pay_slips'), {
        aziendaId: currentUser.aziendaId,
        userId: selectedUser,
        userName: `${worker?.firstName} ${worker?.lastName}`,
        month,
        fileUrl,
        uploadDate: new Date().toISOString(),
        acceptedDate: null,
        status: 'In attesa'
      });

      alert("Busta paga caricata correttamente!");
      setSelectedUser('');
      setMonth('');
      setFile(null);
    } catch (error: any) {
      console.error(error);
      alert("Errore durante il caricamento: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questa busta paga?")) {
      await deleteDoc(doc(db, 'pay_slips', id));
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Upload className="text-blue-600" /> Invia Nuova Busta Paga
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
            placeholder="es. 10/2023"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">File PDF</label>
            <input 
              type="file" 
              accept="application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
          </div>

          <Button type="submit" disabled={isUploading} className="w-full">
            {isUploading ? "Caricamento..." : "Invia File"}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> Storico Caricamenti
        </h3>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-600">Dipendente</th>
                <th className="p-4 font-bold text-slate-600">Mese</th>
                <th className="p-4 font-bold text-slate-600">Caricato il</th>
                <th className="p-4 font-bold text-slate-600">Stato</th>
                <th className="p-4 font-bold text-slate-600">Accettato il</th>
                <th className="p-4 font-bold text-slate-600 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paySlips.map((ps) => (
                <tr key={ps.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-semibold">
                      <UserIcon size={14} className="text-slate-400" />
                      {ps.userName}
                    </div>
                  </td>
                  <td className="p-4 font-mono">{ps.month}</td>
                  <td className="p-4 text-slate-500">{new Date(ps.uploadDate).toLocaleDateString('it-IT')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ps.status === 'Accettata' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ps.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">
                    {ps.acceptedDate ? new Date(ps.acceptedDate).toLocaleDateString('it-IT') : '---'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => window.open(ps.fileUrl, '_blank')}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Visualizza"
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
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Nessuna busta paga caricata finora.
                  </td>
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
