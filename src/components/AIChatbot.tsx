import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Mic, Send, Brain, Activity, Clock, User, CheckCircle2, AlertCircle, ChevronRight, MoreHorizontal, Sparkles, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getBioMistralTriage } from '../services/backendApi';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
}

type TriageLevel = 'Stable' | 'Moderate' | 'Critical';

interface TriageState {
  level: TriageLevel;
  score: number;
  confidence: number;
  detectedSymptoms: string[];
}

interface InterviewQuestion {
  id: string;
  prompt: string;
  placeholder?: string;
}

interface InterviewData {
  name: string;
  age: number;
  symptomsNarrative: string;
  feverOrTemp: string;
  breathingOrSpO2: string;
  chestPain: string;
  chronicConditions: string;
}

const QUESTIONS: InterviewQuestion[] = [
  { id: 'name', prompt: 'Please enter your name.', placeholder: 'Your name...' },
  { id: 'age', prompt: 'Please enter your age.', placeholder: 'e.g. 35' },
  { id: 'symptomsNarrative', prompt: 'Describe all your current symptoms in one sentence.', placeholder: 'I feel...' },
  { id: 'feverOrTemp', prompt: 'Do you have a fever? (Include temperature if known)', placeholder: 'e.g. Yes, 38.5C' },
  { id: 'breathingOrSpO2', prompt: 'Any breathing difficulty? (Include SpO2 if known)', placeholder: 'e.g. Short of breath, SpO2 94%' },
  { id: 'chestPain', prompt: 'Do you have any chest pain or pressure?', placeholder: 'Yes/No' },
  { id: 'chronicConditions', prompt: 'Any chronic conditions (diabetes, asthma, cardiac history)? If none, type none.', placeholder: 'e.g. None' },
];

const INITIAL_INTERVIEW_DATA: InterviewData = {
  name: '',
  age: 35,
  symptomsNarrative: '',
  feverOrTemp: '',
  breathingOrSpO2: '',
  chestPain: '',
  chronicConditions: '',
};

const extractNumber = (input: string): number | undefined => {
  const match = input.match(/\d+(\.\d+)?/);
  if (!match) return undefined;
  return Number(match[0]);
};

const normalizeAge = (input: string): number => {
  const text = input.toLowerCase();
  if (/middle\s*aged|middle-aged/.test(text)) return 35;
  if (/\byoung\b/.test(text)) return 10;
  if (/\bold\b|elderly|senior/.test(text)) return 72;
  const extracted = extractNumber(text);
  if (!extracted || Number.isNaN(extracted)) return 35;
  return Math.max(1, Math.min(110, Math.round(extracted)));
};

const nextAiQuestionText = (index: number): string => {
  if (index >= QUESTIONS.length) {
    return 'Thank you. I have enough data. Processing with BioMistral-7b...';
  }
  return QUESTIONS[index].prompt;
};

export function AIChatbot({ onTriageComplete }: { onTriageComplete?: (data: any) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello, I am your AI Health Assistant. I will run a structured intake and triage interview. ${QUESTIONS[0].prompt}`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [triage, setTriage] = useState<TriageState>({
    level: 'Stable',
    score: 10,
    confidence: 0.95,
    detectedSymptoms: []
  });
  const [reasoning, setReasoning] = useState('Interview initialized. Awaiting patient responses...');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [interviewData, setInterviewData] = useState<InterviewData>(INITIAL_INTERVIEW_DATA);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const updateInterviewData = (questionId: string, answer: string) => {
    setInterviewData((prev) => ({ ...prev, [questionId]: answer }));
  };

  const chooseHospital = (detectedSymptoms: string[]): string => {
    if (detectedSymptoms.some((s) => /chest|cardiac/i.test(s))) return 'Cardiac Specialty Center';
    if (detectedSymptoms.some((s) => /breathing|spo2/i.test(s))) return 'Pulmonary Emergency Unit';
    return 'Central General Hospital';
  };

  const buildRecommendation = (state: TriageState): string => {
    if (state.level === 'Critical') {
      return 'Critical risk detected. Immediate ambulance dispatch and ER stabilization required.';
    }
    if (state.level === 'Moderate') {
      return 'Moderate risk. Online doctor consultation is recommended within 10 minutes.';
    }
    return 'Low immediate risk. Continue AI-guided monitoring with follow-up questions.';
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentQuestion = QUESTIONS[questionIndex];
    const userAnswer = inputValue;
    setInputValue('');
    setIsTyping(true);

    if (currentQuestion && !isInterviewComplete) {
      updateInterviewData(currentQuestion.id, userAnswer);
    }

    setTimeout(async () => {
      const nextIndex = questionIndex + 1;
      const currentTranscript = [...messages, userMsg]
        .filter((m) => m.sender === 'user')
        .map((m) => m.text)
        .join(' ');

      if (nextIndex < QUESTIONS.length) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: nextAiQuestionText(nextIndex),
          sender: 'ai',
          timestamp: new Date(),
        };
        setQuestionIndex(nextIndex);
        setMessages(prev => [...prev, aiMsg]);
        setReasoning(`Collected ${nextIndex + 1}/${QUESTIONS.length} intake parameters.`);
        setIsTyping(false);
        return;
      }

      setIsInterviewComplete(true);

      const finalData: InterviewData = {
        ...interviewData,
        ...(currentQuestion?.id === 'name' ? { name: userAnswer.trim() || interviewData.name } : {}),
        ...(currentQuestion?.id === 'age' ? { age: normalizeAge(userAnswer) } : {}),
        ...(currentQuestion?.id === 'symptomsNarrative' ? { symptomsNarrative: userAnswer } : {}),
        ...(currentQuestion?.id === 'feverOrTemp' ? { feverOrTemp: userAnswer } : {}),
        ...(currentQuestion?.id === 'breathingOrSpO2' ? { breathingOrSpO2: userAnswer } : {}),
        ...(currentQuestion?.id === 'chestPain' ? { chestPain: userAnswer } : {}),
        ...(currentQuestion?.id === 'chronicConditions' ? { chronicConditions: userAnswer } : {}),
      };

      try {
        setReasoning('BioMistral-7b is analyzing patient data...');
        const response = await getBioMistralTriage({
          interviewData: finalData,
          transcript: currentTranscript
        });

        const finalTriage: TriageState = {
          level: response.level as TriageLevel,
          score: response.score,
          confidence: response.confidence,
          detectedSymptoms: response.detectedSymptoms
        };

        setTriage(finalTriage);
        setReasoning(`BioMistral classification complete. Signals: ${finalTriage.detectedSymptoms.join(', ') || 'none'}`);

        const destinationHospital = chooseHospital(finalTriage.detectedSymptoms);
        const etaSeconds = 420 + Math.floor(Math.random() * 420);
        const ambulanceId = `AMB-${Math.floor(100 + Math.random() * 900)}`;
        const recommendation = buildRecommendation(finalTriage);

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: `Triage complete. Score ${finalTriage.score}/100 (${finalTriage.level}). ${recommendation}`,
          sender: 'ai',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);

        if (onTriageComplete) {
          onTriageComplete({
            id: `PAT-${Math.floor(Math.random() * 10000)}`,
            name: finalData.name || 'Anonymous Patient',
            age: finalData.age,
            symptoms: finalTriage.detectedSymptoms,
            score: finalTriage.score,
            vitals: {
              bp: '',
              o2: extractNumber(finalData.breathingOrSpO2),
              temperature: extractNumber(finalData.feverOrTemp),
            },
            aiRecommendation: recommendation,
            hospital: finalTriage.level === 'Critical' ? destinationHospital : undefined,
            etaSeconds: finalTriage.level === 'Critical' ? etaSeconds : undefined,
            ambulanceId: finalTriage.level === 'Critical' ? ambulanceId : undefined,
            timestamp: new Date(),
          });
        }
      } catch (err) {
        console.error(err);
        setReasoning('Analysis failed. Check backend connection.');
        setIsTyping(false);
      }
    }, 900);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Placeholder voice input fallback.
      setTimeout(() => {
        setInputValue('Yes, I have chest pain and I feel dizzy.');
        setIsRecording(false);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">AI Health Assistant</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BioMistral-7b Active</span>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Triage Indicator (Sticky) */}
      <div className="sticky top-0 z-10 px-6 py-2 bg-white/80 backdrop-blur-md border-b border-slate-50 flex justify-center">
        <motion.div 
          animate={{ 
            scale: triage.level === 'Critical' ? [1, 1.05, 1] : 1,
            backgroundColor: triage.level === 'Critical' ? '#FEE2E2' : triage.level === 'Moderate' ? '#FEF3C7' : '#DCFCE7'
          }}
          transition={{ duration: 0.3, repeat: triage.level === 'Critical' ? Infinity : 0, repeatType: "reverse" }}
          className={`px-4 py-1.5 rounded-full flex items-center gap-2 border ${
            triage.level === 'Critical' ? 'border-red-200 text-red-700' : 
            triage.level === 'Moderate' ? 'border-yellow-200 text-yellow-700' : 
            'border-green-200 text-green-700'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-widest">
            {triage.level === 'Critical' ? 'Critical' : triage.level === 'Moderate' ? 'Moderate Risk' : 'Stable'}
          </span>
        </motion.div>
      </div>

      {/* Chat Window */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] group`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                  ? 'bg-[#F1F5F9] text-slate-800 rounded-tr-none' 
                  : 'bg-[#EAF2FF] text-blue-900 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
                <div className={`text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <Clock className="w-3 h-3" />
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-[#EAF2FF] px-4 py-3 rounded-2xl rounded-tl-none flex gap-1">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full"></motion.div>
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full"></motion.div>
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full"></motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Reasoning Box */}
      <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {reasoning}
        </span>
        {triage.detectedSymptoms.length > 0 && (
          <div className="ml-auto flex gap-1">
            {triage.detectedSymptoms.map((s, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[8px] font-bold">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
        {/* FAQs */}
        {!isInterviewComplete && messages.length <= 3 && (
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            <button 
              onClick={() => setInputValue("What is SpO2?")}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              What is SpO2?
            </button>
            <button 
              onClick={() => setInputValue("When should I call an ambulance?")}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              Ambulance Info
            </button>
            <button 
              onClick={() => setInputValue("I don't know")}
              className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              I don't know my vitals
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1.5 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <button 
            onClick={toggleRecording}
            className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:bg-slate-200'}`}
          >
            <Mic className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isInterviewComplete ? 'Interview complete. You can still add notes...' : QUESTIONS[questionIndex]?.placeholder || 'Enter your response...'}
            className="flex-grow bg-transparent border-none focus:ring-0 text-sm py-2 px-1 text-slate-700 placeholder:text-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:hover:bg-blue-600 shadow-lg shadow-blue-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
