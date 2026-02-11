
import React, { useState, useRef } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, UserRole, Company } from '../types';
import { UserPlus, Trash2, Mail, MessageSquare, Phone, Eye, EyeOff, Edit2, Camera, Building2, Palette, Save } from 'lucide-react';

interface ResourcesProps {
  currentUser: User;
  users: User[];
  company: Company;
  onUpdateCompany: (c: Company) => void;
  onAddUser: (user: Partial<User>) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onRemoveUser: (id: string) => void;
}

const Resources: React.FC<ResourcesProps> = ({ currentUser, users, company, onUpdateCompany, onAddUser, onUpdateUser, onRemoveUser }) => {
  const [activeView, setActiveView] = useState<'users' | 'company'>('users');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [companyEdit, setCompanyEdit] = useState<Company>({ ...company });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: UserRole.WORKER, password: 'password123', avatarUrl: ''
  });

  const canEdit = currentUser.role === UserRole.ADMIN;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCompanyEdit({ ...companyEdit, logoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveView('users')} className={`px-4 py-2 font-bold ${activeView === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Team</button>
        {canEdit && <button onClick={() => setActiveView('company')} className={`px-4 py-2 font-bold ${activeView === 'company' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Profilo Azienda</button>}
      </div>

      {activeView === 'users' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {users.map(u => (
            <Card key={u.id} className="p-4 border-l-4 border-l-blue-600">
               <h3 className="font-bold">{u.firstName} {u.lastName}</h3>
               <p className="text-xs text-slate-400 uppercase font-bold mt-1">{u.role}</p>
               <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                  <Button variant="secondary" className="flex-1 text-xs"><Mail size={14}/> Email</Button>
                  <Button variant="secondary" className="flex-1 text-xs"><MessageSquare size={14}/> WA</Button>
               </div>
            </Card>
          ))}
          {canEdit && <Button onClick={() => setIsAdding(true)} variant="ghost" className="border-2 border-dashed border-slate-200 h-full min-h-[120px]"><UserPlus/> Aggiungi</Button>}
        </div>
      ) : (
        <Card className="p-8 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2"><Building2 className="text-blue-600" /> Configurazione Branding</h3>
            <Button onClick={() => { onUpdateCompany(companyEdit); alert("Salvato!"); }}><Save size={18}/> Salva</Button>
          </div>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center gap-4">
              <div onClick={() => logoInputRef.current?.click()} className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer bg-slate-50">
                {companyEdit.logoUrl ? <img src={companyEdit.logoUrl} className="w-full h-full object-contain" /> : <Camera className="text-slate-300" />}
              </div>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
              <div className="w-full">
                <label className="text-xs font-bold text-slate-500 uppercase">Colore App</label>
                <input type="color" value={companyEdit.primaryColor} onChange={e => setCompanyEdit({...companyEdit, primaryColor: e.target.value})} className="w-full h-10 rounded cursor-pointer mt-1" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <Input label="Ragione Sociale" value={companyEdit.name} onChange={e => setCompanyEdit({...companyEdit, name: e.target.value})} />
              <Input label="Sede Legale" value={companyEdit.legalOffice} onChange={e => setCompanyEdit({...companyEdit, legalOffice: e.target.value})} />
              <Input label="Email Contatto" value={companyEdit.email} onChange={e => setCompanyEdit({...companyEdit, email: e.target.value})} />
              <Input label="Telefono" value={companyEdit.phone} onChange={e => setCompanyEdit({...companyEdit, phone: e.target.value})} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Resources;
