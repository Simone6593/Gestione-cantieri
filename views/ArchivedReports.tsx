
import React from 'react';
import { Card, Button } from '../components/Shared';
import { DailyReport, Company } from '../types';
import { FileText, User as UserIcon, Calendar, Clock, Clipboard, Sparkles, Download } from 'lucide-react';
import { generateReportPDF } from '../services/pdfService';

interface ArchivedReportsProps {
  reports: DailyReport[];
  company: Company;
}

const ArchivedReports: React.FC<ArchivedReportsProps> = ({ reports, company }) => {
  const handleDownloadPDF = async (report: DailyReport) => {
    // Passing company data to the PDF service for personalized branding
    await generateReportPDF(report, company);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Archivio Rapportini</h2>
        <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
          Totale: {reports.length}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="flex flex-col h-full border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
            {/* Header section */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">
                  {report.id}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock size={12} />
                  {new Date(report.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                {report.siteName}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-sm font-medium text-slate-500">
                <Calendar size={14} />
                {new Date(report.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Body section */}
            <div className="p-5 space-y-4 flex-1">
              {/* Personnel */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <UserIcon size={14} />
                  Personale sul Cantiere
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {report.workerNames.map((name, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
                      {name}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Compilato da: <span className="font-semibold text-slate-500">{report.compilerName}</span>
                </p>
              </div>

              {/* Full description */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lavorazioni eseguite</div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {report.description}
                </p>
              </div>

              {report.notes && (
                <div className="space-y-1 pt-2 border-t border-slate-50">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note</div>
                  <p className="text-xs text-slate-500 italic">
                    {report.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions section */}
            <div className="p-5 pt-0 mt-auto">
              <Button 
                onClick={() => handleDownloadPDF(report)}
                className="w-full bg-slate-900 hover:bg-black text-white h-11"
              >
                <Download size={18} />
                Scarica Rapporto PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="py-24 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Clipboard size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Nessun rapportino trovato</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-1">
            Non ci sono ancora rapporti archiviati nel database.
          </p>
        </div>
      )}
    </div>
  );
};

export default ArchivedReports;
