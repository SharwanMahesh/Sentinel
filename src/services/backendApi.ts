import type { Hospital, Patient as DisasterPatient, RiskLevel, SystemEvent } from '../context/DisasterContext';
import type { TamilNaduHospital } from '../data/tamilNaduHospitals';

const API_BASE = '/api';

export interface HospitalMetrics {
  hospitalCount: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  bedOccupancy: number;
  totalVentilators: number;
  availableVentilators: number;
  oxygenSupplyPercent: number;
  activeAmbulances: number;
  availableAmbulances: number;
  vaccineDoses: number;
}

export interface BioPatientRecord {
  id: string;
  name: string;
  age: number;
  symptoms: string[];
  score: number;
  timestamp: string;
  status: 'Critical' | 'Moderate' | 'Stable';
  stage: 'AI-Monitored' | 'Pending Consult' | 'Dispatched';
  vitals: {
    bp: string;
    o2: number;
  };
  lastCheckIn: string;
  aiRecommendation: string;
  riskScore: number;
  waitTime: number;
  assignedDoctor?: string;
  ambulanceId?: string;
  eta?: number;
  hospital?: string;
  bedNo?: string;
}

export interface DisasterStatePayload {
  riskLevel: RiskLevel;
  patients: DisasterPatient[];
  hospitals: Hospital[];
  events: SystemEvent[];
}

export interface BioMistralTriageRequest {
  interviewData: {
    name: string;
    age: number;
    symptomsNarrative: string;
    feverOrTemp: string;
    breathingOrSpO2: string;
    chestPain: string;
    chronicConditions: string;
  };
  transcript: string;
}

export interface BioMistralTriageResponse {
  level: 'Stable' | 'Moderate' | 'Critical';
  score: number;
  confidence: number;
  detectedSymptoms: string[];
  recommendation: string;
  reasoning: string;
  source: 'huggingface' | 'fallback';
  model: string;
}

const assertOk = async (response: Response) => {
  if (response.ok) return;
  const text = await response.text();
  throw new Error(text || `Request failed: ${response.status}`);
};

export const listHospitals = async (): Promise<TamilNaduHospital[]> => {
  const response = await fetch(`${API_BASE}/hospitals`);
  await assertOk(response);
  return response.json();
};

export const patchHospital = async (id: string, updates: Partial<TamilNaduHospital>): Promise<TamilNaduHospital> => {
  const response = await fetch(`${API_BASE}/hospitals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  await assertOk(response);
  return response.json();
};

export const getHospitalMetrics = async (): Promise<HospitalMetrics> => {
  const response = await fetch(`${API_BASE}/hospitals/metrics`);
  await assertOk(response);
  return response.json();
};

export const listTopHospitals = async (count = 10): Promise<TamilNaduHospital[]> => {
  const response = await fetch(`${API_BASE}/hospitals/top?count=${count}`);
  await assertOk(response);
  return response.json();
};

export const getDispatchHospital = async (city?: string): Promise<TamilNaduHospital | null> => {
  const query = city ? `?city=${encodeURIComponent(city)}` : '';
  const response = await fetch(`${API_BASE}/hospitals/dispatch${query}`);
  await assertOk(response);
  return response.json();
};

export const listBioPatients = async (): Promise<BioPatientRecord[]> => {
  const response = await fetch(`${API_BASE}/bio/patients`);
  await assertOk(response);
  return response.json();
};

export const upsertBioPatient = async (patient: BioPatientRecord): Promise<BioPatientRecord> => {
  const response = await fetch(`${API_BASE}/bio/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patient),
  });
  await assertOk(response);
  return response.json();
};

export const patchBioPatient = async (id: string, updates: Partial<BioPatientRecord>): Promise<BioPatientRecord> => {
  const response = await fetch(`${API_BASE}/bio/patients/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  await assertOk(response);
  return response.json();
};

export const deleteBioPatient = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/bio/patients/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await assertOk(response);
};

export const getDisasterState = async (): Promise<DisasterStatePayload> => {
  const response = await fetch(`${API_BASE}/disaster/state`);
  await assertOk(response);
  return response.json();
};

export const saveDisasterState = async (payload: DisasterStatePayload): Promise<void> => {
  const response = await fetch(`${API_BASE}/disaster/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await assertOk(response);
};

export const getBioMistralTriage = async (
  payload: BioMistralTriageRequest,
): Promise<BioMistralTriageResponse> => {
  const response = await fetch(`${API_BASE}/chatbot/biomistral-triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await assertOk(response);
  return response.json();
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatWithAI = async (
  messages: ChatMessage[],
): Promise<{ reply: string; source?: string }> => {
  const response = await fetch(`${API_BASE}/chatbot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  await assertOk(response);
  return response.json();
};

export const analyzeTriageFromChat = async (
  transcript: string,
): Promise<BioMistralTriageResponse> => {
  const response = await fetch(`${API_BASE}/chatbot/analyze-triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  await assertOk(response);
  return response.json();
};

export const getDisasterReport = async (payload: {
  epicenter: [number, number];
  magnitude: number;
  affectedHospitalsCount: number;
}): Promise<{ summary: string }> => {
  const response = await fetch(`${API_BASE}/disaster/generate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await assertOk(response);
  return response.json();
};
