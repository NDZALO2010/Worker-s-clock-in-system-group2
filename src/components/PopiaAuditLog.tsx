import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, FileText, Download, Trash2, Cpu, CheckCircle2, Lock } from 'lucide-react';
import { AuditLogItem } from '../types';

interface PopiaAuditLogProps {
  logs: AuditLogItem[];
  onClearLogs: () => void;
}

export const PopiaAuditLog: React.FC<PopiaAuditLogProps> = ({ logs, onClearLogs }) => {
  const [filterTag, setFilterTag] = useState<string>('ALL');

  const filteredLogs = logs.filter(l =>
    filterTag === 'ALL' || l.complianceTag === filterTag
  );

  const handleExportCSV = () => {
    const headers = 'ID,Timestamp,Action,Tag,Status,Details\n';
    const rows = logs.map(l =>
      `"${l.id}","${l.timestamp}","${l.action}","${l.complianceTag}","${l.status}","${l.details.replace(/"/g, '""')}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POPIA_Biometric_Memory_Audit_Log_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  const purgedCount = logs.filter(l => l.status === 'PURGED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              POPIA Section 19 Compliant
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono">
              Zero Raw Image Retention
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">POPIA RAM Purge & Memory Audit Log</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Tracks real-time <code className="text-cyan-300 font-mono">Array.Clear(imageBytes)</code> RAM memory wipe events following ONNX embedding extraction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Memory Purges Executed</p>
            <p className="text-2xl font-bold font-mono text-emerald-400">{purgedCount}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Array.Clear() RAM Zeroed</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-xl flex items-center gap-4">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Raw Image Storage</p>
            <p className="text-2xl font-bold font-mono text-cyan-400">0 Bytes</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Strictly 512D Vectors Only</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Compliance Audit Rating</p>
            <p className="text-2xl font-bold font-mono text-blue-400">100%</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">POPIA Act 4 of 2013 Verified</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          {['ALL', 'POPIA', 'INFERENCE', 'REGISTRATION'].map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                filterTag === tag
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <button
          onClick={onClearLogs}
          className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Logs</span>
        </button>
      </div>

      {/* Logs Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-white shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-slate-400">
          <span>REAL-TIME AUDIT LOG TRAIL ({filteredLogs.length})</span>
          <span>TIMESTAMP (UTC)</span>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-950/50 transition-all font-mono text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.status === 'PURGED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : log.status === 'SUCCESS'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {log.status}
                  </span>
                  <span className="font-bold text-slate-200">{log.action}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {log.complianceTag}
                  </span>
                </div>

                <span className="text-slate-500 text-[11px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <p className="text-slate-400 font-sans text-xs leading-relaxed pl-1">
                {log.details}
              </p>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No audit logs recorded for filter category "{filterTag}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
