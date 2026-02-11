
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, Company, UserRole } from '../types';
import { auth, db } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
  Lock, User as UserIcon, Building, ShieldCheck, CheckCircle2, 
  AlertCircle, Building2, Palette, Camera, Save, Hash
} from 'lucide-react';

interface OptionsProps {
  user: User;
  company: Company;
  onUpdateCompany: (companyData: Company) => Promise<void>;
}

const Options: React.FC<OptionsProps> = ({ user, company, onUpdateCompany }) => {
  const [activeTab, setActiveTab] = useState<'security' | 'profile' | 'company'>('security');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [companyEdit, setCompanyEdit] = useState<Company>({ ...company });
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user.role === UserRole.ADMIN;

  useEffect(() => {
    if (activeTab === 'company' && user.aziendaId) {
      const fetchCompanyData = async () => {
        try {
          const docRef = doc(db, 'aziende', user.aziendaId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCompanyEdit({ ...docSnap.data() as Company, id: docSnap.id });
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
        alert("Per motivi di sicurezza, devi effettuare nuovamente il login prima di cambiare la password.");
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
      await onUpdateCompany(companyEdit);
      alert("Dati azienda salvati correttamente!");
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
          Mio Profilo
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('company')} 
            className={`px-4 py-2 font-bold transition-all ${activeTab === 'company' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Azienda
          </button>
        )}
      </div>

      {activeTab === 'security' && (
        <Card className="p-8 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={20} className="text-blue-600" />
            <h3 className="text-xl font-bold text-slate-800">Cambio Password</h3>
          </div>

          {status === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
              <CheckCircle2 size={20} />
              <span className="text-sm font-semibold">Password aggiornata con successo!</span>
            </div>
          )}

          {status === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span className="text-sm font-semibold">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePass} className="space-y-4 max-w-sm">
            <Input 
              label="Nuova Password" 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Minimo 6 caratteri"
              required 
            />
            <Input 
              label="Conferma Nuova Password" 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Ripeti la password"
              required 
            />
            <div className="pt-2">
              <Button type="submit" className="w-full h-11" disabled={isUpdating}>
                {isUpdating ? "Aggiornamento..." : "Salva Nuova Password"}
              </Button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex gap-3">
              <ShieldCheck size={18} className="text-blue-500 shrink-0" />
              <div className="text-[11px] text-slate-500 leading-relaxed">
                <strong>Sicurezza:</strong> Ti consigliamo di cambiare la password ogni 3-6 mesi per proteggere il tuo account.
              </div>
            </div>
          </div>
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
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                  {user.role}
                </span>
                <span className="text-xs text-slate-400 font-medium">{user.email}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Personale</p>
              <div className="text-slate-700 font-semibold">{user.email}</div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Telefono</p>
              <div className="text-slate-700 font-semibold">{user.phone || 'Non specificato'}</div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Azienda di appartenenza</p>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Building size={16} className="text-slate-400" />
                {company.name}
              </div>
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
              <Save size={18}/> {isSavingCompany ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => logoInputRef.current?.click()} 
                className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group relative"
              >
                {companyEdit.logoUrl ? (
                  <>
                    <img src={companyEdit.logoUrl} className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">Cambia Logo</div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="text-slate-300" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Carica Logo</span>
                  </div>
                )}
              </div>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
              
              <div className="w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Palette size={12} /> Colore Brand
                </label>
                <input 
                  type="color" 
                  value={companyEdit.primaryColor} 
                  onChange={e => setCompanyEdit({...companyEdit, primaryColor: e.target.value})} 
                  className="w-full h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden" 
                />
              </div>
            </div>

            <div className="flex-1 space-y-5">
              <Input label="Ragione Sociale" value={companyEdit.name} onChange={e => setCompanyEdit({...companyEdit, name: e.target.value})} />
              <Input 
                label="Partita IVA" 
                value={companyEdit.vatNumber || ''} 
                onChange={e => setCompanyEdit({...companyEdit, vatNumber: e.target.value})} 
                suffix={<Hash size={16} className="text-slate-400" />}
              />
              <Input label="Sede Legale" value={companyEdit.legalOffice} onChange={e => setCompanyEdit({...companyEdit, legalOffice: e.target.value})} />
              <Input label="Email Aziendale" type="email" value={companyEdit.email} onChange={e => setCompanyEdit({...companyEdit, email: e.target.value})} />
              <Input label="Telefono Assistenza" value={companyEdit.phone} onChange={e => setCompanyEdit({...companyEdit, phone: e.target.value})} />
            </div>
          </div>
        </Card>
      )}

      <div className="text-center pb-8">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CostruGest App v1.2.0</p>
      </div>
    </div>
  );
};

export default Options;
