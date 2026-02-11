
import React, { useState } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, UserRole, Company } from '../types';
import { 
  UserPlus, Trash2, Mail, MessageSquare, Phone, Eye, EyeOff, 
  X, Shield, Edit2, Users
} from 'lucide-react';

interface ResourcesProps {
  currentUser: User;
  users: User[];
  onAddUser: (user: Partial<User> & { password?: string }) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onRemoveUser: (id: string) => void;
}

const Resources: React.FC<ResourcesProps> = ({ currentUser, users, onAddUser, onUpdateUser, onRemoveUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    role: UserRole.WORKER, 
    password: 'password123'
  });

  const canEdit = currentUser.role === UserRole.ADMIN;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("Nome, Cognome ed Email sono obbligatori.");
      return;
    }
    
    setIsSaving(true);
    try {
      await onAddUser(formData);
      alert(`Utente ${formData.firstName} creato correttamente.`);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="text-blue-600" size={24} /> Elenco Dipendenti
        </h2>
        {canEdit && !isAdding && !editingUser && (
          <Button onClick={() => setIsAdding(true)}>
            <UserPlus size={18} /> Aggiungi
          </Button>
        )}
      </div>

      {(isAdding || editingUser) && (
        <Card className="p-6 border-blue-200 bg-blue-50 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
              {editingUser ? <Edit2 size={20} /> : <UserPlus size={20} />} 
              {editingUser ? 'Modifica Dipendente' : 'Nuovo Membro del Team'}
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
                {isSaving ? "In corso..." : editingUser ? "Aggiorna Dipendente" : "Crea Dipendente"}
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
                  >
                    <Edit2 size={16} />
                  </button>
                  {u.id !== currentUser.id && (
                    <button 
                      onClick={() => confirm("Eliminare questo utente?") && onRemoveUser(u.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
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
      </div>
    </div>
  );
};

export default Resources;
