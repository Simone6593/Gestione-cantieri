
import { UserRole } from '../types';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendRoleNotification = (role: UserRole, title: string, body: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Tailor notification visual/vibration style based on role if possible (Android specific feel)
  const options: NotificationOptions = {
    body,
    icon: '/favicon.ico', // Placeholder
    badge: '/favicon.ico',
    tag: `costrugest-${role.toLowerCase()}`,
    // Fix: 'renotify' property is removed to resolve TypeScript compilation error
  };

  new Notification(`CostruGest (${role}): ${title}`, options);
};

export const notifyNewAssignment = (workerName: string, siteName: string) => {
  sendRoleNotification(
    UserRole.WORKER, 
    'Nuovo Incarico', 
    `Ciao ${workerName}, sei stato assegnato al cantiere: ${siteName}`
  );
};

export const notifyScheduleChange = () => {
  sendRoleNotification(
    UserRole.SUPERVISOR,
    'Aggiornamento Programma',
    'Il programma giornaliero è stato modificato dall\'amministratore.'
  );
};

export const notifyReportSubmitted = (compilerName: string, siteName: string) => {
  sendRoleNotification(
    UserRole.ADMIN,
    'Nuovo Rapportino',
    `${compilerName} ha inviato il rapportino per ${siteName}`
  );
};
