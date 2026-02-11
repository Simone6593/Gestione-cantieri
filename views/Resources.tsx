
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, UserRole, Company } from '../types';
import { 
  UserPlus, Trash2, Mail, MessageSquare, Phone, Eye, EyeOff, 
  Camera, Building2, Palette, Save, X, Shield, Lock, User as UserIcon, Edit2, Hash
} from 'lucide-react';
import { auth, db } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ResourcesProps {
  currentUser: User;
  users: User[];
  company: Company;
  onUpdateCompany: (c: Company) => Promise<void>;
  onAddUser: (user: Partial<User> & { password?: string }) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onRemoveUser: (id: string) => void;
}

const Resources: React.FC<ResourcesProps> = ({ currentUser, users, company, onUpdateCompany, onAddUser, onUpdateUser, onRemoveUser }) => {
  const [activeView, setActiveView] = useState<'users' | 'company' | 'profile'>('users');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [companyEdit, setCompanyEdit] = useState<Company>({ ...company });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    role: UserRole.WORKER, 
    password: 'password123'
  });

  const canEdit = currentUser.role === UserRole.ADMIN;

  // RECUPERO DATI AZIENDA: Carica i dati dal database Firestore all'apertura della sezione azienda
  useEffect(() => {
    if (activeView === 'company' && currentUser.companyId) {
      const fetchCompanyData = async () => {
        try {
          const docRef = doc(db, 'aziende', currentUser.companyId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Company;
            setCompanyEdit({ ...data, id: docSnap.id });
          }
        } catch (error) {
          console.error("Errore recupero dati azienda:", error);
        }
      };
      fetchCompanyData();
    }
  }, [activeView, currentUser.companyId]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCompanyEdit({ ...companyEdit, logoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("Nome, Cognome ed Email sono obbligatori.");
      return;
    }
    
    setIsSaving(true);
    try {
      await onAddUser(formData);
      alert(`Utente ${formData.firstName} creato correttamente. Ora può accedere con la sua email.`);
      setFormData({
        firstName: '', 
        lastName: '', 
        email: '', 
        phone: '', 
        role: UserRole.WORKER, 
        password: 'password123'
      });
      setIsAdding(false);
    } catch (err: any) {
      alert("Errore creazione account: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditInit = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: '' 
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsSaving(true);
    try {
      await onUpdateUser(editingUser.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role
      });
      setEditingUser(null);
    } catch (err: any) {
      alert("Errore aggiornamento: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Le password non coincidono.");
      return;
    }
    if (newPassword.length < 6) {
      alert("La password deve avere almeno 6 caratteri.");
      return;
    }

    setIsChangingPass(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        alert("Password aggiornata con successo!");
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      alert("Errore durante l'aggiornamento: " + error.message);
    } finally {
      setIsChangingPass(false);
    }
  };

  // FUNZIONE SALVA AZIENDA: Invia i dati a Firestore con setDoc merge: true
  const handleSaveCompany = async () => {
    setIsSaving(true);
    try {
      await onUpdateCompany(companyEdit);
      alert("Dati salvati correttamente!");
    } catch (error: any) {
      alert("Errore durante il salvataggio: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button 
          onClick={() => setActiveView('users')} 
          className={`px-4 py-2 font-bold transition-all ${activeView === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Team
        </button>
        <button 
          onClick={() => setActiveView('profile')} 
          className={`px-4 py-2 font-bold transition-all ${activeView === 'profile' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Mio Profilo
        </button>
        {canEdit && (
          <button 
            onClick={() => setActiveView('company')} 
            className={`px-4 py-2 font-bold transition-all ${activeView === 'company' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Azienda
          </button>
        )}
      </div>

      {activeView === 'users' && (
        <div className="space-y-6">
          {(isAdding || editingUser) && (
            <Card className="p-6 border-blue-200 bg-blue-50 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  {editingUser ? <Edit2 size={20} /> : <UserPlus size={20} />} 
                  {editingUser ? 'Modifica Membro' : 'Nuovo Membro del Team'}
                </h3>
                <button onClick={() => { setIsAdding(false); setEditingUser(null); }} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={editingUser ? handleEditSubmit : handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="Nome" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                <Input label="Cognome" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
                <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                <Input label="Telefono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Ruolo</label>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value={UserRole.WORKER}>{UserRole.WORKER}</option>
                    <option value={UserRole.SUPERVISOR}>{UserRole.SUPERVISOR}</option>
                    <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                  </select>
                </div>
                {!editingUser && (
                  <Input 
                    label="Password Iniziale" 
                    type={showPassword ? "text" : "password"}
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    suffix={
                      <button type="button" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                )}
                <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-2">
                  <Button variant="ghost" onClick={() => { setIsAdding(false); setEditingUser(null); }}>Annulla</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Creazione in corso..." : editingUser ? "Aggiorna Utente" : "Crea Utente"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {users.map(u => (
              <Card key={u.id} className="p-5 border-l-4 border-l-blue-600 group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{u.firstName} {u.lastName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Shield size={12} className="text-blue-500" />
                      <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">{u.role}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditInit(u)}
                        className="text-slate-300 hover:text-blue-500 transition-colors p-1"
                        title="Modifica utente"
                      >
                        <Edit2 size={16} />
                      </button>
                      {u.id !== currentUser.id && (
                        <button 
                          onClick={() => confirm("Eliminare questo utente? Verrà rimosso solo da Firestore, l'accesso Auth va gestito manualmente.") && onRemoveUser(u.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          title="Rimuovi utente"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 mt-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  {u.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" />
                      <span>{u.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-50">
                  <Button variant="secondary" className="flex-1 text-xs py-2" onClick={() => window.open(`mailto:${u.email}`)}>
                    <Mail size={14}/> Email
                  </Button>
                  {u.phone && (
                    <Button variant="secondary" className="flex-1 text-xs py-2" onClick={() => window.open(`https://wa.me/${u.phone.replace(/\s+/g, '')}`)}>
                      <MessageSquare size={14}/> WA
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            
            {canEdit && !isAdding && !editingUser && (
              <button 
                onClick={() => setIsAdding(true)} 
                className="border-2 border-dashed border-slate-200 rounded-xl h-full min-h-[160px] flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="p-3 bg-slate-50 group-hover:bg-blue-100 rounded-full transition-colors">
                  <UserPlus size={24}/>
                </div>
                <span className="font-bold text-sm">Aggiungi Membro</span>
              </button>
            )}
          </div>
        </div>
      )}

      {activeView === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-8 shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 mb-6">
              <UserIcon className="text-blue-600" /> I miei Dati
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nome Completo</p>
                <p className="font-semibold text-lg">{currentUser.firstName} {currentUser.lastName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email di Accesso</p>
                <p className="font-semibold text-lg">{currentUser.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ruolo</p>
                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold uppercase">{currentUser.role}</span>
              </div>
            </div>
          </Card>

          <Card className="p-8 shadow-sm border-amber-100">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 mb-6">
              <Lock className="text-amber-600" /> Sicurezza Account
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <Input 
                label="Nuova Password" 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required 
              />
              <Input 
                label="Conferma Password" 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
              />
              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={isChangingPass}>
                {isChangingPass ? "Aggiornamento..." : "Cambia Password"}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {activeView === 'company' && canEdit && (
        <Card className="p-8 max-w-2xl mx-auto shadow-lg border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Building2 className="text-blue-600" /> Dati Azienda
            </h3>
            <Button onClick={handleSaveCompany} disabled={isSaving}>
              <Save size={18}/> {isSaving ? "Salvataggio..." : "Salva"}
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
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={companyEdit.primaryColor} 
                    onChange={e => setCompanyEdit({...companyEdit, primaryColor: e.target.value})} 
                    className="w-full h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden" 
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-5">
              <Input label="Ragione Sociale" value={companyEdit.name} onChange={e => setCompanyEdit({...companyEdit, name: e.target.value})} />
              <Input 
                label="Partita IVA / P.IVA" 
                value={companyEdit.vatNumber || ''} 
                onChange={e => setCompanyEdit({...companyEdit, vatNumber: e.target.value})} 
                placeholder="01234567890"
                suffix={<Hash size={16} className="text-slate-400" />}
              />
              <Input label="Sede Legale (Indirizzo)" value={companyEdit.legalOffice} onChange={e => setCompanyEdit({...companyEdit, legalOffice: e.target.value})} />
              <Input label="Email Aziendale" type="email" value={companyEdit.email} onChange={e => setCompanyEdit({...companyEdit, email: e.target.value})} />
              <Input label="Telefono / Supporto" value={companyEdit.phone} onChange={e => setCompanyEdit({...companyEdit, phone: e.target.value})} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Resources;
