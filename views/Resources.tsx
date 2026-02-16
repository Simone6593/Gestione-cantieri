
import React, { useState } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, UserRole } from '../types';
import { 
  UserPlus, Trash2, Mail, MessageSquare, Phone, Eye, EyeOff, 
  X, Shield, Edit2, Users, Briefcase, HardHat, ShieldCheck, Check
} from 'lucide-react';

interface ResourcesProps {
  currentUser: User;
  users: User[];
  onAddUser: (user: Partial<User> & { password?: string }) => Promise<void>;
  onUpdateUser: (id: string, updates: Partial<User>) => Promise<void>;
  onRemoveUser: (id: string) => Promise<void>;
}

const Resources: React.FC<ResourcesProps> = ({ currentUser, users, onAddUser, onUpdateUser, onRemoveUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const initialForm = {
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    role: UserRole.WORKER, 
    password: 'password123'
  };

  const [formData, setFormData] = useState(initialForm);

  const canEdit = currentUser.role === UserRole.ADMIN;

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const resetUI = () => {
    setIsAdding(false);
    setEditingUser(null);
    setFormData(initialForm);
    setShowPassword(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("Nome, Cognome ed Email sono obbligatori.");
      return;
    }

    if (!validateEmail(formData.email)) {
      alert("Inserisci un indirizzo email valido.");
      return;
    }
    
    setIsSaving(true);
    try {
      await onAddUser(formData);
      resetUI();
    } catch (err: any) {
      alert("Errore creazione: " + err.message);
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
    setIsAdding(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!validateEmail(formData.email)) {
      alert("Inserisci un indirizzo email valido.");
      return;
    }
    
    setIsSaving(true);
    try {
      await onUpdateUser(editingUser.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role
      });
      resetUI();
    } catch (err: any) {
      alert("Errore aggiornamento: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderUserCard = (u: User) => (
    <Card key={u.id} className="p-5 border-l-4 border-l-blue-600 group hover:shadow-md transition-all bg-white relative">
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
            <button onClick={() => handleEditInit(u)} className="text-slate-300 hover:text-blue-500 p-1 transition-colors"><Edit2 size={16} /></button>
            {u.id !== currentUser.id && (
              <button onClick={() => confirm("Eliminare questo utente?") && onRemoveUser(u.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={16} /></button>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-2 mt-4 text-sm text-slate-500">
        <div className="flex items-center gap-2 truncate"><Mail size={14} className="text-slate-400 shrink-0" /> <span>{u.email}</span></div>
        {u.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400 shrink-0" /> <span>{u.phone}</span></div>}
      </div>

      <div className="flex gap-2 mt-6 pt-4 border-t border-slate-50">
        <Button variant="secondary" className="flex-1 text-xs py-2 h-9" onClick={() => window.open(`mailto:${u.email}`)}>Email</Button>
        {u.phone && (
          <Button variant="secondary" className="flex-1 text-xs py-2 h-9" onClick={() => window.open(`https://wa.me/${u.phone.replace(/\s+/g, '')}`)}>WhatsApp</Button>
        )}
      </div>
    </Card>
  );

  const admins = users.filter(u => u.role === UserRole.ADMIN);
  const supervisors = users.filter(u => u.role === UserRole.SUPERVISOR);
  const workers = users.filter(u => u.role === UserRole.WORKER);

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="text-blue-600" size={28} /> Organico Aziendale
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
            ID Azienda: <span className="text-blue-600 font-mono">{currentUser.aziendaId}</span>
          </p>
        </div>
        {canEdit && !isAdding && !editingUser && (
          <Button onClick={() => { setFormData(initialForm); setIsAdding(true); }} className="shadow-lg h-11 px-6">
            <UserPlus size={18} /> Aggiungi
          </Button>
        )}
      </div>

      {(isAdding || editingUser) && (
        <Card className="p-6 border-blue-200 bg-blue-50/30 animate-in slide-in-from-top-4 shadow-xl border-2">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                {editingUser ? <Edit2 size={20} /> : <UserPlus size={20} />}
              </div>
              <h3 className="text-lg font-bold text-blue-900">{editingUser ? 'Modifica Profilo' : 'Nuovo Utente'}</h3>
            </div>
            <button onClick={resetUI} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"><X size={24} /></button>
          </div>
          
          <form onSubmit={editingUser ? handleEditSubmit : handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Input label="Nome *" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
            <Input label="Cognome *" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
            <Input label="Email Aziendale *" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            <Input label="Telefono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+39 333..." />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Ruolo Aziendale</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500">
                <option value={UserRole.WORKER}>{UserRole.WORKER}</option>
                <option value={UserRole.SUPERVISOR}>{UserRole.SUPERVISOR}</option>
                <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
              </select>
            </div>
            {!editingUser && (
              <Input label="Password Iniziale" type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} suffix={<button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-blue-600 transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />
            )}
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
              <Button variant="ghost" onClick={resetUI} className="px-6">Annulla</Button>
              <Button type="submit" disabled={isSaving} className="px-8 shadow-lg">
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvataggio...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check size={18} />
                    <span>{editingUser ? "Aggiorna" : "Salva"}</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {admins.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <ShieldCheck size={20} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Amministratori ({admins.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{admins.map(renderUserCard)}</div>
        </div>
      )}

      {supervisors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Briefcase size={20} className="text-amber-600" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Supervisori ({supervisors.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{supervisors.map(renderUserCard)}</div>
        </div>
      )}

      {workers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <HardHat size={20} className="text-slate-600" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Operai ({workers.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{workers.map(renderUserCard)}</div>
        </div>
      )}
    </div>
  );
};

export default Resources;
