
import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/Shared';
import { User, PaySlip } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { FileText, CheckCircle, Clock, Download, ExternalLink, Calendar } from 'lucide-react';

interface PaySlipsWorkerProps {
  currentUser: User;
}

const PaySlipsWorker: React.FC<PaySlipsWorkerProps> = ({ currentUser }) => {
  const [paySlips, setPaySlips] = useState<PaySlip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'pay_slips'),
      where('userId', '==', currentUser.id),
      orderBy('uploadDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPaySlips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaySlip)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  const handleAccept = async (id: string) => {
    if (!confirm("Confermi di aver preso visione della busta paga?")) return;

    try {
      const psRef = doc(db, 'pay_slips', id);
      await updateDoc(psRef, {
        acceptedDate: new Date().toISOString(),
        status: 'Accettata'
      });
      alert("Busta paga accettata correttamente.");
    } catch (error) {
      alert("Errore durante l'aggiornamento.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Le mie Buste Paga</h2>
          <p className="text-sm text-slate-500">Visualizza e accetta i documenti caricati dall'amministrazione.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paySlips.map((ps) => (
          <Card key={ps.id} className={`p-5 flex flex-col transition-all hover:shadow-md border-t-4 ${ps.status === 'Accettata' ? 'border-t-green-500' : 'border-t-amber-500'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-slate-100 p-3 rounded-xl text-slate-600">
                <FileText size={24} />
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ps.status === 'Accettata' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {ps.status}
              </span>
            </div>

            <div className="space-y-1 mb-6">
              <h3 className="font-bold text-lg text-slate-800">Busta Paga {ps.month}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar size={12} /> Caricata il: {new Date(ps.uploadDate).toLocaleDateString('it-IT')}
              </p>
              {ps.acceptedDate && (
                <p className="text-xs text-green-600 flex items-center gap-1 font-semibold">
                  <CheckCircle size={12} /> Accettata il: {new Date(ps.acceptedDate).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <Button 
                variant="secondary" 
                className="w-full text-sm py-2 bg-slate-100 hover:bg-slate-200 text-slate-700"
                onClick={() => window.open(ps.fileUrl, '_blank')}
              >
                <ExternalLink size={14} /> Visualizza PDF
              </Button>
              
              {ps.status === 'In attesa' && (
                <Button 
                  onClick={() => handleAccept(ps.id)}
                  className="w-full text-sm py-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle size={14} /> Accetta Documento
                </Button>
              )}
            </div>
          </Card>
        ))}

        {!loading && paySlips.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
            <FileText size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-400">Nessuna busta paga</h3>
            <p className="text-sm text-slate-400">Non ci sono ancora documenti disponibili per te.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaySlipsWorker;
