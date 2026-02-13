
export enum UserRole {
  ADMIN = 'Amministratore',
  SUPERVISOR = 'Supervisore',
  WORKER = 'Operaio'
}

export interface CostParameters {
  inpsRate: number;        // Aliquota INPS Aziendale %
  inailRate: number;       // Coefficiente INAIL %
  cassaEdileRate: number;  // Contributi Cassa Edile %
  tfrDivisor: number;      // Divisore TFR (solitamente 13.5)
}

export interface Company {
  id?: string;
  name: string;
  vatNumber?: string;
  legalOffice: string;
  phone: string;
  email: string;
  logoUrl?: string;
  primaryColor: string;
  costParameters?: CostParameters; // Parametri per analisi costi
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

export interface PaySlip {
  id: string;
  aziendaId: string;
  userId: string;
  userName: string;
  month: string;
  fileData?: string;
  fileUrl?: string;
  fileName: string;
  uploadDate: string;
  acceptedDate?: string | null;
  status: 'In attesa' | 'Accettata';
  // Dati estratti per calcolo costi
  competenzeLorde?: number;
  imponibileInps?: number;
  imponibileInail?: number;
  oreRetribuite?: number; // Ore indicate nel cedolino
  costoOrarioReale?: number; // Calcolato al momento del caricamento
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
  originalStartTime?: string; // Orario originale pre-modifica manuale
  originalEndTime?: string;   // Orario originale pre-modifica manuale
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
  photoUrls?: string[];
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
