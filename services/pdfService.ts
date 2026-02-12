
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

  let logoWidth = 0;
  let logoHeight = 0;
  let headerX = 20;

  // 1. Logo Aziendale
  if (company.logoUrl) {
    try {
      const dims = await getImageDimensions(company.logoUrl);
      const scaled = getScaledDimensions(dims.width, dims.height, 45, 30);
      logoWidth = scaled.width;
      logoHeight = scaled.height;
      doc.addImage(company.logoUrl, 'PNG', 15, 15, logoWidth, logoHeight, undefined, 'FAST');
      headerX = 20 + logoWidth;
    } catch (e) {
      headerX = 20;
    }
  }

  // 2. Intestazione
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(company.name.toUpperCase(), headerX + 5, 25);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text(company.legalOffice || '', headerX + 5, 32);
  doc.text(`Email: ${company.email} | Tel: ${company.phone}`, headerX + 5, 37);

  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1.5);
  doc.line(15, 50, 195, 50);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORTO GIORNALIERO DI CANTIERE', 105, 62, { align: 'center' });

  doc.setFontSize(10);
  doc.text('CANTIERE / CLIENTE:', 15, 75);
  doc.text('DATA:', 130, 75);
  doc.setFont('helvetica', 'bold');
  doc.text(report.siteName, 15, 80);
  doc.text(new Date(report.date).toLocaleDateString('it-IT'), 130, 80);

  doc.setFont('helvetica', 'normal');
  doc.text('PERSONALE PRESENTE:', 15, 90);
  doc.setFont('helvetica', 'italic');
  doc.text(report.workerNames.join(', '), 15, 95);

  doc.setFont('helvetica', 'bold');
  doc.text('LAVORAZIONI ESEGUITE:', 15, 110);
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(report.description, 180);
  doc.text(splitDesc, 15, 115);

  let currentY = 120 + (splitDesc.length * 5);

  if (report.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('NOTE:', 15, currentY);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(report.notes, 180);
    doc.text(splitNotes, 15, currentY + 5);
    currentY += 15 + (splitNotes.length * 5);
  }

  // 3. Documentazione Fotografica Multipla
  if (report.photoUrls && report.photoUrls.length > 0) {
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTAZIONE FOTOGRAFICA:', 15, currentY);
    currentY += 8;

    for (const url of report.photoUrls) {
      try {
        const dims = await getImageDimensions(url);
        const scaled = getScaledDimensions(dims.width, dims.height, 170, 90);
        
        if (currentY + scaled.height + 10 > 280) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.addImage(url, 'JPEG', 20, currentY, scaled.width, scaled.height, undefined, 'FAST');
        currentY += scaled.height + 10;
      } catch (e) {
        console.error("PDF Image error", e);
      }
    }
  }

  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(`Documento generato digitalmente - CostruGest`, 105, 288, { align: 'center' });

  doc.save(`Rapporto_${report.siteName.replace(/\s+/g, '_')}_${report.date}.pdf`);
};
