
import React, { useState, useMemo } from 'react';
import { Card, Button, Input } from '../components/Shared';
import { Site, MaterialCost, User } from '../types';
import { ShoppingCart, Plus, X, Download, Trash2, Calendar, Building2, Hash, Search, Check, ChevronDown } from 'lucide-react';

interface MaterialCostsProps {
  currentUser: User;
  sites: Site[];
  costs: MaterialCost[];
  onAddCost: (cost: Partial<MaterialCost>) => void;
  onRemoveCost: (id: string) => void;
}

const MaterialCosts: React.FC<MaterialCostsProps> = ({ currentUser, sites, costs, onAddCost, onRemoveCost }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); 
  
  const [formData, setFormData] = useState({
    supplier: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    siteIds: [] as string[],
    taxableAmount: ''
  });

  const activeSites = sites.filter(s => s.isActive);

  const filteredCosts = useMemo(() => {
    return costs
      .filter(c => {
        const matchesSearch = c.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             c.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMonth = c.date.startsWith(filterMonth);
        return matchesSearch && matchesMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [costs, searchTerm, filterMonth]);

  const toggleSite = (id: string) => {
    setFormData(prev => ({
      ...prev,
      siteIds: prev.siteIds.includes(id) 
        ? prev.siteIds.filter(sid => sid !== id) 
        : [...prev.siteIds, id]
    }));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier || !formData.date || formData.siteIds.length === 0 || !formData.taxableAmount) {
      alert("Compila tutti i campi obbligatori e seleziona almeno un cantiere.");
      return;
    }

    const selectedSiteNames = sites
      .filter(s => formData.siteIds.includes(s.id))
      .map(s => s.client);

    onAddCost({
      aziendaId: currentUser.aziendaId,
      supplier: formData.supplier,
      invoiceNumber: formData.invoiceNumber,
      date: formData.date,
      siteIds: formData.siteIds,
      siteNames: selectedSiteNames,
      taxableAmount: Number(formData.taxableAmount),
      timestamp: new Date().toISOString()
    });

    setFormData({
      supplier: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      siteIds: [],
      taxableAmount: ''
    });
    setIsAdding(false);
  };

  const downloadExcel = (empty: boolean = false) => {
    // Esportazione in formato CSV (compatibile Excel)
    const headers = ["Fornitore", "N. Fattura", "Data", "Cantieri Associati", "Imponibile (EUR)"];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n";

    if (!empty) {
      filteredCosts.forEach(c => {
        const row = [
          `"${c.supplier.replace(/"/g, '""')}"`,
          `"${c.invoiceNumber.replace(/"/g, '""')}"`,
          c.date,
          `"${c.siteNames.join(', ')}"`,
          c.taxableAmount.toFixed(2).replace('.', ',')
        ];
        csvContent += row.join(";") + "\n";
      } );
    } else {
      // Template vuoto con esempi
      csvContent += "Fornitore Esempio;FT-001;2024-01-01;Cantiere A, Cantiere B;1000,00\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", empty ? "Template_Spese_Materiali.csv" : `Report_Spese_${filterMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Costi Materiali</h2>
          <p className="text-sm text-slate-500">Gestione fatture fornitori e suddivisione per cantiere.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={() => downloadExcel(true)} title="Scarica template excel vuoto">
             <Download size={18} /> Template
          </Button>
          <Button onClick={() => setIsAdding(true)}>
            <Plus size={18} /> Aggiungi Spesa
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="p-6 border-blue-200 bg-blue-50 animate-in slide-in-from-top-4 shadow-xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-blue-100">
            <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
              <ShoppingCart size={20} /> Registra Nuova Fattura
            </h3>
            <button onClick={() => setIsAdding(false)} className="text-blue-400 p-1 hover:bg-blue-100 rounded-full">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleAddSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input 
                label="Fornitore *" 
                value={formData.supplier} 
                onChange={e => setFormData({...formData, supplier: e.target.value})} 
                placeholder="Nome fornitore..."
                required 
              />
              <Input 
                label="N. Fattura / Documento" 
                value={formData.invoiceNumber} 
                onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} 
                placeholder="es. 123/2024"
              />
              <Input 
                label="Data *" 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
                required 
              />
              <Input 
                label="Imponibile (€) *" 
                type="number" 
                value={formData.taxableAmount} 
                onChange={e => setFormData({...formData, taxableAmount: e.target.value})} 
                placeholder="0.00"
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Building2 size={16} className="text-blue-500" /> Cantieri a cui addebitare la spesa *
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-white rounded-xl border border-slate-200 shadow-inner min-h-[60px]">
                {activeSites.map(site => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => toggleSite(site.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      formData.siteIds.includes(site.id) 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300'
                    }`}
                  >
                    {formData.siteIds.includes(site.id) && <Check size={12} />}
                    {site.client}
                  </button>
                ))}
                {activeSites.length === 0 && <p className="text-xs text-slate-400">Nessun cantiere attivo.</p>}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Nota: Se selezioni più cantieri, la spesa verrà divisa in parti uguali tra loro.</p>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-blue-100">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Annulla</Button>
              <Button type="submit" className="px-8 shadow-md">Salva Spesa</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-4 bg-white shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cerca fornitore o n. fattura..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <input 
                type="month" 
                value={filterMonth} 
                onChange={e => setFilterMonth(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none"
             />
             <Button variant="secondary" onClick={() => downloadExcel()} disabled={filteredCosts.length === 0}>
                <Download size={18} /> Esporta Report
             </Button>
          </div>
        </div>
      </Card>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="p-4">Fornitore</th>
                <th className="p-4">N. Fattura</th>
                <th className="p-4">Data</th>
                <th className="p-4">Destinazione</th>
                <th className="p-4 text-right">Imponibile</th>
                <th className="p-4 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredCosts.map(cost => (
                <tr key={cost.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{cost.supplier}</td>
                  <td className="p-4 font-mono text-slate-500">{cost.invoiceNumber || '---'}</td>
                  <td className="p-4 text-slate-600">{new Date(cost.date).toLocaleDateString('it-IT')}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {cost.siteNames.map((name, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                          {name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-slate-700">
                    € {cost.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => confirm("Eliminare questa spesa?") && onRemoveCost(cost.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCosts.length > 0 && (
                <tr className="bg-slate-900 text-white font-bold">
                  <td colSpan={4} className="p-4 text-right uppercase text-[10px] tracking-widest">Totale Mensile Selezionato</td>
                  <td className="p-4 text-right font-mono text-lg">
                    € {filteredCosts.reduce((sum, c) => sum + c.taxableAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredCosts.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold">Nessun costo registrato per questo periodo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialCosts;
