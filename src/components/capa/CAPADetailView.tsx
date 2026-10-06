import React, { useState } from 'react';
import { CAPA } from '../../types';
import { X, FolderGit2, CheckCircle2, ShieldCheck, Clock, AlertTriangle, Edit3, Trash2, ExternalLink } from 'lucide-react';

interface CAPADetailViewProps {
  capa: CAPA;
  onClose: () => void;
  onEdit: (capa: CAPA) => void;
  onDelete: (capa: CAPA) => void;
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const CAPADetailView: React.FC<CAPADetailViewProps> = ({ capa, onClose, onEdit, onDelete, onNavigateToTab }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const tabs = ['Overview', 'Related QC', 'Investigation', 'Root Cause', 'Corrective Action', 'Preventive Action', 'Evidence', 'Effectiveness', 'Timeline', 'Audit Trail'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Dokumen CAPA #{capa.id}</h3>
            <p className="text-xs text-slate-500 font-mono">Status: {capa.status} | Priority: {capa.priority}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-2 border-b border-slate-200 mb-4 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-xs font-semibold border-b-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'Overview' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border">
                <div><label className="text-slate-500">Problem Statement</label><p className="font-semibold">{capa.problemStatement}</p></div>
                <div><label className="text-slate-500">PIC</label><p className="font-semibold">{capa.pic}</p></div>
                <div><label className="text-slate-500">Due Date</label><p className="font-semibold">{capa.overallDueDate}</p></div>
                <div><label className="text-slate-500">Department</label><p className="font-semibold">{capa.department}</p></div>
              </div>
              <div><label className="text-slate-500">Description</label><p className="mt-1">{capa.nonConformityDescription}</p></div>
            </div>
          )}

          {activeTab === 'Investigation' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold">Investigation Details</h4>
              <p className="text-slate-500">Form investigation to be implemented here with immediate containment actions.</p>
            </div>
          )}

          {activeTab === 'Root Cause' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold">Root Cause Analysis (RCA)</h4>
              <p className="text-slate-500">5-Why and Fishbone visualization/form here.</p>
            </div>
          )}

          {activeTab === 'Corrective Action' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold">Corrective Actions</h4>
              {capa.correctiveActions.map((ca, i) => <div key={i} className="p-2 border rounded">{ca.description}</div>)}
            </div>
          )}
          
          {/* Add other tabs... */}
          {['Related QC', 'Preventive Action', 'Evidence', 'Effectiveness', 'Timeline', 'Audit Trail'].includes(activeTab) && (
            <div className="text-xs text-slate-500">Tab {activeTab} content implementation in progress.</div>
          )}
        </div>
      </div>
    </div>
  );
};
