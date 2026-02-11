
import React, { useState, useEffect } from 'react';
import { UserRole, User, Site, DailyReport, AttendanceRecord, DailySchedule, Company } from './types';
import { auth, db } from './firebase';
// @ts-ignore
import { initializeApp } from 'firebase/app';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  getAuth,
  sendPasswordResetEmail
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
import { summarizeWorkDescription } from './geminiService';
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
  primaryColor: '#2563eb'
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
    requestNotificationPermission();
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User & { isActive?: boolean };
            
            // BLOCCO ACCESSO SE DISATTIVATO
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
            
            setupFirestoreListeners(userData.companyId);
          } else {
            setLoading(false);
          }
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

  const setupFirestoreListeners = (companyId: string) => {
    setLoading(true);

    onSnapshot(doc(db, "companies", companyId), (doc) => {
      if (doc.exists()) setCompany(doc.data() as Company);
    });

    // Filtriamo per mostrare solo utenti attivi nel team
    const qUsers = query(collection(db, "users"), where("companyId", "==", companyId), where("isActive", "==", true));
    onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    });

    const qSites = query(collection(db, "sites"), where("companyId", "==", companyId));
    onSnapshot(qSites, (snapshot) => {
      setSites(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Site)));
    });

    const qReports = query(collection(db, "reports"), where("companyId", "==", companyId));
    onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DailyReport)));
    });

    const qAttendance = query(collection(db, "attendance"), where("companyId", "==", companyId));
    onSnapshot(qAttendance, (snapshot) => {
      setAttendance(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord)));
    });

    const qSchedules = query(collection(db, "schedules"), where("companyId", "==", companyId));
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
    const userCred = await signInWithEmailAndPassword(auth, email, pass);
    const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
    
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
      const userCred = await createUserWithEmailAndPassword(auth, adminData.email!, adminData.password!);
      const uid = userCred.user.uid;
      const companyId = `comp_${Date.now()}`;

      await setDoc(doc(db, "companies", companyId), { ...companyData, id: companyId });

      const newAdmin: User & { isActive: boolean } = {
        id: uid,
        companyId: companyId,
        firstName: adminData.firstName || '',
        lastName: adminData.lastName || '',
        email: adminData.email || '',
        phone: adminData.phone || '',
        role: UserRole.ADMIN,
        isActive: true
      };
      await setDoc(doc(db, "users", uid), newAdmin);
      
      setCurrentUser(newAdmin);
      setActiveTab('attendance-log');
      setupFirestoreListeners(companyId);
    } catch (error: any) {
      alert("Errore registrazione: " + error.message);
      setLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const addSite = async (site: Partial<Site>) => {
    if (!currentUser) return;
    await addDoc(collection(db, "sites"), {
      ...site,
      companyId: currentUser.companyId,
      actualDays: 0,
      isActive: true
    });
  };

  const updateSite = async (id: string, updates: Partial<Site>) => {
    await updateDoc(doc(db, "sites", id), updates);
  };

  const removeSite = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo cantiere?")) return;
    await deleteDoc(doc(db, "sites", id));
  };

  const addUser = async (userData: Partial<User> & { password?: string }) => {
    if (!currentUser) return;

    // CONTROLLO SE ESISTE GIÀ UN ACCOUNT (ATTIVO O DISATTIVATO)
    const q = query(collection(db, "users"), where("email", "==", userData.email));
    const existingDocs = await getDocs(q);
    
    if (!existingDocs.empty) {
      const docData = existingDocs.docs[0].data() as any;
      if (docData.isActive === false) {
        // RIATTIVAZIONE
        if (!confirm(`L'email ${userData.email} era precedentemente bloccata. Vuoi riattivarla con i nuovi dati? (Nota: la password rimarrà quella vecchia, l'utente potrà resettarla se dimenticata).`)) {
          return;
        }
        const uid = existingDocs.docs[0].id;
        await updateDoc(doc(db, "users", uid), {
          ...userData,
          isActive: true,
          companyId: currentUser.companyId, // Assicuriamoci che sia nella stessa azienda
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
      await setDoc(doc(db, "users", newUid), {
        ...profileData,
        id: newUid,
        isActive: true,
        companyId: currentUser.companyId,
      });

      await signOut(secondaryAuth);
      return newUid;
    } catch (error: any) {
      console.error("Error adding user to Auth:", error);
      throw error;
    }
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    await updateDoc(doc(db, "users", id), updates);
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm("Sei sicuro di voler bloccare questo utente? L'accesso verrà revocato immediatamente.")) return;
    try {
      // SOFT DELETE: Disattiviamo invece di eliminare
      await updateDoc(doc(db, "users", id), { isActive: false });
    } catch (error: any) {
      alert("Errore durante il blocco: " + error.message);
    }
  };

  const handleClockIn = async (siteId: string, coords: { lat: number, lng: number }) => {
    if (!currentUser) return;
    const site = sites.find(s => s.id === siteId);
    if (!site) return;

    await addDoc(collection(db, "attendance"), {
      companyId: currentUser.companyId,
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
    await updateDoc(doc(db, "attendance", recordId), {
      endTime: new Date().toISOString(),
      endCoords: coords
    });
  };

  const submitReport = async (reportData: Partial<DailyReport>) => {
    if (!currentUser) return;

    let summary = "";
    if (reportData.description) {
      try {
        summary = await summarizeWorkDescription(reportData.description);
      } catch (err) {
        console.error("AI summary failed", err);
      }
    }

    const report: Partial<DailyReport> = {
      ...reportData,
      summary,
      companyId: currentUser.companyId,
      timestamp: new Date().toISOString()
    };
    
    await addDoc(collection(db, "reports"), report);
    notifyReportSubmitted(currentUser.firstName, report.siteName || '');

    const activeRec = attendance.find(a => a.userId === currentUser.id && !a.endTime);
    if (activeRec) {
      await updateDoc(doc(db, "attendance", activeRec.id), {
        endTime: new Date().toISOString(),
        endCoords: reportData.coords,
        reportSubmitted: true
      });
    }

    if (reportData.siteId) {
      const site = sites.find(s => s.id === reportData.siteId);
      if (site) {
        await updateDoc(doc(db, "sites", site.id), { actualDays: site.actualDays + 1 });
      }
    }
    setActiveTab('attendance');
  };

  const handleUpdateSchedule = async (date: string, schedule: DailySchedule) => {
    if (!currentUser) return;
    await setDoc(doc(db, "schedules", `${currentUser.companyId}_${date}`), {
      ...schedule,
      companyId: currentUser.companyId,
      date: date
    });
    notifyScheduleChange();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-bold tracking-widest animate-pulse">COSTRUGEST...</div>;

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
          onRemoveRecord={async (id) => await deleteDoc(doc(db, "attendance", id))}
        />
      )}
      {activeTab === 'resources' && (
        <Resources 
          currentUser={currentUser} 
          users={users} 
          company={company}
          onUpdateCompany={async (c) => await updateDoc(doc(db, "companies", currentUser.companyId), c as any)}
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
        <ArchivedReports reports={reports} company={company} />
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
        <Options user={currentUser} company={company} />
      )}
    </Layout>
  );
};

export default App;
