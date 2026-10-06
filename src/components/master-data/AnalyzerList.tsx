import React from 'react';
import { Instrument } from '../../types';

export const AnalyzerList: React.FC = () => {
  // This would typically fetch from the database
  const analyzers: Instrument[] = [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900">Daftar Analyzer</h2>
        <button className="px-4 py-2 bg-[#0B5FA5] text-white rounded-lg text-sm font-semibold hover:bg-[#084B83]">
          Tambah Analyzer
        </button>
      </div>
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-3">Nama</th>
            <th className="p-3">Brand</th>
            <th className="p-3">Status</th>
            <th className="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {analyzers.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-4 text-center text-slate-500">Belum ada data analyzer.</td>
            </tr>
          ) : (
            analyzers.map(a => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="p-3">{a.name}</td>
                <td className="p-3">{a.brand}</td>
                <td className="p-3">{a.status}</td>
                <td className="p-3">Edit</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
