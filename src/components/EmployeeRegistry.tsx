import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Binary,
  Search,
  Key,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  Sparkles,
  X,
  Camera,
  Upload
} from 'lucide-react';
import { Employee } from '../types';
import { cosineSimilarity, toByteArray, toBase64, generate512DVector } from '../utils/biometrics';

interface EmployeeRegistryProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onAddLog: (action: string, details: string, tag: 'POPIA' | 'INFERENCE' | 'SECURITY' | 'REGISTRATION', status: 'PURGED' | 'SUCCESS' | 'WARNING', employeeId?: string) => void;
}

export const EmployeeRegistry: React.FC<EmployeeRegistryProps> = ({
  employees,
  onAddEmployee,
  onDeleteEmployee,
  onAddLog
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [matrixEmpA, setMatrixEmpA] = useState<string>(employees[0]?.employeeId || '');
  const [matrixEmpB, setMatrixEmpB] = useState<string>(employees[1]?.employeeId || '');

  // Form states for new enrollment
  const [newEmployeeId, setNewEmployeeId] = useState<string>(crypto.randomUUID());
  const [newName, setNewName] = useState<string>('');
  const [newDept, setNewDept] = useState<string>('Biometric Operations');
  const [newRole, setNewRole] = useState<string>('Security Analyst');
  const [newAvatarUrl, setNewAvatarUrl] = useState<string>(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'
  );
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    setIsRegistering(true);
    await new Promise(r => setTimeout(r, 600)); // Simulate ONNX inference & RAM purge

    const vector512 = generate512DVector(`emp-${newEmployeeId}-${newName}`);
    const bytes = toByteArray(vector512);
    const encryptedVectorPayload = toBase64(bytes);

    const newEmp: Employee = {
      id: String(Date.now()),
      employeeId: newEmployeeId,
      name: newName,
      department: newDept,
      role: newRole,
      registeredAt: new Date().toISOString(),
      vector512,
      encryptedVectorPayload,
      avatarUrl: newAvatarUrl,
      notes: 'POPIA Compliant enrollment. Raw image purged.'
    };

    onAddEmployee(newEmp);
    onAddLog(
      'FACE_REGISTERED_POPIA_PURGED',
      `Registered face profile for ${newEmp.name} (${newEmp.employeeId}). Extracted 512D ONNX vector. Discarded raw frame buffer per POPIA guidelines.`,
      'REGISTRATION',
      'PURGED',
      newEmp.employeeId
    );

    setIsRegistering(false);
    setShowAddModal(false);
    // Reset form
    setNewEmployeeId(crypto.randomUUID());
    setNewName('');
  };

  const empAObj = employees.find(e => e.employeeId === matrixEmpA);
  const empBObj = employees.find(e => e.employeeId === matrixEmpB);
  const matrixSimilarity = (empAObj && empBObj)
    ? cosineSimilarity(empAObj.vector512, empBObj.vector512)
    : 0;

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(employees, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "BiometricCore_Employees_512D_Registry.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono font-semibold">
              Encrypted Biometric Store
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono">
              {employees.length} Profiles Enrolled
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Enrolled Employee Biometric Registry</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Stores 512D floating-point vectors and Base64 byte array payloads. Raw facial images are strictly destroyed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Vector Store</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Face Profile</span>
          </button>
        </div>
      </div>

      {/* 1:1 Cosine Similarity Comparison Matrix Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          1:1 Biometric Cosine Similarity Cross-Inspector
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Profile A Picker */}
          <div className="md:col-span-4 bg-slate-950 border border-slate-800 rounded-xl p-3">
            <label className="block text-[10px] text-slate-500 font-mono mb-1">PROFILE A</label>
            <select
              value={matrixEmpA}
              onChange={(e) => setMatrixEmpA(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 font-medium"
            >
              {employees.map(e => (
                <option key={e.employeeId} value={e.employeeId}>{e.name} ({e.department})</option>
              ))}
            </select>
            {empAObj && (
              <div className="mt-2 flex items-center gap-3">
                <img src={empAObj.avatarUrl} alt={empAObj.name} className="w-9 h-9 rounded-lg object-cover border border-slate-700" />
                <div className="truncate text-xs">
                  <p className="font-bold text-white truncate">{empAObj.name}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{empAObj.employeeId.substring(0, 12)}...</p>
                </div>
              </div>
            )}
          </div>

          {/* Cosine Calculation Center */}
          <div className="md:col-span-4 text-center bg-slate-950 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] font-mono text-slate-400 uppercase">MathUtility.CosineSimilarity</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 my-1">
              {matrixSimilarity.toFixed(4)}
            </div>
            <p className={`text-[11px] font-mono font-semibold ${
              matrixEmpA === matrixEmpB
                ? 'text-emerald-400'
                : matrixSimilarity >= 0.75
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}>
              {matrixEmpA === matrixEmpB
                ? '100% IDENTICAL VECTOR (1.0000)'
                : matrixSimilarity >= 0.75
                ? 'SIMILAR PROFILE MATCH (>= 0.75)'
                : 'DISTINCT INDIVIDUALS (< 0.75)'}
            </p>
          </div>

          {/* Profile B Picker */}
          <div className="md:col-span-4 bg-slate-950 border border-slate-800 rounded-xl p-3">
            <label className="block text-[10px] text-slate-500 font-mono mb-1">PROFILE B</label>
            <select
              value={matrixEmpB}
              onChange={(e) => setMatrixEmpB(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 font-medium"
            >
              {employees.map(e => (
                <option key={e.employeeId} value={e.employeeId}>{e.name} ({e.department})</option>
              ))}
            </select>
            {empBObj && (
              <div className="mt-2 flex items-center gap-3">
                <img src={empBObj.avatarUrl} alt={empBObj.name} className="w-9 h-9 rounded-lg object-cover border border-slate-700" />
                <div className="truncate text-xs">
                  <p className="font-bold text-white truncate">{empBObj.name}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{empBObj.employeeId.substring(0, 12)}...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search employees by name, GUID, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.employeeId}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Profile Top Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.avatarUrl}
                    alt={emp.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-500/30 shadow"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{emp.name}</h4>
                    <p className="text-xs text-slate-400 truncate">{emp.role}</p>
                    <span className="inline-block text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded mt-0.5 border border-cyan-900">
                      {emp.department}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteEmployee(emp.employeeId)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer"
                  title="Purge Biometric Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* GUID and Registration Details */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    Employee GUID:
                  </span>
                  <span className="text-white text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {emp.employeeId.substring(0, 16)}...
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    Enrolled At:
                  </span>
                  <span className="text-slate-300 text-[10px]">
                    {new Date(emp.registeredAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Encrypted Vector Payload Box */}
              <div className="mt-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                    <Binary className="w-3 h-3" />
                    Encrypted Vector Payload
                  </span>
                  <span className="text-slate-500">2,048 Bytes</span>
                </div>
                <p className="text-slate-500 truncate">{emp.encryptedVectorPayload.substring(0, 48)}...</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-emerald-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                POPIA Compliant Storage
              </span>
              <span className="text-slate-500">512D ONNX Vector</span>
            </div>
          </div>
        ))}
      </div>

      {/* Enroll New Face Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Enroll New Employee Face</h3>
                <p className="text-xs text-slate-400">Simulates POST /api/v1/faces/register</p>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Employee GUID (Auto-generated)</label>
                <input
                  type="text"
                  value={newEmployeeId}
                  onChange={(e) => setNewEmployeeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-cyan-400 font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Employee Name</label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Thorne"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Job Role</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={newAvatarUrl}
                  onChange={(e) => setNewAvatarUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-300 text-xs"
                  required
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-emerald-900/60 text-[11px] font-mono text-emerald-400">
                <span className="font-bold">POPIA Assurance:</span> Upon submitting, raw image data is zero-cleared from RAM immediately following 512D ArcFace vector extraction.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {isRegistering ? 'Processing ONNX...' : 'Register & Purge RAM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
