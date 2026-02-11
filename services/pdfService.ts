
import { jsPDF } from 'jspdf';
import { DailyReport, Company } from '../types';

// Updated to accept company for white-label branding
export const generateReportPDF = async (report: DailyReport, company: Company) => {
  const doc = new jsPDF();
  const primaryColor = company.primaryColor || '#2563eb';
  const secondaryColor = '#475569'; // Slate-600

  // Header
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name.toUpperCase(), 20, 25);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('RAPPORTO GIORNALIERO DI CANTIERE', 20, 32);

  // Content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`ID Rapporto: ${report.id}`, 20, 55);
  
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 60, 190, 60);

  // Details Grid
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text('CANTIERE:', 20, 70);
  doc.text('DATA:', 110, 70);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(report.siteName, 20, 75);
  doc.text(new Date(report.date).toLocaleDateString('it-IT'), 110, 75);

  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPILATORE:', 20, 85);
  doc.text('TIMESTAMP INVIO:', 110, 85);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(report.compilerName, 20, 90);
  doc.text(new Date(report.timestamp).toLocaleString('it-IT'), 110, 90);

  // Workers List
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('OPERATORI PRESENTI:', 20, 105);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'italic');
  doc.text(report.workerNames.join(', '), 20, 110);

  // Description
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 120, 40, 120);
  
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIZIONE LAVORAZIONI:', 20, 128);
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(report.description, 170);
  doc.text(splitDesc, 20, 135);

  // Notes
  const descHeight = splitDesc.length * 5;
  if (report.notes) {
    const notesY = 145 + descHeight;
    doc.setFont('helvetica', 'bold');
    doc.text('NOTE AGGIUNTIVE:', 20, notesY);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(report.notes, 170);
    doc.text(splitNotes, 20, notesY + 7);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Generato automaticamente da CostruGest per Android', 105, 285, { align: 'center' });

  // Save the PDF
  doc.save(`Rapporto_${report.id}.pdf`);
};
