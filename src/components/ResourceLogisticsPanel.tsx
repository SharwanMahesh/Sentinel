import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  ChevronRight, 
  X, 
  Package, 
  Activity, 
  Truck, 
  Hospital,
  ArrowRightLeft,
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';
import { useHospitalData } from '../hooks/useHospitalData';

interface ResourceLogisticsPanelProps {
  redPatientCount: number;
}

interface ResourceItem {
  name: string;
  capacity: number;
  status: 'Stable' | 'Trending Up' | 'Near Capacity';
  trend: 'up' | 'down' | 'stable';
  arrivals?: string;
}

interface Alert {
  id: string | number;
  message: string;
  type: 'warning' | 'critical';
  timestamp?: Date;
}

const toPercent = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
};

const mockChartData = [
  { time: '0h', oxygen: 40, beds: 30, ventilators: 20, oxygenPred: 40, bedsPred: 30, ventilatorsPred: 20 },
  { time: '4h', oxygen: 45, beds: 35, ventilators: 25, oxygenPred: 45, bedsPred: 35, ventilatorsPred: 25 },
  { time: '8h', oxygen: 55, beds: 45, ventilators: 35, oxygenPred: 55, bedsPred: 45, ventilatorsPred: 35 },
  { time: '12h', oxygen: 65, beds: 60, ventilators: 50, oxygenPred: 65, bedsPred: 60, ventilatorsPred: 50 },
  { time: '16h', oxygen: null, beds: null, ventilators: null, oxygenPred: 75, bedsPred: 70, ventilatorsPred: 65 },
  { time: '20h', oxygen: null, beds: null, ventilators: null, oxygenPred: 85, bedsPred: 82, ventilatorsPred: 78 },
  { time: '24h', oxygen: null, beds: null, ventilators: null, oxygenPred: 95, bedsPred: 92, ventilatorsPred: 88 },
];

export function ResourceLogisticsPanel({ redPatientCount }: ResourceLogisticsPanelProps) {
  const { metrics } = useHospitalData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    fromZone: 'Zone A',
    toZone: 'Zone B',
    resourceType: 'Oxygen',
    quantity: 50
  });

  const safeVentilatorsTotal = metrics.totalVentilators || 1;
  const safeVentilatorsAvail = metrics.availableVentilators || 0;
  const safeOxygen = metrics.oxygenSupplyPercent || 0;
  const safeAmbulances = metrics.activeAmbulances || 0;

  const bedUtilization = metrics.bedOccupancy || 0;
  const ventilatorUtilization = 100 - toPercent(safeVentilatorsAvail, safeVentilatorsTotal);
  const oxygenStress = safeOxygen > 0 ? 100 - safeOxygen : 0; // if 0, assume stable until data loads

  const [resources, setResources] = useState<ResourceItem[]>([
    { name: 'Hospital Beds', capacity: bedUtilization, status: bedUtilization > 80 ? 'Near Capacity' : 'Stable', trend: 'up', arrivals: `+${Math.max(1, redPatientCount)} arrivals in next 15 min` },
    { name: 'Ventilators', capacity: ventilatorUtilization, status: 'Stable', trend: 'stable', arrivals: `${safeVentilatorsAvail} available` },
    { name: 'Oxygen Supply', capacity: oxygenStress, status: oxygenStress > 80 ? 'Trending Up' : 'Stable', trend: 'up', arrivals: `${safeOxygen}% avg reserve` },
    { name: 'Ambulances', capacity: 100 - toPercent(safeAmbulances, 200), status: 'Stable', trend: 'down', arrivals: `${safeAmbulances} active units` },
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    setResources((prev) => prev.map((resource) => {
      if (resource.name === 'Hospital Beds') {
        return {
          ...resource,
          capacity: bedUtilization,
          status: bedUtilization > 80 ? 'Near Capacity' : 'Stable',
          arrivals: `+${Math.max(1, redPatientCount)} arrivals in next 15 min`,
        };
      }

      if (resource.name === 'Ventilators') {
        return {
          ...resource,
          capacity: ventilatorUtilization,
          arrivals: `${safeVentilatorsAvail} available`,
        };
      }

      if (resource.name === 'Oxygen Supply') {
        return {
          ...resource,
          capacity: oxygenStress,
          status: oxygenStress > 80 ? 'Trending Up' : 'Stable',
          arrivals: `${safeOxygen}% avg reserve`,
        };
      }
      
      if (resource.name === 'Ambulances') {
        return {
          ...resource,
          capacity: 100 - toPercent(safeAmbulances, 200),
          arrivals: `${safeAmbulances} active units`,
        };
      }

      return resource;
    }));
  }, [bedUtilization, ventilatorUtilization, safeVentilatorsAvail, safeOxygen, safeAmbulances, oxygenStress, redPatientCount]);

  // Alert logic for red patient count spike
  useEffect(() => {
    if (redPatientCount > 5) {
      const id = Date.now();
      setAlerts(prev => [...prev, { 
        id, 
        message: `High volume of critical cases (${redPatientCount}). Suggesting immediate resource redistribution.`,
        type: 'critical'
      }]);
      
      // Auto-highlight affected resources
      setResources(prev => prev.map(r => 
        r.name === 'Hospital Beds' || r.name === 'Oxygen Supply' 
        ? { ...r, status: 'Near Capacity' as const } 
        : r
      ));

      const timer = setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [redPatientCount]);

  // Alert logic for resource thresholds
  useEffect(() => {
    resources.forEach(r => {
      if (r.capacity > 90) {
        const id = Date.now() + Math.random();
        setAlerts(prev => {
          if (prev.some(a => a.message.includes(r.name))) return prev;
          return [...prev, { 
            id, 
            message: `${r.name} critical in Zone B. Capacity at ${r.capacity}%.`,
            type: 'critical'
          }];
        });
      }
    });
  }, [resources]);

  // Auto-allocation alert logic
  const prevRedCount = React.useRef(redPatientCount);
  React.useEffect(() => {
    if (redPatientCount > prevRedCount.current) {
      const newAlert: Alert = {
        id: `alloc-${Date.now()}`,
        type: 'warning',
        message: `Auto-Allocation: Reserving beds and assigning ambulances for ${redPatientCount - prevRedCount.current} new critical case(s).`,
        timestamp: new Date()
      };
      setAlerts(prev => [newAlert, ...prev].slice(0, 3));
    }
    prevRedCount.current = redPatientCount;
  }, [redPatientCount]);

  const handleTransfer = () => {
    // Simulate transfer
    const id = Date.now();
    setAlerts(prev => [...prev, { 
      id, 
      message: `Transfer of ${transferData.quantity} units of ${transferData.resourceType} from ${transferData.fromZone} to ${transferData.toZone} initiated.`,
      type: 'warning'
    }]);
    setIsModalOpen(false);
    
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      {/* 1. Stock Predictor */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4" /> Resource Forecast
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-0.5 bg-blue-500"></div>
              <span className="text-[8px] font-bold text-slate-400">O2</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-0.5 bg-green-500"></div>
              <span className="text-[8px] font-bold text-slate-400">BEDS</span>
            </div>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', fontSize: '12px' }}
              />
              <ReferenceArea y1={80} y2={100} {...({ fill: "#fee2e2", fillOpacity: 0.3 } as any)} />
              
              {/* Oxygen */}
              <Line 
                type="monotone" 
                dataKey="oxygen" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 4 }} 
              />
              <Line 
                type="monotone" 
                dataKey="oxygenPred" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                dot={false} 
              />
              
              {/* Beds */}
              <Line 
                type="monotone" 
                dataKey="beds" 
                stroke="#22c55e" 
                strokeWidth={2} 
                dot={false} 
              />
              <Line 
                type="monotone" 
                dataKey="bedsPred" 
                stroke="#22c55e" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-3 h-3 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Oxygen depletion in 14 hrs</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400">CONFIDENCE: 92%</div>
        </div>
      </div>

      {/* 2. Resource Grid */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex-grow flex flex-col overflow-hidden">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Hospital className="w-4 h-4" /> Resource & Capacity
        </h3>
        
        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {resources.map((resource, i) => (
            <div key={i} className={`space-y-2 p-3 rounded-xl transition-all ${resource.capacity > 85 ? 'bg-red-50/50 ring-1 ring-red-100' : ''}`}>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs font-bold text-slate-900">{resource.name}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{resource.arrivals}</div>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  resource.capacity > 80 ? 'bg-red-100 text-red-600' : 
                  resource.capacity > 50 ? 'bg-yellow-100 text-yellow-600' : 
                  'bg-green-100 text-green-600'
                }`}>
                  {resource.status}
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${resource.capacity}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    resource.capacity > 80 ? 'bg-red-500' : 
                    resource.capacity > 50 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                />
                {resource.capacity > 85 && (
                  <motion.div 
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-white"
                  />
                )}
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                <span>Utilization</span>
                <span className={resource.capacity > 80 ? 'text-red-500' : ''}>{resource.capacity}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Re-supply Trigger */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" /> Resource Redistribution
          </h3>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 flex gap-3">
          <Zap className="w-5 h-5 text-blue-500 shrink-0" />
          <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
            AI Advisory: Transfer 20 oxygen units from Zone C to Zone B to prevent depletion.
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
        >
          Request Transfer <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Resource Transfer</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supply Chain Management</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">From Zone</label>
                    <select 
                      value={transferData.fromZone}
                      onChange={(e) => setTransferData(prev => ({ ...prev, fromZone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option>Zone A</option>
                      <option>Zone B</option>
                      <option>Zone C</option>
                      <option>Zone D</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">To Zone</label>
                    <select 
                      value={transferData.toZone}
                      onChange={(e) => setTransferData(prev => ({ ...prev, toZone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option>Zone A</option>
                      <option>Zone B</option>
                      <option>Zone C</option>
                      <option>Zone D</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Resource Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Oxygen', 'Beds', 'Ventilators', 'Ambulances'].map(type => (
                      <button
                        key={type}
                        onClick={() => setTransferData(prev => ({ ...prev, resourceType: type }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          transferData.resourceType === type 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Quantity</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={transferData.quantity}
                      onChange={(e) => setTransferData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                      className="flex-grow h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="bg-slate-900 text-white px-3 py-1 rounded-lg font-bold text-sm min-w-[40px] text-center">
                      {transferData.quantity}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                  <Info className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                    This transfer will reduce Zone A's reserve by 15%. Ensure secondary supply is active.
                  </p>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={handleTransfer}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  Confirm Redistribution <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Alerts */}
      <div className="fixed bottom-6 right-6 z-[3000] flex flex-col gap-3 items-end pointer-events-none">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto bg-white border-l-4 ${alert.type === 'critical' ? 'border-red-500' : 'border-blue-500'} p-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px] max-w-md`}
            >
              <div className={`w-10 h-10 rounded-full ${alert.type === 'critical' ? 'bg-red-50' : 'bg-blue-50'} flex items-center justify-center shrink-0`}>
                {alert.type === 'critical' ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <Info className="w-6 h-6 text-blue-500" />}
              </div>
              <div className="flex-grow">
                <div className={`text-[10px] font-bold ${alert.type === 'critical' ? 'text-red-500' : 'text-blue-500'} uppercase tracking-wider mb-0.5`}>
                  {alert.type === 'critical' ? 'Critical Supply Alert' : 'System Notification'}
                </div>
                <div className="text-xs font-bold text-slate-900 leading-tight">{alert.message}</div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setAlerts(prev => prev.filter(a => a.id !== alert.id));
                }} 
                className="text-slate-300 hover:text-slate-500 pointer-events-auto"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
