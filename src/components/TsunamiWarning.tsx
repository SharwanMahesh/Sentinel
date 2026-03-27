import React, { useState, useEffect } from 'react';
import { Waves, MapPin, Navigation, AlertTriangle, Users, Clock, ShieldAlert } from 'lucide-react';
import { useDisaster, RiskLevel } from '../context/DisasterContext';

export function TsunamiWarning() {
  const { riskLevel, setRiskLevel, tsunamiAlert } = useDisaster();
  const [timer, setTimer] = useState(18 * 60 + 43); // 18:43

  useEffect(() => {
    if (tsunamiAlert?.active) {
      setTimer(tsunamiAlert.eta * 60);
      if (riskLevel !== 'High') setRiskLevel('High');
    }
  }, [tsunamiAlert, setRiskLevel, riskLevel]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden relative">
      {/* Risk Banner */}
      <div className={`shrink-0 rounded-xl p-6 flex items-center justify-between transition-colors duration-500 ${
        riskLevel === 'High' ? 'bg-red-500/20 border border-red-500/50' :
        riskLevel === 'Moderate' ? 'bg-amber-500/20 border border-amber-500/50' :
        riskLevel === 'Low' ? 'bg-green-500/20 border border-green-500/50' :
        'bg-slate-800/50 border border-slate-700'
      }`}>
        <div className="flex items-center gap-4">
          <Waves className={`w-8 h-8 ${
            riskLevel === 'High' ? 'text-red-500 animate-pulse' :
            riskLevel === 'Moderate' ? 'text-amber-500' :
            riskLevel === 'Low' ? 'text-green-500' :
            'text-slate-400'
          }`} />
          <div>
            <h2 className={`text-2xl font-black tracking-widest uppercase ${
              riskLevel === 'High' ? 'text-red-500' :
              riskLevel === 'Moderate' ? 'text-amber-500' :
              riskLevel === 'Low' ? 'text-green-500' :
              'text-slate-300'
            }`}>TSUNAMI RISK: {riskLevel}</h2>
            <p className="text-sm font-medium text-slate-400 mt-1">
              Epicenter 42km offshore — Depth: 38km
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {['None', 'Low', 'Moderate', 'High'].map((level) => (
            <button 
              key={level} 
              onClick={() => setRiskLevel(level as RiskLevel)}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase border transition-all ${
                riskLevel === level ? 
                  (level === 'High' ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                   level === 'Moderate' ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' :
                   level === 'Low' ? 'bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' :
                   'bg-slate-600 text-white border-slate-500 shadow-[0_0_15px_rgba(71,85,105,0.4)]') :
                'bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-400'
            }`}>
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left: Map & Stats */}
        <div className="col-span-8 flex flex-col gap-6">
          <div className="flex-1 bg-[#161920] border border-slate-800 rounded-2xl relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}></div>
            
            {/* Map Overlay Elements */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Coastal Danger Zone */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-red-500/20 to-transparent border-t border-red-500/30"></div>
              
              {/* Evacuation Routes */}
              <div className="absolute bottom-1/4 left-1/4 flex items-center gap-2 text-blue-400">
                <Navigation className="w-5 h-5 transform -rotate-45" />
                <div className="w-16 h-0.5 bg-blue-400/50 transform -rotate-45 origin-left"></div>
              </div>
              <div className="absolute bottom-1/3 right-1/3 flex items-center gap-2 text-blue-400">
                <Navigation className="w-5 h-5 transform -rotate-45" />
                <div className="w-24 h-0.5 bg-blue-400/50 transform -rotate-45 origin-left"></div>
              </div>

              {/* Safe Shelters */}
              <div className="absolute top-1/4 left-1/3 flex flex-col items-center">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                  <ShieldAlert className="w-3 h-3 text-white" />
                </div>
                <div className="bg-slate-900/80 px-2 py-1 rounded text-[9px] font-bold text-white mt-1 border border-slate-700">SHELTER ALPHA</div>
              </div>
              <div className="absolute top-1/3 right-1/4 flex flex-col items-center">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                  <ShieldAlert className="w-3 h-3 text-white" />
                </div>
                <div className="bg-slate-900/80 px-2 py-1 rounded text-[9px] font-bold text-white mt-1 border border-slate-700">SHELTER BRAVO</div>
              </div>
            </div>

            <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-xl">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Affected Zone Radius</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Evacuation Zone</div>
                    <div className="text-sm font-bold text-white">2.4km from coastline</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Estimated Population</div>
                    <div className="text-sm font-bold text-white">~12,400 people</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Timer & Action */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center flex-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50"></div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 z-10 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Wave Arrival Time
            </div>
            
            <div className={`text-6xl font-black font-mono tracking-tighter z-10 ${
              timer > 300 ? 'text-amber-400' : 'text-red-500 animate-pulse'
            }`}>
              {formatTime(timer)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-4 z-10">MINUTES : SECONDS TO COAST</div>
            
            {timer <= 300 && (
              <div className="mt-6 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase animate-pulse z-10">
                WAVE ARRIVING — SEEK HIGH GROUND
              </div>
            )}
          </div>

          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-6 shrink-0">
            <button 
              className={`w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all shadow-lg ${
                riskLevel === 'Moderate' || riskLevel === 'High' 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              disabled={riskLevel === 'None' || riskLevel === 'Low'}
            >
              Push Evacuation Routes to Phones in Area
            </button>
            <div className="mt-4 text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Delivery Progress</div>
              <div className="text-xs font-medium text-slate-400 mt-1">Sent to 247 devices in range</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
