
import { jsPDF } from 'jspdf';
import { DailyReport, Company } from '../types';

export const generateReportPDF = async (report: DailyReport, company: Company) => {
  const doc = new jsPDF();
  const primaryColor = company.primaryColor || '#2563eb';
  const secondaryColor = '#475569'; 

  // Header Background
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 50, 'F');
  
  // Company Logo
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', 10, 10, 30, 30, undefined, 'FAST');
    } catch (e) {
      console.error("PDF Logo error", e);
    }
  }

  // Company Details (Header Text)
  const headerX = company.logoUrl ? 50 : 20;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(company.name.toUpperCase(), headerX, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(company.legalOffice || 'Indirizzo non disponibile', headerX, 30);
  doc.text(`Email: ${company.email} | Tel: ${company.phone}`, headerX, 36);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORTO GIORNALIERO DI CANTIERE', headerX, 45);

  // Content Start
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(`ID Rapporto: ${report.id}`, 20, 65);
  
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 70, 190, 70);

  // Details Grid
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('CANTIERE:', 20, 80);
  doc.text('DATA:', 110, 80);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(report.siteName, 20, 85);
  doc.text(new Date(report.date).toLocaleDateString('it-IT'), 110, 85);

  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPILATORE:', 20, 95);
  doc.text('TIMESTAMP INVIO:', 110, 95);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(report.compilerName, 20, 100);
  doc.text(new Date(report.timestamp).toLocaleString('it-IT'), 110, 100);

  // Workers List
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('OPERATORI PRESENTI:', 20, 115);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'italic');
  doc.text(report.workerNames.join(', '), 20, 120);

  // Description
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 130, 40, 130);
  
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIZIONE LAVORAZIONI:', 20, 138);
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(report.description, 170);
  doc.text(splitDesc, 20, 145);

  let currentY = 155 + (splitDesc.length * 5);

  // Notes
  if (report.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('NOTE AGGIUNTIVE:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(report.notes, 170);
    doc.text(splitNotes, 20, currentY + 7);
    currentY += 15 + (splitNotes.length * 5);
  }

  // Report Photo
  if (report.photoUrl) {
    // Check if we need a new page
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    try {
      doc.setFont('helvetica', 'bold');
      doc.text('DOCUMENTAZIONE FOTOGRAFICA:', 20, currentY);
      doc.addImage(report.photoUrl, 'JPEG', 20, currentY + 5, 170, 110, undefined, 'FAST');
    } catch (e) {
      console.error("PDF Image error", e);
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Generato automaticamente da CostruGest by Simone Barni', 105, 285, { align: 'center' });

  // Save the PDF
  doc.save(`Rapporto_${report.siteName.replace(/\s+/g, '_')}_${report.date}.pdf`);
};
