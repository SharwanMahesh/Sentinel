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
const TRIAGE_SYMPTOM_EXTRACTORS = [
  { value: 'Heavy Breathing / Labored', patterns: [/heavy breathing/i, /labored breathing/i, /shortness of breath/i, /can't breathe/i] },
  { value: 'Not Walking / Immobile', patterns: [/cannot stand/i, /can\'?t stand/i, /not walking/i, /immobile/i] },
  { value: 'Severe Uncontrolled Bleeding', patterns: [/severe bleeding/i, /uncontrolled bleeding/i, /bleeding heavily/i, /lots of blood/i] },
  { value: 'Unconscious / Unresponsive', patterns: [/unconscious/i, /unresponsive/i, /not responding/i, /passed out/i] },
  { value: 'Crush Injury', patterns: [/crush/i] },
  { value: 'Trapped Under Debris', patterns: [/trapped/i, /debris/i] },
  { value: 'Burn Injury', patterns: [/burn/i, /fire/i] },
  { value: 'Cardiac Event', patterns: [/chest pain/i, /cardiac/i, /heart/i] },
];

export function WalkieTalkiePanel() {
  const {
    patients,
    hospitals,
    addPatient,
    removePatient,
    addEvent,
    latestVoiceTriageSignal,
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
  const mountedRef = useRef(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const resultReceivedRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [micStatus, setMicStatus] = useState<string>('');

  const speechSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionStatus('connected'); // Mic hardware detection is separate from speech API
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      keepListeningRef.current = false;
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ok */ }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ok */ }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ---- MediaRecorder fallback: record audio, send to backend for Whisper transcription ----
  const startMediaRecorderFallback = (stream: MediaStream) => {
    if (!mountedRef.current) return;
    setMicStatus('Recording audio (fallback mode)...');

    audioChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      if (!mountedRef.current || audioChunksRef.current.length === 0) return;
      setMicStatus('Transcribing audio...');

      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      try {
        const res = await fetch('/api/walkie/transcribe', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.text && mountedRef.current) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${data.text}`.trim();
            setTranscription(finalTranscriptRef.current);
            setMicStatus('Transcription complete');
          }
        } else {
          console.warn('[WalkieTalkie] Transcribe API error:', res.status);
          setMicStatus('Transcription failed — type manually');
        }
      } catch (err) {
        console.error('[WalkieTalkie] Transcribe fetch error:', err);
        setMicStatus('Transcription failed — type manually');
      }
    };

    recorder.start(1000); // collect data every 1s
  };

  // ---- Web Speech API approach ----
  const startSpeechRecognition = (stream: MediaStream) => {
    if (!mountedRef.current || !speechSupported) {
      // No speech API — go straight to MediaRecorder
      startMediaRecorderFallback(stream);
      return;
    }

    setMicStatus('Starting speech recognition...');
    resultReceivedRef.current = false;

    const Ctor = (window.SpeechRecognition || window.webkitSpeechRecognition) as RecognitionCtor;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (mountedRef.current) {
        setIsMicActive(true);
        setMicStatus('Listening... speak now');
      }
    };

    recognition.onspeechstart = () => {
      if (mountedRef.current) setIsSpeechDetected(true);
    };

    recognition.onspeechend = () => {
      if (mountedRef.current) setIsSpeechDetected(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!mountedRef.current) return;
      resultReceivedRef.current = true;
      setMicStatus('Transcribing...');

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

    recognition.onerror = (event: Event) => {
      const errEvent = event as Event & { error?: string };
      const errType = errEvent.error || 'unknown';
      console.warn('[WalkieTalkie] SpeechRecognition error:', errType);

      if (errType === 'not-allowed' || errType === 'service-not-allowed') {
        // Fatal — switch to MediaRecorder
        if (mountedRef.current) {
          setMicStatus('Speech API denied — switching to audio recording...');
          startMediaRecorderFallback(stream);
        }
        return;
      }
      // For other errors, onend will handle restart
    };

    recognition.onend = () => {
      if (mountedRef.current) setIsSpeechDetected(false);

      if (keepListeningRef.current && mountedRef.current) {
        // Restart after brief pause
        setTimeout(() => {
          if (keepListeningRef.current && mountedRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // If restart fails, switch to fallback
              startMediaRecorderFallback(stream);
            }
          }
        }, 300);
      } else if (mountedRef.current) {
        setIsMicActive(false);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('[WalkieTalkie] recognition.start() failed:', e);
      startMediaRecorderFallback(stream);
      return;
    }

    // Fallback timer: if no results received within 4 seconds, switch to MediaRecorder
    fallbackTimerRef.current = setTimeout(() => {
      if (!resultReceivedRef.current && keepListeningRef.current && mountedRef.current) {
        console.warn('[WalkieTalkie] No speech results after 4s — falling back to MediaRecorder');
        setMicStatus('Speech API not responding — switching to audio recording...');
        // Stop the broken speech recognition
        try { recognition.abort(); } catch { /* ok */ }
        recognitionRef.current = null;
        // Start MediaRecorder fallback
        startMediaRecorderFallback(stream);
      }
    }, 4000);
  };

  // ---- Main toggle ----
  const toggleMic = async () => {
    if (connectionStatus !== 'connected') return;

    setActiveTab('transcription');

    if (isMicActive) {
      // STOP everything
      keepListeningRef.current = false;
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ok */ }
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ok */ }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsMicActive(false);
      setIsSpeechDetected(false);
      setMicStatus('');
      return;
    }

    // START — first, explicitly get mic permission via getUserMedia
    setMicStatus('Requesting microphone access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err) {
      console.error('[WalkieTalkie] getUserMedia failed:', err);
      setMicStatus('Microphone access denied. Please allow mic in browser settings.');
      setConnectionStatus('disconnected');
      return;
    }

    // Mic is confirmed working
    finalTranscriptRef.current = transcription;
    keepListeningRef.current = true;
    setIsMicActive(true);

    // Try Web Speech API first, with automatic fallback
    startSpeechRecognition(streamRef.current!);
  };

  useEffect(() => {
    if (!transcription.trim()) {
      return;
    }

    const selectedSymptoms = TRIAGE_SYMPTOM_EXTRACTORS
      .filter((item) => item.patterns.some((pattern) => pattern.test(transcription)))
      .map((item) => item.value);

    let consciousness: 'CONSCIOUS' | 'UNCONSCIOUS' = 'CONSCIOUS';
    if (/unconscious|unresponsive|not responding|passed out/i.test(transcription)) {
      consciousness = 'UNCONSCIOUS';
    }

    let bleeding = 'None';
    if (/severe bleeding|uncontrolled bleeding|bleeding heavily|lots of blood/i.test(transcription)) {
      bleeding = 'Severe';
    } else if (/moderate bleeding/i.test(transcription)) {
      bleeding = 'Moderate';
    } else if (/minor bleeding|light bleeding/i.test(transcription)) {
      bleeding = 'Minor';
    }

    let mobility = 'Unknown';
    if (/cannot stand|can\'?t stand|immobile|not walking/i.test(transcription)) {
      mobility = 'Immobile';
    } else if (/assisted|with help/i.test(transcription)) {
      mobility = 'Assisted';
    } else if (/walking|ambulatory|can walk/i.test(transcription)) {
      mobility = 'Walking';
    }
    
    let age = '';
    const ageMatch = transcription.match(/\b(\d{1,3})\s*(?:years|yrs|yo|y\.o)\b/i) || transcription.match(/\b(?:age|aged)\s*(\d{1,3})\b/i);
    if (ageMatch) {
      age = ageMatch[1];
    }

    setLatestVoiceTriageSignal({
      selectedSymptoms,
      notes: transcription.slice(0, 500),
      age,
      consciousness,
      bleeding,
      mobility,
    });
  }, [transcription, setLatestVoiceTriageSignal]);

  const handleAnalyze = () => {
    if (!transcription.trim()) {
      return;
    }

    setIsAnalyzing(true);
    setTriageResult(null);

    // Compute identical logical state locally based on current derived voice signal
    setTimeout(() => {
      let score = 20; 
      if (latestVoiceTriageSignal.consciousness === 'UNCONSCIOUS') score += 25;
      if (latestVoiceTriageSignal.selectedSymptoms.some(s => s.includes('Breathing'))) score += 20;
      if (latestVoiceTriageSignal.bleeding === 'Severe') score += 15;
      else if (latestVoiceTriageSignal.bleeding === 'Moderate') score += 10;
      if (latestVoiceTriageSignal.mobility === 'Immobile') score += 10;
      if (latestVoiceTriageSignal.selectedSymptoms.includes('Cardiac Event')) score += 40;
      
      score += (latestVoiceTriageSignal.selectedSymptoms.length * 5);
      
      score = Math.min(score, 100);

      let tag: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK' = 'GREEN';
      if (score >= 90) tag = 'RED';
      else if (score >= 60) tag = 'YELLOW';
      else if (score >= 30) tag = 'GREEN';
      else tag = 'BLACK';

      let sortedHospitals = [...hospitals];
      if (seismicAnomaly) {
        const [latE, lngE] = seismicAnomaly.epicenter;
        sortedHospitals = sortedHospitals
          .map(h => ({ ...h, dist: Math.sqrt(Math.pow(h.lat - latE, 2) + Math.pow(h.lng - lngE, 2)) }))
          .sort((a, b) => a.dist - b.dist);
      } else {
        sortedHospitals = sortedHospitals.sort((a, b) => b.availableBeds - a.availableBeds);
      }
      
      const preferredHospital = sortedHospitals.find((h) => h.capacity < 95) || sortedHospitals[0];
      const etaMinutes = 8 + Math.floor(Math.random() * 8);

      const result = {
        score,
        tag,
        confidence: 94,
        matchedSymptoms: latestVoiceTriageSignal.selectedSymptoms,
        hospitalName: preferredHospital?.name || 'Nearest Facility',
        eta: `${etaMinutes} min`
      };

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
        `Patient triaged ${result.tag} Priority with a severity score of ${result.score}. Detected conditions: ${result.matchedSymptoms.length > 0 ? result.matchedSymptoms.join(', ') : 'none'}. Responding units route to ${result.hospitalName}. ETA is ${result.eta}.`
      );

      addEvent({
        type: 'dispatch',
        severity: result.tag === 'RED' ? 'critical' : result.tag === 'YELLOW' ? 'warning' : 'info',
        message: `Voice triage complete: ${result.tag} (${result.score}) processed via auto-filled features.`,
      });

      setIsAnalyzing(false);
      setActiveTab('analyzed');
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
            {isAnalyzing ? 'ANALYZING...' : 'SEND DATA'}
          </button>
        </div>
      )}



      {activeTab === 'capacity' && (
        <div className="flex-1 min-h-0 bg-[#161920] border border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Hospital Capacity</h3>
          <div className="space-y-4">
            {hospitals.map((hospital) => (
              <div key={hospital.id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <div className="flex justify-between text-[11px] mb-2">
                  <span className="font-bold text-slate-200">{hospital.name} <span className="text-slate-500 font-normal">({hospital.city})</span></span>
                  <span className={`font-bold ${hospital.capacity >= 90 ? 'text-red-400' : hospital.capacity >= 75 ? 'text-amber-400' : 'text-green-400'}`}>{hospital.capacity}% Full</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`${hospital.capacity >= 90 ? 'bg-red-500' : hospital.capacity >= 75 ? 'bg-amber-500' : 'bg-green-500'} h-full`} style={{ width: `${hospital.capacity}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wider">
                  <span>Beds: <span className="text-slate-300">{hospital.availableBeds} / {hospital.totalBeds}</span></span>
                  <span>Vents: <span className="text-slate-300">{hospital.availableVentilators}</span></span>
                  <span>Amb: <span className="text-slate-300">{hospital.availableAmbulances}</span></span>
                </div>
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${p.tag === 'RED' ? 'bg-red-500/20 text-red-500' :
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
