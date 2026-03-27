import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Clock, Truck, Users, Activity, CheckCircle2, X, Hospital as HospitalIcon, Heart, Droplets, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDisaster, Patient } from '../context/DisasterContext';

export function PriorityQueuePanel() {
  const { patients, hospitals, updatePatient } = useDisaster();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const filteredPatients = patients;

  const handleDispatch = (id: string) => {
    updatePatient(id, { status: 'dispatched', eta: '12 min' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c10] text-slate-300 p-6 gap-6 overflow-hidden relative">
      {/* Patient Card Stack */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
        <AnimatePresence mode="popLayout">
          {filteredPatients.sort((a, b) => b.score - a.score).map(patient => (
            <motion.div 
              key={patient.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => setSelectedPatient(patient)}
              className={`bg-[#161920] p-4 rounded-xl border transition-all cursor-pointer group ${
                selectedPatient?.id === patient.id ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border-2 ${
                    patient.tag === 'RED' ? 'bg-red-500/20 text-red-500 border-red-500/50' : 
                    patient.tag === 'YELLOW' ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 
                    'bg-green-500/20 text-green-500 border-green-500/50'
                  }`}>
                    {patient.tag}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{patient.id}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Score: {patient.score}</div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-1.5 ${
                  patient.status === 'dispatched' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  {patient.status === 'dispatched' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {patient.status.toUpperCase()}
                </div>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <HospitalIcon className="w-3 h-3" />
                    {patient.hospital}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <MapPin className="w-3 h-3" />
                    {patient.location}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-blue-400 font-mono">{patient.eta}</div>
                  <div className="text-[8px] font-bold text-slate-600 uppercase">ETA</div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Hospital Capacity Dashboard */}
      <div className="bg-[#161920] p-5 rounded-xl border border-slate-800 shrink-0">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Hospital Capacity</h3>
        <div className="flex flex-col gap-4">
          {hospitals.map(h => (
            <div key={h.id} className="group cursor-pointer">
              <div className="flex justify-between text-[10px] mb-1.5">
                <span className="font-bold text-slate-300 group-hover:text-white transition-colors">{h.name}</span>
                <span className={`font-bold ${h.capacity >= 90 ? 'text-red-500' : h.capacity >= 75 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {h.capacity >= 90 ? 'CRITICAL' : `${h.capacity}%`}
                </span>
              </div>
              <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${h.capacity}%` }}
                  className={`h-full rounded-full ${
                    h.capacity >= 90 ? 'bg-red-500' : 
                    h.capacity >= 75 ? 'bg-amber-500' : 
                    'bg-blue-500'
                  }`}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <div className="text-[9px] text-slate-500">+{h.incoming} incoming</div>
                <div className="text-[9px] text-slate-500">{h.availableBeds} beds free</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Detail Modal Overlay */}
      <AnimatePresence>
        {selectedPatient && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0a0c10]/95 backdrop-blur-sm z-50 p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border-2 ${
                  selectedPatient.tag === 'RED' ? 'bg-red-500/20 text-red-500 border-red-500/50' : 
                  selectedPatient.tag === 'YELLOW' ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 
                  'bg-green-500/20 text-green-500 border-green-500/50'
                }`}>
                  {selectedPatient.tag}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white leading-none">{selectedPatient.id}</h2>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{selectedPatient.location}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-[#161920] border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <div className="text-xl font-black text-white font-mono">{selectedPatient.vitals.heartRate}</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase">BPM</div>
              </div>
              <div className="bg-[#161920] border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                <div className="text-xl font-black text-white font-mono">{selectedPatient.vitals.bloodPressure}</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase">BP</div>
              </div>
              <div className="bg-[#161920] border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <Wind className="w-5 h-5 text-green-500" />
                <div className="text-xl font-black text-white font-mono">{selectedPatient.vitals.oxygen}%</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase">SpO2</div>
              </div>
            </div>

            <div className="flex-1 bg-[#161920] border border-slate-800 rounded-2xl p-6 mb-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Dispatch Status</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Ambulance Unit AMB-42</div>
                  <div className="text-xs text-slate-500">Assigned to {selectedPatient.hospital}</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Current Status</span>
                  <span className="text-blue-400 font-bold uppercase tracking-wider">{selectedPatient.status}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Estimated Arrival</span>
                  <span className="text-white font-bold">{selectedPatient.eta}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  handleDispatch(selectedPatient.id);
                  setSelectedPatient(null);
                }}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm tracking-widest uppercase transition-all shadow-lg shadow-blue-600/20"
              >
                Assign & Dispatch
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
