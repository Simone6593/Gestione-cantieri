
import { jsPDF } from 'jspdf';
import { DailyReport, Company } from '../types';

/**
 * Helper per ottenere le dimensioni naturali di un'immagine base64 o URL
 */
const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Calcola le dimensioni proporzionali all'interno di un box massimo
 */
const getScaledDimensions = (imgW: number, imgH: number, maxW: number, maxH: number) => {
  const ratio = imgW / imgH;
  let width = maxW;
  let height = maxW / ratio;

  if (height > maxH) {
    height = maxH;
    width = maxH * ratio;
  }

  return { width, height };
};

export const generateReportPDF = async (report: DailyReport, company: Company) => {
  const doc = new jsPDF();
  const primaryColor = company.primaryColor || '#2563eb';
  const secondaryColor = '#475569'; 

  // Header Background
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 50, 'F');
  
  let logoWidth = 0;
  let logoHeight = 0;
  let headerX = 20;

  // Company Logo con proporzioni mantenute
  if (company.logoUrl) {
    try {
      const dims = await getImageDimensions(company.logoUrl);
      const scaled = getScaledDimensions(dims.width, dims.height, 40, 30);
      logoWidth = scaled.width;
      logoHeight = scaled.height;
      
      // Centratura verticale nel box dell'header (50mm altezza)
      const logoY = (50 - logoHeight) / 2;
      doc.addImage(company.logoUrl, 'PNG', 10, logoY, logoWidth, logoHeight, undefined, 'FAST');
      headerX = 20 + logoWidth;
    } catch (e) {
      console.error("PDF Logo error", e);
      headerX = 20;
    }
  }

  // Company Details (Header Text)
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

  // Report Photo con proporzioni mantenute
  if (report.photoUrl) {
    try {
      const photoDims = await getImageDimensions(report.photoUrl);
      const photoScaled = getScaledDimensions(photoDims.width, photoDims.height, 170, 110);
      
      // Controllo se serve nuova pagina
      if (currentY + photoScaled.height + 10 > 280) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('DOCUMENTAZIONE FOTOGRAFICA:', 20, currentY);
      doc.addImage(report.photoUrl, 'JPEG', 20, currentY + 5, photoScaled.width, photoScaled.height, undefined, 'FAST');
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
