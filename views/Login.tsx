
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal } from '../components/Shared';
import { Construction, Eye, EyeOff, ArrowLeft, KeyRound, Mail, Lock } from 'lucide-react';
import { User, UserRole, Company } from '../types';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegisterCompany: (adminData: Partial<User>, companyData: Company) => void;
  onPasswordReset: (email: string) => Promise<void>;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegisterCompany, onPasswordReset, users }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'error' as any });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [legalOffice, setLegalOffice] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isRegistering) {
        if (regStep === 1) {
          setRegStep(2);
        } else {
          const company: Company = { 
            name: companyName, 
            legalOffice, 
            email: companyEmail, 
            phone: companyPhone, 
            primaryColor, 
            logoUrl: '' 
          };
          onRegisterCompany({ 
            firstName, 
            lastName, 
            email, 
            phone: adminPhone, 
            password, 
            role: UserRole.ADMIN 
          }, company);
        }
      } else {
        await onLogin(email, password);
      }
    } catch (error: any) {
      console.error(error);
      let title = "Errore Accesso";
      let message = "Si è verificato un errore imprevisto.";

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        title = "Credenziali Errate";
        message = "La password inserita non è corretta. Riprova o usa il recupero password.";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        title = "Utente non trovato";
        message = "Non esiste alcun account associato a questa email.";
      } else if (error.code === 'auth/user-disabled') {
        title = "Account Bloccato";
        message = "Il tuo account è stato disattivato dall'amministratore. Contatta il supporto aziendale.";
      } else if (error.code === 'auth/too-many-requests') {
        title = "Troppi Tentativi";
        message = "L'accesso è stato temporaneamente bloccato per motivi di sicurezza. Riprova più tardi.";
      }

      setModal({ isOpen: true, title, message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    try {
      await onPasswordReset(recoveryEmail);
      setModal({ 
        isOpen: true, 
        title: "Email Inviata", 
        message: "Abbiamo inviato le istruzioni per il reset alla tua email.", 
        type: 'success' 
      });
      setIsRecovering(false);
    } catch (err) {
      setModal({ isOpen: true, title: "Errore Invio", message: "Impossibile inviare l'email. Controlla l'indirizzo inserito.", type: 'error' });
    }
  };

  if (isRecovering) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
        <Modal {...modal} onClose={() => setModal({ ...modal, isOpen: false })} />
        <Card className="p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
          <button type="button" onClick={() => setIsRecovering(false)} className="text-slate-500 flex items-center gap-1 text-sm mb-6 hover:text-blue-600 transition-colors">
            <ArrowLeft size={16} /> Torna al Login
          </button>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Recupera Password</h2>
            <p className="text-slate-500 text-sm mt-1">Riceverai un'email per reimpostare la tua password.</p>
          </div>
          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            <Input 
              label="Email Account" 
              type="email" 
              value={recoveryEmail} 
              onChange={e => setRecoveryEmail(e.target.value)} 
              placeholder="Inserisci la tua email"
              required 
            />
            <Button type="submit" className="w-full h-12">Invia Email di Recupero</Button>
          </form>
        </Card>
        <div className="mt-8">
           <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">powered by Simone Barni</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <Modal {...modal} onClose={() => setModal({ ...modal, isOpen: false })} />
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-10 text-white">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6 animate-in zoom-in duration-500">
            <Construction size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            CostruGest
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-3 bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-700">
            Professional Construction Management
          </p>
        </div>

        <Card className="p-8 shadow-2xl border-slate-700/50">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">
              {isRegistering ? `Step ${regStep}: ${regStep === 1 ? 'Dati Admin' : 'Dati Azienda'}` : 'Accesso Sicuro'}
            </h2>
            {isRegistering && (
              <button 
                type="button"
                onClick={() => regStep === 2 ? setRegStep(1) : setIsRegistering(false)} 
                className="text-blue-600 text-sm font-bold hover:text-blue-800 transition-colors"
              >
                Indietro
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && regStep === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Nome" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  <Input label="Cognome" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <Input label="Telefono Personale" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} required />
              </>
            )}

            {isRegistering && regStep === 2 && (
              <div className="space-y-4">
                <Input label="Ragione Sociale" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                <Input label="Sede Legale" value={legalOffice} onChange={e => setLegalOffice(e.target.value)} required />
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input label="Email Aziendale" type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} required />
                  </div>
                  <div className="w-20">
                    <label className="text-sm font-semibold text-slate-700">Brand</label>
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={e => setPrimaryColor(e.target.value)} 
                      className="w-full h-10 rounded cursor-pointer mt-1 border border-slate-200" 
                    />
                  </div>
                </div>
              </div>
            )}

            {(!isRegistering || regStep === 1) && (
              <>
                <Input 
                  label="Email Aziendale" 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  placeholder="nome@azienda.it"
                />
                <div className="space-y-1">
                  <Input 
                    label="Password di Accesso" 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    placeholder="••••••••"
                    suffix={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-blue-600 transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    } 
                  />
                  {!isRegistering && (
                    <div className="flex justify-end items-center px-1 py-2">
                      <button type="button" onClick={() => setIsRecovering(true)} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                        Password dimenticata?
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <Button type="submit" className="w-full h-14 text-lg font-bold tracking-wide mt-2 shadow-xl shadow-blue-500/20 active:scale-[0.98]" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifica...</span>
                </div>
              ) : (
                isRegistering ? (regStep === 1 ? 'Prosegui' : 'Crea Account Azienda') : 'Entra nel Sistema'
              )}
            </Button>
          </form>

          {!isRegistering && (
            <div className="mt-10 pt-6 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setIsRegistering(true)} 
                className="w-full text-center text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
              >
                La tua azienda non è su CostruGest? <span className="text-blue-600 font-bold">Registrati</span>
              </button>
            </div>
          )}
        </Card>
      </div>
      <div className="mt-12 flex flex-col items-center gap-2 opacity-50">
         <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Enterprise Grade Infrastructure</p>
         <p className="text-[9px] font-bold text-slate-600 tracking-widest uppercase">powered by Simone Barni</p>
      </div>
    </div>
  );
};

export default Login;
