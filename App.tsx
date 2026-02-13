
import React, { useState, useEffect } from 'react';
import { UserRole, User, Site, DailyReport, AttendanceRecord, DailySchedule, Company, PaySlip, MaterialCost } from './types';
import { auth, db } from './firebase';
// @ts-ignore
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { requestNotificationPermission } from './services/notificationService';
import Layout from './components/Layout';
import Login from './views/Login';
import Resources from './views/Resources';
import Sites from './views/Sites';
import Attendance from './views/Attendance';
import DailyReportForm from './views/DailyReport';
import ArchivedReports from './views/ArchivedReports';
import Schedule from './views/Schedule';
import AttendanceLog from './views/AttendanceLog';
import Options from './views/Options';
import PaySlipsAdmin from './views/PaySlipsAdmin';
import PaySlipsWorker from './views/PaySlipsWorker';
import MaterialCosts from './views/MaterialCosts';

const DEFAULT_COMPANY: Company = {
  name: 'Caricamento...',
  legalOffice: '',
  phone: '',
  email: '',
  primaryColor: '#2563eb',
  vatNumber: ''
};

const getLocalDateString = (dateInput?: string | Date) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(true);
  
  const [company, setCompany] = useState<Company>(DEFAULT_COMPANY);
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [schedules, setSchedules] = useState<Record<string, DailySchedule>>({});
  const [paySlips, setPaySlips] = useState<PaySlip[]>([]);
  const [materialCosts, setMaterialCosts] = useState<MaterialCost[]>([]);

  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch(console.error);
    requestNotificationPermission();
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "team", fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User & { isActive?: boolean };
            if (userData.isActive === false) { await signOut(auth); setLoading(false); return; }
            setCurrentUser({ ...userData, id: fbUser.uid });
            if (userData.role === UserRole.WORKER) setActiveTab('attendance');
            else setActiveTab('attendance-log');
            setupFirestoreListeners(userData.aziendaId);
          } else { setCurrentUser(null); setLoading(false); }
        } catch (e) { console.error(e); setLoading(false); }
      } else { setCurrentUser(null); setLoading(false); }
    });
    return () => unsubscribeAuth();
  }, []);

  const setupFirestoreListeners = (aziendaId: string) => {
    onSnapshot(doc(db, "aziende", aziendaId), (d) => d.exists() && setCompany({ ...d.data(), id: d.id } as Company));
    onSnapshot(query(collection(db, "team"), where("aziendaId", "==", aziendaId), where("isActive", "==", true)), (s) => setUsers(s.docs.map(d => ({ ...d.data(), id: d.id } as User))));
    onSnapshot(query(collection(db, "cantieri"), where("aziendaId", "==", aziendaId)), (s) => setSites(s.docs.map(d => ({ ...d.data(), id: d.id } as Site))));
    onSnapshot(query(collection(db, "reports"), where("aziendaId", "==", aziendaId)), (s) => setReports(s.docs.map(d => ({ ...d.data(), id: d.id } as DailyReport))));
    onSnapshot(query(collection(db, "timbrature"), where("aziendaId", "==", aziendaId)), (s) => setAttendance(s.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord))));
    onSnapshot(query(collection(db, "pay_slips_data"), where("aziendaId", "==", aziendaId)), (s) => setPaySlips(s.docs.map(d => ({ ...d.data(), id: d.id } as PaySlip))));
    onSnapshot(query(collection(db, "material_costs"), where("aziendaId", "==", aziendaId)), (s) => setMaterialCosts(s.docs.map(d => ({ ...d.data(), id: d.id } as MaterialCost))));
    onSnapshot(query(collection(db, "schedules"), where("aziendaId", "==", aziendaId)), (s) => {
      const map: Record<string, DailySchedule> = {};
      s.docs.forEach(d => { map[(d.data() as DailySchedule).date] = d.data() as DailySchedule; });
      setSchedules(map);
      setLoading(false);
    });
  };

  const handleUpdateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>) => {
    await updateDoc(doc(db, "timbrature", id), updates);
  };

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-bold tracking-widest"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>COSTRUGEST...</div>;
  if (!currentUser) return <Login onLogin={async (email, password) => { await signInWithEmailAndPassword(auth, email, password); }} onRegisterCompany={() => {}} onPasswordReset={async (email) => { await sendPasswordResetEmail(auth, email); }} users={users} />;

  const activeAttendance = attendance.find(a => a.userId === currentUser.id && !a.endTime);
  const activeSite = sites.find(s => s.id === activeAttendance?.siteId);
  const referenceDate = activeAttendance ? getLocalDateString(activeAttendance.startTime) : undefined;

  return (
    <Layout user={currentUser} company={company} onLogout={() => signOut(auth)} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'attendance' && <Attendance user={currentUser} sites={sites} attendance={attendance} schedules={schedules} reports={reports} onClockIn={async (sId, coords) => await addDoc(collection(db, "timbrature"), { aziendaId: currentUser.aziendaId, userId: currentUser.id, userName: `${currentUser.firstName} ${currentUser.lastName}`, siteId: sId, siteName: sites.find(s => s.id === sId)?.client || 'Unknown', startTime: new Date().toISOString(), startCoords: coords, reportSubmitted: false })} onClockOut={async (id, coords) => await updateDoc(doc(db, "timbrature", id), { endTime: new Date().toISOString(), endCoords: coords })} onGoToReport={() => setActiveTab('daily-report')} />}
      {activeTab === 'daily-report' && <DailyReportForm user={currentUser} activeSite={activeSite} sites={sites} allWorkers={users.filter(u => u.role === UserRole.WORKER)} schedules={schedules} referenceDate={referenceDate} onSubmit={async (r) => { await addDoc(collection(db, "reports"), { ...r, aziendaId: currentUser.aziendaId }); if (activeAttendance) await updateDoc(doc(db, "timbrature", activeAttendance.id), { endTime: new Date().toISOString(), endCoords: r.coords || null, reportSubmitted: true }); setActiveTab('attendance'); }} />}
      {activeTab === 'attendance-log' && <AttendanceLog currentUser={currentUser} attendance={attendance} reports={reports} sites={sites} company={company} paySlips={paySlips} onRemoveRecord={async (id) => await deleteDoc(doc(db, "timbrature", id))} onUpdateRecord={handleUpdateAttendanceRecord} />}
      {activeTab === 'material-costs' && <MaterialCosts currentUser={currentUser} sites={sites} costs={materialCosts} onAddCost={async (c) => await addDoc(collection(db, "material_costs"), c)} onRemoveCost={async (id) => await deleteDoc(doc(db, "material_costs", id))} />}
      {activeTab === 'admin-pay-slips' && <PaySlipsAdmin currentUser={currentUser} users={users} />}
      {activeTab === 'worker-pay-slips' && <PaySlipsWorker currentUser={currentUser} />}
      {activeTab === 'resources' && <Resources currentUser={currentUser} users={users} onAddUser={() => {}} onUpdateUser={async (id, upd) => await updateDoc(doc(db, "team", id), upd)} onRemoveUser={async (id) => await updateDoc(doc(db, "team", id), { isActive: false })} />}
      {activeTab === 'active-sites' && <Sites currentUser={currentUser} sites={sites} attendance={attendance} paySlips={paySlips} materialCosts={materialCosts} onAddSite={async (s) => await addDoc(collection(db, "cantieri"), { ...s, aziendaId: currentUser.aziendaId, isActive: true })} onUpdateSite={async (id, upd) => await updateDoc(doc(db, "cantieri", id), upd)} onRemoveSite={async (id) => await deleteDoc(doc(db, "cantieri", id))} showActive={true} />}
      {activeTab === 'completed-sites' && <Sites currentUser={currentUser} sites={sites} attendance={attendance} paySlips={paySlips} materialCosts={materialCosts} onAddSite={async (s) => {}} onUpdateSite={async (id, upd) => {}} onRemoveSite={async (id) => {}} showActive={false} />}
      {activeTab === 'archived-reports' && <ArchivedReports currentUser={currentUser} reports={reports} company={company} onRemoveReport={async (id) => await deleteDoc(doc(db, "reports", id))} />}
      {activeTab === 'schedule' && <Schedule currentUser={currentUser} sites={sites} workers={users.filter(u => u.role === UserRole.WORKER)} schedules={schedules} onUpdateSchedule={async (d, s) => await setDoc(doc(db, "schedules", `${currentUser.aziendaId}_${d}`), s)} />}
      {activeTab === 'options' && <Options user={currentUser} company={company} onUpdateCompany={async (c) => await setDoc(doc(db, "aziende", currentUser.aziendaId), c, { merge: true })} />}
    </Layout>
  );
};

export default App;
