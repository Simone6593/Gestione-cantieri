
import React, { useState, useEffect } from 'react';
import { UserRole, User, Site, DailyReport, AttendanceRecord, DailySchedule, Company } from './types';
import { MOCK_USERS, MOCK_SITES, MOCK_REPORTS } from './constants';
import { 
  requestNotificationPermission, 
  notifyReportSubmitted, 
  notifyScheduleChange 
} from './services/notificationService';
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
  name: 'CostruGest Demo',
  legalOffice: 'Via dell\'Edilizia 1, Milano',
  phone: '02 1234567',
  email: 'info@costrugest.it',
  primaryColor: '#2563eb' // Blue-600
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('attendance');
  
  // App State
  const [company, setCompany] = useState<Company>(() => {
    const saved = localStorage.getItem('company_data');
    return saved ? JSON.parse(saved) : DEFAULT_COMPANY;
  });
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users_data');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  const [sites, setSites] = useState<Site[]>(MOCK_SITES);
  const [reports, setReports] = useState<DailyReport[]>(MOCK_REPORTS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [schedules, setSchedules] = useState<Record<string, DailySchedule>>({});

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Dynamic Branding
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', company.primaryColor);
    // Calculate a darker version for hover states
    const darken = (color: string) => {
      // Simplified darkening logic for HEX
      return color; 
    };
    document.documentElement.style.setProperty('--primary-color-dark', darken(company.primaryColor));
    
    // Persist company data
    localStorage.setItem('company_data', JSON.stringify(company));
  }, [company]);

  useEffect(() => {
    localStorage.setItem('users_data', JSON.stringify(users));
  }, [users]);

  // Derived state
  const activeAttendance = attendance.find(a => a.userId === currentUser?.id && !a.endTime);
  const activeSite = sites.find(s => s.id === activeAttendance?.siteId);

  const handleLogin = (email: string, pass: string) => {
    const user = users.find(u => u.email === email);
    if (user && (user.password === pass || !user.password)) {
      setCurrentUser(user);
      if (user.role === UserRole.WORKER) setActiveTab('attendance');
      else setActiveTab('active-sites');
    } else {
      alert("Credenziali non valide.");
    }
  };

  const handleRegisterNewCompany = (adminData: Partial<User>, companyData: Company) => {
    const newAdmin: User = {
      id: `u-admin-${Date.now()}`,
      firstName: adminData.firstName || '',
      lastName: adminData.lastName || '',
      email: adminData.email || '',
      phone: adminData.phone || '',
      role: UserRole.ADMIN,
      password: adminData.password || 'password123'
    };
    
    setCompany(companyData);
    setUsers([newAdmin]); // Start fresh for new company
    setCurrentUser(newAdmin);
    setActiveTab('active-sites');
    
    // Reset other states for the new company
    setSites([]);
    setReports([]);
    setAttendance([]);
    setSchedules({});
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const addSite = (site: Partial<Site>) => {
    const newSite: Site = {
      id: `s-${Date.now()}`,
      client: site.client || '',
      address: site.address || '',
      budget: site.budget || 0,
      estimatedDays: site.estimatedDays || 0,
      actualDays: 0,
      isActive: true,
      quoteUrl: site.quoteUrl,
      coords: site.coords
    };
    setSites([...sites, newSite]);
  };

  const updateSite = (id: string, updates: Partial<Site>) => {
    setSites(sites.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addUser = (userData: Partial<User>) => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      role: userData.role || UserRole.WORKER,
      password: userData.password || 'password123',
      avatarUrl: userData.avatarUrl
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser && id === currentUser.id) {
      setCurrentUser({ ...currentUser, ...updates });
    }
  };

  const removeUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const handleClockIn = (siteId: string, coords: { lat: number, lng: number }) => {
    const site = sites.find(s => s.id === siteId);
    if (!site || !currentUser) return;

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      siteId: site.id,
      siteName: site.client,
      startTime: new Date().toISOString(),
      startCoords: coords,
      reportSubmitted: false
    };
    setAttendance([...attendance, newRecord]);
  };

  const handleClockOut = (recordId: string, coords: { lat: number, lng: number }) => {
    setAttendance(attendance.map(a => 
      a.id === recordId 
        ? { ...a, endTime: new Date().toISOString(), endCoords: coords } 
        : a
    ));
  };

  const removeAttendanceRecord = (id: string) => {
    setAttendance(attendance.filter(a => a.id !== id));
  };

  const submitReport = async (reportData: Partial<DailyReport>) => {
    if (!currentUser) return;

    const newReport: DailyReport = {
      id: `${reportData.siteName}-${new Date().toLocaleDateString('it-IT').replace(/\//g, '-')}-${Date.now()}`,
      siteId: reportData.siteId || '',
      siteName: reportData.siteName || '',
      compilerId: currentUser.id,
      compilerName: `${currentUser.firstName} ${currentUser.lastName}`,
      workerIds: reportData.workerIds || [],
      workerNames: reportData.workerNames || [],
      date: reportData.date || new Date().toISOString().split('T')[0],
      description: reportData.description || '',
      notes: reportData.notes || '',
      photoUrl: reportData.photoUrl,
      timestamp: new Date().toISOString(),
      coords: reportData.coords
    };

    setReports([...reports, newReport]);
    notifyReportSubmitted(newReport.compilerName, newReport.siteName);

    const activeRec = attendance.find(a => a.userId === currentUser.id && !a.endTime);
    if (activeRec) {
      setAttendance(attendance.map(a => 
        a.id === activeRec.id 
          ? { 
              ...a, 
              endTime: new Date().toISOString(), 
              endCoords: reportData.coords, 
              reportSubmitted: true 
            } 
          : a
      ));
    }

    setSites(sites.map(s => 
      s.id === reportData.siteId 
        ? { ...s, actualDays: s.actualDays + 1 } 
        : s
    ));

    setActiveTab('attendance');
  };

  const handleUpdateSchedule = (date: string, schedule: DailySchedule) => {
    setSchedules(prev => ({
      ...prev,
      [date]: schedule
    }));
    notifyScheduleChange();
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} onRegisterCompany={handleRegisterNewCompany} users={users} />;
  }

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
          onRemoveRecord={removeAttendanceRecord}
        />
      )}
      {activeTab === 'resources' && (
        <Resources 
          currentUser={currentUser} 
          users={users} 
          company={company}
          onUpdateCompany={setCompany}
          onAddUser={addUser} 
          onUpdateUser={updateUser}
          onRemoveUser={removeUser}
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
