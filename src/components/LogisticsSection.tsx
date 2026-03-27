import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Hospital, Package, Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock, MapPin, Zap, ArrowLeft, Download, Send, X, ArrowRightLeft } from 'lucide-react';
import { useHospitalData } from '../hooks/useHospitalData';
import { patchHospital } from '../services/backendApi';

interface ResourceCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
  status?: 'Normal' | 'Warning' | 'Critical';
}

const ResourceCard = ({ title, value, subtitle, icon, trend, status }: ResourceCardProps) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-50 rounded-xl text-slate-600">
        {icon}
      </div>
      {trend && (
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
          <TrendingUp className="w-3 h-3" /> {trend}
        </div>
      )}
    </div>
    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</div>
    <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
    <div className="flex items-center justify-between">
      <div className="text-xs text-slate-500 font-medium">{subtitle}</div>
      {status && (
        <div className={`w-2 h-2 rounded-full ${status === 'Normal' ? 'bg-green-500' : status === 'Warning' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
      )}
    </div>
  </div>
);

export function LogisticsSection({ onBack }: { onBack?: () => void }) {
  const { metrics, topHospitals, hospitals: allHospitals, updateHospitalLocal } = useHospitalData();
  const [ambulances, setAmbulances] = React.useState([
    { id: 'AMB-01', status: 'Active', location: 'Zone A', battery: 85, driver: 'Suriya' },
    { id: 'AMB-02', status: 'Idle', location: 'HQ', battery: 100, driver: 'Aarti' },
    { id: 'AMB-03', status: 'Maintenance', location: 'Garage', battery: 42, driver: 'Siva' },
    { id: 'AMB-04', status: 'Active', location: 'Zone C', battery: 68, driver: 'Sharwan' },
  ]);
  const [actionAlert, setActionAlert] = React.useState<{ message: string, type: 'success' | 'warn' } | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
  const [transferForm, setTransferForm] = React.useState({
    resource: 'Oxygen Tanks',
    source: '',
    destination: '',
    quantity: 100
  });

  const [trackedIds, setTrackedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (trackedIds.length === 0 && allHospitals && allHospitals.length > 0) {
      const sorted = [...allHospitals].sort((a, b) => b.capacity - a.capacity);
      const critical = sorted.slice(0, 4);
      const moderate = sorted.slice(Math.floor(sorted.length / 2), Math.floor(sorted.length / 2) + 3);
      const available = sorted.slice(-3);
      const selectedIds = [...critical, ...moderate, ...available]
        .sort((a, b) => b.capacity - a.capacity)
        .map(h => h.id);
      setTrackedIds(selectedIds);
    }
  }, [allHospitals, trackedIds.length]);

  const hospitals = useMemo(() => {
    if (trackedIds.length === 0) return [];
    return trackedIds
      .map(id => allHospitals?.find(h => h.id === id))
      .filter((h): h is NonNullable<typeof h> => Boolean(h));
  }, [allHospitals, trackedIds]);
  const activeAmbulances = ambulances.filter((a) => a.status === 'Active').length;
  const criticalHospitals = hospitals.filter((h) => h.status === 'Critical');
  const warningHospital = criticalHospitals[0] || hospitals.find((h) => h.status === 'Warning');

  const formatCompact = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return `${value}`;
  };

  const showToast = (message: string, type: 'success' | 'warn' = 'success') => {
    setActionAlert({ message, type });
    setTimeout(() => setActionAlert(null), 4000);
  };

  const generateInventoryReport = () => {
    if (!allHospitals || allHospitals.length === 0) {
      showToast("No hospital data available to export.", "warn");
      return;
    }
    const headers = ["Hospital Name", "City", "Total Beds", "Available Beds", "ICU Beds", "Oxygen Liters", "Vaccine Doses", "Status"];
    const rows = allHospitals.map(h => [
      `"${h.name}"`,
      `"${h.city}"`,
      h.totalBeds.toString(),
      h.availableBeds.toString(),
      h.availableIcuBeds.toString(),
      h.oxygenLiters.toString(),
      h.vaccineDoses.toString(),
      h.status
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `statewide_inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Inventory report downloaded successfully.");
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.source || !transferForm.destination) {
      showToast("Please select both a source and destination hospital.", "warn");
      return;
    }
    if (transferForm.source === transferForm.destination) {
      showToast("Source and destination cannot be the same.", "warn");
      return;
    }

    const sourceHosp = allHospitals.find(h => h.name === transferForm.source);
    const destHosp = allHospitals.find(h => h.name === transferForm.destination);

    if (sourceHosp && destHosp && transferForm.resource === 'Standard Beds') {
      const qty = transferForm.quantity;
      if (sourceHosp.availableBeds < qty) {
        showToast("Source hospital does not have enough beds to transfer.", "warn");
        return;
      }

      const newSourceAvail = sourceHosp.availableBeds - qty;
      const newSourceCap = Math.round(((sourceHosp.totalBeds - newSourceAvail) / sourceHosp.totalBeds) * 100);
      const newSourceStatus = newSourceCap >= 90 ? 'Critical' : newSourceCap >= 75 ? 'Warning' : 'Normal';

      const newDestAvail = destHosp.availableBeds + qty;
      const newDestCap = Math.round(((destHosp.totalBeds - newDestAvail) / destHosp.totalBeds) * 100);
      const newDestStatus = newDestCap >= 90 ? 'Critical' : newDestCap >= 75 ? 'Warning' : 'Normal';

      // Live patch backend (fire and forget optimistically)
      patchHospital(sourceHosp.id, { availableBeds: newSourceAvail, capacity: newSourceCap, status: newSourceStatus as any }).catch(console.error);
      patchHospital(destHosp.id, { availableBeds: newDestAvail, capacity: newDestCap, status: newDestStatus as any }).catch(console.error);

      // Instant UI update
      if (updateHospitalLocal) {
        updateHospitalLocal(sourceHosp.id, { availableBeds: newSourceAvail, capacity: newSourceCap, status: newSourceStatus as any });
        updateHospitalLocal(destHosp.id, { availableBeds: newDestAvail, capacity: newDestCap, status: newDestStatus as any });
      }
    }

    setIsTransferModalOpen(false);
    showToast(`Successfully transferred ${transferForm.quantity} ${transferForm.resource} from ${transferForm.source} to ${transferForm.destination}.`);

    // Reset form
    setTransferForm({
      ...transferForm,
      quantity: 100,
      source: '',
      destination: ''
    });
  };

  return (
    <div className="flex-grow flex flex-col p-8 bg-[#F5F7FB] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors" title="Back to Dashboard">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Resource Logistics</h2>
            <p className="text-slate-500 text-sm font-medium">Real-time supply chain and asset tracking</p>
          </div>
        </div>
        <div className="flex gap-3 relative">
          {/* Action Toast Notification */}
          <AnimatePresence>
            {actionAlert && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={`absolute top-[48px] right-0 z-50 px-4 py-2.5 rounded-xl shadow-lg border flex items-center gap-2 whitespace-nowrap text-sm font-bold ${actionAlert.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
              >
                {actionAlert.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {actionAlert.message}
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={generateInventoryReport} className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" /> Inventory Report
          </button>
          <button onClick={() => setIsTransferModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            <ArrowRightLeft className="w-4 h-4 relative z-10" /> <span className="relative z-10">Resource Transfer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8 shrink-0">
        <ResourceCard
          title="Active Ambulances"
          value={`${activeAmbulances}/${ambulances.length}`}
          subtitle={`${ambulances.filter((a) => a.status === 'Maintenance').length} in maintenance`}
          icon={<Truck className="w-6 h-6" />}
          trend={`+${Math.max(1, activeAmbulances - 1)}`}
          status="Normal"
        />
        <ResourceCard
          title="Hospital Beds"
          value={formatCompact(metrics.totalBeds)}
          subtitle={`${metrics.bedOccupancy}% Occupancy`}
          icon={<Hospital className="w-6 h-6" />}
          trend={`+${Math.max(5, Math.round(metrics.availableBeds / 500))}`}
          status={metrics.bedOccupancy >= 85 ? 'Critical' : metrics.bedOccupancy >= 75 ? 'Warning' : 'Normal'}
        />
        <ResourceCard
          title="Oxygen Supply"
          value={formatCompact(metrics.oxygenLiters)}
          subtitle="Liters available"
          icon={<Activity className="w-6 h-6" />}
          trend={metrics.oxygenLiters < 12000 ? '-8%' : '-3%'}
          status={metrics.oxygenLiters < 12000 ? 'Warning' : 'Normal'}
        />
        <ResourceCard
          title="Vaccine Stock"
          value={formatCompact(metrics.vaccineDoses)}
          subtitle="Doses remaining"
          icon={<Package className="w-6 h-6" />}
          trend={metrics.vaccineDoses < 5000 ? '-18%' : '-7%'}
          status={metrics.vaccineDoses < 5000 ? 'Critical' : 'Warning'}
        />
      </div>

      <div className="grid grid-cols-2 gap-8 flex-grow min-h-0">
        {/* Ambulance Fleet */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" /> Ambulance Fleet
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Status</span>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto flex-grow custom-scrollbar">
            {ambulances.map(amb => (
              <div key={amb.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${amb.status === 'Active' ? 'bg-blue-100 text-blue-600' :
                      amb.status === 'Idle' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'
                    }`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{amb.id}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{amb.driver}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 ${amb.status === 'Active' ? 'bg-blue-50 text-blue-600' :
                      amb.status === 'Idle' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                    {amb.status}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 justify-end">
                    <MapPin className="w-3 h-3" /> {amb.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hospital Capacity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Hospital className="w-5 h-5 text-emerald-600" /> Hospital Capacity
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bed Tracking</span>
          </div>
          <div className="p-6 space-y-6 overflow-y-auto flex-grow custom-scrollbar">
            {hospitals.map(hosp => (
              <div key={hosp.id} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{hosp.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{hosp.city} • Available: {hosp.availableBeds}</div>
                  </div>
                  <div className={`text-xs font-bold ${hosp.status === 'Critical' ? 'text-red-600' : hosp.status === 'Warning' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                    {hosp.capacity}% Full
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${hosp.capacity}%` }}
                    className={`h-full rounded-full ${hosp.status === 'Critical' ? 'bg-red-500' : hosp.status === 'Warning' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                  />
                </div>
              </div>
            ))}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <div className="text-xs font-bold text-slate-700">Capacity Warning</div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {warningHospital ? `${warningHospital.name} is approaching critical capacity. Redirecting non-emergency dispatches to top available hospitals.` : 'All tracked hospitals are currently within manageable capacity levels.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Modal Overlay */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsTransferModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl relative z-10 w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  Manual Resource Transfer
                </h3>
                <button onClick={() => setIsTransferModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Resource Type</label>
                  <select
                    value={transferForm.resource}
                    onChange={(e) => setTransferForm({ ...transferForm, resource: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  >
                    <option value="Oxygen Tanks">Oxygen Tanks (Liters)</option>
                    <option value="ICU Ventilators">ICU Ventilators</option>
                    <option value="Standard Beds">Standard Beds</option>
                    <option value="Ambulance Units">Ambulance Units</option>
                    <option value="Vaccine Doses">Vaccine Doses</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Source Facility</label>
                    <select
                      required
                      value={transferForm.source}
                      onChange={(e) => setTransferForm({ ...transferForm, source: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select Origin...</option>
                      {allHospitals?.map(h => (
                        <option key={h.id} value={h.name}>{h.name} ({h.city})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Facility</label>
                    <select
                      required
                      value={transferForm.destination}
                      onChange={(e) => setTransferForm({ ...transferForm, destination: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select Target...</option>
                      {allHospitals?.map(h => (
                        <option key={`dest-${h.id}`} value={h.name}>{h.name} ({h.city})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transfer Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 bg-blue-600 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
                  >
                    Initiate Transfer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
