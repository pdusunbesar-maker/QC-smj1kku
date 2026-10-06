import React from 'react';
import { Parameter } from '../../types';

export const ParameterList: React.FC = () => {
  const parameters: Parameter[] = [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900">Daftar Parameter QC</h2>
        <button className="px-4 py-2 bg-[#0B5FA5] text-white rounded-lg text-sm font-semibold hover:bg-[#084B83]">
          Tambah Parameter
        </button>
      </div>
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-3">Nama</th>
            <th className="p-3">Kode</th>
            <th className="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {parameters.length === 0 ? (
            <tr>
              <td colSpan={3} className="p-4 text-center text-slate-500">Belum ada data parameter.</td>
            </tr>
          ) : (
            parameters.map(p => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.code}</td>
                <td className="p-3">Edit</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
