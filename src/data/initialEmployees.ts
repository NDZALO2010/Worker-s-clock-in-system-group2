import { Employee } from '../types';
import { generate512DVector, toByteArray, toBase64 } from '../utils/biometrics';

const createEmployee = (
  id: string,
  employeeId: string,
  name: string,
  department: string,
  role: string,
  avatarUrl: string,
  registeredAt: string
): Employee => {
  const vector512 = generate512DVector(`emp-${employeeId}-${name}`);
  const bytes = toByteArray(vector512);
  const encryptedVectorPayload = toBase64(bytes);

  return {
    id,
    employeeId,
    name,
    department,
    role,
    registeredAt,
    vector512,
    encryptedVectorPayload,
    avatarUrl,
    notes: 'POPIA Compliant enrollment. Raw image purged.'
  };
};

export const INITIAL_EMPLOYEES: Employee[] = [
  createEmployee(
    '1',
    'a108f230-84c7-432a-9e12-88091e4f3a01',
    'Sarah Jenkins',
    'Biometric Security & IT',
    'Senior Access Control Engineer',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    '2026-06-12T08:30:00Z'
  ),
  createEmployee(
    '2',
    'b219e341-95d8-443b-af23-99102f5e4b02',
    'Dr. Michael Vance',
    'AI Research Lab',
    'Lead Computer Vision Scientist',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    '2026-06-14T10:15:00Z'
  ),
  createEmployee(
    '3',
    'c320f452-06e9-454c-b034-00213a6f5c03',
    'Elena Rostova',
    'Data Governance & Compliance',
    'POPIA Compliance Officer',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    '2026-06-20T14:45:00Z'
  ),
  createEmployee(
    '4',
    'd431a563-17fa-465d-c145-11324b7a6d04',
    'David Chen',
    'Cloud Infrastructure',
    'DevOps & On-Prem Architect',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    '2026-07-01T09:10:00Z'
  ),
  createEmployee(
    '5',
    'e542b674-28ab-476e-d256-22435c8b7e05',
    'Amara Okafor',
    'Executive Management',
    'VP of Operations',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop&q=80',
    '2026-07-10T11:20:00Z'
  )
];
