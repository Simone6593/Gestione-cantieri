
import React, { useState, useEffect } from 'react';
import { UserRole, User, Site, DailyReport, AttendanceRecord, DailySchedule, Company, PaySlip } from './types';
import { auth, db } from './firebase';
// @ts-ignore
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, onSnapshot, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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

const DEFAULT_COMPANY: Company = {
  name: 'Caricamento...',
  legalOffice: '',
  phone: '',
  email: '',
  primaryColor: '#2563eb',
  vatNumber: ''
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

  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch(console.error);
    requestNotificationPermission();
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "team", fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User & { isActive?: boolean };
            if (userData.isActive === false) { await signOut(auth); return; }
            setCurrentUser({ ...userData, id: fbUser.uid });
            if (userData.role === UserRole.WORKER) setActiveTab('attendance');
            else setActiveTab('attendance-log');
            setupFirestoreListeners(userData.aziendaId);
          }
        } catch (e) { console.error(e); }
      } else { setCurrentUser(null); setLoading(false); }
    });
    return () => unsubscribeAuth();
  }, []);

  const setupFirestoreListeners = (aziendaId: string) => {
    setLoading(true);
    onSnapshot(doc(db, "aziende", aziendaId), (d) => d.exists() && setCompany({ ...d.data(), id: d.id } as Company));
    onSnapshot(query(collection(db, "team"), where("aziendaId", "==", aziendaId), where("isActive", "==", true)), (s) => setUsers(s.docs.map(d => ({ ...d.data(), id: d.id } as User))));
    onSnapshot(query(collection(db, "cantieri"), where("aziendaId", "==", aziendaId)), (s) => setSites(s.docs.map(d => ({ ...d.data(), id: d.id } as Site))));
    onSnapshot(query(collection(db, "reports"), where("aziendaId", "==", aziendaId)), (s) => setReports(s.docs.map(d => ({ ...d.data(), id: d.id } as DailyReport))));
    onSnapshot(query(collection(db, "timbrature"), where("aziendaId", "==", aziendaId)), (s) => setAttendance(s.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord))));
    onSnapshot(query(collection(db, "pay_slips_data"), where("aziendaId", "==", aziendaId)), (s) => setPaySlips(s.docs.map(d => ({ ...d.data(), id: d.id } as PaySlip))));
    onSnapshot(query(collection(db, "schedules"), where("aziendaId", "==", aziendaId)), (s) => {
      const map: Record<string, DailySchedule> = {};
      s.docs.forEach(d => { map[(d.data() as DailySchedule).date] = d.data() as DailySchedule; });
      setSchedules(map);
      setLoading(false);
    });
  };

  const handleClockIn = async (sId: string, coords: { lat: number, lng: number }) => {
    if (!currentUser) return;
    await addDoc(collection(db, "timbrature"), {
      aziendaId: currentUser.aziendaId,
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      siteId: sId,
      siteName: sites.find(s => s.id === sId)?.client || 'Cantiere',
      startTime: new Date().toISOString(),
      startCoords: coords,
      reportSubmitted: false
    });
  };

  const handleClockOut = async (id: string, coords: { lat: number, lng: number }) => {
    await updateDoc(doc(db, "timbrature", id), { 
      endTime: new Date().toISOString(), 
      endCoords: coords 
    });
  };

  const activeAttendance = attendance.find(a => a.userId === currentUser?.id && !a.endTime);
  const activeSite = sites.find(s => s.id === activeAttendance?.siteId);

  return (
    <Layout user={currentUser} company={company} onLogout={() => signOut(auth)} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'attendance' && currentUser && (
        <Attendance 
          user={currentUser} sites={sites} attendance={attendance} schedules={schedules} reports={reports}
          onClockIn={handleClockIn} onClockOut={handleClockOut} onGoToReport={() => setActiveTab('daily-report')}
        />
      )}
      {activeTab === 'daily-report' && currentUser && (
        <DailyReportForm 
          user={currentUser} activeSite={activeSite} allWorkers={users.filter(u => u.role === UserRole.WORKER)} schedules={schedules}
          onSubmit={async (r) => {
            // 1. Invia il rapporto
            await addDoc(collection(db, "reports"), { ...r, aziendaId: currentUser.aziendaId });
            // 2. Clock-out automatico se timbratura attiva
            if (activeAttendance) {
              await handleClockOut(activeAttendance.id, r.coords || {lat: 0, lng: 0});
            }
            setActiveTab('attendance');
          }}
        />
      )}
      {activeTab === 'attendance-log' && currentUser && (
        <AttendanceLog 
          currentUser={currentUser} attendance={attendance} reports={reports} sites={sites} company={company} paySlips={paySlips}
          onRemoveRecord={async (id) => await deleteDoc(doc(db, "timbrature", id))}
          onUpdateRecord={async (id, upd) => await updateDoc(doc(db, "timbrature", id), upd)}
        />
      )}
      {activeTab === 'admin-pay-slips' && currentUser && <PaySlipsAdmin currentUser={currentUser} users={users} />}
      {activeTab === 'worker-pay-slips' && currentUser && <PaySlipsWorker currentUser={currentUser} />}
      {activeTab === 'resources' && currentUser && (
        <Resources 
          currentUser={currentUser} users={users} onAddUser={() => {}} 
          onUpdateUser={async (id, upd) => await updateDoc(doc(db, "team", id), upd)}
          onRemoveUser={async (id) => await updateDoc(doc(db, "team", id), { isActive: false })}
        />
      )}
      {activeTab === 'active-sites' && currentUser && (
        <Sites 
          currentUser={currentUser} sites={sites} attendance={attendance} paySlips={paySlips} showActive={true}
          onAddSite={async (s) => await addDoc(collection(db, "cantieri"), { ...s, aziendaId: currentUser.aziendaId, isActive: true })}
          onUpdateSite={async (id, upd) => await updateDoc(doc(db, "cantieri", id), upd)}
          onRemoveSite={async (id) => await deleteDoc(doc(db, "cantieri", id))}
        />
      )}
      {activeTab === 'completed-sites' && currentUser && (
        <Sites currentUser={currentUser} sites={sites} attendance={attendance} paySlips={paySlips} showActive={false} onAddSite={() => {}} onUpdateSite={() => {}} onRemoveSite={() => {}} />
      )}
      {activeTab === 'archived-reports' && currentUser && (
        <ArchivedReports currentUser={currentUser} reports={reports} company={company} onRemoveReport={async (id) => await deleteDoc(doc(db, "reports", id))} />
      )}
      {activeTab === 'schedule' && currentUser && (
        <Schedule currentUser={currentUser} sites={sites} workers={users.filter(u => u.role === UserRole.WORKER)} schedules={schedules} onUpdateSchedule={async (d, s) => await setDoc(doc(db, "schedules", `${currentUser.aziendaId}_${d}`), s)} />
      )}
      {activeTab === 'options' && currentUser && <Options user={currentUser} company={company} onUpdateCompany={async (c) => await setDoc(doc(db, "aziende", currentUser.aziendaId), c, { merge: true })} />}
    </Layout>
  );
};

export default App;
