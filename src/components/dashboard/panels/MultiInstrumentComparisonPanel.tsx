import React, { useMemo } from 'react';
import { QCResult, Parameter, Instrument } from '../../../types';
import { LineChart, BarChart } from 'lucide-react';

interface MultiInstrumentComparisonPanelProps {
  qcResults: QCResult[];
  parameters: Parameter[];
  instruments: Instrument[];
}

export const MultiInstrumentComparisonPanel: React.FC<MultiInstrumentComparisonPanelProps> = ({
  qcResults,
  parameters,
  instruments,
}) => {
  // Logic to group results by parameter and compare across instruments
  const comparisonData = useMemo(() => {
    const data: Record<string, Record<string, QCResult[]>> = {};

    qcResults.forEach(r => {
      if (!data[r.parameterId]) data[r.parameterId] = {};
      if (!data[r.parameterId][r.instrumentId]) data[r.parameterId][r.instrumentId] = [];
      data[r.parameterId][r.instrumentId].push(r);
    });

    return data;
  }, [qcResults]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs space-y-4">
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
        <BarChart className="h-4 w-4 text-[#0B5FA5]" />
        <h3 className="font-bold text-[#172033] text-sm sm:text-base">
          Multi-Instrument Comparison
        </h3>
      </div>
      <p className="text-xs text-slate-500">
        Perbandingan stabilitas hasil QC antar instrumen untuk parameter yang sama.
      </p>
      {/* Implementation of comparison table/charts will go here */}
      <div className="text-sm text-slate-400 italic">
        Data perbandingan sedang disusun...
      </div>
    </div>
  );
};
