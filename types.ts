
export enum UserRole {
  ADMIN = 'Amministratore',
  SUPERVISOR = 'Supervisore',
  WORKER = 'Operaio'
}

export interface Company {
  id?: string;
  name: string;
  legalOffice: string;
  phone: string;
  email: string;
  logoUrl?: string;
  primaryColor: string;
}

export interface User {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
  avatarUrl?: string;
}

export interface Site {
  id: string;
  companyId: string;
  client: string;
  address: string;
  budget: number;
  quoteUrl?: string;
  estimatedDays: number;
  actualDays: number;
  isActive: boolean;
  coords?: { latitude: number; longitude: number };
}

export interface AttendanceRecord {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  siteId: string;
  siteName: string;
  startTime: string;
  endTime?: string;
  startCoords?: { lat: number; lng: number };
  endCoords?: { lat: number; lng: number };
  reportSubmitted: boolean;
}

export interface DailyReport {
  id: string;
  companyId: string;
  siteId: string;
  siteName: string;
  compilerId: string;
  compilerName: string;
  workerIds: string[];
  workerNames: string[];
  date: string;
  description: string;
  summary?: string;
  notes: string;
  photoUrl?: string;
  timestamp: string;
  coords?: { lat: number; lng: number };
}

export interface DailySchedule {
  companyId: string;
  date: string;
  siteAssignments: Record<string, string[]>; 
  offDuty: {
    holidays: string[];
    sickness: string[];
  };
  notes: Record<string, string>;
}
