export enum UserRole {
  ADMIN = 'Amministratore',
  SUPERVISOR = 'Supervisore',
  WORKER = 'Operaio'
}

export interface Company {
  id?: string;
  name: string;
  vatNumber?: string; // Partita IVA
  legalOffice: string;
  phone: string;
  email: string;
  logoUrl?: string;
  primaryColor: string;
}

export interface User {
  id: string;
  aziendaId: string;
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
  aziendaId: string;
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
  aziendaId: string;
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
  aziendaId: string;
  siteId: string;
  siteName: string;
  compilerId: string;
  compilerName: string;
  workerIds: string[];
  workerNames: string[];
  date: string;
  description: string;
  notes: string;
  photoUrl?: string;
  timestamp: string;
  coords?: { lat: number; lng: number };
}

export interface DailySchedule {
  aziendaId: string;
  date: string;
  siteAssignments: Record<string, string[]>; 
  offDuty: {
    holidays: string[];
    sickness: string[];
  };
  notes: Record<string, string>;
}