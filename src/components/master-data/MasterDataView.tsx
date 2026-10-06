import React, { useState } from 'react';
import { AnalyzerList } from './AnalyzerList';
import { ParameterList } from './ParameterList';
import { Database, Wrench, FileSpreadsheet } from 'lucide-react';

export const MasterDataView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'analyzer' | 'parameter'>('analyzer');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="h-10 w-10 rounded-xl bg-[#0B5FA5] flex items-center justify-center text-white">
          <Database className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Master Data Laboratorium</h1>
          <p className="text-sm text-slate-500">Konfigurasi utama alat, parameter, dan referensi QC.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('analyzer')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeSubTab === 'analyzer' ? 'border-[#0B5FA5] text-[#0B5FA5]' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
        >
          <Wrench className="inline h-4 w-4 mr-2" />
          Analyzer / Instrument
        </button>
        <button
          onClick={() => setActiveSubTab('parameter')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeSubTab === 'parameter' ? 'border-[#0B5FA5] text-[#0B5FA5]' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
        >
          <FileSpreadsheet className="inline h-4 w-4 mr-2" />
          Parameter QC
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {activeSubTab === 'analyzer' && <AnalyzerList />}
        {activeSubTab === 'parameter' && <ParameterList />}
      </div>
    </div>
  );
};
