
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { Construction, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { User, UserRole, Company } from '../types';

interface LoginProps {
  onLogin: (email: string, pass: string) => void;
  onRegisterCompany: (adminData: Partial<User>, companyData: Company) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegisterCompany, users }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [rememberMe, setRememberMe] = useState(false);
  
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
  
  useEffect(() => {
    const saved = localStorage.getItem('remembered_user');
    if (saved) {
      const { email: savedEmail, pass: savedPass } = JSON.parse(saved);
      setEmail(savedEmail);
      setPassword(savedPass);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      if (rememberMe) {
        localStorage.setItem('remembered_user', JSON.stringify({ email, pass: password }));
      } else {
        localStorage.removeItem('remembered_user');
      }
      onLogin(email, password);
    }
  };

  if (isRecovering) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <Card className="p-8 w-full max-w-md">
          <button onClick={() => setIsRecovering(false)} className="text-slate-500 flex items-center gap-1 text-sm mb-6">
            <ArrowLeft size={16} /> Torna al Login
          </button>
          <div className="text-center mb-6">
            <KeyRound size={40} className="mx-auto text-blue-600 mb-2" />
            <h2 className="text-2xl font-bold">Recupera Password</h2>
            <p className="text-slate-500 text-sm mt-1">Ti invieremo un link per creare una nuova password.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); alert('Email inviata!'); setIsRecovering(false); }} className="space-y-4">
            <Input label="Email" type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} required />
            <Button type="submit" className="w-full">Invia Email</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8 text-white">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mb-4">
            <Construction size={32} />
          </div>
          <h1 className="text-3xl font-bold">CostruGest</h1>
        </div>

        <Card className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {isRegistering ? `Step ${regStep}: ${regStep === 1 ? 'Admin' : 'Azienda'}` : 'Bentornato'}
            </h2>
            {isRegistering && (
              <button 
                type="button"
                onClick={() => regStep === 2 ? setRegStep(1) : setIsRegistering(false)} 
                className="text-blue-600 text-sm font-semibold"
              >
                Indietro
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && regStep === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Nome" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  <Input label="Cognome" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <Input label="Telefono" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} required />
              </>
            )}

            {isRegistering && regStep === 2 && (
              <div className="space-y-4">
                <Input label="Nome Azienda" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                <Input label="Sede Legale" value={legalOffice} onChange={e => setLegalOffice(e.target.value)} required />
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input label="Email Azienda" type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} required />
                  </div>
                  <div className="w-20">
                    <label className="text-sm font-semibold">Colore</label>
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={e => setPrimaryColor(e.target.value)} 
                      className="w-full h-10 rounded cursor-pointer mt-1" 
                    />
                  </div>
                </div>
              </div>
            )}

            {(!isRegistering || regStep === 1) && (
              <>
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                <div className="space-y-1">
                  <Input 
                    label="Password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    suffix={
                      <button type="button" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    } 
                  />
                  {!isRegistering && (
                    <div className="flex justify-between items-center px-1">
                      <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                        <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded" /> Ricordami
                      </label>
                      <button type="button" onClick={() => setIsRecovering(true)} className="text-xs font-bold text-blue-600">
                        Password dimenticata?
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <Button type="submit" className="w-full h-12 text-lg">
              {isRegistering ? (regStep === 1 ? 'Prosegui' : 'Crea Azienda') : 'Accedi'}
            </Button>
          </form>

          {!isRegistering && (
            <button 
              type="button"
              onClick={() => setIsRegistering(true)} 
              className="w-full text-center text-sm font-semibold text-blue-600 mt-6 hover:underline"
            >
              Nuova Azienda? Registrati ora
            </button>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;
