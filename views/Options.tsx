
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, Company, UserRole, CostParameters } from '../types';
import { auth, db } from '../firebase';
// @ts-ignore - Bypass type resolution error in specific environment
import { updatePassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
  Lock, User as UserIcon, Building, ShieldCheck, CheckCircle2, 
  AlertCircle, Building2, Palette, Camera, Save, Hash, Calculator, Percent
} from 'lucide-react';

interface OptionsProps {
  user: User;
  company: Company;
  onUpdateCompany: (companyData: Company) => Promise<void>;
}

const Options: React.FC<OptionsProps> = ({ user, company, onUpdateCompany }) => {
  const [activeTab, setActiveTab] = useState<'security' | 'profile' | 'company' | 'costs'>('security');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [companyEdit, setCompanyEdit] = useState<Company>({ ...company });
  const [costParams, setCostParams] = useState<CostParameters>(company.costParameters || {
    inpsRate: 30.00,
    inailRate: 3.50,
    cassaEdileRate: 10.50,
    tfrDivisor: 13.5
  });

  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user.role === UserRole.ADMIN;

  useEffect(() => {
    if ((activeTab === 'company' || activeTab === 'costs') && user.aziendaId) {
      const fetchCompanyData = async () => {
        try {
          const docRef = doc(db, 'aziende', user.aziendaId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Company;
            setCompanyEdit({ ...data, id: docSnap.id });
            if (data.costParameters) setCostParams(data.costParameters);
          }
        } catch (error) {
          console.error("Errore recupero dati azienda:", error);
        }
      };
      fetchCompanyData();
    }
  }, [activeTab, user.aziendaId]);

  const handleUpdatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Le password non coincidono.");
      return;
    }
    if (newPassword.length < 6) {
      alert("La password deve avere almeno 6 caratteri.");
      return;
    }

    setIsUpdating(true);
    setStatus('idle');
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setStatus('success');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.message || "Errore sconosciuto.");
      if (error.code === 'auth/requires-recent-login') {
        alert("Effettua nuovamente il login prima di cambiare la password.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCompanyEdit({ ...companyEdit, logoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCompany = async () => {
    setIsSavingCompany(true);
    try {
      await onUpdateCompany({ ...companyEdit, costParameters: costParams });
      alert("Dati salvati correttamente!");
    } catch (error: any) {
      alert("Errore durante il salvataggio: " + error.message);
    } finally {
      setIsSavingCompany(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button 
          onClick={() => setActiveTab('security')} 
          className={`px-4 py-2 font-bold transition-all ${activeTab === 'security' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Sicurezza
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`px-4 py-2 font-bold transition-all ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Profilo
        </button>
        {isAdmin && (
          <>
            <button 
              onClick={() => setActiveTab('company')} 
              className={`px-4 py-2 font-bold transition-all ${activeTab === 'company' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Azienda
            </button>
            <button 
              onClick={() => setActiveTab('costs')} 
              className={`px-4 py-2 font-bold transition-all ${activeTab === 'costs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Parametri Costo
            </button>
          </>
        )}
      </div>

      {activeTab === 'costs' && isAdmin && (
        <Card className="p-8 shadow-sm animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Calculator size={20} className="text-blue-600" />
              <h3 className="text-xl font-bold text-slate-800">Parametri Costo Dipendenti</h3>
            </div>
            <Button onClick={handleSaveCompany} disabled={isSavingCompany}>
              <Save size={18}/> {isSavingCompany ? "Salvataggio..." : "Salva Parametri"}
            </Button>
          </div>

          <p className="text-sm text-slate-500 mb-8">
            Coefficienti per il calcolo del costo reale del lavoro basato sui dati LUL e timbrature.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <Input 
              label="Aliquota INPS Aziendale (%)" 
              type="number" 
              value={costParams.inpsRate.toString()} 
              onChange={e => setCostParams({...costParams, inpsRate: Number(e.target.value)})}
              suffix={<Percent size={14} className="text-slate-400" />}
            />
            <Input 
              label="Coefficiente INAIL (%)" 
              type="number" 
              value={costParams.inailRate.toString()} 
              onChange={e => setCostParams({...costParams, inailRate: Number(e.target.value)})}
              suffix={<Percent size={14} className="text-slate-400" />}
            />
            <Input 
              label="Contributi Cassa Edile (%)" 
              type="number" 
              value={costParams.cassaEdileRate.toString()} 
              onChange={e => setCostParams({...costParams, cassaEdileRate: Number(e.target.value)})}
              suffix={<Percent size={14} className="text-slate-400" />}
            />
            <Input 
              label="Divisore TFR" 
              type="number" 
              value={costParams.tfrDivisor.toString()} 
              onChange={e => setCostParams({...costParams, tfrDivisor: Number(e.target.value)})}
              placeholder="es. 13.5"
            />
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
            <AlertCircle size={18} className="text-blue-500 shrink-0" />
            <div className="text-[11px] text-blue-700 leading-relaxed">
              <strong>Formula di calcolo:</strong> Il costo totale mensile viene calcolato sommando Competenze Lorde, Costo Previdenziale (INPS), Assicurativo (INAIL), Cassa Edile extra e Accantonamento TFR. Il costo orario reale è diviso per le ore effettive registrate.
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card className="p-8 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={20} className="text-blue-600" />
            <h3 className="text-xl font-bold text-slate-800">Cambio Password</h3>
          </div>
          <form onSubmit={handleUpdatePass} className="space-y-4 max-w-sm">
            <Input label="Nuova Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            <Input label="Conferma Nuova Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={isUpdating}>Aggiorna Password</Button>
          </form>
        </Card>
      )}

      {activeTab === 'profile' && (
        <Card className="p-8 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <UserIcon size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{user.firstName} {user.lastName}</h2>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
             <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ruolo</p>
              <div className="text-slate-700 font-semibold">{user.role}</div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Azienda</p>
              <div className="text-slate-700 font-semibold">{company.name}</div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'company' && isAdmin && (
        <Card className="p-8 shadow-lg border-slate-100 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Building2 className="text-blue-600" /> Profilo Aziendale
            </h3>
            <Button onClick={handleSaveCompany} disabled={isSavingCompany}>
              <Save size={18}/> Salva Modifiche
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center gap-4">
              <div onClick={() => logoInputRef.current?.click()} className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer bg-slate-50 group relative">
                {companyEdit.logoUrl ? (
                  <img src={companyEdit.logoUrl} className="w-full h-full object-contain p-2" />
                ) : (
                  <Camera className="text-slate-300" />
                )}
              </div>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
              <input type="color" value={companyEdit.primaryColor} onChange={e => setCompanyEdit({...companyEdit, primaryColor: e.target.value})} className="w-full h-10 rounded-lg cursor-pointer" />
            </div>

            <div className="flex-1 space-y-5">
              <Input label="Ragione Sociale" value={companyEdit.name} onChange={e => setCompanyEdit({...companyEdit, name: e.target.value})} />
              <Input label="Partita IVA" value={companyEdit.vatNumber || ''} onChange={e => setCompanyEdit({...companyEdit, vatNumber: e.target.value})} />
              <Input label="Sede Legale" value={companyEdit.legalOffice} onChange={e => setCompanyEdit({...companyEdit, legalOffice: e.target.value})} />
              <Input label="Email Aziendale" type="email" value={companyEdit.email} onChange={e => setCompanyEdit({...companyEdit, email: e.target.value})} />
              <Input label="Telefono" value={companyEdit.phone} onChange={e => setCompanyEdit({...companyEdit, phone: e.target.value})} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Options;
