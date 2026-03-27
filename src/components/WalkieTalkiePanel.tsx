import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Loader2, Mic, Send, X } from 'lucide-react';
import { useDisaster } from '../context/DisasterContext';

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: (event: Event) => void;
  onspeechstart?: (event: Event) => void;
  onspeechend?: (event: Event) => void;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => SpeechRecognition;

type PriorityResult = {
  score: number;
  tag: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
  confidence: number;
  matchedSymptoms: string[];
  hospitalName: string;
  eta: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: RecognitionCtor;
    SpeechRecognition?: RecognitionCtor;
  }
}


const SYMPTOM_RULES = [
  { label: 'chest pain', weight: 28, patterns: [/chest pain/i, /crushing pain/i, /cardiac/i] },
  { label: 'sweating', weight: 10, patterns: [/sweating/i, /clammy/i, /diaphoretic/i] },
  { label: 'cannot stand', weight: 15, patterns: [/cannot stand/i, /can\'?t stand/i, /immobile/i, /not walking/i] },
  { label: 'heavy breathing', weight: 18, patterns: [/heavy breathing/i, /labored breathing/i, /shortness of breath/i] },
  { label: 'unconscious', weight: 30, patterns: [/unconscious/i, /unresponsive/i, /not responding/i] },
  { label: 'bleeding', weight: 18, patterns: [/severe bleeding/i, /uncontrolled bleeding/i, /bleeding heavily/i] },
  { label: 'injury', weight: 12, patterns: [/injury/i, /crush injury/i, /burn injury/i, /debris/i] },
];

const TRIAGE_SYMPTOM_EXTRACTORS = [
  { value: 'Heavy Breathing / Labored', patterns: [/heavy breathing/i, /labored breathing/i, /shortness of breath/i] },
  { value: 'Not Walking / Immobile', patterns: [/cannot stand/i, /can\'?t stand/i, /not walking/i, /immobile/i] },
  { value: 'Severe Uncontrolled Bleeding', patterns: [/severe bleeding/i, /uncontrolled bleeding/i, /bleeding heavily/i] },
  { value: 'Unconscious / Unresponsive', patterns: [/unconscious/i, /unresponsive/i, /not responding/i] },
  { value: 'Crush Injury', patterns: [/crush injury/i] },
  { value: 'Trapped Under Debris', patterns: [/trapped under debris/i, /under debris/i, /trapped/i] },
  { value: 'Burn Injury', patterns: [/burn injury/i, /burned/i, /burns/i] },
  { value: 'Cardiac Event', patterns: [/chest pain/i, /cardiac/i, /heart attack/i, /crushing pain/i] },
];

export function WalkieTalkiePanel() {
  const { 
    patients, 
    hospitals, 
    addPatient, 
    removePatient,
    addEvent, 
    latestTriageSignal, 
    setLatestVoiceTriageSignal,
    seismicAnomaly,
    updatePatient 
  } = useDisaster();

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'searching' | 'disconnected'>('searching');
  const [activeTab, setActiveTab] = useState<'transcription' | 'capacity' | 'analyzed'>('transcription');
  const [transcription, setTranscription] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageResult, setTriageResult] = useState<PriorityResult | null>(null);
  const [responsePreview, setResponsePreview] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const keepListeningRef = useRef(false);
  const finalTranscriptRef = useRef('');



  const speechSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionStatus(speechSupported ? 'connected' : 'disconnected');
    }, 800);
    return () => clearTimeout(timer);
  }, [speechSupported]);

  useEffect(() => {
    if (!speechSupported) {
      return;
    }

    const Ctor = (window.SpeechRecognition || window.webkitSpeechRecognition) as RecognitionCtor;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsMicActive(true);
    };

    recognition.onspeechstart = () => {
      setIsSpeechDetected(true);
    };

    recognition.onspeechend = () => {
      setIsSpeechDetected(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const fragment = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) {
          finalChunk += `${fragment} `;
        } else {
          interimChunk += fragment;
        }
      }

      if (finalChunk.trim()) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalChunk}`.trim();
      }

      setTranscription(`${finalTranscriptRef.current} ${interimChunk}`.trim());
    };

    recognition.onerror = () => {
      setIsSpeechDetected(false);
    };

    recognition.onend = () => {
      setIsSpeechDetected(false);
      if (keepListeningRef.current) {
        recognition.start();
      } else {
        setIsMicActive(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      keepListeningRef.current = false;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [speechSupported]);

  const toggleMic = () => {
    if (!recognitionRef.current || connectionStatus !== 'connected') {
      return;
    }

    setActiveTab('transcription');

    if (isMicActive) {
      keepListeningRef.current = false;
      recognitionRef.current.stop();
      return;
    }

    finalTranscriptRef.current = transcription;
    keepListeningRef.current = true;
    recognitionRef.current.start();
  };

  const extractAge = (text: string): string => {
    if (/middle\s*aged|middle-aged/i.test(text)) {
      return '30-40';
    }
    if (/\byoung\b/i.test(text)) {
      return '10';
    }
    if (/\bold\b|elderly|senior/i.test(text)) {
      return 'Old';
    }

    const match = text.match(/\b(age\s*)?(\d{1,2})\b/i);
    if (match?.[2]) {
      return match[2];
    }
    return '';
  };

  const extractVoiceTriageSignal = (text: string) => {
    const selectedSymptoms = TRIAGE_SYMPTOM_EXTRACTORS
      .filter((item) => item.patterns.some((pattern) => pattern.test(text)))
      .map((item) => item.value);

    let consciousness: 'CONSCIOUS' | 'UNCONSCIOUS' = 'CONSCIOUS';
    if (/unconscious|unresponsive|not responding/i.test(text)) {
      consciousness = 'UNCONSCIOUS';
    } else if (/conscious|responsive|alert/i.test(text)) {
      consciousness = 'CONSCIOUS';
    }

    let bleeding = 'None';
    if (/severe bleeding|uncontrolled bleeding|bleeding heavily/i.test(text)) {
      bleeding = 'Severe';
    } else if (/moderate bleeding/i.test(text)) {
      bleeding = 'Moderate';
    } else if (/minor bleeding|light bleeding/i.test(text)) {
      bleeding = 'Minor';
    }

    let mobility = 'Unknown';
    if (/cannot stand|can\'?t stand|immobile|not walking/i.test(text)) {
      mobility = 'Immobile';
    } else if (/assisted|with help/i.test(text)) {
      mobility = 'Assisted';
    } else if (/walking|ambulatory|can walk/i.test(text)) {
      mobility = 'Walking';
    }

    return {
      selectedSymptoms,
      notes: text.slice(0, 500),
      age: extractAge(text),
      consciousness,
      bleeding,
      mobility,
    };
  };

  useEffect(() => {
    if (!transcription.trim()) {
      return;
    }

    setLatestVoiceTriageSignal(extractVoiceTriageSignal(transcription));
  }, [transcription, setLatestVoiceTriageSignal]);

  const computePriority = (text: string): PriorityResult => {
    const triageText = [
      text,
      latestTriageSignal.notes,
      latestTriageSignal.selectedSymptoms.join(' '),
      latestTriageSignal.consciousness,
      latestTriageSignal.bleeding,
      latestTriageSignal.mobility,
    ].join(' ');

    let score = 20;
    const matchedSymptoms: string[] = [];

    SYMPTOM_RULES.forEach((rule) => {
      if (rule.patterns.some((pattern) => pattern.test(triageText))) {
        score += rule.weight;
        matchedSymptoms.push(rule.label);
      }
    });

    if (latestTriageSignal.consciousness === 'UNCONSCIOUS') {
      score += 25;
      matchedSymptoms.push('unconscious (structured)');
    }
    if (latestTriageSignal.bleeding === 'Severe') {
      score += 15;
      matchedSymptoms.push('severe bleeding (structured)');
    }
    if (latestTriageSignal.mobility === 'Immobile') {
      score += 12;
      matchedSymptoms.push('immobile (structured)');
    }

    score = Math.min(100, score);

    let tag: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK' = 'GREEN';
    if (score >= 85) tag = 'RED';
    else if (score >= 60) tag = 'YELLOW';
    else if (score >= 30) tag = 'GREEN';
    else tag = 'BLACK';

    const confidence = Math.min(98, 72 + matchedSymptoms.length * 4);
    
    // Logic: Proximity if anomaly, else capacity
    let sortedHospitals = [...hospitals];
    if (seismicAnomaly) {
      const [latE, lngE] = seismicAnomaly.epicenter;
      sortedHospitals = sortedHospitals
        .map(h => ({ ...h, dist: Math.sqrt(Math.pow(h.lat - latE, 2) + Math.pow(h.lng - lngE, 2)) }))
        .sort((a, b) => a.dist - b.dist);
    } else {
      sortedHospitals = sortedHospitals.sort((a, b) => b.availableBeds - a.availableBeds);
    }

    const preferredHospital = sortedHospitals.find((h) => h.capacity < 95) || hospitals[0];
    const etaMinutes = 8 + Math.floor(Math.random() * 8);

    return {
      score,
      tag,
      confidence,
      matchedSymptoms,
      hospitalName: preferredHospital?.name ?? 'Nearest Hospital',
      eta: `${etaMinutes} min`,
    };
  };

  const handleAnalyze = () => {
    if (!transcription.trim()) {
      return;
    }

    setIsAnalyzing(true);
    setTriageResult(null);

    setTimeout(() => {
      setLatestVoiceTriageSignal(extractVoiceTriageSignal(transcription));
      const result = computePriority(transcription);
      setTriageResult(result);

      addPatient({
        score: result.score,
        tag: result.tag,
        hospital: result.hospitalName,
        eta: result.eta,
        status: 'awaiting',
        location: seismicAnomaly 
          ? `${seismicAnomaly.epicenter[0].toFixed(3)}°N, ${seismicAnomaly.epicenter[1].toFixed(3)}°E` 
          : '12.927°N, 80.128°E',
        vitals: {
          heartRate: 98 + Math.floor(Math.random() * 25),
          bloodPressure: result.tag === 'RED' ? '95/60' : '118/76',
          oxygen: result.tag === 'RED' ? 89 : 95,
        },
      });

      setResponsePreview(
        `Patient triaged ${result.tag} with score ${result.score}. Matched symptoms: ${result.matchedSymptoms.join(', ') || 'none'}. Route to ${result.hospitalName}. ETA ${result.eta}.`
      );

      addEvent({
        type: 'dispatch',
        severity: result.tag === 'RED' ? 'critical' : result.tag === 'YELLOW' ? 'warning' : 'info',
        message: `Voice triage complete: ${result.tag} (${result.score}) from live walkie transmission.`,
      });

      setIsAnalyzing(false);
      setActiveTab('dispatch');
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c10] text-slate-300 p-6 gap-6 overflow-hidden">
      <div className="flex items-center justify-between bg-[#161920] p-4 rounded-xl border border-slate-800">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Walkie-Talkie Connection</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${connectionStatus === 'connected' ? 'bg-green-500/10 text-green-400' : connectionStatus === 'searching' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'searching' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
          {connectionStatus.toUpperCase()}
        </div>
      </div>

      <div className="bg-[#161920] p-6 rounded-xl border border-slate-800 flex flex-col items-center gap-4">
        <button
          onClick={toggleMic}
          disabled={!speechSupported || connectionStatus !== 'connected'}
          className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${isMicActive ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.25)]' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
          title={speechSupported ? 'Start or stop microphone' : 'Speech recognition not supported in this browser'}
        >
          <Mic className="w-8 h-8" />
        </button>

        <div className="flex items-center gap-1 h-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${isSpeechDetected ? 'bg-green-500 h-full animate-pulse' : 'bg-slate-700 h-3'}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            ></div>
          ))}
        </div>

        <p className="text-sm font-medium text-slate-400">
          {isSpeechDetected ? 'Listening for transmission...' : 'Listening idle'}
        </p>
      </div>

      <div className="bg-[#161920] p-2 rounded-xl border border-slate-800 grid grid-cols-3 gap-2">
        <button onClick={() => setActiveTab('transcription')} className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${activeTab === 'transcription' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
          Transcription
        </button>
        <button onClick={() => setActiveTab('capacity')} className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${activeTab === 'capacity' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
          Capacity ({hospitals.length})
        </button>
        <button onClick={() => setActiveTab('analyzed')} className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${activeTab === 'analyzed' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
          Analyzed Patients ({patients.length})
        </button>
      </div>

      {activeTab === 'transcription' && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <textarea
            value={transcription}
            onChange={(e) => {
              const next = e.target.value;
              finalTranscriptRef.current = next;
              setTranscription(next);
            }}
            placeholder="Press the mic button and start speaking..."
            className="flex-1 w-full bg-[#161920] border border-slate-800 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
          />

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !transcription.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
            {isAnalyzing ? 'ANALYZING...' : 'ANALYZE THIS PATIENT'}
          </button>
        </div>
      )}



      {activeTab === 'capacity' && (
        <div className="flex-1 min-h-0 bg-[#161920] border border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Hospital Capacity</h3>
          <div className="space-y-4">
            {hospitals.map((hospital) => (
              <div key={hospital.id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-bold text-slate-200">{hospital.name}</span>
                  <span className={`${hospital.capacity >= 90 ? 'text-red-400' : hospital.capacity >= 75 ? 'text-amber-400' : 'text-green-400'}`}>{hospital.capacity}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`${hospital.capacity >= 90 ? 'bg-red-500' : hospital.capacity >= 75 ? 'bg-amber-500' : 'bg-green-500'} h-full`} style={{ width: `${hospital.capacity}%` }}></div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">Incoming: +{hospital.incoming} • Available beds: {hospital.availableBeds}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analyzed' && (
        <div className="flex-1 min-h-0 bg-[#161920] border border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Analyzed Patients Data</h3>
          <div className="space-y-3">
            {patients.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-lg">No designated patients stored yet.</div>
            )}
            {patients.map((p) => (
              <div key={p.id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex justify-between items-center group transition-colors hover:border-slate-600">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-white">{p.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                      p.tag === 'RED' ? 'bg-red-500/20 text-red-500' : 
                      p.tag === 'YELLOW' ? 'bg-amber-500/20 text-amber-500' :
                      'bg-green-500/20 text-green-500'
                    }`}>{p.score} PRIORITY • {p.tag}</span>
                  </div>
                  <div className="text-xs text-slate-400">Designated Hospital: <span className="text-slate-200">{p.hospital}</span></div>
                </div>
                <button 
                  onClick={() => removePatient(p.id)}
                  className="w-8 h-8 rounded bg-red-500/10 text-red-500 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white shrink-0"
                  title="Remove record"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {triageResult && (
        <div className="flex flex-col gap-2">
          <div className="bg-[#161920] p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-slate-500 font-bold tracking-wider">PRIORITY SCORE</div>
              <div className="text-xs text-slate-500">Confidence {triageResult.confidence}%</div>
            </div>
            <div className="text-2xl font-mono font-bold text-white">{triageResult.score} / 100 • {triageResult.tag}</div>
            <div className="text-xs text-slate-400 mt-2">Matched: {triageResult.matchedSymptoms.join(', ') || 'none detected'}</div>
            <div className="text-xs text-blue-300 mt-1">Assigned: {triageResult.hospitalName} • ETA {triageResult.eta}</div>
          </div>

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Voice Response Preview</h3>
          <textarea
            value={responsePreview}
            onChange={(e) => setResponsePreview(e.target.value)}
            className="w-full h-20 bg-[#161920] border border-slate-800 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
          />
          <button className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            <Send className="w-5 h-5" />
            BROADCAST RESPONSE ON WALKIE
          </button>
        </div>
      )}

      {!speechSupported && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          This browser does not support Web Speech Recognition. Use Chrome or Edge for live microphone transcription.
        </div>
      )}
    </div>
  );
}
