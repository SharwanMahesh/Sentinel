import React, { useState } from 'react';
import { Siren, MapPin, Clock, ShieldAlert, Activity, HeartPulse, Bed, Truck, CheckCircle2, XCircle, Loader2, BookOpen, Cpu } from 'lucide-react';
import { useDisaster } from '../context/DisasterContext';
import { getDisasterReport } from '../services/backendApi';

export function EmergencySOS() {
  const { 
    broadcastAlert, 
    hospitals: globalHospitals, 
    seismicAnomaly, 
    tsunamiAlert, 
    updateHospital, 
    nlpReport, 
    setNlpReport,
    patients 
  } = useDisaster();
  
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [casualties, setCasualties] = useState('50-200');
  const [injuryType, setInjuryType] = useState('Trauma');
  const [secondaryRisk, setSecondaryRisk] = useState('Structural collapse');
  const [alertText, setAlertText] = useState('');
  const [hospitalSort, setHospitalSort] = useState<'distance' | 'capacity'>('distance');

  // Auto-fill logic based on live anomalies
  React.useEffect(() => {
    if (seismicAnomaly) {
      const text = `DISASTER TYPE: Earthquake M${seismicAnomaly.magnitude}
LOCATION: Epicenter [${seismicAnomaly.epicenter.join(', ')}]
TSUNAMI WARNING: ${tsunamiAlert?.active ? 'YES' : 'NO'} ${tsunamiAlert?.active ? `— ${tsunamiAlert.eta} min ETA` : ''}
TIMESTAMP: ${new Date(seismicAnomaly.timestamp).toLocaleString()}
AUTOMATED SYSTEM PRIORITY: CRITICAL`;
      setAlertText(text);
      
      if (seismicAnomaly.magnitude > 7) {
        setCasualties('500+');
        setInjuryType('Multiple');
      } else if (seismicAnomaly.magnitude > 6) {
        setCasualties('200-500');
        setInjuryType('Trauma');
      }

      if (tsunamiAlert?.active) {
        setSecondaryRisk('Flooding');
      }
    } else {
      setAlertText(`STATUS: SYSTEM READY
NO ACTIVE ANOMALIES DETECTED
MONITORING P-WAVE NETWORKS...`);
    }
  }, [seismicAnomaly, tsunamiAlert]);

  const handleBroadcast = async () => {
    setBroadcastStatus('sending');
    
    // Logic: Identify nearby hospitals and reserve capacity
    if (seismicAnomaly) {
      const [latE, lngE] = seismicAnomaly.epicenter;
      
      // Calculate distance and reserve beds at top 3 closest
      const sortedHospitals = [...globalHospitals]
        .map(h => {
          const dist = Math.sqrt(Math.pow(h.lat - latE, 2) + Math.pow(h.lng - lngE, 2));
          return { ...h, dist };
        })
        .sort((a, b) => a.dist - b.dist);

      const affected = sortedHospitals.slice(0, 3);
      affected.forEach(h => {
        // Reserve 20% of beds or 50 beds (whichever is less)
        const reservation = Math.min(50, Math.floor(h.availableBeds * 0.2));
        updateHospital(h.id, { 
          availableBeds: h.availableBeds - reservation,
          capacity: Math.round(((h.totalBeds - (h.availableBeds - reservation)) / h.totalBeds) * 100)
        });
      });

      // Generate AI NLP Report
      try {
        const report = await getDisasterReport({
          epicenter: seismicAnomaly.epicenter,
          magnitude: seismicAnomaly.magnitude,
          affectedHospitalsCount: affected.length
        });
        setNlpReport(report.summary);
      } catch (err) {
        console.error("AI Report error:", err);
      }
    }

    broadcastAlert(alertText || "Manual Emergency Request Issued", 'critical');
    setTimeout(() => setBroadcastStatus('sent'), 2500);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left: Composer & Resources */}
        <div className="col-span-5 flex flex-col gap-6 overflow-hidden">
          {/* Auto-Filled Alert Message Composer */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 flex flex-col shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Siren className="w-4 h-4 text-red-500" /> Auto-Filled Alert Message
            </h3>
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex-1">
              <textarea 
                className="w-full h-full bg-transparent text-slate-300 text-sm resize-none focus:outline-none font-mono"
                value={alertText}
                onChange={(e) => setAlertText(e.target.value)}
              />
            </div>
            <div className="text-right text-[10px] font-bold text-slate-500 mt-2">142/500 CHARACTERS</div>
          </div>

          {/* Emergency Resource Request Panel */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 flex flex-col flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-blue-500" /> Resource Request Parameters
            </h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Estimated Casualties</label>
                <select 
                  value={casualties}
                  onChange={(e) => setCasualties(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500"
                >
                  <option>0–50</option>
                  <option>50–200</option>
                  <option>200–500</option>
                  <option>500+</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Primary Injury Type</label>
                <select 
                  value={injuryType}
                  onChange={(e) => setInjuryType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500"
                >
                  <option>Trauma</option>
                  <option>Crush</option>
                  <option>Burn</option>
                  <option>Respiratory</option>
                  <option>Multiple</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Secondary Risk</label>
                <select 
                  value={secondaryRisk}
                  onChange={(e) => setSecondaryRisk(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500"
                >
                  <option>Flooding</option>
                  <option>Gas leak</option>
                  <option>Structural collapse</option>
                  <option>None</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">System Auto-Calculation</div>
              <div className="text-xs text-slate-300">Resource needs per hospital updated based on selections.</div>
            </div>
          </div>
        </div>

        {/* Right: Hospitals & Tracker */}
        <div className="col-span-7 flex flex-col gap-6 overflow-hidden">
          {/* Nearby Hospitals List */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 flex flex-col flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bed className="w-4 h-4 text-green-500" /> Nearby Hospitals (50km)
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setHospitalSort('distance')}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${hospitalSort === 'distance' ? 'text-slate-400 bg-slate-800' : 'text-slate-500 hover:text-white'}`}
                >
                  Sort: Distance
                </button>
                <button 
                  onClick={() => setHospitalSort('capacity')}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${hospitalSort === 'capacity' ? 'text-slate-400 bg-slate-800' : 'text-slate-500 hover:text-white'}`}
                >
                  Sort: Capacity
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
              {[...globalHospitals]
                .map(h => {
                  if (seismicAnomaly) {
                    const [latE, lngE] = seismicAnomaly.epicenter;
                    const d = Math.sqrt(Math.pow(h.lat - latE, 2) + Math.pow(h.lng - lngE, 2)) * 111; // Approx km
                    return { ...h, displayDist: d.toFixed(1) };
                  }
                  return { ...h, displayDist: (1.2 + Math.random() * 5).toFixed(1) };
                })
                .sort((a, b) => {
                  if (hospitalSort === 'capacity') {
                    return a.capacity - b.capacity;
                  }
                  return Number(a.displayDist) - Number(b.displayDist);
                })
                .slice(0, 15) // Show top 15 nearest/relevant
                .map((h, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-200 text-sm">{h.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      h.capacity > 80 ? 'bg-red-500/20 text-red-400' :
                      h.capacity > 50 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>{h.capacity}% Full</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {h.displayDist} km</span>
                    <div className="flex gap-1">
                      {['ICU', 'Trauma'].map(t => (
                        <span key={t} className="bg-slate-800 text-[9px] px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                    Auto-Route Strategy: {h.capacity > 80 ? 'Overflow Diversion' : h.capacity > 60 ? 'Triage Support' : 'Primary Reception'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Triage Overview Grid */}
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-red-500" /> Regional Victim Triage
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'RED', color: 'text-red-400', bg: 'bg-red-500/10', count: patients.filter(p => p.tag === 'RED').length },
                { label: 'YELLOW', color: 'text-amber-400', bg: 'bg-amber-500/10', count: patients.filter(p => p.tag === 'YELLOW').length },
                { label: 'GREEN', color: 'text-green-400', bg: 'bg-green-500/10', count: patients.filter(p => p.tag === 'GREEN').length }
              ].map((item) => (
                <div key={item.label} className={`${item.bg} border border-white/5 rounded-xl p-3 text-center`}>
                  <div className={`text-[9px] font-black ${item.color} uppercase mb-1`}>{item.label}</div>
                  <div className="text-xl font-black text-white">{String(item.count).padStart(2, '0')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Status Tracker */}
          {broadcastStatus !== 'idle' && (
            <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-blue-500" /> Delivery Status Tracker
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <div>
                    <div className="text-xl font-bold text-white">{broadcastStatus === 'sent' ? '23' : '8'}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Acknowledged</div>
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                  {broadcastStatus === 'sending' ? <Loader2 className="w-6 h-6 text-amber-500 animate-spin" /> : <Clock className="w-6 h-6 text-amber-500" />}
                  <div>
                    <div className="text-xl font-bold text-white">{broadcastStatus === 'sent' ? '15' : '30'}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Pending</div>
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <div className="text-xl font-bold text-white">{broadcastStatus === 'sent' ? '9' : '0'}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI NLP Impact Report */}
          {nlpReport && (
            <div className="bg-[#161920] border border-blue-500/30 rounded-2xl p-6 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BookOpen className="w-24 h-24 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 mb-4 relative z-10">
                <Cpu className="w-4 h-4" /> AI Situation Executive Summary
              </h3>
              <div className="text-xs leading-relaxed text-slate-300 whitespace-pre-line relative z-10">
                {nlpReport}
              </div>
            </div>
          )}

          {/* Broadcast Button */}
          <button 
            onClick={handleBroadcast}
            disabled={broadcastStatus === 'sending'}
            className={`w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all shadow-lg shrink-0 ${
              broadcastStatus === 'sending' ? 'bg-slate-700 text-slate-400 cursor-not-allowed' :
              broadcastStatus === 'sent' ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.4)]' :
              'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
            }`}
          >
            {broadcastStatus === 'sending' ? 'BROADCASTING...' : 
             broadcastStatus === 'sent' ? 'BROADCAST SENT — SEND UPDATE' : 
             `BROADCAST ALERT TO ${globalHospitals.length} HOSPITALS`}
          </button>
        </div>
      </div>
    </div>
  );
}
