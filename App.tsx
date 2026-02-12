
import React, { useState, useEffect } from 'react';
import { UserRole, User, Site, DailyReport, AttendanceRecord, DailySchedule, Company } from './types';
import { auth, db } from './firebase';
// @ts-ignore
import { initializeApp } from 'firebase/app';
// @ts-ignore - Bypass type resolution error in specific environment
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  getAuth,
  sendPasswordResetEmail,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
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
      else setCompany({ ...DEFAULT_COMPANY, id: aziendaId, name: 'Nuova Azienda' });
    });

    const qTeam = query(collection(db, "team"), where("aziendaId", "==", aziendaId), where("isActive", "==", true));
    onSnapshot(qTeam, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    });

    const qSites = query(collection(db, "cantieri"), where("aziendaId", "==", aziendaId));
    onSnapshot(qSites, (snapshot) => {
      setSites(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Site)));
    });

    const qReports = query(collection(db, "reports"), where("aziendaId", "==", aziendaId));
    onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DailyReport)));
    });

    const qAttendance = query(collection(db, "timbrature"), where("aziendaId", "==", aziendaId));
    onSnapshot(qAttendance, (snapshot) => {
      setAttendance(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord)));
    });

    const qSchedules = query(collection(db, "schedules"), where("aziendaId", "==", aziendaId));
    onSnapshot(qSchedules, (snapshot) => {
      const scheduleMap: Record<string, DailySchedule> = {};
      snapshot.docs.forEach(d => {
        const data = d.data() as DailySchedule;
        scheduleMap[data.date] = data;
      });
      setSchedules(scheduleMap);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (company.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', company.primaryColor);
    }
  }, [company]);

  const handleLogin = async (email: string, pass: string) => {
    await setPersistence(auth, browserSessionPersistence);
    const userCred = await signInWithEmailAndPassword(auth, email, pass);
    const userDoc = await getDoc(doc(db, "team", userCred.user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as any;
      if (userData.isActive === false) {
        await signOut(auth);
        throw { code: 'auth/user-disabled' };
      }
    }
  };

  const handlePasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const handleRegisterNewCompany = async (adminData: Partial<User>, companyData: Company) => {
    try {
      setLoading(true);
      await setPersistence(auth, browserSessionPersistence);
      const userCred = await createUserWithEmailAndPassword(auth, adminData.email!, adminData.password!);
      const uid = userCred.user.uid;
      
      const aziendaId = `azienda_${Date.now()}`;

      await setDoc(doc(db, "aziende", aziendaId), { ...companyData, id: aziendaId });

      const newAdmin: User & { isActive: boolean } = {
        id: uid,
        aziendaId: aziendaId,
        firstName: adminData.firstName || '',
        lastName: adminData.lastName || '',
        email: adminData.email || '',
        phone: adminData.phone || '',
        role: UserRole.ADMIN,
        isActive: true
      };
      await setDoc(doc(db, "team", uid), newAdmin);
      
      setCurrentUser(newAdmin);
      setActiveTab('attendance-log');
      setupFirestoreListeners(aziendaId);
    } catch (error: any) {
      alert("Errore registrazione: " + error.message);
      setLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleUpdateCompany = async (companyData: Company) => {
    if (!currentUser) return;
    await setDoc(doc(db, "aziende", currentUser.aziendaId), companyData, { merge: true });
  };

  const addSite = async (site: Partial<Site>) => {
    if (!currentUser) return;
    await addDoc(collection(db, "cantieri"), {
      ...site,
      aziendaId: currentUser.aziendaId,
      actualDays: 0,
      isActive: true
    });
  };

  const updateSite = async (id: string, updates: Partial<Site>) => {
    await updateDoc(doc(db, "cantieri", id), updates);
  };

  const removeSite = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo cantiere?")) return;
    await deleteDoc(doc(db, "cantieri", id));
  };

  const addUser = async (userData: Partial<User> & { password?: string }) => {
    if (!currentUser) return;
    const q = query(collection(db, "team"), where("email", "==", userData.email));
    const existingDocs = await getDocs(q);
    
    if (!existingDocs.empty) {
      const docData = existingDocs.docs[0].data() as any;
      if (docData.isActive === false) {
        if (!confirm(`L'email ${userData.email} era precedentemente bloccata. Riattivare?`)) return;
        const uid = existingDocs.docs[0].id;
        await updateDoc(doc(db, "team", uid), {
          ...userData,
          isActive: true,
          aziendaId: currentUser.aziendaId,
        });
        return uid;
      } else {
        throw new Error("L'utente esiste già ed è attivo.");
      }
    }
    
    const secondaryConfig = {
      apiKey: "AIzaSyDTn3FOP59TOUl0Vj0LA8NzIXPAJoX5HFg",
      authDomain: "costrugest.firebaseapp.com",
      projectId: "costrugest",
      storageBucket: "costrugest.firebasestorage.app",
      messagingSenderId: "596860812954",
      appId: "1:596860812954:web:cd19e7afaf6298c9976923"
    };
    
    const secondaryApp = initializeApp(secondaryConfig, `secondary_${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth, 
        userData.email!, 
        userData.password || 'password123'
      );
      
      const newUid = userCred.user.uid;
      const { password, ...profileData } = userData;
      await setDoc(doc(db, "team", newUid), {
        ...profileData,
        id: newUid,
        isActive: true,
        aziendaId: currentUser.aziendaId,
      });

      await signOut(secondaryAuth);
      return newUid;
    } catch (error: any) {
      console.error("Error adding user to Auth:", error);
      throw error;
    }
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    await updateDoc(doc(db, "team", id), updates);
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm("Sei sicuro di voler bloccare questo utente?")) return;
    await updateDoc(doc(db, "team", id), { isActive: false });
  };

  const handleClockIn = async (siteId: string, coords: { lat: number, lng: number }) => {
    if (!currentUser) return;
    const site = sites.find(s => s.id === siteId);
    if (!site) return;

    await addDoc(collection(db, "timbrature"), {
      aziendaId: currentUser.aziendaId,
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      siteId: site.id,
      siteName: site.client,
      startTime: new Date().toISOString(),
      startCoords: coords,
      reportSubmitted: false
    });
  };

  const handleClockOut = async (recordId: string, coords: { lat: number, lng: number }) => {
    await updateDoc(doc(db, "timbrature", recordId), {
      endTime: new Date().toISOString(),
      endCoords: coords
    });
  };

  const handleRemoveReport = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo rapportino? L'operazione è irreversibile.")) return;
    await deleteDoc(doc(db, "reports", id));
  };

  const submitReport = async (reportData: Partial<DailyReport>) => {
    if (!currentUser) return;
    
    const report: Partial<DailyReport> = {
      ...reportData,
      aziendaId: currentUser.aziendaId,
      timestamp: new Date().toISOString()
    };
    
    try {
      await addDoc(collection(db, "reports"), report);
      notifyReportSubmitted(currentUser.firstName, report.siteName || '');

      const activeRec = attendance.find(a => a.userId === currentUser.id && !a.endTime);
      if (activeRec) {
        await updateDoc(doc(db, "timbrature", activeRec.id), {
          endTime: new Date().toISOString(),
          endCoords: reportData.coords,
          reportSubmitted: true
        });
      }

      if (reportData.siteId) {
        const site = sites.find(s => s.id === reportData.siteId);
        if (site) {
          await updateDoc(doc(db, "cantieri", site.id), { actualDays: site.actualDays + 1 });
        }
      }
      setActiveTab('attendance');
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Errore durante l'invio del rapportino. Riprova.");
    }
  };

  const handleUpdateSchedule = async (date: string, schedule: DailySchedule) => {
    if (!currentUser) return;
    await setDoc(doc(db, "schedules", `${currentUser.aziendaId}_${date}`), {
      ...schedule,
      aziendaId: currentUser.aziendaId,
      date: date
    });
    notifyScheduleChange();
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
        onLogin={handleLogin} 
        onRegisterCompany={handleRegisterNewCompany} 
        onPasswordReset={handlePasswordReset}
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
      onLogout={handleLogout} 
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
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onGoToReport={() => setActiveTab('daily-report')}
        />
      )}
      {activeTab === 'daily-report' && (
        <DailyReportForm 
          user={currentUser} 
          activeSite={activeSite}
          allWorkers={users.filter(u => u.role === UserRole.WORKER)}
          schedules={schedules}
          onSubmit={submitReport}
        />
      )}
      {activeTab === 'attendance-log' && (
        <AttendanceLog 
          currentUser={currentUser}
          attendance={attendance}
          reports={reports}
          sites={sites}
          onRemoveRecord={async (id) => await deleteDoc(doc(db, "timbrature", id))}
        />
      )}
      {activeTab === 'resources' && (
        <Resources 
          currentUser={currentUser} 
          users={users} 
          onAddUser={addUser} 
          onUpdateUser={handleUpdateUser}
          onRemoveUser={handleRemoveUser}
        />
      )}
      {activeTab === 'active-sites' && (
        <Sites 
          currentUser={currentUser} 
          sites={sites} 
          onAddSite={addSite} 
          onUpdateSite={updateSite} 
          onRemoveSite={removeSite}
          showActive={true} 
        />
      )}
      {activeTab === 'completed-sites' && (
        <Sites 
          currentUser={currentUser} 
          sites={sites} 
          onAddSite={addSite} 
          onUpdateSite={updateSite} 
          onRemoveSite={removeSite}
          showActive={false} 
        />
      )}
      {activeTab === 'archived-reports' && (
        <ArchivedReports 
          currentUser={currentUser}
          reports={reports} 
          company={company} 
          onRemoveReport={handleRemoveReport}
        />
      )}
      {activeTab === 'schedule' && (
        <Schedule 
          currentUser={currentUser}
          sites={sites} 
          workers={users.filter(u => u.role === UserRole.WORKER)} 
          schedules={schedules}
          onUpdateSchedule={handleUpdateSchedule}
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