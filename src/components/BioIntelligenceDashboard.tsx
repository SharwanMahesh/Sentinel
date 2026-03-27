import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Activity, ShieldAlert, MapPin, Zap, AlertTriangle, Search, Layers, Filter, Clock, User, ArrowLeft, TrendingUp, Users, CheckCircle2, ChevronRight, Stethoscope, Truck, Hospital, AlertCircle, Timer, Brain, Maximize, X } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ContainmentSection } from './ContainmentSection';
import { AIChatbot } from './AIChatbot';
import { LogisticsSection } from './LogisticsSection';
import { ResourceLogisticsPanel } from './ResourceLogisticsPanel';
import { useHospitalData } from '../hooks/useHospitalData';
import { listBioPatients, patchBioPatient, upsertBioPatient, deleteBioPatient, type BioPatientRecord } from '../services/backendApi';

interface Patient {
  id: string;
  name: string;
  age: number;
  symptoms: string[];
  score: number;
  timestamp: Date;
  status: 'Critical' | 'Moderate' | 'Stable';
  stage: 'AI-Monitored' | 'Pending Consult' | 'Dispatched';
  vitals: {
    bp: string;
    o2: number;
  };
  lastCheckIn: Date;
  aiRecommendation: string;
  riskScore: number;
  waitTime: number; // in seconds
  assignedDoctor?: string;
  ambulanceId?: string;
  eta?: number; // in seconds
  hospital?: string;
  bedNo?: string;
}

const toBioPatientModel = (record: BioPatientRecord): Patient => ({
  ...record,
  timestamp: new Date(record.timestamp),
  lastCheckIn: new Date(record.lastCheckIn),
});

const toBioPatientRecord = (patient: Patient): BioPatientRecord => ({
  ...patient,
  timestamp: patient.timestamp.toISOString(),
  lastCheckIn: patient.lastCheckIn.toISOString(),
});

export function BioIntelligenceDashboard({ onBack, onSwitchMode }: { onBack: () => void, onSwitchMode: () => void, key?: React.Key }) {
  const { metrics: hospitalMetrics, topHospitals, pickDispatchHospital } = useHospitalData();
  const [activeTab, setActiveTab] = useState<'Bio-Intel' | 'Containment' | 'Chatbot' | 'Patients' | 'Logistics'>(() => {
    return (localStorage.getItem('sentinel_bio_tab') as any) || 'Bio-Intel';
  });

  useEffect(() => {
    localStorage.setItem('sentinel_bio_tab', activeTab);
  }, [activeTab]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [mapMode, setMapMode] = useState<'2D' | 'Topology' | 'Heatmap'>('Heatmap');
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<{ id: string, name: string, risk: number, rate: string, lat: number, lng: number } | null>(null);
  const [containmentCenter, setContainmentCenter] = useState<[number, number] | undefined>(undefined);
  const [toasts, setToasts] = useState<{ id: string, message: string, type: 'info' | 'warning' | 'critical' }[]>([]);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const preferredHospitals = useMemo(() => topHospitals(12), [topHospitals]);

  const showToast = (message: string, type: 'info' | 'warning' | 'critical' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const hotspots = [
    { id: 'CHE', name: 'Chennai', risk: 0.84, rate: '+12%', lat: 13.0827, lng: 80.2707 },
    { id: 'CBE', name: 'Coimbatore', risk: 0.62, rate: '+5%', lat: 11.0168, lng: 76.9558 },
    { id: 'MDU', name: 'Madurai', risk: 0.91, rate: '+24%', lat: 9.9252, lng: 78.1198 },
    { id: 'SLM', name: 'Salem', risk: 0.45, rate: '+2%', lat: 11.6643, lng: 78.1460 },
  ];

  const getHotspotIcon = (risk: number) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="relative w-4 h-4 rounded-full border-2 border-white shadow-lg ${risk > 0.8 ? 'bg-red-500' : 'bg-orange-500'}">
             <div class="absolute inset-0 rounded-full animate-ping ${risk > 0.8 ? 'bg-red-400' : 'bg-orange-400'}"></div>
           </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  useEffect(() => {
    let isMounted = true;

    const loadPatients = async () => {
      try {
        const persistedPatients = await listBioPatients();
        if (!isMounted) return;
        setPatients(persistedPatients.map(toBioPatientModel));
      } catch {
        // Backend may be offline; continue with in-memory state.
      }
    };

    void loadPatients();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPatients(prev => prev.map(p => {
        const updates: Partial<Patient> = {};
        if (p.stage === 'Pending Consult') {
          updates.waitTime = (p.waitTime || 0) + 1;
        }
        if (p.stage === 'Dispatched' && p.eta && p.eta > 0) {
          updates.eta = p.eta - 1;
        }
        return Object.keys(updates).length > 0 ? { ...p, ...updates } : p;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const movePatient = (id: string, newStage: Patient['stage']) => {
    const updatedCheckIn = new Date();
    setPatients(prev => prev.map(p => p.id === id ? { ...p, stage: newStage, lastCheckIn: updatedCheckIn } : p));

    void patchBioPatient(id, {
      stage: newStage,
      lastCheckIn: updatedCheckIn.toISOString(),
    }).catch(() => {
      // Ignore transient backend outages.
    });
  };

  const handleDeletePatient = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteBioPatient(id);
      setPatients(prev => prev.filter(p => p.id !== id));
      showToast('Patient deleted', 'info');
    } catch (error) {
      console.error('Failed to delete patient:', error);
      showToast('Failed to delete patient', 'critical');
    }
  };

  const handleTriageComplete = (data: any) => {
    const status = data.score > 70 ? 'Critical' : data.score > 35 ? 'Moderate' : 'Stable';
    const derivedBp = data?.vitals?.bp || `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`;
    const derivedO2 = typeof data?.vitals?.o2 === 'number' ? data.vitals.o2 : 94 + Math.floor(Math.random() * 6);
    const dispatchHospital = pickDispatchHospital();
    const resolvedHospital = status === 'Critical'
      ? (data.hospital || dispatchHospital?.name || preferredHospitals[0]?.name || 'Central General')
      : undefined;
    const resolvedEta = status === 'Critical' ? (data.etaSeconds || 360 + Math.floor(Math.random() * 300)) : undefined;
    const resolvedAmbulance = status === 'Critical' ? (data.ambulanceId || `AMB-${Math.floor(Math.random() * 999)}`) : undefined;

    const newPatient: Patient = {
      id: data.id || `P-${Math.floor(Math.random() * 10000)}`,
      name: data.name || "Anonymous Patient",
      age: data.age || 35,
      symptoms: data.symptoms || [],
      score: data.score,
      timestamp: new Date(),
      status: status,
      stage: status === 'Critical' ? 'Dispatched' : status === 'Moderate' ? 'Pending Consult' : 'AI-Monitored',
      vitals: {
        bp: derivedBp,
        o2: derivedO2
      },
      lastCheckIn: new Date(),
      aiRecommendation: data.aiRecommendation || (status === 'Critical' ? "Immediate dispatch required." : status === 'Moderate' ? "Doctor consultation pending." : "Continuous AI monitoring."),
      riskScore: data.score,
      waitTime: 0,
      assignedDoctor: status === 'Moderate' ? "Unassigned" : undefined,
      ambulanceId: resolvedAmbulance,
      eta: resolvedEta,
      hospital: resolvedHospital,
      bedNo: status === 'Critical' ? `B-${Math.floor(Math.random() * 50)}` : undefined
    };
    setPatients(prev => [newPatient, ...prev]);

    void upsertBioPatient(toBioPatientRecord(newPatient)).catch(() => {
      showToast('Patient saved locally. Backend unavailable.', 'warning');
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] font-sans text-slate-900 flex">
      {/* Sidebar */}
      <nav className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 shrink-0 z-20">
        {(activeTab === 'Containment' || activeTab === 'Chatbot') && (
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors mb-2" title="Back to Dashboard">
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-100">
          <Shield className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-6 w-full items-center">
          {[
            { icon: Activity, label: 'Bio-Intel' },
            { icon: ShieldAlert, label: 'Containment' },
            { icon: Search, label: 'Chatbot' },
            { icon: User, label: 'Patients' },
            { icon: Layers, label: 'Logistics' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(item.label as any)}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.label ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <item.icon className={`w-6 h-6 ${activeTab === item.label ? 'drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]' : ''}`} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto">
          {/* User image removed as requested */}
          <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400">
            <User className="w-6 h-6" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Toast System */}
        <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 min-w-[280px] ${toast.type === 'critical' ? 'bg-red-600 border-red-500 text-white' :
                    toast.type === 'warning' ? 'bg-orange-500 border-orange-400 text-white' :
                      'bg-slate-900 border-slate-800 text-white'
                  }`}
              >
                {toast.type === 'critical' ? <AlertTriangle className="w-5 h-5" /> :
                  toast.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                <span className="text-xs font-bold">{toast.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Expanded Timeline Panel */}
        <AnimatePresence>
          {isTimelineOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-40 border-l border-slate-200 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Anomaly Timeline</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical Event Log</p>
                </div>
                <button
                  onClick={() => setIsTimelineOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {[
                  {
                    date: 'Today', events: [
                      { title: "Viral RNA spike +320%", zone: "Zone B", time: "16:45", type: 'critical' },
                      { title: "Humidity Threshold Breach", zone: "Sector 4", time: "16:31", type: 'warning' },
                      { title: "Station 02 Recalibration", zone: "Zone A", time: "15:12", type: 'info' }
                    ]
                  },
                  {
                    date: 'Yesterday', events: [
                      { title: "Baseline Reset Successful", zone: "Global", time: "23:00", type: 'info' },
                      { title: "Thermal Anomaly Detected", zone: "Cluster X", time: "19:45", type: 'warning' },
                      { title: "Node 12 Maintenance", zone: "Sector 2", time: "14:20", type: 'info' }
                    ]
                  }
                ].map((group, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">{group.date}</div>
                    {group.events.map((event, eIdx) => (
                      <div key={eIdx} className="relative pl-6 border-l-2 border-slate-100 py-1">
                        <div className={`absolute left-[-5px] top-2 w-2 h-2 rounded-full ${event.type === 'critical' ? 'bg-red-500' :
                            event.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                          }`} />
                        <div className="text-xs font-black text-slate-900">{event.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{event.zone}</span>
                          <span className="text-[9px] font-bold text-slate-300">•</span>
                          <span className="text-[9px] font-bold text-slate-400">{event.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button className="w-full py-3 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                  Export Full Report (PDF)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'Bio-Intel' ? (
            <motion.div
              key="bio-intel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-8 pb-8 flex-grow grid grid-cols-12 gap-6 overflow-y-auto custom-scrollbar"
            >
              {/* Integrated Header */}
              <div className="col-span-12 flex items-center justify-between py-6 shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors" title="Back to Dashboard">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bio-Intelligence Surveillance</h2>
                    <p className="text-slate-500 text-sm font-medium">Real-time pathogenic anomaly detection & spatial analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">System Active</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200 mx-2" />
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Center: Transmission Analysis */}
              <div className="col-span-9 flex flex-col gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex-grow flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute inset-0 bg-slate-50/5 pointer-events-none" />
                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2 uppercase tracking-widest"><MapPin className="w-4 h-4" /> Spatial Transmission Analysis</h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold shadow-inner">
                      {(['2D', 'Topology', 'Heatmap'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setMapMode(mode)}
                          className={`px-3 py-1 rounded transition-all ${mapMode === mode ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-grow bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden z-10">
                    <MapContainer
                      center={[11.1271, 78.6569]}
                      zoom={6.5}
                      style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      />

                      {/* Topology Links */}
                      {mapMode === 'Topology' && (
                        hotspots.map((h, i) => hotspots.slice(i + 1).map((h2, j) => (
                          <Polyline
                            key={`${h.id}-${h2.id}`}
                            positions={[[h.lat, h.lng], [h2.lat, h2.lng]]}
                            pathOptions={{ color: '#3b82f6', weight: 1, dashArray: '5, 10' }}
                          />
                        )))
                      )}

                      {/* Heatmap Gradients */}
                      {mapMode === 'Heatmap' && (
                        hotspots.map(h => (
                          <Circle
                            key={`heat-${h.id}`}
                            center={[h.lat, h.lng]}
                            radius={40000}
                            pathOptions={{
                              fillColor: h.risk > 0.8 ? '#ef4444' : '#f59e0b',
                              fillOpacity: 0.2,
                              stroke: false
                            }}
                          />
                        ))
                      )}

                      {/* Hotspots */}
                      {hotspots.map(h => (
                        <Marker
                          key={h.id}
                          position={[h.lat, h.lng]}
                          icon={getHotspotIcon(h.risk)}
                          eventHandlers={{
                            click: () => setSelectedHotspot(h as any)
                          }}
                        >
                          <Popup className="custom-popup bg-slate-900/90 text-white rounded shadow-lg border border-slate-700">
                            <div className="p-2 font-sans text-slate-900">
                              <div className="font-bold text-slate-800">{h.name}</div>
                              <div className="text-xs text-slate-500">Risk: {Math.round(h.risk * 100)}%</div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>

                    {/* Hotspot Detail Panel */}
                    <AnimatePresence>
                      {selectedHotspot && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="absolute top-4 right-4 w-48 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-2xl p-4 z-[1000]"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{selectedHotspot.name}</h4>
                            <button onClick={() => setSelectedHotspot(null)} className="text-slate-400 hover:text-slate-600">×</button>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Risk Level</span>
                              <span className={`text-xs font-black ${selectedHotspot.risk > 0.8 ? 'text-red-600' : 'text-orange-600'}`}>
                                {Math.round(selectedHotspot.risk * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Spread Rate</span>
                              <span className="text-xs font-black text-slate-900">{selectedHotspot.rate}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex gap-2">
                              <button
                                onClick={() => {
                                  setContainmentCenter([selectedHotspot.lat, selectedHotspot.lng]);
                                  setActiveTab('Containment');
                                  showToast(`Navigating to ${selectedHotspot.name} containment map`, 'info');
                                }}
                                className="flex-1 py-1.5 bg-blue-600 text-white text-[9px] font-bold rounded-lg hover:bg-blue-700 transition-all"
                              >
                                Containment
                              </button>
                              <button
                                onClick={() => showToast(`Alert sent to ${selectedHotspot.name} response team`, 'warning')}
                                className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-lg hover:bg-slate-200 transition-all"
                              >
                                Alert Team
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="absolute bottom-4 left-4 z-[1000]">
                      <button onClick={() => {
                        setContainmentCenter(selectedHotspot ? [selectedHotspot.lat, selectedHotspot.lng] : undefined);
                        setActiveTab('Containment');
                      }} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95">
                        <Layers className="w-3 h-3" /> Open Containment Map
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 mt-6 text-center relative z-10">
                    <div className="p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Population Exposed</div>
                      <div className="text-xl font-bold text-slate-900">142,500</div>
                    </div>
                    <div className="p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Clusters</div>
                      <div className="text-xl font-bold text-slate-900">08</div>
                    </div>
                    <div className="p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nodes Online</div>
                      <div className="text-xl font-bold text-slate-900">24 / 24</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Anomaly Feed */}
              <div className="col-span-3 flex flex-col gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex-grow overflow-hidden flex flex-col relative group hover:shadow-md transition-all">
                  <div className="absolute inset-0 bg-red-50/5 pointer-events-none" />
                  <h3 className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-widest relative z-10">Anomaly Feed (Live)</h3>
                  <div className="space-y-6 overflow-y-auto flex-grow custom-scrollbar pr-2 relative z-10">
                    {[
                      { title: "Google Searches: Surge in 'cough remedies' (Chennai)", time: "JUST NOW", critical: true, hotspotId: 'CHE' },
                      { title: "Pharmacy: +45% Antipyretics drug sales (Madurai)", time: "12 MINS AGO", critical: true, hotspotId: 'MDU' },
                      { title: "AIChatbot cluster: 5 users reporting severe chest pain (Coimbatore)", time: "28 MINS AGO", critical: true, hotspotId: 'CBE' },
                      { title: "Environmental: High humidity >85% sustained (Salem)", time: "1 HOUR AGO", critical: false, hotspotId: 'SLM' },
                      { title: "Google Searches: 'breathing difficulty' trending locally (Chennai)", time: "2 HOURS AGO", critical: false, hotspotId: 'CHE' },
                      { title: "Pharmacy: Respiratory inhalers stock low (Madurai)", time: "5 HOURS AGO", critical: false, hotspotId: 'MDU' },
                      { title: "AIChatbot Triage Cluster: Respiratory symptoms (Salem)", time: "8 HOURS AGO", critical: false, hotspotId: 'SLM' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 4 }}
                        onClick={() => {
                          if (item.hotspotId) {
                            const h = hotspots.find(hs => hs.id === item.hotspotId);
                            if (h) {
                              setSelectedHotspot(h as any);
                            }
                          }
                          showToast(`Viewing details for: ${item.title}`, 'info');
                        }}
                        className="flex gap-3 group cursor-pointer"
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.critical ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-400'}`}></div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</div>
                          <div className="text-[10px] font-bold text-slate-400">{item.time}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsTimelineOpen(true)}
                    className="w-full mt-8 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95 relative z-10"
                  >
                    View All Activity
                  </button>
                </div>
              </div>

              {/* Bottom: Future State Analysis */}
              <div className="col-span-12 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute inset-0 bg-blue-50/5 pointer-events-none" />
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    Future State Analysis
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black">CONFIDENCE: 87%</span>
                  </h3>
                  <div className="text-xs font-bold text-slate-400">Predictive modeling of pathogenic concentration over 72-hour window</div>
                </div>
                <div className="h-40 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 italic relative overflow-hidden z-10">
                  <div className="absolute inset-0 flex items-end px-12 pb-8 gap-4">
                    {[40, 35, 45, 60, 85, 75, 90, 80, 95, 100, 85, 70].map((h, i) => (
                      <div key={i} className="flex-1 bg-blue-100/50 rounded-t-sm relative group" style={{ height: `${h}%` }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: '100%' }}
                          transition={{ delay: i * 0.05, duration: 0.5 }}
                          className={`absolute inset-0 rounded-t-sm opacity-60 group-hover:opacity-100 transition-opacity ${h > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                        />
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {h}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="relative z-10 font-black text-blue-900/20 tracking-[0.5em] uppercase text-xl pointer-events-none">Predictive Trend</div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'Containment' ? (
            <motion.div
              key="containment"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-grow flex flex-col"
            >
              <ContainmentSection initialCenter={containmentCenter} />
            </motion.div>
          ) : activeTab === 'Chatbot' ? (
            <motion.div
              key="chatbot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 flex-grow grid grid-cols-12 gap-6 overflow-hidden"
            >
              <div className="col-span-8 flex flex-col h-full overflow-hidden">
                <AIChatbot onTriageComplete={handleTriageComplete} />
              </div>
              <div className="col-span-4 flex flex-col gap-6 h-full overflow-hidden">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-[40%] shrink-0">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Priority Triage Queue
                    </h3>
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">{patients.length} PENDING</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">ICU Free</div>
                      <div className="text-sm font-black text-slate-800">{hospitalMetrics.availableIcuBeds}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Beds Free</div>
                      <div className="text-sm font-black text-slate-800">{hospitalMetrics.availableBeds}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Hospitals</div>
                      <div className="text-sm font-black text-slate-800">{hospitalMetrics.hospitalCount}</div>
                    </div>
                  </div>
                  <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    <AnimatePresence initial={false}>
                      {patients.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-xl">
                          <Users className="w-12 h-12 text-slate-200 mb-4" />
                          <p className="text-sm text-slate-400 font-medium italic">No patients in queue. Awaiting AI intake...</p>
                        </div>
                      ) : (
                        patients.map((patient) => (
                          <motion.div
                            key={patient.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-blue-200 transition-all group cursor-pointer"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="text-xs font-bold text-slate-900">{patient.id}</div>
                                <div className={`px-2 py-0.5 mt-1 rounded text-[8px] font-bold uppercase tracking-wider inline-block ${patient.status === 'Critical' ? 'bg-red-100 text-red-600' :
                                    patient.status === 'Moderate' ? 'bg-yellow-100 text-yellow-600' :
                                      'bg-green-100 text-green-600'
                                  }`}>
                                  {patient.status}
                                </div>
                              </div>
                              <button onClick={(e) => handleDeletePatient(patient.id, e)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {patient.symptoms.map((s, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-slate-500 font-medium">{s}</span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {patient.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex-grow overflow-hidden">
                  <ResourceLogisticsPanel redPatientCount={patients.filter(p => p.stage === 'Dispatched').length} />
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'Patients' ? (
            <motion.div
              key="patients"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 flex-grow flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors" title="Back to Dashboard">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Lifecycle Board</h2>
                    <p className="text-slate-500 text-sm font-medium">Tracking intake to recovery pipeline</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> SYNCED WITH LOGISTICS
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-[10px] font-bold">
                    <Hospital className="w-3 h-3" /> TN HOSPITALS: {hospitalMetrics.hospitalCount}
                  </div>
                  <button
                    onClick={() => {
                      handleTriageComplete({ score: Math.random() * 100, symptoms: ['Simulated Case'] });
                      showToast('New patient intake simulated', 'info');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Users className="w-3 h-3" /> Simulate Intake
                  </button>
                  <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-center shadow-sm">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Intake</div>
                    <div className="text-xl font-bold text-slate-900">{patients.length}</div>
                  </div>
                  <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 text-center shadow-sm">
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Critical</div>
                    <div className="text-xl font-bold text-red-600">{patients.filter(p => p.status === 'Critical').length}</div>
                  </div>
                </div>
              </div>

              <div className="flex-grow grid grid-cols-12 gap-8 overflow-hidden pb-4">
                <div className="col-span-9 grid grid-cols-3 gap-8 overflow-hidden">
                  {/* AI-Monitored (Green) */}
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-[#ECFDF5] border border-[#D1FAE5] rounded-t-2xl shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
                        <h3 className="text-sm font-bold text-[#065F46] uppercase tracking-widest">AI-Monitored</h3>
                      </div>
                      <span className="bg-white/50 text-[#065F46] px-2 py-0.5 rounded text-[10px] font-bold">
                        {patients.filter(p => p.stage === 'AI-Monitored').length}
                      </span>
                    </div>
                    <div className="flex-grow bg-[#F8FAFC] border-x border-b border-slate-200 rounded-b-2xl p-4 space-y-4 overflow-y-auto custom-scrollbar">
                      <AnimatePresence mode="popLayout">
                        {patients.filter(p => p.stage === 'AI-Monitored').map(p => (
                          <motion.div
                            layout
                            key={p.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-[#22C55E] border-slate-200 hover:shadow-md transition-all group"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="text-sm font-bold text-slate-900">{p.name}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.id} • AGE: {p.age}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${p.score > 30 ? 'bg-yellow-400 animate-pulse' : 'bg-[#22C55E]'}`}></div>
                                <button onClick={(e) => handleDeletePatient(p.id, e)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="text-[8px] font-bold text-slate-400 uppercase">Vitals: BP</div>
                                <div className="text-xs font-bold text-slate-700">{p.vitals.bp}</div>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="text-[8px] font-bold text-slate-400 uppercase">Vitals: O2</div>
                                <div className={`text-xs font-bold ${p.vitals.o2 < 95 ? 'text-red-500' : 'text-slate-700'}`}>{p.vitals.o2}%</div>
                              </div>
                            </div>

                            <div className="mb-4">
                              <div className="text-[8px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                <Brain className="w-2 h-2" /> AI Recommendation
                              </div>
                              <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">"{p.aiRecommendation}"</p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {p.lastCheckIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <button
                                onClick={() => {
                                  movePatient(p.id, 'Pending Consult');
                                  showToast(`Patient ${p.id} moved to Consult`, 'info');
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 active:scale-95 transition-transform"
                              >
                                Monitor <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Pending Consult (Yellow) */}
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-[#FFFBEB] border border-[#FEF3C7] rounded-t-2xl shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                        <h3 className="text-sm font-bold text-[#92400E] uppercase tracking-widest">Pending Consult</h3>
                      </div>
                      <span className="bg-white/50 text-[#92400E] px-2 py-0.5 rounded text-[10px] font-bold">
                        {patients.filter(p => p.stage === 'Pending Consult').length}
                      </span>
                    </div>
                    <div className="flex-grow bg-[#F8FAFC] border-x border-b border-slate-200 rounded-b-2xl p-4 space-y-4 overflow-y-auto custom-scrollbar">
                      <AnimatePresence mode="popLayout">
                        {patients.filter(p => p.stage === 'Pending Consult').map(p => (
                          <motion.div
                            layout
                            key={p.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-[#F59E0B] border-slate-200 hover:shadow-md transition-all group ${p.waitTime > 900 ? 'ring-2 ring-red-400 ring-opacity-50' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="text-sm font-bold text-slate-900">{p.name}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.id}</div>
                              </div>
                              <div className="flex items-start gap-4">
                                <div className="text-center">
                                  <div className="text-[8px] font-bold text-slate-400 uppercase">Risk Score</div>
                                  <div className={`text-sm font-black ${p.riskScore > 50 ? 'text-red-500' : 'text-yellow-600'}`}>{Number(p.riskScore).toFixed(2)}</div>
                                </div>
                                <button onClick={(e) => handleDeletePatient(p.id, e)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors -mt-1 -mr-1">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                  <Timer className="w-2 h-2" /> Wait Time
                                </div>
                                <div className={`text-xs font-bold ${p.waitTime > 900 ? 'text-red-600' : 'text-slate-700'}`}>
                                  {Math.floor(p.waitTime / 60)}m {p.waitTime % 60}s
                                </div>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                  <Stethoscope className="w-2 h-2" /> Doctor
                                </div>
                                <div className="text-[10px] font-bold text-slate-700 truncate">{p.assignedDoctor || 'Unassigned'}</div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.waitTime <= 900 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600 animate-pulse'}`}>
                                {p.waitTime <= 900 ? 'SLA OK' : 'SLA BREACH'}
                              </div>
                              <button
                                onClick={() => {
                                  movePatient(p.id, 'Dispatched');
                                  showToast(`Emergency dispatch triggered for ${p.id}`, 'critical');
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 active:scale-95 transition-transform"
                              >
                                Dispatch <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Dispatched (Red) */}
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-t-2xl shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
                        <h3 className="text-sm font-bold text-[#991B1B] uppercase tracking-widest">Dispatched</h3>
                      </div>
                      <span className="bg-white/50 text-[#991B1B] px-2 py-0.5 rounded text-[10px] font-bold">
                        {patients.filter(p => p.stage === 'Dispatched').length}
                      </span>
                    </div>
                    <div className="flex-grow bg-[#F8FAFC] border-x border-b border-slate-200 rounded-b-2xl p-4 space-y-4 overflow-y-auto custom-scrollbar">
                      <AnimatePresence mode="popLayout">
                        {patients.filter(p => p.stage === 'Dispatched').map(p => (
                          <motion.div
                            layout
                            key={p.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-[#EF4444] border-slate-200 hover:shadow-md transition-all group"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="text-sm font-bold text-slate-900">{p.name}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.id}</div>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="bg-red-50 text-red-600 p-1.5 rounded-lg">
                                  <Truck className="w-4 h-4" />
                                </div>
                                <button onClick={(e) => handleDeletePatient(p.id, e)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors mt-0.5">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="text-[8px] font-bold text-slate-400 uppercase">Ambulance ID</div>
                                <div className="text-xs font-bold text-slate-700">{p.ambulanceId || 'N/A'}</div>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="text-[8px] font-bold text-slate-400 uppercase">ETA</div>
                                <div className="text-xs font-bold text-red-600">
                                  {p.eta ? `${Math.floor(p.eta / 60)}m ${p.eta % 60}s` : 'Arrived'}
                                </div>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                              <div className="flex items-center gap-2 mb-1">
                                <Hospital className="w-3 h-3 text-slate-400" />
                                <div className="text-[10px] font-bold text-slate-700">{p.hospital || 'Assigning...'}</div>
                              </div>
                              <div className="text-[9px] font-bold text-slate-400 ml-5">BED NO: {p.bedNo || '--'}</div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-red-400" /> Critical Status
                              </div>
                              <button
                                onClick={() => {
                                  movePatient(p.id, 'AI-Monitored');
                                  showToast(`Patient ${p.id} stabilized & moved to monitoring`, 'info');
                                }}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 active:scale-95 transition-transform"
                              >
                                Reset <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 overflow-hidden">
                  <ResourceLogisticsPanel redPatientCount={patients.filter(p => p.stage === 'Dispatched').length} />
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'Logistics' ? (
            <motion.div
              key="logistics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-grow grid grid-cols-12 overflow-hidden"
            >
              <div className="col-span-9 overflow-y-auto custom-scrollbar">
                <LogisticsSection onBack={onBack} />
              </div>
              <div className="col-span-3 border-l border-slate-200 bg-white overflow-hidden">
                <ResourceLogisticsPanel redPatientCount={patients.filter(p => p.stage === 'Dispatched').length} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-8 pb-8 flex-grow flex items-center justify-center text-slate-400 italic"
            >
              {activeTab} Module Under Construction
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
