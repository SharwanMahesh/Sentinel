import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bot, Mic, Send, Brain, Activity, Clock, MoreHorizontal, Sparkles, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAI, analyzeTriageFromChat, type ChatMessage } from '../services/backendApi';

interface UIMessage {
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
  recommendation: string;
  model: string;
}

const INITIAL_TRIAGE: TriageState = {
  level: 'Stable',
  score: 5,
  confidence: 0,
  detectedSymptoms: [],
  recommendation: '',
  model: '',
};

const GREETING = `Hello! I'm BioSentinel, your AI Health Assistant. I'm here to help assess your symptoms.

To get started, could you please tell me your name?`;

const QUICK_PROMPTS = [
  { text: 'My name is John Doe', color: 'blue' },
  { text: 'I have a high fever and headache', color: 'red' },
  { text: 'I feel chest pain and dizziness', color: 'red' },
  { text: 'I have a mild cold and sore throat', color: 'blue' },
];

export function AIChatbot({ onTriageComplete }: { onTriageComplete?: (data: any) => void }) {
  const [messages, setMessages] = useState<UIMessage[]>([
    { id: '1', text: GREETING, sender: 'ai', timestamp: new Date() },
  ]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [triage, setTriage] = useState<TriageState>(INITIAL_TRIAGE);
  const [reasoning, setReasoning] = useState('Awaiting identification...');
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [isTriageFinalized, setIsTriageFinalized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // New states for patient identification
  const [patientName, setPatientName] = useState('');
  const [chatStep, setChatStep] = useState<'IDENTIFYING' | 'TRIAGING'>('IDENTIFYING');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Build transcript from all messages for triage analysis
  const buildTranscript = useCallback((): string => {
    return messages
      .map((m) => `${m.sender === 'user' ? 'Patient' : 'Doctor'}: ${m.text}`)
      .join('\n');
  }, [messages]);

  // Run triage analysis in the background
  const runTriageAnalysis = useCallback(async (transcript: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeTriageFromChat(transcript);
      setTriage({
        level: result.level as TriageLevel,
        score: result.score,
        confidence: result.confidence,
        detectedSymptoms: result.detectedSymptoms,
        recommendation: result.recommendation,
        model: result.model,
      });
      setReasoning(
        `${result.model}: ${result.detectedSymptoms.length > 0 ? result.detectedSymptoms.join(', ') : 'Analyzing...'} — Score ${result.score}/100`
      );
      return result;
    } catch (err) {
      console.error('Triage analysis failed:', err);
      setReasoning('Triage analysis pending...');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userText = inputValue.trim();
    const userMsg: UIMessage = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    // Handle initial identification step
    if (chatStep === 'IDENTIFYING') {
      setIsTyping(true);
      setReasoning('Confirming identity...');
      
      const cleanName = userText.replace(/my name is|i am|this is/gi, '').trim();
      setPatientName(cleanName || userText);
      setChatStep('TRIAGING');
      
      setTimeout(() => {
        const welcomeBack: UIMessage = {
          id: (Date.now() + 1).toString(),
          text: `Thank you, ${cleanName || userText}. Please describe what you're experiencing — any symptoms, pain, or discomfort you'd like to share.`,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, welcomeBack]);
        setChatHistory([{ role: 'assistant', content: welcomeBack.text }]);
        setIsTyping(false);
        setReasoning('Ready for clinical assessment');
      }, 800);
      return;
    }

    setIsTyping(true);

    const newCount = userMessageCount + 1;
    setUserMessageCount(newCount);

    // Build the chat history for the API
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: userText }];
    setChatHistory(updatedHistory);

    try {
      setReasoning('Mistral-7B is generating response...');
      const response = await chatWithAI(updatedHistory);
      const aiReply = response.reply;

      const aiMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        text: aiReply,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setChatHistory((prev) => [...prev, { role: 'assistant', content: aiReply }]);

      // Auto-trigger triage analysis after every 2+ user clinical messages
      if (newCount >= 2) {
        const transcript = buildTranscript();
        runTriageAnalysis(transcript);
      } else {
        setReasoning(`Collecting symptoms... (${newCount} message${newCount > 1 ? 's' : ''} so far)`);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, I encountered a brief connection issue. Could you repeat what you were saying?',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setReasoning('Connection issue — retrying on next message...');
    } finally {
      setIsTyping(false);
    }
  };

  const handleFinalizeTriage = async () => {
    if (isTriageFinalized) return;

    setIsTyping(true);
    setReasoning('Running final triage assessment...');

    const transcript = buildTranscript();
    const result = await runTriageAnalysis(transcript);

    const finalScore = result?.score ?? triage.score;
    const finalLevel = result?.level ?? triage.level;
    const finalSymptoms = result?.detectedSymptoms ?? triage.detectedSymptoms;
    const finalRecommendation = result?.recommendation ?? triage.recommendation;

    const summaryMsg: UIMessage = {
      id: (Date.now() + 2).toString(),
      text: `📋 **Triage Assessment Complete**\n\n🔴 Priority Score: ${finalScore}/100 (${finalLevel})\n📌 Detected: ${finalSymptoms.join(', ') || 'General symptoms'}\n💡 ${finalRecommendation}`,
      sender: 'ai',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, summaryMsg]);
    setIsTriageFinalized(true);
    setIsTyping(false);
    setReasoning(`Final assessment: ${finalLevel} — ${finalScore}/100`);

    if (onTriageComplete) {
      onTriageComplete({
        id: `PAT-${Math.floor(Math.random() * 10000)}`,
        name: patientName || 'Anonymous Patient',
        symptoms: finalSymptoms,
        score: finalScore,
        aiRecommendation: finalRecommendation,
        hospital: finalLevel === 'Critical' ? 'Nearest Trauma Center' : undefined,
        timestamp: new Date(),
      });
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        if (chatStep === 'IDENTIFYING') {
          setInputValue('John Doe');
        } else {
          setInputValue('I have been having severe headache and fever for the past 2 days');
        }
        setIsRecording(false);
      }, 2000);
    }
  };

  const triageColor = triage.level === 'Critical' ? 'red' : triage.level === 'Moderate' ? 'amber' : 'green';

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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mistral-7B Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="text-blue-500"
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
          )}
          <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Triage Indicator (Sticky) */}
      <div className="sticky top-0 z-10 px-6 py-2 bg-white/80 backdrop-blur-md border-b border-slate-50 flex items-center justify-between">
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
          {triage.score > 0 && (
            <span className={`text-xs font-black ml-1 ${
              triage.level === 'Critical' ? 'text-red-600' : triage.level === 'Moderate' ? 'text-amber-600' : 'text-green-600'
            }`}>
              {triage.score}/100
            </span>
          )}
        </motion.div>

        {/* Finalize button */}
        {userMessageCount >= 3 && !isTriageFinalized && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleFinalizeTriage}
            disabled={isAnalyzing || isTyping}
            className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-blue-100"
          >
            <Zap className="w-3 h-3" />
            Finalize Triage
          </motion.button>
        )}
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
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-line ${
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
        <Brain className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {reasoning}
        </span>
        {triage.detectedSymptoms.length > 0 && (
          <div className="ml-auto flex gap-1 shrink-0">
            {triage.detectedSymptoms.slice(0, 4).map((s, i) => (
              <span key={i} className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                triage.level === 'Critical' ? 'bg-red-100 text-red-600' :
                triage.level === 'Moderate' ? 'bg-amber-100 text-amber-600' :
                'bg-blue-100 text-blue-600'
              }`}>{s}</span>
            ))}
            {triage.detectedSymptoms.length > 4 && (
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-bold">
                +{triage.detectedSymptoms.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
        {/* Quick Prompts - only on first few messages */}
        {userMessageCount < 2 && !isTriageFinalized && (
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => setInputValue(qp.text)}
                className={`border text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  qp.color === 'red' ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100' :
                  qp.color === 'amber' ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-100' :
                  'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100'
                }`}
              >
                {qp.text}
              </button>
            ))}
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
            placeholder={isTriageFinalized ? 'Triage complete. You can still ask questions...' : 'Describe your symptoms...'}
            className="flex-grow bg-transparent border-none focus:ring-0 text-sm py-2 px-1 text-slate-700 placeholder:text-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:hover:bg-blue-600 shadow-lg shadow-blue-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
