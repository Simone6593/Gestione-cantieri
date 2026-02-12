
import React from 'react';
import { Card, Button } from '../components/Shared';
import { DailyReport, Company, User, UserRole } from '../types';
import { FileText, User as UserIcon, Calendar, Clock, Clipboard, Download, Trash2, Image as ImageIcon } from 'lucide-react';
import { generateReportPDF } from '../services/pdfService';

interface ArchivedReportsProps {
  currentUser: User;
  reports: DailyReport[];
  company: Company;
  onRemoveReport: (id: string) => void;
}

const ArchivedReports: React.FC<ArchivedReportsProps> = ({ currentUser, reports, company, onRemoveReport }) => {
  const isAdmin = currentUser.role === UserRole.ADMIN;

  const handleDownloadPDF = async (report: DailyReport) => {
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
          <Card key={report.id} className="flex flex-col h-full border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group relative">
            {isAdmin && (
              <button 
                onClick={() => onRemoveReport(report.id)}
                className="absolute top-4 right-4 z-20 p-2 text-slate-300 hover:text-red-500 transition-colors bg-white/80 backdrop-blur rounded-full shadow-sm"
                title="Elimina rapportino"
              >
                <Trash2 size={16} />
              </button>
            )}

            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-start mb-2 pr-8">
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

            <div className="p-5 space-y-4 flex-1">
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
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lavorazioni eseguite</div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {report.description}
                </p>
              </div>

              {report.photoUrls && report.photoUrls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} /> Foto ({report.photoUrls.length})
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {report.photoUrls.slice(0, 3).map((url, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 relative">
                        <img src={url} className="w-full h-full object-cover" alt="Foto cantiere" />
                        {idx === 2 && report.photoUrls!.length > 3 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                            +{report.photoUrls!.length - 3}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
    </div>
  );
};

export default ArchivedReports;
