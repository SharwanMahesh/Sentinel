import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getDisasterState, saveDisasterState, listHospitals } from '../services/backendApi';
import type { TamilNaduHospital } from '../data/tamilNaduHospitals';

export type RiskLevel = 'None' | 'Low' | 'Moderate' | 'High';

export interface SeismicAnomaly {
  magnitude: number;
  epicenter: [number, number];
  depth: number;
  timestamp: string;
}

export interface TsunamiAlert {
  active: boolean;
  eta: number;
  maxWaveHeight: number;
}

export interface Patient {
  id: string;
  score: number;
  tag: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
  hospital: string;
  eta: string;
  status: 'awaiting' | 'dispatched';
  location: string;
  vitals: {
    heartRate: number;
    bloodPressure: string;
    oxygen: number;
  };
}

export interface Hospital {
  id: string;
  name: string;
  capacity: number;
  incoming: number;
  totalBeds: number;
  availableBeds: number;
  lat: number;
  lng: number;
  city: string;
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  type: 'alert' | 'dispatch' | 'sensor' | 'system';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface TriageSignal {
  selectedSymptoms: string[];
  notes: string;
  age: string;
  consciousness: 'CONSCIOUS' | 'UNCONSCIOUS';
  bleeding: string;
  mobility: string;
  updatedAt: string;
}

interface DisasterContextType {
  riskLevel: RiskLevel;
  setRiskLevel: (level: RiskLevel) => void;
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id'>) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  hospitals: Hospital[];
  updateHospital: (id: string, updates: Partial<Hospital>) => void;
  events: SystemEvent[];
  addEvent: (event: Omit<SystemEvent, 'id' | 'timestamp'>) => void;
  broadcastAlert: (message: string, severity: SystemEvent['severity']) => void;
  latestTriageSignal: TriageSignal;
  setLatestTriageSignal: (signal: Omit<TriageSignal, 'updatedAt'>) => void;
  latestVoiceTriageSignal: TriageSignal;
  setLatestVoiceTriageSignal: (signal: Omit<TriageSignal, 'updatedAt'>) => void;
  seismicAnomaly: SeismicAnomaly | null;
  tsunamiAlert: TsunamiAlert | null;
  nlpReport: string | null;
  setNlpReport: (report: string) => void;
}

const DisasterContext = createContext<DisasterContextType | undefined>(undefined);

export const useDisaster = () => {
  const context = useContext(DisasterContext);
  if (!context) {
    throw new Error('useDisaster must be used within a DisasterProvider');
  }
  return context;
};

const INITIAL_PATIENTS: Patient[] = [
  { 
    id: 'P-047', 
    score: 91, 
    tag: 'RED', 
    hospital: 'Rajiv Gandhi GH', 
    eta: '9 min', 
    status: 'dispatched',
    location: '12.927°N, 80.128°E',
    vitals: { heartRate: 112, bloodPressure: '90/60', oxygen: 88 }
  },
  { 
    id: 'P-082', 
    score: 75, 
    tag: 'YELLOW', 
    hospital: 'Apollo Hospital', 
    eta: '14 min', 
    status: 'awaiting',
    location: '12.935°N, 80.142°E',
    vitals: { heartRate: 98, bloodPressure: '110/70', oxygen: 94 }
  },
  { 
    id: 'P-012', 
    score: 45, 
    tag: 'GREEN', 
    hospital: 'Fortis', 
    eta: '22 min', 
    status: 'dispatched',
    location: '12.912°N, 80.115°E',
    vitals: { heartRate: 76, bloodPressure: '120/80', oxygen: 98 }
  },
];

const INITIAL_HOSPITALS: Hospital[] = [
  { id: 'h1', name: 'Rajiv Gandhi GH', capacity: 92, incoming: 5, totalBeds: 500, availableBeds: 40, lat: 13.0827, lng: 80.2707, city: 'Chennai' },
  { id: 'h2', name: 'Apollo Hospital', capacity: 75, incoming: 3, totalBeds: 350, availableBeds: 87, lat: 13.0645, lng: 80.2505, city: 'Chennai' },
  { id: 'h3', name: 'Fortis', capacity: 40, incoming: 2, totalBeds: 200, availableBeds: 120, lat: 13.0067, lng: 80.2206, city: 'Chennai' },
  { id: 'h4', name: 'MIOT International', capacity: 60, incoming: 4, totalBeds: 400, availableBeds: 160, lat: 13.0210, lng: 80.1830, city: 'Chennai' },
  { id: 'h5', name: 'Global Hospital', capacity: 30, incoming: 1, totalBeds: 300, availableBeds: 210, lat: 12.8988, lng: 80.1924, city: 'Chennai' },
];

const INITIAL_TRIAGE_SIGNAL: TriageSignal = {
  selectedSymptoms: [],
  notes: '',
  age: '',
  consciousness: 'CONSCIOUS',
  bleeding: 'None',
  mobility: 'Unknown',
  updatedAt: new Date().toISOString(),
};

export const DisasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [riskLevel, setRiskLevelState] = useState<RiskLevel>('Moderate');
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_HOSPITALS);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [latestTriageSignalState, setLatestTriageSignalState] = useState<TriageSignal>(INITIAL_TRIAGE_SIGNAL);
  const [latestVoiceTriageSignalState, setLatestVoiceTriageSignalState] = useState<TriageSignal>(INITIAL_TRIAGE_SIGNAL);
  const [seismicAnomaly, setSeismicAnomaly] = useState<SeismicAnomaly | null>(null);
  const [tsunamiAlert, setTsunamiAlert] = useState<TsunamiAlert | null>(null);
  const [nlpReport, setNlpReport] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const persistTimerRef = useRef<number | null>(null);

  // Background SSE Daemon Pipeline
  useEffect(() => {
    let source: EventSource | null = null;
    let fallbackTimeout: number;
    
    const connectSSE = () => {
      source = new EventSource('/api/disaster/stream');
      
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'EARTHQUAKE') {
            setSeismicAnomaly({ ...data.payload, timestamp: new Date().toISOString() });
            setRiskLevelState('High');
            setEvents(prev => [{
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toISOString(),
              type: 'system',
              message: `URGENT: Magnitude ${data.payload.magnitude} Seismic Anomaly detected!`,
              severity: 'critical'
            }, ...prev].slice(0, 50));
          } else if (data.type === 'TSUNAMI') {
            setTsunamiAlert(data.payload);
            setEvents(prev => [{
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toISOString(),
              type: 'alert',
              message: `TSUNAMI WARNING: Coastal inundation expected in ${data.payload.eta} minutes.`,
              severity: 'critical'
            }, ...prev].slice(0, 50));
          }
        } catch (e) {
          console.error('SSE Payload Parsing Error:', e);
        }
      };

      source.onerror = () => {
        source?.close();
        fallbackTimeout = window.setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (source) source.close();
      clearTimeout(fallbackTimeout);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const remote = await getDisasterState();
        if (!isMounted) return;

        let hospitalsToSet = INITIAL_HOSPITALS;
        if (remote) {
          setRiskLevelState(remote.riskLevel || 'Moderate');
          setPatients(Array.isArray(remote.patients) && remote.patients.length > 0 ? remote.patients : INITIAL_PATIENTS);
          setEvents(Array.isArray(remote.events) ? remote.events : []);
          if (Array.isArray(remote.hospitals) && remote.hospitals.length > 0) {
            hospitalsToSet = remote.hospitals;
          }
        }

        // Always fallback to listHospitals if no hospitals are in the local/remote state
        if (hospitalsToSet === INITIAL_HOSPITALS || hospitalsToSet.length <= 5) {
          const allTNHospitals = await listHospitals();
          if (allTNHospitals && allTNHospitals.length > 0) {
            hospitalsToSet = allTNHospitals.map(h => ({
              id: h.id,
              name: h.name,
              capacity: h.capacity,
              incoming: 0,
              totalBeds: h.totalBeds,
              availableBeds: h.availableBeds,
              lat: h.lat,
              lng: h.lng,
              city: h.city
            }));
          }
        }
        
        setHospitals(hospitalsToSet);
      } catch {
        // Backend may be offline; keep in-memory defaults.
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = window.setTimeout(() => {
      void saveDisasterState({
        riskLevel,
        patients,
        hospitals,
        events,
      }).catch(() => {
        // Keep app responsive when backend is unavailable.
      });
    }, 500);

    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, [isHydrated, riskLevel, patients, hospitals, events]);

  const addEvent = useCallback((event: Omit<SystemEvent, 'id' | 'timestamp'>) => {
    const newEvent: SystemEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 50));
  }, []);

  const setRiskLevel = useCallback((level: RiskLevel) => {
    setRiskLevelState(level);
    addEvent({
      type: 'system',
      message: `Tsunami Risk Level updated to ${level.toUpperCase()}`,
      severity: level === 'High' ? 'critical' : level === 'Moderate' ? 'warning' : 'info',
    });
  }, [addEvent]);

  const addPatient = useCallback((patient: Omit<Patient, 'id'>) => {
    const newPatient: Patient = {
      ...patient,
      id: `P-${Math.floor(100 + Math.random() * 900)}`,
    };
    setPatients(prev => [...prev, newPatient]);
    addEvent({
      type: 'system',
      message: `New patient ${newPatient.id} logged with ${newPatient.tag} priority`,
      severity: newPatient.tag === 'RED' ? 'critical' : 'info',
    });
  }, [addEvent]);

  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const updateHospital = useCallback((id: string, updates: Partial<Hospital>) => {
    setHospitals(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  }, []);

  const broadcastAlert = useCallback((message: string, severity: SystemEvent['severity']) => {
    addEvent({
      type: 'alert',
      message: `BROADCAST: ${message}`,
      severity,
    });
  }, [addEvent]);

  const setLatestTriageSignal = useCallback((signal: Omit<TriageSignal, 'updatedAt'>) => {
    setLatestTriageSignalState({
      ...signal,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const setLatestVoiceTriageSignal = useCallback((signal: Omit<TriageSignal, 'updatedAt'>) => {
    setLatestVoiceTriageSignalState({
      ...signal,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  // Auto-dispatch logic for RED patients
  useEffect(() => {
    const redAwaiting = patients.filter(p => p.tag === 'RED' && p.status === 'awaiting');
    if (redAwaiting.length > 0) {
      redAwaiting.forEach(patient => {
        // Simulate dispatch engine delay
        setTimeout(() => {
          updatePatient(patient.id, { status: 'dispatched', eta: '8 min' });
          addEvent({
            type: 'dispatch',
            message: `Emergency dispatch triggered for ${patient.id} to ${patient.hospital}`,
            severity: 'critical',
          });
        }, 2000);
      });
    }
  }, [patients, updatePatient, addEvent]);

  return (
    <DisasterContext.Provider value={{
      riskLevel,
      setRiskLevel,
      patients,
      addPatient,
      updatePatient,
      hospitals,
      updateHospital,
      events,
      addEvent,
      broadcastAlert,
      latestTriageSignal: latestTriageSignalState,
      setLatestTriageSignal,
      latestVoiceTriageSignal: latestVoiceTriageSignalState,
      setLatestVoiceTriageSignal,
      seismicAnomaly,
      tsunamiAlert,
      nlpReport,
      setNlpReport,
    }}>
      {children}
    </DisasterContext.Provider>
  );
};
