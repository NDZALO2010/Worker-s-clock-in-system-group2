import express, { Request, Response } from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  cosineSimilarity,
  toByteArray,
  toBase64,
  generate512DVector,
  generateSimilarVector,
  matchFace
} from './src/utils/biometrics.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

interface ServerEmployee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  role: string;
  registeredAt: string;
  vector512: number[];
  encryptedVectorPayload: string;
  avatarUrl: string;
  notes?: string;
}

// In-memory employee registry database
let employeesDatabase: ServerEmployee[] = [
  {
    id: '1',
    employeeId: 'a108f230-84c7-432a-9e12-88091e4f3a01',
    name: 'Sarah Jenkins',
    department: 'Biometric Security & IT',
    role: 'Senior Access Control Engineer',
    registeredAt: '2026-06-12T08:30:00Z',
    vector512: generate512DVector('emp-a108f230-84c7-432a-9e12-88091e4f3a01-Sarah Jenkins'),
    encryptedVectorPayload: toBase64(toByteArray(generate512DVector('emp-a108f230-84c7-432a-9e12-88091e4f3a01-Sarah Jenkins'))),
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    notes: 'POPIA Compliant enrollment. Raw image purged.'
  },
  {
    id: '2',
    employeeId: 'b219e341-95d8-443b-af23-99102f5e4b02',
    name: 'Dr. Michael Vance',
    department: 'AI Research Lab',
    role: 'Lead Computer Vision Scientist',
    registeredAt: '2026-06-14T10:15:00Z',
    vector512: generate512DVector('emp-b219e341-95d8-443b-af23-99102f5e4b02-Dr. Michael Vance'),
    encryptedVectorPayload: toBase64(toByteArray(generate512DVector('emp-b219e341-95d8-443b-af23-99102f5e4b02-Dr. Michael Vance'))),
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    notes: 'POPIA Compliant enrollment. Raw image purged.'
  },
  {
    id: '3',
    employeeId: 'c320f452-06e9-454c-b034-00213a6f5c03',
    name: 'Elena Rostova',
    department: 'Data Governance & Compliance',
    role: 'POPIA Compliance Officer',
    registeredAt: '2026-06-20T14:45:00Z',
    vector512: generate512DVector('emp-c320f452-06e9-454c-b034-00213a6f5c03-Elena Rostova'),
    encryptedVectorPayload: toBase64(toByteArray(generate512DVector('emp-c320f452-06e9-454c-b034-00213a6f5c03-Elena Rostova'))),
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    notes: 'POPIA Compliant enrollment. Raw image purged.'
  }
];

let auditLogs: Array<{
  id: string;
  timestamp: string;
  action: string;
  details: string;
  complianceTag: 'POPIA' | 'SECURITY' | 'INFERENCE' | 'REGISTRATION';
  status: 'PURGED' | 'SUCCESS' | 'WARNING';
  employeeId?: string;
}> = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: 'RAM_PURGE_SUCCESS',
    details: 'Raw byte buffer [Size: 1.2MB] zero-cleared via Array.Clear() following ONNX ArcFace inference',
    complianceTag: 'POPIA',
    status: 'PURGED',
    employeeId: 'a108f230-84c7-432a-9e12-88091e4f3a01'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    action: 'VECTOR_EXTRACTED_512D',
    details: 'Generated 512-dimensional float array [Tensor: 1,3,112,112] via ONNX ArcFace w600k model',
    complianceTag: 'INFERENCE',
    status: 'SUCCESS'
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API Route 1: Register Face Endpoint (Matches ASP.NET FacesController [HttpPost("register")])
  app.post('/api/v1/faces/register', upload.single('faceImage'), async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const employeeId = req.body.employeeId || req.body.EmployeeId;
      const file = req.file;

      if (!employeeId) {
        return res.status(400).json({ message: 'Valid employeeId is required.' });
      }

      if (!file && !req.body.imageBase64) {
        return res.status(400).json({ message: 'Valid image file or imageBase64 payload is required.' });
      }

      let imageBytes: Uint8Array;
      if (file) {
        imageBytes = new Uint8Array(file.buffer);
      } else {
        const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        imageBytes = new Uint8Array(Buffer.from(base64Data, 'base64'));
      }

      // 1. Simulate 112x112 BGR->RGB preprocessing and 512D ONNX Inference
      const embeddingVector = generate512DVector(`emp-${employeeId}-${imageBytes.length}`);
      
      // 2. Binary conversion (MathUtility.ToByteArray)
      const vectorBytes = toByteArray(embeddingVector);
      const encryptedVectorPayload = toBase64(vectorBytes);

      // 3. POPIA Compliance: Wipe image bytes buffer from memory
      for (let i = 0; i < imageBytes.length; i++) {
        imageBytes[i] = 0;
      }

      // Log POPIA audit event
      const logId = `log-${Date.now()}`;
      auditLogs.unshift({
        id: logId,
        timestamp: new Date().toISOString(),
        action: 'REGISTER_AND_PURGE',
        details: `Raw image payload (${imageBytes.length} bytes) destroyed from RAM after 512D ONNX extraction for Employee: ${employeeId}`,
        complianceTag: 'POPIA',
        status: 'PURGED',
        employeeId
      });

      // Update or add in database
      const existingIdx = employeesDatabase.findIndex(e => e.employeeId === employeeId);
      const empName = req.body.name || req.body.Name || `Employee ${employeeId.substring(0, 8)}`;
      const department = req.body.department || req.body.Department || 'General Operations';
      const role = req.body.role || req.body.Role || 'Staff Member';

      if (existingIdx >= 0) {
        employeesDatabase[existingIdx].vector512 = embeddingVector;
        employeesDatabase[existingIdx].encryptedVectorPayload = encryptedVectorPayload;
      } else {
        employeesDatabase.push({
          id: String(Date.now()),
          employeeId,
          name: empName,
          department,
          role,
          registeredAt: new Date().toISOString(),
          vector512: embeddingVector,
          encryptedVectorPayload,
          avatarUrl: req.body.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
          notes: 'Registered via API v1 /faces/register.'
        });
      }

      const responsePayload = {
        EmployeeId: employeeId,
        VectorDimension: embeddingVector.length,
        EncryptedVectorPayload: encryptedVectorPayload,
        Message: 'Face registered successfully. Raw image discarded per POPIA guidelines.',
        ProcessingTimeMs: Date.now() - startTime
      };

      return res.json(responsePayload);
    } catch (error: any) {
      console.error('Error processing face registration:', error);
      return res.status(500).json({
        message: 'Failed to process face image.',
        details: error?.message || 'Internal server error'
      });
    }
  });

  // API Route 2: Match Face Endpoint (1:N Biometric Cosine Matching)
  app.post('/api/v1/faces/match', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const { inputVector, targetEmployeeId, threshold = 0.75 } = req.body;

      let searchVector: number[];
      if (inputVector && Array.isArray(inputVector)) {
        searchVector = inputVector;
      } else if (targetEmployeeId) {
        const emp = employeesDatabase.find(e => e.employeeId === targetEmployeeId);
        if (!emp) {
          return res.status(404).json({ message: 'Target employee profile not found.' });
        }
        searchVector = generateSimilarVector(emp.vector512, 0.08); // Simulate webcam angle scan
      } else {
        searchVector = generate512DVector('random-visitor');
      }

      const knownProfiles = employeesDatabase.map(e => ({
        employeeId: e.employeeId,
        vector: e.vector512
      }));

      const { matchedEmployeeId, highestScore } = matchFace(searchVector, knownProfiles, threshold);
      const matchedEmp = employeesDatabase.find(e => e.employeeId === matchedEmployeeId);

      const processingTimeMs = Date.now() - startTime;

      // Log matching audit
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'BIOMETRIC_MATCH_QUERY',
        details: matchedEmp
          ? `1:N Match SUCCESS: Identified ${matchedEmp.name} (${matchedEmp.employeeId}) with Cosine Score ${highestScore.toFixed(4)} >= threshold ${threshold}`
          : `1:N Match REJECTED: Highest similarity score ${highestScore.toFixed(4)} below threshold ${threshold}`,
        complianceTag: 'INFERENCE',
        status: matchedEmp ? 'SUCCESS' : 'WARNING',
        employeeId: matchedEmp?.employeeId
      });

      return res.json({
        matchedEmployeeId,
        employeeName: matchedEmp?.name || null,
        employeeRole: matchedEmp?.role || null,
        department: matchedEmp?.department || null,
        avatarUrl: matchedEmp?.avatarUrl || null,
        similarityScore: highestScore,
        threshold,
        isMatched: Boolean(matchedEmp),
        processingTimeMs,
        inputVector: searchVector.slice(0, 16), // Preview snippet
        vectorBytesBase64: toBase64(toByteArray(searchVector))
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Matching process failed.', details: error.message });
    }
  });

  // API Route 3: List & Manage Employees
  app.get('/api/v1/faces/employees', (req: Request, res: Response) => {
    return res.json(employeesDatabase);
  });

  app.post('/api/v1/faces/employees', (req: Request, res: Response) => {
    const { name, department, role, avatarUrl } = req.body;
    const employeeId = crypto.randomUUID();
    const vector512 = generate512DVector(`emp-${employeeId}-${name}`);
    const encryptedVectorPayload = toBase64(toByteArray(vector512));

    const newEmp: ServerEmployee = {
      id: String(Date.now()),
      employeeId,
      name: name || 'New Staff Member',
      department: department || 'Operations',
      role: role || 'Employee',
      registeredAt: new Date().toISOString(),
      vector512,
      encryptedVectorPayload,
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      notes: 'Manually added via registry dashboard.'
    };

    employeesDatabase.push(newEmp);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'EMPLOYEE_ENROLLED',
      details: `Enrolled new profile ${newEmp.name} (${newEmp.employeeId}). Generated 512D vector payload.`,
      complianceTag: 'REGISTRATION',
      status: 'SUCCESS',
      employeeId: newEmp.employeeId
    });

    return res.status(201).json(newEmp);
  });

  app.delete('/api/v1/faces/employees/:employeeId', (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const initialLen = employeesDatabase.length;
    employeesDatabase = employeesDatabase.filter(e => e.employeeId !== employeeId);

    if (employeesDatabase.length < initialLen) {
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'EMPLOYEE_DELETED',
        details: `Permanently erased biometric vector profile for Employee ID: ${employeeId}`,
        complianceTag: 'POPIA',
        status: 'PURGED',
        employeeId
      });
      return res.json({ message: 'Employee biometric record purged successfully.' });
    }

    return res.status(404).json({ message: 'Employee not found.' });
  });

  // API Route 4: Audit Logs
  app.get('/api/v1/faces/logs', (req: Request, res: Response) => {
    return res.json(auditLogs);
  });

  // Vite development middleware or production static server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Facial Recognition Biometric Core server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
