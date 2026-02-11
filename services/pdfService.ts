
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

  // 1. Logo Aziendale (se presente)
  if (company.logoUrl) {
    try {
      const dims = await getImageDimensions(company.logoUrl);
      const scaled = getScaledDimensions(dims.width, dims.height, 45, 30);
      logoWidth = scaled.width;
      logoHeight = scaled.height;
      
      doc.addImage(company.logoUrl, 'PNG', 15, 15, logoWidth, logoHeight, undefined, 'FAST');
      headerX = 20 + logoWidth;
    } catch (e) {
      console.error("PDF Logo error", e);
      headerX = 20;
    }
  }

  // 2. Intestazione Aziendale (Testo)
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(company.name.toUpperCase(), headerX + 5, 25);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text(company.legalOffice || 'Indirizzo non specificato', headerX + 5, 32);
  doc.text(`Email: ${company.email} | Tel: ${company.phone}`, headerX + 5, 37);
  if (company.vatNumber) {
    doc.text(`P.IVA: ${company.vatNumber}`, headerX + 5, 42);
  }

  // 3. RIGA SPESSA DEL COLORE AZIENDALE (Separatore)
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1.5);
  doc.line(15, 50, 195, 50);

  // 4. Titolo Rapporto
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORTO GIORNALIERO DI CANTIERE', 105, 62, { align: 'center' });

  // 5. Dettagli Generali
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID: ${report.id}`, 15, 75);
  
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.line(15, 78, 195, 78);

  // Grid Informazioni
  doc.text('CANTIERE / CLIENTE:', 15, 88);
  doc.text('DATA LAVORO:', 130, 88);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(report.siteName, 15, 93);
  doc.text(new Date(report.date).toLocaleDateString('it-IT'), 130, 93);

  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('RESPONSABILE COMPILAZIONE:', 15, 103);
  doc.text('DATA E ORA INVIO:', 130, 103);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(report.compilerName, 15, 108);
  doc.text(new Date(report.timestamp).toLocaleString('it-IT'), 130, 108);

  // Operatori
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('PERSONALE PRESENTE:', 15, 120);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'italic');
  doc.text(report.workerNames.join(', '), 15, 125);

  // 6. Descrizione Lavorazioni
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.8);
  doc.line(15, 135, 35, 135);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DESCRIZIONE DELLE ATTIVITÀ:', 15, 142);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const splitDesc = doc.splitTextToSize(report.description, 180);
  doc.text(splitDesc, 15, 148);

  let currentY = 155 + (splitDesc.length * 5);

  // Note (opzionali)
  if (report.notes) {
    if (currentY > 260) { doc.addPage(); currentY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text('NOTE E OSSERVAZIONI:', 15, currentY);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(report.notes, 180);
    doc.text(splitNotes, 15, currentY + 7);
    currentY += 15 + (splitNotes.length * 5);
  }

  // 7. Foto Cantiere
  if (report.photoUrl) {
    try {
      const photoDims = await getImageDimensions(report.photoUrl);
      const photoScaled = getScaledDimensions(photoDims.width, photoDims.height, 180, 100);
      
      if (currentY + photoScaled.height + 15 > 280) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('DOCUMENTAZIONE FOTOGRAFICA:', 15, currentY);
      doc.addImage(report.photoUrl, 'JPEG', 15, currentY + 5, photoScaled.width, photoScaled.height, undefined, 'FAST');
    } catch (e) {
      console.error("PDF Image error", e);
    }
  }

  // 8. Footer
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(`Documento generato digitalmente tramite CostruGest | Azienda: ${company.name}`, 105, 288, { align: 'center' });

  // Salvataggio
  const fileName = `Rapporto_${report.siteName.replace(/\s+/g, '_')}_${report.date}.pdf`;
  doc.save(fileName);
};
