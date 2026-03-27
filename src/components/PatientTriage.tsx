import React, { useState, useEffect } from 'react';
import { MapPin, Mic, Activity, AlertCircle, CheckCircle2, Loader2, Save, Stethoscope, Map } from 'lucide-react';
import { useDisaster } from '../context/DisasterContext';

const SYMPTOMS = [
  'Heavy Breathing / Labored',
  'Not Walking / Immobile',
  'Severe Uncontrolled Bleeding',
  'Unconscious / Unresponsive',
  'Crush Injury',
  'Trapped Under Debris',
  'Burn Injury',
  'Cardiac Event'
];

type TriageResult = {
  score: number;
  tag: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
  confidence: number;
} | null;

export function PatientTriage() {
  const { 
    addPatient, 
    patients, 
    setLatestTriageSignal, 
    latestVoiceTriageSignal, 
    hospitals,
    seismicAnomaly,
    updatePatient 
  } = useDisaster();
  
  const [patientId, setPatientId] = useState('PT-8492');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [age, setAge] = useState('');
  const [consciousness, setConsciousness] = useState<'CONSCIOUS' | 'UNCONSCIOUS'>('CONSCIOUS');
  const [bleeding, setBleeding] = useState('None');
  const [mobility, setMobility] = useState('Unknown');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult>(null);
  const [lastVoiceSyncAt, setLastVoiceSyncAt] = useState('');

  useEffect(() => {
    setLatestTriageSignal({
      selectedSymptoms,
      notes,
      age,
      consciousness,
      bleeding,
      mobility,
    });
  }, [selectedSymptoms, notes, age, consciousness, bleeding, mobility, setLatestTriageSignal]);

  useEffect(() => {
    if (!latestVoiceTriageSignal.updatedAt || latestVoiceTriageSignal.updatedAt === lastVoiceSyncAt) {
      return;
    }

    setSelectedSymptoms(latestVoiceTriageSignal.selectedSymptoms);
    setNotes(latestVoiceTriageSignal.notes.slice(0, 500));
    setAge(latestVoiceTriageSignal.age);
    setConsciousness(latestVoiceTriageSignal.consciousness);
    setBleeding(latestVoiceTriageSignal.bleeding);
    setMobility(latestVoiceTriageSignal.mobility);
    setLastVoiceSyncAt(latestVoiceTriageSignal.updatedAt);
  }, [latestVoiceTriageSignal, lastVoiceSyncAt]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTriageResult(null);
    
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      
      // Calculate a mock score based on inputs
      let score = 20; // Base score
      if (consciousness === 'UNCONSCIOUS') score += 25;
      if (selectedSymptoms.some(s => s.includes('Breathing'))) score += 20;
      if (bleeding === 'Severe') score += 15;
      if (mobility === 'Immobile') score += 10;
      if (selectedSymptoms.includes('Cardiac Event')) score += 40;
      
      score = Math.min(score, 100);
      
      let tag: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK' = 'GREEN';
      if (score >= 90) tag = 'RED';
      else if (score >= 60) tag = 'YELLOW';
      else if (score >= 30) tag = 'GREEN';
      else tag = 'BLACK'; // In a real scenario, BLACK might have specific criteria

      setTriageResult({
        score,
        tag,
        confidence: 94
      });
    }, 2000);
  };

  const handleSaveAndNext = () => {
    if (triageResult) {
      // Logic: Pick best hospital from the 150+ dataset
      let assignedHospital = hospitals[0];
      
      if (seismicAnomaly && hospitals.length > 0) {
        // Nearest to epicenter
        const [latE, lngE] = seismicAnomaly.epicenter;
        assignedHospital = [...hospitals]
          .map(h => ({ ...h, dist: Math.sqrt(Math.pow(h.lat - latE, 2) + Math.pow(h.lng - lngE, 2)) }))
          .sort((a, b) => a.dist - b.dist)[0];
      } else if (hospitals.length > 0) {
        // Most available beds
        assignedHospital = [...hospitals].sort((a, b) => b.availableBeds - a.availableBeds)[0];
      }

      addPatient({
        score: triageResult.score,
        tag: triageResult.tag,
        hospital: assignedHospital?.name || 'Emergency Medical Center',
        eta: `${8 + Math.floor(Math.random() * 12)} min`,
        status: 'awaiting',
        location: seismicAnomaly ? `${seismicAnomaly.epicenter[0].toFixed(3)}°N, ${seismicAnomaly.epicenter[1].toFixed(3)}°E` : '12.927°N, 80.128°E',
        vitals: {
          heartRate: 100 + Math.floor(Math.random() * 20),
          bloodPressure: triageResult.tag === 'RED' ? '90/60' : '120/80',
          oxygen: triageResult.tag === 'RED' ? 88 : 95
        }
      });
    }

    setPatientId(`PT-${Math.floor(1000 + Math.random() * 9000)}`);
    setSelectedSymptoms([]);
    setNotes('');
    setAge('');
    setConsciousness('CONSCIOUS');
    setBleeding('None');
    setMobility('Unknown');
    setTriageResult(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0c10]">
      {/* Top Section: Patient ID & GPS */}
      <div className="shrink-0 bg-[#161920] border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg font-mono font-bold border border-blue-500/30">
            {patientId}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MapPin className="w-4 h-4 text-slate-500" />
            <div>
              <div className="font-mono text-slate-300">
                {seismicAnomaly ? `${seismicAnomaly.epicenter[0].toFixed(4)}°N, ${seismicAnomaly.epicenter[1].toFixed(4)}°E` : '12.9274°N, 80.1283°E'}
              </div>
              <div>{seismicAnomaly ? 'Simulation Epicenter Proximity' : 'Accuracy: ±8 metres'}</div>
            </div>
          </div>
        </div>
        <div className="w-24 h-10 bg-slate-800 rounded border border-slate-700 overflow-hidden relative flex items-center justify-center">
          <Map className="w-4 h-4 text-slate-600 absolute" />
          <div className="w-2 h-2 bg-blue-500 rounded-full absolute z-10 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          
          {/* Quick Symptom Selector */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Symptom Selector</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SYMPTOMS.map(symptom => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${
                    selectedSymptoms.includes(symptom)
                      ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : 'bg-[#161920] border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </section>

          {/* Free-Text Input */}
          <section>
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Notes</h3>
              <span className="text-[10px] font-mono text-slate-500">{notes.length} / 500</span>
            </div>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                placeholder="Describe patient condition in your own words..."
                className="w-full h-24 bg-[#161920] border border-slate-800 rounded-xl p-4 text-sm text-slate-300 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
              />
              <button className="absolute bottom-3 right-3 p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Structured Clinical Fields */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Structured Vitals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#161920] border border-slate-800 rounded-xl p-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Age (Optional)</label>
                <input 
                  type="text" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 35, 30-40, Young, Old"
                  className="w-full bg-transparent text-white font-mono text-lg focus:outline-none"
                />
              </div>
              
              <div className="bg-[#161920] border border-slate-800 rounded-xl p-3 flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Consciousness</label>
                <div className="flex bg-slate-900 rounded-lg p-1 mt-auto">
                  <button 
                    onClick={() => setConsciousness('CONSCIOUS')}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${consciousness === 'CONSCIOUS' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                  >
                    CONSCIOUS
                  </button>
                  <button 
                    onClick={() => setConsciousness('UNCONSCIOUS')}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${consciousness === 'UNCONSCIOUS' ? 'bg-red-500/20 text-red-400' : 'text-slate-500'}`}
                  >
                    UNCONSCIOUS
                  </button>
                </div>
              </div>

              <div className="bg-[#161920] border border-slate-800 rounded-xl p-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Bleeding</label>
                <select 
                  value={bleeding}
                  onChange={(e) => setBleeding(e.target.value)}
                  className="w-full bg-transparent text-white text-sm focus:outline-none appearance-none"
                >
                  <option className="bg-slate-900">None</option>
                  <option className="bg-slate-900">Minor</option>
                  <option className="bg-slate-900">Moderate</option>
                  <option className="bg-slate-900">Severe</option>
                </select>
              </div>

              <div className="bg-[#161920] border border-slate-800 rounded-xl p-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Mobility</label>
                <select 
                  value={mobility}
                  onChange={(e) => setMobility(e.target.value)}
                  className="w-full bg-transparent text-white text-sm focus:outline-none appearance-none"
                >
                  <option className="bg-slate-900">Walking</option>
                  <option className="bg-slate-900">Assisted</option>
                  <option className="bg-slate-900">Immobile</option>
                  <option className="bg-slate-900">Unknown</option>
                </select>
              </div>
            </div>
          </section>

          {/* Analyze Button */}
          {!triageResult && (
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-5 rounded-xl font-black text-lg tracking-widest uppercase transition-all shadow-lg bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  ANALYZING WITH AI...
                </>
              ) : (
                <>
                  <Activity className="w-6 h-6" />
                  ANALYZE PATIENT
                </>
              )}
            </button>
          )}

          {triageResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row gap-6">
              {/* Triage Badge */}
              <div className={`shrink-0 w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center relative ${
                triageResult.tag === 'RED' ? 'border-red-500 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.4)]' :
                triageResult.tag === 'YELLOW' ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]' :
                triageResult.tag === 'GREEN' ? 'border-green-500 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.2)]' :
                'border-slate-700 bg-slate-800 shadow-[0_0_30px_rgba(51,65,85,0.4)]'
              }`}>
                {triageResult.tag === 'RED' && (
                  <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-20"></div>
                )}
                <div className={`text-6xl font-black tracking-tighter ${
                  triageResult.tag === 'RED' ? 'text-red-500' :
                  triageResult.tag === 'YELLOW' ? 'text-amber-500' :
                  triageResult.tag === 'GREEN' ? 'text-green-500' :
                  'text-slate-400'
                }`}>
                  {triageResult.score}
                </div>
                <div className={`text-xl font-bold tracking-widest mt-1 ${
                  triageResult.tag === 'RED' ? 'text-red-400' :
                  triageResult.tag === 'YELLOW' ? 'text-amber-400' :
                  triageResult.tag === 'GREEN' ? 'text-green-400' :
                  'text-slate-500'
                }`}>
                  {triageResult.tag}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-2">
                  {triageResult.confidence}% CONFIDENCE
                </div>
              </div>

              {/* Hospital Assignment Card */}
              <div className="flex-1 bg-[#161920] border border-slate-800 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
                
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Auto-Assigned Destination</h3>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">
                      {patients.length > 0 ? patients[patients.length - 1].hospital : 'Searching...'}
                    </h4>
                    <div className="text-sm text-slate-400">Trauma Department • Bay 4</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-blue-400 font-mono">
                      {patients.length > 0 ? patients[patients.length - 1].eta : '-- MIN'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">ETA</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg mb-4 w-fit">
                  <CheckCircle2 className="w-4 h-4" />
                  HOSPITAL NOTIFIED
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Treatment Prep Instruction</div>
                  <p className="text-sm text-slate-300">
                    Prepare trauma team, massive transfusion protocol standby. Ensure immediate access to CT scanner.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="shrink-0 bg-[#161920] border-t border-slate-800 p-4 flex items-center justify-between">
        <div className="text-xs font-bold text-slate-500">
          Patient {patients.length} logged in current session
        </div>
        <button 
          onClick={handleSaveAndNext}
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm tracking-widest uppercase transition-colors flex items-center gap-2 border border-slate-700"
        >
          <Save className="w-4 h-4" />
          SAVE & NEXT PATIENT
        </button>
      </div>
    </div>
  );
}
