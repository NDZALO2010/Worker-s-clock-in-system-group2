import React from 'react';
import { ScanFace, Cpu, ShieldCheck, Database, Code, PlaySquare, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  activeTab: 'scanner' | 'registry' | 'code' | 'playground' | 'audit';
  setActiveTab: (tab: 'scanner' | 'registry' | 'code' | 'playground' | 'audit') => void;
  employeeCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, employeeCount }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
              <ScanFace className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                  BiometricCore Engine
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-medium">
                  ASP.NET Core 9
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                InsightFace / ArcFace 512D ONNX Facial Recognition Pipeline
              </p>
            </div>
          </div>

          {/* System Telemetry Pills */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>ONNX Runtime (112x112)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>POPIA Purge ACTIVE</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'scanner'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ScanFace className="w-4 h-4" />
              <span>1:N Matcher</span>
            </button>

            <button
              onClick={() => setActiveTab('registry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'registry'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Registry</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-cyan-300 font-mono">
                {employeeCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">C# Source Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab('playground')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'playground'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PlaySquare className="w-4 h-4" />
              <span className="hidden sm:inline">API Tester</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'audit'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">POPIA Audit</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
