import React, { useState, useEffect } from 'react';
import { UserRole, User, Site, DailyReport, AttendanceRecord, DailySchedule, Company } from './types';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
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
import { requestNotificationPermission, notifyReportSubmitted, notifyScheduleChange } from './services/notificationService';
import { summarizeWorkDescription } from './geminiService'; // Import Gemini service
import Layout from './components/Layout';
import Login from './views/Login';
import Resources from './views/Resources';
import Sites from './views/Sites';
import Attendance from './views/Attendance';
import DailyReportForm from './views/DailyReport';
import ArchivedReports from './views/ArchivedReports';
import Schedule from './views/Schedule';
import AttendanceLog from './views/AttendanceLog';

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
            const userData = userDoc.data() as User;
            setCurrentUser(userData);
            setupFirestoreListeners(userData.companyId);
          } else {
            // Caso utente appena registrato ma doc non ancora pronto
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

    // 1. Company Data
    onSnapshot(doc(db, "companies", companyId), (doc) => {
      if (doc.exists()) setCompany(doc.data() as Company);
    });

    // 2. Users of same company
    const qUsers = query(collection(db, "users"), where("companyId", "==", companyId));
    onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(d => d.data() as User));
    });

    // 3. Sites
    const qSites = query(collection(db, "sites"), where("companyId", "==", companyId));
    onSnapshot(qSites, (snapshot) => {
      setSites(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Site)));
    });

    // 4. Reports
    const qReports = query(collection(db, "reports"), where("companyId", "==", companyId));
    onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DailyReport)));
    });

    // 5. Attendance
    const qAttendance = query(collection(db, "attendance"), where("companyId", "==", companyId));
    onSnapshot(qAttendance, (snapshot) => {
      setAttendance(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord)));
    });

    // 6. Schedules
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
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      alert("Errore accesso: " + error.message);
    }
  };

  const handleRegisterNewCompany = async (adminData: Partial<User>, companyData: Company) => {
    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(auth, adminData.email!, adminData.password!);
      const uid = userCred.user.uid;
      const companyId = `comp_${Date.now()}`;

      await setDoc(doc(db, "companies", companyId), { ...companyData, id: companyId });

      const newAdmin: User = {
        id: uid,
        companyId: companyId,
        firstName: adminData.firstName || '',
        lastName: adminData.lastName || '',
        email: adminData.email || '',
        phone: adminData.phone || '',
        role: UserRole.ADMIN
      };
      await setDoc(doc(db, "users", uid), newAdmin);
      
      setCurrentUser(newAdmin);
      setupFirestoreListeners(companyId);
      setActiveTab('active-sites');
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

  const addUser = async (userData: Partial<User>) => {
    if (!currentUser) return;
    const tempId = `u-${Date.now()}`;
    await setDoc(doc(db, "users", tempId), {
      ...userData,
      id: tempId,
      companyId: currentUser.companyId,
    });
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

  // Improved submitReport with Gemini AI summary integration
  const submitReport = async (reportData: Partial<DailyReport>) => {
    if (!currentUser) return;

    // Fix: Ensure description is a string before passing to summarizer
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

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Inizializzazione CostruGest...</div>;

  if (!currentUser) {
    return <Login onLogin={handleLogin} onRegisterCompany={handleRegisterNewCompany} users={users} />;
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
          onUpdateUser={async (id, u) => await updateDoc(doc(db, "users", id), u)}
          onRemoveUser={async (id) => await deleteDoc(doc(db, "users", id))}
        />
      )}
      {activeTab === 'active-sites' && (
        <Sites 
          currentUser={currentUser} 
          sites={sites} 
          onAddSite={addSite} 
          onUpdateSite={updateSite} 
          showActive={true} 
        />
      )}
      {activeTab === 'completed-sites' && (
        <Sites 
          currentUser={currentUser} 
          sites={sites} 
          onAddSite={addSite} 
          onUpdateSite={updateSite} 
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
    </Layout>
  );
};

export default App;