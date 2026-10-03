import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Calendar, 
  User, 
  Eye, 
  X,
  Lock
} from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditTrailViewProps {
  logs: AuditLog[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.userName.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Audit Trail & Rekam Jejak Aktivitas Sistem
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Immutable</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Log permanen seluruh interaksi pengguna, verifikasi hasil QC, disposisi supervisor, dan pembaruan dokumen mutu sesuai standar ISO 15189 / KARS.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'Semua Aktivitas' },
            { id: 'INPUT_QC', label: 'Input QC' },
            { id: 'REVIEW_ACCEPT_QC', label: 'Approval QC' },
            { id: 'REVIEW_REJECT_QC', label: 'Reject QC' },
            { id: 'CREATE_CAPA', label: 'CAPA' },
            { id: 'LOGIN', label: 'Sesi / Auth' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActionFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                actionFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari user, aksi, keterangan..."
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3 font-mono">Timestamp</th>
                <th className="px-4 py-3">Pengguna & Peran</th>
                <th className="px-4 py-3 font-mono">Aksi</th>
                <th className="px-4 py-3">Rincian Aktivitas</th>
                <th className="px-4 py-3 font-mono">IP & Sesi</th>
                <th className="px-4 py-3 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada rekam jejak audit yang sesuai kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                      {log.timestamp}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{log.userName}</div>
                      <span className="font-mono text-[10px] text-slate-500 uppercase">
                        {log.userRole}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-700 text-xs leading-relaxed max-w-md">
                      {log.details}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {log.ipAddress || 'Client Session'}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {(log.previousData || log.newData) ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 ml-auto"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Lihat JSON</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Rekam Data Log #{selectedLog.id}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedLog.action} · {selectedLog.timestamp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-700 font-medium">{selectedLog.details}</p>

              {selectedLog.newData && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Data Baru (Payload):</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[11px] font-mono max-h-48">
                    {JSON.stringify(selectedLog.newData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.previousData && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Data Sebelumnya:</span>
                  <pre className="p-3 bg-slate-100 text-slate-800 rounded-lg overflow-x-auto text-[11px] font-mono max-h-48">
                    {JSON.stringify(selectedLog.previousData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
