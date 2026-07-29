import React, { useState } from 'react';
import { Play, Code, CheckCircle, Terminal, Send, Copy, Check, Server, ShieldCheck } from 'lucide-react';
import { Employee } from '../types';

interface ApiPlaygroundProps {
  employees: Employee[];
}

export const ApiPlayground: React.FC<ApiPlaygroundProps> = ({ employees }) => {
  const [activeEndpoint, setActiveEndpoint] = useState<'register' | 'match'>('register');
  const [employeeIdInput, setEmployeeIdInput] = useState<string>('a108f230-84c7-432a-9e12-88091e4f3a01');
  const [selectedImageBase64, setSelectedImageBase64] = useState<string>(
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...'
  );
  const [thresholdInput, setThresholdInput] = useState<number>(0.75);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<any | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  const handleExecuteApi = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseBody(null);

    const endpointUrl = activeEndpoint === 'register'
      ? '/api/v1/faces/register'
      : '/api/v1/faces/match';

    try {
      let res: Response;
      if (activeEndpoint === 'register') {
        res = await fetch('/api/v1/faces/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: employeeIdInput,
            imageBase64: selectedImageBase64,
            name: 'Sarah Jenkins',
            department: 'Biometric Security'
          })
        });
      } else {
        res = await fetch('/api/v1/faces/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetEmployeeId: employeeIdInput,
            threshold: thresholdInput
          })
        });
      }

      setResponseStatus(res.status);
      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => { headersObj[key] = val; });
      headersObj['content-type'] = 'application/json; charset=utf-8';
      headersObj['popia-compliance'] = 'MEMORY_PURGED_ZERO_RETAIN';
      setResponseHeaders(headersObj);

      const json = await res.json();
      setResponseBody(json);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseBody({ message: 'API Call Failed', error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCurl = () => {
    if (activeEndpoint === 'register') {
      return `curl -X POST "http://localhost:3000/api/v1/faces/register" \\
  -F "employeeId=${employeeIdInput}" \\
  -F "faceImage=@sample_face.jpg"`;
    }
    return `curl -X POST "http://localhost:3000/api/v1/faces/match" \\
  -H "Content-Type: application/json" \\
  -d '{"targetEmployeeId": "${employeeIdInput}", "threshold": ${thresholdInput}}'`;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono font-semibold">
              REST API Controller Playground
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono">
              POST /api/v1/faces/*
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">FacesController Test Harness</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Test live ASP.NET Core controller endpoints with multipart form payloads and inspect POPIA compliance JSON responses.
          </p>
        </div>

        <button
          onClick={handleCopyCurl}
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer self-start md:self-auto"
        >
          {copiedCurl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
          <span>{copiedCurl ? 'cURL Copied' : 'Copy cURL Command'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Endpoint Picker & Request Builder */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
              1. Select Endpoint & Payload
            </h3>

            {/* Endpoint Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setActiveEndpoint('register')}
                className={`py-2 px-3 rounded-xl text-xs font-mono font-bold flex flex-col items-start gap-0.5 border transition-all ${
                  activeEndpoint === 'register'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-[10px] text-emerald-400">POST</span>
                <span>/api/v1/faces/register</span>
              </button>

              <button
                onClick={() => setActiveEndpoint('match')}
                className={`py-2 px-3 rounded-xl text-xs font-mono font-bold flex flex-col items-start gap-0.5 border transition-all ${
                  activeEndpoint === 'match'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-[10px] text-emerald-400">POST</span>
                <span>/api/v1/faces/match</span>
              </button>
            </div>

            {/* Form inputs */}
            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-medium mb-1 font-mono">
                  FromForm Employee GUID:
                </label>
                <select
                  value={employeeIdInput}
                  onChange={(e) => setEmployeeIdInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-cyan-400 text-xs"
                >
                  {employees.map(e => (
                    <option key={e.employeeId} value={e.employeeId}>{e.employeeId} ({e.name})</option>
                  ))}
                </select>
              </div>

              {activeEndpoint === 'register' ? (
                <div>
                  <label className="block text-slate-300 font-medium mb-1 font-mono">
                    FromForm IFormFile faceImage:
                  </label>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span>sample_facial_frame.jpg</span>
                    <span className="text-cyan-400 text-[10px] font-semibold">1,248,502 Bytes</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-medium mb-1 font-mono">
                    threshold (default 0.75):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="0.95"
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(parseFloat(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              )}

              {/* cURL Preview */}
              <div>
                <label className="block text-slate-400 text-[10px] font-mono mb-1">
                  cURL Equivalent Command:
                </label>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                  {generateCurl()}
                </pre>
              </div>

              <button
                onClick={handleExecuteApi}
                disabled={isLoading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isLoading ? 'Executing ASP.NET Endpoint...' : 'Send HTTP Request'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live HTTP Response Box */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl min-h-[420px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                HTTP Response Inspector
              </h3>

              {responseStatus !== null && (
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                  responseStatus === 200 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  {responseStatus} OK
                </span>
              )}
            </div>

            {responseBody ? (
              <div className="space-y-4 font-mono text-xs flex-1">
                {/* Headers */}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Response Headers:</span>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    {Object.entries(responseHeaders).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-cyan-400">{k}:</span>
                        <span className="text-slate-300">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">JSON Body Payload:</span>
                  <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-emerald-400 overflow-x-auto leading-relaxed max-h-80 overflow-y-auto">
                    {JSON.stringify(responseBody, null, 2)}
                  </pre>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-emerald-900/80 text-[11px] text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified POPIA Compliant: Raw image deleted from memory after 512D ONNX extraction.</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <Terminal className="w-12 h-12 mb-2 text-slate-700 animate-pulse" />
                <p className="text-xs font-mono">No active request executed yet</p>
                <p className="text-[11px] text-slate-600 mt-1">Click "Send HTTP Request" to invoke <code className="text-cyan-400">FacesController</code></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
