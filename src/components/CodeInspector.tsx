import React, { useState } from 'react';
import { CSHARP_FILES } from '../data/csharpCode';
import { Code, Copy, Check, FileCode, Cpu, ShieldCheck, Layers, ExternalLink } from 'lucide-react';

export const CodeInspector: React.FC = () => {
  const [selectedFileId, setSelectedFileId] = useState<string>(CSHARP_FILES[0].id);
  const [copied, setCopied] = useState<boolean>(false);

  const activeFile = CSHARP_FILES.find(f => f.id === selectedFileId) || CSHARP_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono font-semibold">
              C# ASP.NET Core 9
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono">
              OpenCvSharp4 + ONNX Runtime
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Facial Recognition Engine Architecture</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Production-ready source code implementation for 512D ArcFace vector extraction and POPIA compliant zero-memory purging.
          </p>
        </div>

        <button
          onClick={handleCopyCode}
          className="py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer self-start md:self-auto"
        >
          {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Code Copied!' : `Copy ${activeFile.fileName}`}</span>
        </button>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar File Picker */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-xl">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Source Pipeline Modules (5 Files)
            </h3>

            <div className="space-y-2">
              {CSHARP_FILES.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedFileId === file.id
                      ? 'bg-slate-950 border-cyan-500/80 text-white shadow-md shadow-cyan-950'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className={`w-4 h-4 ${selectedFileId === file.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="font-mono text-xs font-bold">{file.fileName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {file.code.split('\n').length} lines
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed font-sans">
                    {file.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Key Pipeline Architecture Notes Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-xl space-y-3 text-xs">
            <h4 className="font-bold text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              POPIA & Performance Highlights
            </h4>
            <ul className="space-y-2 text-slate-400 text-[11px] list-disc list-inside">
              <li>
                <strong className="text-slate-200">POPIA Memory Purging:</strong> Raw image byte arrays and OpenCV Mats are cleared immediately using <code className="text-cyan-300 font-mono">Array.Clear()</code>.
              </li>
              <li>
                <strong className="text-slate-200">ArcFace Normalization:</strong> Input pixel BGR-&gt;RGB tensor is normalized by <code className="text-cyan-300 font-mono">(pixel - 127.5f) / 128.0f</code>.
              </li>
              <li>
                <strong className="text-slate-200">512D Cosine Matching:</strong> Matches 512D embeddings in 1:N mode using <code className="text-cyan-300 font-mono">MathUtility.CosineSimilarity</code> with default 0.75 threshold.
              </li>
              <li>
                <strong className="text-slate-200">Binary Serialization:</strong> Uses <code className="text-cyan-300 font-mono">Buffer.BlockCopy</code> for fast byte[] conversion for DB storage.
              </li>
            </ul>
          </div>
        </div>

        {/* Main Code View Container */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-white shadow-2xl">
            {/* Code Header Bar */}
            <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-xs font-bold text-cyan-400 pl-2">
                  {activeFile.namespace} / {activeFile.fileName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                  C# 13 / .NET 9
                </span>
              </div>
            </div>

            {/* Code Content */}
            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200 max-h-[650px] overflow-y-auto">
              <pre className="whitespace-pre">
                {activeFile.code.split('\n').map((line, idx) => (
                  <div key={idx} className="table-row hover:bg-slate-900/60 rounded">
                    <span className="table-cell select-none text-slate-600 text-right pr-4 font-mono text-[11px] w-10">
                      {idx + 1}
                    </span>
                    <span className="table-cell">
                      {highlightCSharpLine(line)}
                    </span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper syntax highlighter for C#
function highlightCSharpLine(line: string): React.ReactNode {
  if (line.trim().startsWith('//') || line.trim().startsWith('///')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  if (line.includes('using ') || line.includes('namespace ')) {
    return (
      <span>
        <span className="text-rose-400 font-semibold">{line.split(' ')[0]} </span>
        <span className="text-cyan-300">{line.substring(line.indexOf(' ') + 1)}</span>
      </span>
    );
  }

  // Highlight keywords
  const keywords = ['public', 'static', 'class', 'interface', 'async', 'Task', 'byte', 'float', 'void', 'return', 'using', 'var', 'new', 'if', 'foreach', 'in', 'throw', 'for'];
  
  // Basic token styling
  let formatted = line;
  if (line.includes('Array.Clear') || line.includes('MathUtility.CosineSimilarity') || line.includes('ExtractEmbeddingAsync')) {
    return <span className="text-amber-300 font-bold">{line}</span>;
  }
  
  return <span className="text-slate-200">{line}</span>;
}
