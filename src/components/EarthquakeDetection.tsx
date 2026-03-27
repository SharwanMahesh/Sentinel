import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldAlert, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useDisaster } from '../context/DisasterContext';

type SeismicPacket = {
  deviceId: string;
  timestamp?: number;
  x: number;
  y: number;
  z: number;
  alert?: boolean;
  connectedPeers?: number;
};

type MeshAlertPayload = {
  deviceId?: string;
  timestamp?: number;
  connectedPeers?: number;
  message?: string;
};

declare global {
  interface Window {
    __SENTINEL_NEARBY_SEISMIC__?: {
      subscribe?: (cb: (packet: SeismicPacket) => void) => (() => void) | void;
    };
  }
}

const GRAPH_POINTS = 80;
const ALERT_PROBABILITY = 95;
const PWAVE_PROBABILITY = 70;

export function EarthquakeDetection() {
  const { addEvent, seismicAnomaly } = useDisaster();
  const [data, setData] = useState<any[]>([]);
  const [probability, setProbability] = useState(0);
  const [status, setStatus] = useState<'Monitoring' | 'P-wave Detected' | 'Earthquake Confirmed'>('Monitoring');
  const [nodes, setNodes] = useState(0);
  const [sWaveTimer, setSWaveTimer] = useState<number | null>(null);
  const [lastPacketAt, setLastPacketAt] = useState<number | null>(null);
  const peerIdsRef = useRef<Set<string>>(new Set());
  const tickRef = useRef(0);
  const pWaveEscalationTimerRef = useRef<number | null>(null);

  const isNearbyActive = lastPacketAt ? Date.now() - lastPacketAt < 8000 : false;

  const pushGraphPoint = (packet: SeismicPacket) => {
    const point = {
      time: tickRef.current++,
      x: packet.x,
      y: packet.y,
      z: packet.z,
    };

    setData((prev) => {
      const base = prev.length === 0
        ? Array.from({ length: GRAPH_POINTS - 1 }, (_, i) => ({ time: i, x: 0, y: 0, z: 0 }))
        : prev;
      return [...base.slice(-GRAPH_POINTS + 1), point];
    });
  };

  const evaluatePacket = (packet: SeismicPacket, options?: { forcePWave?: boolean; forceConfirm?: boolean }) => {
    const amplitude = Math.max(Math.abs(packet.x), Math.abs(packet.y), Math.abs(packet.z));
    const amplitudeProbability = Math.min(100, Math.round((amplitude / 12) * 100));
    const packetProbability = options?.forceConfirm
      ? 100
      : options?.forcePWave || packet.alert
        ? Math.max(amplitudeProbability, PWAVE_PROBABILITY + 2)
        : amplitudeProbability;

    setProbability((prev) => {
      const smoothed = Math.round(prev * 0.75 + packetProbability * 0.25);
      if (options?.forceConfirm || smoothed >= ALERT_PROBABILITY) {
        setStatus('Earthquake Confirmed');
        setSWaveTimer((current) => (current === null ? 15 : current));
      } else if (options?.forcePWave || packet.alert || smoothed >= PWAVE_PROBABILITY) {
        setStatus((current) => (current === 'Earthquake Confirmed' ? current : 'P-wave Detected'));
      } else {
        setStatus((current) => (current === 'Earthquake Confirmed' ? current : 'Monitoring'));
      }
      return smoothed;
    });

    peerIdsRef.current.add(packet.deviceId);
    const consensusFromPacket = typeof packet.connectedPeers === 'number' ? packet.connectedPeers : peerIdsRef.current.size;
    setNodes(Math.max(1, Math.min(consensusFromPacket, 5)));
    setLastPacketAt(packet.timestamp ?? Date.now());
    pushGraphPoint(packet);
  };

  const simulatePWaveFromMeshAlert = (payload: MeshAlertPayload) => {
    const sourceId = payload.deviceId || 'MESH-PHONE';
    const consensus = Math.max(2, payload.connectedPeers || 2);
    const now = payload.timestamp ?? Date.now();

    evaluatePacket(
      {
        deviceId: sourceId,
        timestamp: now,
        x: (Math.random() * 2 + 3) * (Math.random() > 0.5 ? 1 : -1),
        y: (Math.random() * 2 + 3) * (Math.random() > 0.5 ? 1 : -1),
        z: (Math.random() * 2 + 3) * (Math.random() > 0.5 ? 1 : -1),
        alert: false,
        connectedPeers: consensus,
      },
      { forcePWave: true },
    );

    if (pWaveEscalationTimerRef.current !== null) {
      window.clearTimeout(pWaveEscalationTimerRef.current);
    }

    // Simulate S-wave arrival shortly after a detected P-wave.
    pWaveEscalationTimerRef.current = window.setTimeout(() => {
      evaluatePacket(
        {
          deviceId: sourceId,
          timestamp: Date.now(),
          x: (Math.random() * 4 + 11) * (Math.random() > 0.5 ? 1 : -1),
          y: (Math.random() * 4 + 11) * (Math.random() > 0.5 ? 1 : -1),
          z: (Math.random() * 4 + 11) * (Math.random() > 0.5 ? 1 : -1),
          alert: true,
          connectedPeers: Math.max(consensus, 3),
        },
        { forceConfirm: true },
      );
      pWaveEscalationTimerRef.current = null;
    }, 4500);
  };

  useEffect(() => {
    if (status === 'Earthquake Confirmed') {
      addEvent({
        type: 'sensor',
        message: 'Seismic event confirmed by 5 nodes. Magnitude estimated at 6.8.',
        severity: 'critical',
      });
    }
  }, [status, addEvent]);

  useEffect(() => {
    // Initialize graph with neutral sensor values.
    const initialData = Array.from({ length: GRAPH_POINTS }, (_, i) => ({
      time: i,
      x: 0,
      y: 0,
      z: 0,
    }));
    setData(initialData);
    tickRef.current = GRAPH_POINTS;
  }, []);

  useEffect(() => {
    // Nearby bridge path for native wrapper integration.
    const unsubscribe = window.__SENTINEL_NEARBY_SEISMIC__?.subscribe?.((packet) => {
      const maybePayload = packet as SeismicPacket & MeshAlertPayload;

      if (typeof maybePayload.message === 'string') {
        const normalizedMessage = maybePayload.message.toUpperCase();
        if (normalizedMessage.includes('EARTHQUAKE') || normalizedMessage.includes('SHAKE') || normalizedMessage.includes('P-WAVE')) {
          simulatePWaveFromMeshAlert(maybePayload);
        }
        return;
      }

      if (!packet || typeof packet.x !== 'number' || typeof packet.y !== 'number' || typeof packet.z !== 'number') {
        return;
      }
      evaluatePacket(packet);
    });

    // Browser event path (useful for testing or websocket adapters).
    const eventHandler = (evt: Event) => {
      const custom = evt as CustomEvent<SeismicPacket>;
      if (!custom.detail) return;
      evaluatePacket(custom.detail);
    };

    const meshAlertHandler = (evt: Event) => {
      const custom = evt as CustomEvent<MeshAlertPayload>;
      if (!custom.detail?.message) return;
      const normalizedMessage = custom.detail.message.toUpperCase();
      if (normalizedMessage.includes('EARTHQUAKE') || normalizedMessage.includes('SHAKE') || normalizedMessage.includes('P-WAVE')) {
        simulatePWaveFromMeshAlert(custom.detail);
      }
    };

    window.addEventListener('sentinel:nearby-seismic', eventHandler as EventListener);
    window.addEventListener('sentinel:mesh-alert', meshAlertHandler as EventListener);

    return () => {
      window.removeEventListener('sentinel:nearby-seismic', eventHandler as EventListener);
      window.removeEventListener('sentinel:mesh-alert', meshAlertHandler as EventListener);
      if (pWaveEscalationTimerRef.current !== null) {
        window.clearTimeout(pWaveEscalationTimerRef.current);
      }
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Fallback simulation or live override when SSE triggers.
    const interval = setInterval(() => {
      const nearbyLive = lastPacketAt ? Date.now() - lastPacketAt < 8000 : false;
      if (nearbyLive || pWaveEscalationTimerRef.current !== null) return;
      
      const isCritical = !!seismicAnomaly;
      const baseAmp = isCritical ? seismicAnomaly.magnitude * 2.5 : 1;
      
      const x = (Math.random() * baseAmp * 2 - baseAmp);
      const y = (Math.random() * baseAmp * 2 - baseAmp);
      const z = (Math.random() * baseAmp * 2 - baseAmp);
      
      evaluatePacket({
        deviceId: isCritical ? 'SENTINEL-SSE-CORE' : 'SIM-LOCAL',
        x,
        y,
        z,
        alert: isCritical,
        connectedPeers: isCritical ? 5 : 1,
      }, isCritical ? { forceConfirm: true } : undefined);
      
      if (!isCritical) {
        setNodes(1);
        setProbability((prev) => Math.max(5, Math.round(prev * 0.6)));
      }
    }, 150);

    return () => clearInterval(interval);
  }, [lastPacketAt, seismicAnomaly]);

  useEffect(() => {
    if (sWaveTimer !== null && sWaveTimer > 0) {
      const timer = setTimeout(() => setSWaveTimer(sWaveTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [sWaveTimer]);

  const probColor = probability < 50 ? 'text-slate-400' : probability < 80 ? 'text-amber-500' : 'text-red-500';
  const probBg = probability < 50 ? 'border-slate-700' : probability < 80 ? 'border-amber-500' : 'border-red-500';

  return (
    <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
      {/* Alert Banner */}
      <div className={`shrink-0 rounded-xl p-4 flex items-center justify-between transition-colors duration-500 ${
        status === 'Monitoring' ? 'bg-slate-800/50 border border-slate-700' :
        status === 'P-wave Detected' ? 'bg-amber-500/20 border border-amber-500/50' :
        'bg-red-500/20 border border-red-500/50'
      }`}>
        <div className="flex items-center gap-4">
          {status === 'Monitoring' ? <Activity className="w-6 h-6 text-slate-400" /> :
           status === 'P-wave Detected' ? <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" /> :
           <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />}
          <div>
            <h2 className={`text-lg font-bold tracking-wider uppercase ${
              status === 'Monitoring' ? 'text-slate-300' :
              status === 'P-wave Detected' ? 'text-amber-500' :
              'text-red-500'
            }`}>{status}</h2>
            <p className="text-xs text-slate-400">
              {status === 'Monitoring' ? 'System active. Awaiting seismic anomalies.' :
               status === 'P-wave Detected' ? 'Anomalous vibrations detected. Verifying with nearby nodes.' :
               'Seismic event confirmed. S-wave imminent.'}
            </p>
          </div>
        </div>
        
        {/* Multi-device confirmation */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Node Consensus {isNearbyActive ? '(Nearby)' : '(Local)'}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                n <= nodes ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-600'
              }`}>
                <Cpu className="w-3.5 h-3.5" />
              </div>
            ))}
          </div>
          <div className="text-xs font-bold text-slate-300">{nodes}/5 Nodes Confirmed</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left: Probability & Timer */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="bg-[#161920] border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center flex-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50"></div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-8 z-10">P-Wave Probability</div>
            
            <div className={`relative w-48 h-48 rounded-full border-4 flex items-center justify-center z-10 transition-colors duration-500 ${probBg} shadow-[0_0_30px_rgba(0,0,0,0.5)]`}>
              {probability > 80 && (
                <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-20"></div>
              )}
              <div className="text-center">
                <div className={`text-5xl font-black tracking-tighter ${probColor}`}>{probability}%</div>
                <div className="text-xs font-medium text-slate-500 mt-2">CONFIDENCE</div>
              </div>
            </div>
          </div>

          {sWaveTimer !== null && (
            <div className={`bg-[#161920] border rounded-2xl p-6 flex flex-col items-center justify-center shrink-0 transition-colors duration-500 ${
              sWaveTimer > 10 ? 'border-green-500/30' : sWaveTimer > 5 ? 'border-amber-500/30' : 'border-red-500/50 bg-red-500/10'
            }`}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">S-Wave Arrival In</div>
              <div className={`text-4xl font-black font-mono ${
                sWaveTimer > 10 ? 'text-green-400' : sWaveTimer > 5 ? 'text-amber-400' : 'text-red-500 animate-pulse'
              }`}>
                00:{sWaveTimer.toString().padStart(2, '0')}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Accelerometer */}
        <div className="col-span-8 bg-[#161920] border border-slate-800 rounded-2xl p-6 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-6 z-10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" /> Live Accelerometer Data
            </h3>
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400"></div> X-Axis</span>
              <span className="flex items-center gap-1.5 text-green-400"><div className="w-2 h-2 rounded-full bg-green-400"></div> Y-Axis</span>
              <span className="flex items-center gap-1.5 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Z-Axis</span>
            </div>
          </div>
          
          <div className="flex-1 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <YAxis domain={[-20, 20]} stroke="#475569" tick={{ fill: '#475569', fontSize: 10 }} />
                <Line type="monotone" dataKey="x" stroke="#f87171" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="y" stroke="#4ade80" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="z" stroke="#60a5fa" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {probability > 80 && (
            <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
          )}
        </div>
      </div>
    </div>
  );
}
