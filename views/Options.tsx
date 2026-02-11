import React, { useState } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { User, Company } from '../types';
import { auth } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { Lock, User as UserIcon, Building, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface OptionsProps {
  user: User;
  company: Company;
}

const Options: React.FC<OptionsProps> = ({ user, company }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profilo Utente */}
      <Card className="p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-50">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Azienda</p>
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Building size={16} className="text-slate-400" />
              {company.name}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefono</p>
            <div className="text-slate-700 font-semibold">{user.phone || 'Non specificato'}</div>
          </div>
        </div>
      </Card>

      {/* Cambio Password */}
      <Card className="p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Lock size={20} className="text-blue-600" />
          <h3 className="text-xl font-bold text-slate-800">Sicurezza e Password</h3>
        </div>

        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={20} />
            <span className="text-sm font-semibold">Password aggiornata con successo!</span>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
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
              <strong>Consiglio di sicurezza:</strong> Scegli una password che non usi per altri servizi. Una combinazione di lettere, numeri e simboli rende il tuo account più protetto.
            </div>
          </div>
        </div>
      </Card>

      {/* Info App */}
      <div className="text-center pb-8">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CostruGest App v1.2.0</p>
        <p className="text-[9px] text-slate-300 mt-1">Sviluppato per gestione professionale cantieri Android</p>
      </div>
    </div>
  );
};

export default Options;