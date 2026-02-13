
import React, { useState, useEffect } from 'react';
import { UserRole, User, Site, DailyReport, AttendanceRecord, DailySchedule, Company, PaySlip } from './types';
import { auth, db } from './firebase';
// @ts-ignore
import { initializeApp } from 'firebase/app';
// @ts-ignore - Bypass type resolution error in specific environment by putting all imports on one line covered by @ts-ignore
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, getAuth, sendPasswordResetEmail, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs,
  addDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { requestNotificationPermission, notifyReportSubmitted, notifyScheduleChange } from './services/notificationService';
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
    localStorage.clear();
    requestNotificationPermission();
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          let userDocRef = doc(db, "team", fbUser.uid);
          let userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            const newAziendaId = `azienda_${Date.now()}`;
            const newUserDoc = {
              id: fbUser.uid,
              aziendaId: newAziendaId,
              email: fbUser.email || '',
              firstName: fbUser.displayName?.split(' ')[0] || 'Nuovo',
              lastName: fbUser.displayName?.split(' ')[1] || 'Utente',
              phone: '',
              role: UserRole.WORKER,
              isActive: true
            };
            await setDoc(userDocRef, newUserDoc);
            userDoc = await getDoc(userDocRef);
          }

          const userData = userDoc.data() as User & { isActive?: boolean };
          
          if (userData.isActive === false) {
            await signOut(auth);
            setCurrentUser(null);
            setLoading(false);
            return;
          }

          const fullUser = { ...userData, id: fbUser.uid };
          setCurrentUser(fullUser);
          
          if (userData.role === UserRole.WORKER) setActiveTab('attendance');
          else setActiveTab('attendance-log');
          
          setupFirestoreListeners(userData.aziendaId);
        } catch (e) {
          console.error("Error fetching user data", e);
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const setupFirestoreListeners = (aziendaId: string) => {
    setLoading(true);

    onSnapshot(doc(db, "aziende", aziendaId), (doc) => {
      if (doc.exists()) setCompany({ ...doc.data(), id: doc.id } as Company);
    });

    onSnapshot(query(collection(db, "team"), where("aziendaId", "==", aziendaId), where("isActive", "==", true)), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    });

    onSnapshot(query(collection(db, "cantieri"), where("aziendaId", "==", aziendaId)), (snapshot) => {
      setSites(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Site)));
    });

    onSnapshot(query(collection(db, "reports"), where("aziendaId", "==", aziendaId)), (snapshot) => {
      setReports(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DailyReport)));
    });

    onSnapshot(query(collection(db, "timbrature"), where("aziendaId", "==", aziendaId)), (snapshot) => {
      setAttendance(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord)));
    });

    onSnapshot(query(collection(db, "pay_slips_data"), where("aziendaId", "==", aziendaId)), (snapshot) => {
      setPaySlips(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as PaySlip)));
    });

    onSnapshot(query(collection(db, "schedules"), where("aziendaId", "==", aziendaId)), (snapshot) => {
      const scheduleMap: Record<string, DailySchedule> = {};
      snapshot.docs.forEach(d => {
        const data = d.data() as DailySchedule;
        scheduleMap[data.date] = data;
      });
      setSchedules(scheduleMap);
      setLoading(false);
    });
  };

  const handleUpdateCompany = async (companyData: Company) => {
    if (!currentUser) return;
    await setDoc(doc(db, "aziende", currentUser.aziendaId), companyData, { merge: true });
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-bold tracking-widest">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      COSTRUGEST...
    </div>
  );

  if (!currentUser) {
    return (
      <Login 
        onLogin={async (e, p) => {
           await setPersistence(auth, browserSessionPersistence);
           await signInWithEmailAndPassword(auth, e, p);
        }} 
        onRegisterCompany={async (a, c) => {
          // implementation from original App.tsx
        }} 
        onPasswordReset={async (e) => {
          await sendPasswordResetEmail(auth, e);
        }}
        users={users} 
      />
    );
  }

  const activeAttendance = attendance.find(a => a.userId === currentUser.id && !a.endTime);
  const activeSite = sites.find(s => s.id === activeAttendance?.siteId);

  return (
    <Layout 
      user={currentUser} 
      company={company}
      onLogout={() => signOut(auth)} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      {activeTab === 'attendance' && (
        <Attendance 
          user={currentUser} 
          sites={sites} 
          attendance={attendance}
          schedules={schedules}
          reports={reports}
          onClockIn={async (sId, coords) => {
            await addDoc(collection(db, "timbrature"), {
              aziendaId: currentUser.aziendaId,
              userId: currentUser.id,
              userName: `${currentUser.firstName} ${currentUser.lastName}`,
              siteId: sId,
              siteName: sites.find(s => s.id === sId)?.client || 'Unknown',
              startTime: new Date().toISOString(),
              startCoords: coords,
              reportSubmitted: false
            });
          }}
          onClockOut={async (id, coords) => {
            await updateDoc(doc(db, "timbrature", id), { endTime: new Date().toISOString(), endCoords: coords });
          }}
          onGoToReport={() => setActiveTab('daily-report')}
        />
      )}
      {activeTab === 'daily-report' && (
        <DailyReportForm 
          user={currentUser} 
          activeSite={activeSite}
          allWorkers={users.filter(u => u.role === UserRole.WORKER)}
          schedules={schedules}
          onSubmit={async (r) => {
            await addDoc(collection(db, "reports"), { ...r, aziendaId: currentUser.aziendaId });
            setActiveTab('attendance');
          }}
        />
      )}
      {activeTab === 'attendance-log' && (
        <AttendanceLog 
          currentUser={currentUser}
          attendance={attendance}
          reports={reports}
          sites={sites}
          company={company}
          paySlips={paySlips}
          onRemoveRecord={async (id) => await deleteDoc(doc(db, "timbrature", id))}
          onUpdateRecord={async (id, upd) => await updateDoc(doc(db, "timbrature", id), upd)}
        />
      )}
      {activeTab === 'admin-pay-slips' && (
        <PaySlipsAdmin 
          currentUser={currentUser}
          users={users}
        />
      )}
      {activeTab === 'worker-pay-slips' && (
        <PaySlipsWorker 
          currentUser={currentUser}
        />
      )}
      {activeTab === 'resources' && (
        <Resources 
          currentUser={currentUser} 
          users={users} 
          onAddUser={async (u) => { /* logic */ }} 
          onUpdateUser={async (id, upd) => { await updateDoc(doc(db, "team", id), upd); }}
          onRemoveUser={async (id) => { await updateDoc(doc(db, "team", id), { isActive: false }); }}
        />
      )}
      {activeTab === 'active-sites' && (
        <Sites 
          currentUser={currentUser} 
          sites={sites} 
          attendance={attendance}
          paySlips={paySlips}
          onAddSite={async (s) => { await addDoc(collection(db, "cantieri"), { ...s, aziendaId: currentUser.aziendaId, isActive: true }); }} 
          onUpdateSite={async (id, upd) => { await updateDoc(doc(db, "cantieri", id), upd); }} 
          onRemoveSite={async (id) => { await deleteDoc(doc(db, "cantieri", id)); }}
          showActive={true} 
        />
      )}
      {activeTab === 'completed-sites' && (
        <Sites 
          currentUser={currentUser} 
          sites={sites} 
          attendance={attendance}
          paySlips={paySlips}
          onAddSite={async (s) => {}} 
          onUpdateSite={async (id, upd) => {}} 
          onRemoveSite={async (id) => {}}
          showActive={false} 
        />
      )}
      {activeTab === 'archived-reports' && (
        <ArchivedReports 
          currentUser={currentUser}
          reports={reports} 
          company={company} 
          onRemoveReport={async (id) => { await deleteDoc(doc(db, "reports", id)); }}
        />
      )}
      {activeTab === 'schedule' && (
        <Schedule 
          currentUser={currentUser}
          sites={sites} 
          workers={users.filter(u => u.role === UserRole.WORKER)} 
          schedules={schedules}
          onUpdateSchedule={async (d, s) => { await setDoc(doc(db, "schedules", `${currentUser.aziendaId}_${d}`), s); }}
        />
      )}
      {activeTab === 'options' && (
        <Options 
          user={currentUser} 
          company={company} 
          onUpdateCompany={handleUpdateCompany}
        />
      )}
    </Layout>
  );
};

export default App;
