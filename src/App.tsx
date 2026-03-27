import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Activity, Map, WifiOff, Mic, Cpu, Users, ArrowRight, ArrowLeft, Play, BarChart3, Zap, ShieldAlert, Database, Globe, AlertTriangle, Clock, ChevronRight, CheckCircle2, Layers, Filter, Plus, Globe2, Crosshair, AlertCircle, Info, Navigation, HeartPulse, Bed, Wifi, Truck, Phone, UserPlus, Maximize, TrendingUp, LayoutGrid, MoreHorizontal, Bell, Waves, Siren, Stethoscope, Radio, Settings, User, Search, Flame, Wind, Droplets, MapPin, X } from 'lucide-react';
import { EarthquakeDetection } from './components/EarthquakeDetection';
import { TsunamiWarning } from './components/TsunamiWarning';
import { EmergencySOS } from './components/EmergencySOS';
import { PatientTriage } from './components/PatientTriage';
import { WalkieTalkiePanel } from './components/WalkieTalkiePanel';
import { PriorityQueuePanel } from './components/PriorityQueuePanel';
import { BioIntelligenceDashboard } from './components/BioIntelligenceDashboard';

function Navbar({ onEnterDashboard }: { onEnterDashboard: () => void }) {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="flex items-center gap-2 text-teal-500 font-bold text-xl tracking-tight">
        <Shield className="w-6 h-6" />
        <span>SENTINEL</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
        <a href="#" className="hover:text-teal-500 transition-colors">Overview</a>
        <a href="#" className="hover:text-teal-500 transition-colors">Features</a>
        <a href="#" className="hover:text-teal-500 transition-colors">Technology</a>
        <a href="#" className="hover:text-teal-500 transition-colors">Use Cases</a>
      </div>
      <div className="flex items-center gap-4">
        <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-500 border border-slate-200 rounded-full transition-colors">Try Demo</button>
        <button onClick={onEnterDashboard} className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-full transition-colors">Enter Dashboard</button>
      </div>
    </nav>
  );
}

function Hero({ onEnterDashboard }: { onEnterDashboard: () => void }) {
  return (
    <section className="px-8 py-20 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <div className="inline-block px-3 py-1 mb-6 text-xs font-semibold text-teal-600 bg-teal-50 rounded-full border border-teal-100">
          v2.4 Live: Predictive Triage Engine
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6 text-slate-900">
          AI That Predicts <br/>
          <span className="text-teal-500 italic">Before</span> It Happens
        </h1>
        <p className="text-lg text-slate-600 mb-8 max-w-lg">
          SmartTriage AI helps hospitals and disaster teams detect, respond, and act in real time — even offline.
        </p>
        <div className="flex items-center gap-4">
          <button onClick={onEnterDashboard} className="px-6 py-3 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-full flex items-center gap-2 transition-colors">
            Launch Command Center
          </button>
          <button className="px-6 py-3 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-full flex items-center gap-2 transition-colors">
            <Play className="w-4 h-4" /> View Demo
          </button>
        </div>
      </div>
      <div className="relative">
        <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-800 transform rotate-1 hover:rotate-0 transition-transform duration-500 min-h-[320px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="relative z-10"
          >
            <Shield className="w-32 h-32 text-teal-500/20" />
            <Activity className="w-16 h-16 text-teal-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </motion.div>
          
          <div className="absolute top-8 right-8 bg-white p-4 rounded-xl shadow-lg">
             <div className="text-xs text-slate-500 font-semibold mb-1">ALERT STATUS</div>
             <div className="text-lg font-bold text-slate-900">Critical Surge</div>
             <div className="text-xs text-red-500 font-medium">+14% Expected (Zone B)</div>
          </div>
          
          <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg flex items-end justify-between">
             <div>
               <div className="text-xs text-slate-500 font-semibold mb-2 flex items-center gap-1"><Activity className="w-3 h-3"/> PREDICTIVE RESOURCE FLOW</div>
               <div className="flex items-end gap-2 h-12">
                 {[40, 30, 60, 40, 80, 50, 90, 70].map((h, i) => (
                   <div key={i} className="w-6 bg-teal-100 rounded-t-sm relative h-full flex items-end">
                     <div className="w-full bg-teal-500 rounded-t-sm" style={{height: `${h}%`}}></div>
                   </div>
                 ))}
               </div>
             </div>
             <div className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded tracking-wider">AI-OPTIMIZED</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PredictiveIntelligence() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-teal-600 bg-teal-50 rounded-full mb-4">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
            ENGINE STATUS: ACTIVE
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Predictive Intelligence in Action</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">72-HOUR SURGE PREDICTION</div>
                <div className="text-3xl font-bold text-slate-900 flex items-baseline gap-2">87% <span className="text-sm font-normal text-slate-500">Confidence</span></div>
              </div>
              <BarChart3 className="w-5 h-5 text-teal-500" />
            </div>
            <div className="h-24 relative w-full overflow-hidden rounded-lg bg-gradient-to-t from-teal-50/50 to-transparent">
               <svg viewBox="0 0 100 40" className="absolute bottom-0 w-full h-full preserve-3d" preserveAspectRatio="none">
                 <path d="M0,40 Q25,30 50,20 T100,10 L100,40 L0,40 Z" fill="rgba(20, 184, 166, 0.1)" />
                 <path d="M0,40 Q25,30 50,20 T100,10" fill="none" stroke="#14b8a6" strokeWidth="2" />
               </svg>
            </div>
            <div className="text-xs text-slate-500 mt-4">Predicted peak: Monday, 03:00 AM</div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">RESOURCE OPTIMIZATION</div>
                <div className="text-2xl font-bold text-slate-900 flex items-baseline gap-2">Critical <span className="text-sm font-medium text-red-500">Low (ICU)</span></div>
              </div>
              <Zap className="w-5 h-5 text-teal-500" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Ventilators</span></div>
                <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-teal-500 h-2 rounded-full" style={{width: '45%'}}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Staffing</span></div>
                <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-teal-500 h-2 rounded-full" style={{width: '95%'}}></div></div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-4">Vitals: ICU (82%), Vents (45%), Staff (91%)</div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">AI RECOMMENDATIONS</div>
                <div className="text-2xl font-bold text-slate-900 flex items-baseline gap-2">Active <span className="text-sm font-medium text-teal-500">Protocol</span></div>
              </div>
              <ShieldAlert className="w-5 h-5 text-teal-500" />
            </div>
            <div className="space-y-2">
              <div className="bg-slate-50 rounded-lg p-3 text-sm flex items-center gap-3 border border-slate-100 text-slate-700">
                <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></div>
                Move 3 ventilators to Zone B
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-sm flex items-center gap-3 border border-slate-100 text-slate-700">
                <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></div>
                Reroute ambulance #402 to Gen. Medical
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-sm flex items-center gap-3 border border-slate-100 text-slate-700">
                <div className="w-2 h-2 rounded-full bg-slate-800 shrink-0"></div>
                Deploy temporary triage tent in Sector 2
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: <BarChart3 className="w-5 h-5 text-teal-500"/>, title: "Predictive Analytics", desc: "Forecast patient surges 72 hours in advance using multi-source signal processing." },
    { icon: <Map className="w-5 h-5 text-teal-500"/>, title: "Real-time Heatmaps", desc: "Visualize crisis zones and resource availability with sub-meter geospatial accuracy." },
    { icon: <WifiOff className="w-5 h-5 text-teal-500"/>, title: "Offline Communication", desc: "Proprietary mesh protocols ensure data sync even when cellular networks fail." },
    { icon: <Mic className="w-5 h-5 text-teal-500"/>, title: "Voice-based Triage", desc: "AI-powered voice analysis for hands-free patient risk assessment and tagging." },
    { icon: <Cpu className="w-5 h-5 text-teal-500"/>, title: "AI Decision Engine", desc: "Autonomous resource recommendations prioritized by urgency and clinical outcomes." },
    { icon: <Users className="w-5 h-5 text-teal-500"/>, title: "Resource Orchestration", desc: "Coordinated dispatch of personnel and equipment across disparate agencies." },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">Intelligence Built for Chaos</h2>
          <p className="text-slate-600">Sophisticated algorithms simplified for real-world decision-making during high-pressure scenarios.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-6">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Modes() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-orange-50/50 border border-orange-100 rounded-3xl p-10 flex flex-col">
            <div className="inline-block px-3 py-1 text-xs font-bold text-white bg-orange-500 rounded-full w-max mb-6">
              Mode 01
            </div>
            <h2 className="text-3xl font-bold mb-4 text-slate-900">Disaster Response</h2>
            <p className="text-slate-600 mb-8 max-w-sm">
              Command center for mass casualty events, natural disasters, and infrastructure failure.
            </p>
            <div className="flex-grow mb-8 rounded-2xl overflow-hidden shadow-lg border border-orange-200/50 bg-orange-100/30 flex items-center justify-center h-48 relative">
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%">
                  <pattern id="diag" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="10" stroke="orange" strokeWidth="2" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#diag)" />
                </svg>
              </div>
              <AlertTriangle className="w-16 h-16 text-orange-400 opacity-50" />
            </div>
            <a href="#" className="text-orange-600 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all uppercase tracking-wide">
              ACCESS DISASTER PROTOCOL <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-teal-50/50 border border-teal-100 rounded-3xl p-10 flex flex-col">
            <div className="inline-block px-3 py-1 text-xs font-bold text-teal-600 bg-teal-100 border border-teal-200 rounded-full w-max mb-6">
              Mode 02
            </div>
            <h2 className="text-3xl font-bold mb-4 text-slate-900">Epidemic Shield</h2>
            <p className="text-slate-600 mb-8 max-w-sm">
              Predictive modeling for pathogen spread, hospital saturation, and vaccine logistics.
            </p>
            <div className="flex-grow mb-8 rounded-2xl overflow-hidden shadow-lg border border-teal-200/50 bg-teal-100/30 flex items-center justify-center h-48 relative">
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%">
                  <circle cx="50%" cy="50%" r="40%" fill="none" stroke="teal" strokeWidth="1" strokeDasharray="4 4" />
                  <circle cx="50%" cy="50%" r="20%" fill="none" stroke="teal" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
              </div>
              <Activity className="w-16 h-16 text-teal-400 opacity-50" />
            </div>
            <a href="#" className="text-teal-600 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all uppercase tracking-wide">
              LEARN ABOUT SENTINEL AI <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileTriage() {
  return (
    <section className="py-24 bg-[#111827] text-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-16 items-center">
        <div className="relative flex justify-center gap-6">
          <div className="w-64 h-[500px] bg-white rounded-[2.5rem] p-2 shadow-2xl transform -translate-y-8">
            <div className="w-full h-full bg-slate-50 rounded-[2rem] overflow-hidden flex flex-col relative border border-slate-100">
              <div className="absolute top-0 w-full h-6 bg-white flex justify-center">
                <div className="w-20 h-4 bg-slate-200 rounded-b-xl"></div>
              </div>
              <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-6">
                  <Mic className="w-8 h-8 text-teal-500" />
                </div>
                <div className="text-xs font-bold text-teal-500 tracking-widest mb-4">LISTENING...</div>
                <div className="text-lg font-medium text-slate-800 italic">"Patient exhibiting shortness of breath..."</div>
              </div>
              <div className="h-32 bg-white p-4 flex flex-col justify-end gap-2">
                <div className="w-full h-1 bg-teal-100 rounded-full"><div className="w-3/4 h-full bg-teal-400 rounded-full"></div></div>
                <div className="w-5/6 h-1 bg-teal-100 rounded-full"><div className="w-1/2 h-full bg-teal-400 rounded-full"></div></div>
                <div className="w-4/6 h-1 bg-teal-100 rounded-full"><div className="w-1/3 h-full bg-teal-400 rounded-full"></div></div>
              </div>
            </div>
            <div className="text-center text-xs text-slate-500 mt-4">Voice-first triage interface</div>
          </div>
          
          <div className="w-64 h-[500px] bg-white rounded-[2.5rem] p-2 shadow-2xl transform translate-y-8">
            <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden flex flex-col relative border border-slate-100">
              <div className="absolute top-0 w-full h-6 bg-white flex justify-center z-10">
                <div className="w-20 h-4 bg-slate-200 rounded-b-xl"></div>
              </div>
              <div className="p-6 pt-12 border-b border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-[10px] font-bold text-slate-400">ANALYSIS RESULT</div>
                  <div className="text-[10px] font-bold text-teal-500">94% ACCURACY</div>
                </div>
                <div className="text-xs font-bold text-orange-500 mb-1">RISK LEVEL</div>
                <div className="text-xl font-black text-slate-900 mb-2">MODERATE RISK</div>
                <p className="text-xs text-slate-500">Observation recommended. Transport assigned.</p>
              </div>
              <div className="p-6 flex-grow flex flex-col justify-end">
                <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 mb-4 border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                    <Activity className="w-4 h-4 text-teal-500"/>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Mercy Gen Hospital</div>
                    <div className="text-[10px] text-slate-500">Nearest Facility • 1.2 miles</div>
                  </div>
                </div>
                <button className="w-full py-3 bg-teal-500 hover:bg-teal-600 transition-colors text-white text-sm font-bold rounded-xl shadow-md">
                  Confirm Assignment
                </button>
              </div>
            </div>
            <div className="text-center text-xs text-slate-500 mt-4">Instant risk assessment</div>
          </div>
        </div>

        <div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Zero-Friction<br/>Mobile Triage</h2>
          <p className="text-slate-400 text-lg mb-10 max-w-md">
            Field agents shouldn't have to navigate menus. Our voice-first UI captures critical patient data and provides instant AI risk tagging while you work.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Mic className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium text-slate-200">Voice Processing</span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Activity className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium text-slate-200">Biometric Analysis</span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Database className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium text-slate-200">Offline Database</span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Globe className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium text-slate-200">Satellite Sync</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white pt-20 pb-10 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1">
            <div className="flex items-center gap-2 text-teal-500 font-bold text-xl tracking-tight mb-4">
              <Shield className="w-6 h-6" />
              <span>SENTINEL</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Empowering the front lines of healthcare and emergency response with predictive intelligence.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-slate-900">Platform</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><a href="#" className="hover:text-teal-500 transition-colors">Command Center</a></li>
              <li><a href="#" className="hover:text-teal-500 transition-colors">Triage App</a></li>
              <li><a href="#" className="hover:text-teal-500 transition-colors">API Docs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-slate-900">Company</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><a href="#" className="hover:text-teal-500 transition-colors">Our Mission</a></li>
              <li><a href="#" className="hover:text-teal-500 transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-teal-500 transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-slate-900">Connect</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><a href="#" className="hover:text-teal-500 transition-colors">LinkedIn</a></li>
              <li><a href="#" className="hover:text-teal-500 transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-teal-500 transition-colors">Status</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-slate-400 italic">"Offline-first AI system for real-world emergencies"</div>
          <div className="flex gap-6 text-xs font-semibold text-slate-500">
            <a href="#" className="hover:text-teal-500 transition-colors">PRIVACY POLICY</a>
            <a href="#" className="hover:text-teal-500 transition-colors">TERMS OF SERVICE</a>
            <span>© 2026 SMARTTRIAGE AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Dashboard({ onBack, onDiseaseMode, onDisasterMode }: { onBack: () => void, onDiseaseMode: () => void, onDisasterMode: () => void }) {
  return (
    <div className="min-h-screen bg-[#eef4f5] font-sans text-slate-900 p-4 flex flex-col gap-4">
      {/* Top Bar */}
      <header className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          <button onClick={onBack} className="flex items-center gap-2 text-[#00d4ff] font-bold text-2xl tracking-tight hover:opacity-80 transition-opacity">
            <Shield className="w-8 h-8" />
            <span>Sentinel</span>
          </button>
          <div className="border-l border-slate-200 pl-8">
            <h1 className="font-bold text-slate-900">Unified Command Layer</h1>
            <div className="text-xs text-slate-500 font-medium tracking-wider">SECTOR-01 CONTROL</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-full">
          <button onClick={onDiseaseMode} className="px-6 py-2 rounded-full bg-[#00d4ff] text-white font-semibold text-sm flex items-center gap-2 shadow-sm">
            <Activity className="w-4 h-4" /> Disease Mode
          </button>
          <button onClick={onDisasterMode} className="px-6 py-2 rounded-full text-slate-600 font-semibold text-sm flex items-center gap-2 hover:bg-white transition-colors">
            <AlertTriangle className="w-4 h-4" /> Disaster Mode
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full border border-red-100">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-bold tracking-wide">RED ALERT LEVEL</span>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-lg leading-none">06:41:31</div>
            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 justify-end mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]"></div> ANALYZING...
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400">
            <User className="w-6 h-6" />
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { icon: <AlertCircle className="w-6 h-6 text-orange-500" />, title: "ACTIVE INCIDENTS", value: "1,284", trend: "+12%", trendUp: true, bg: "bg-orange-50" },
          { icon: <Activity className="w-6 h-6 text-slate-400" />, title: "CRITICALITY RATIO", value: "0.42", trend: "-2%", trendUp: false, bg: "bg-slate-50" },
          { icon: <Cpu className="w-6 h-6 text-[#00d4ff]" />, title: "RESOURCE UTILIZATION", value: "94.2%", trend: "+5.1%", trendUp: true, bg: "bg-[#00d4ff]/10" },
          { icon: <Clock className="w-6 h-6 text-slate-400" />, title: "AVG RESPONSE TIME", value: "4m 22s", trend: "-14s", trendUp: false, bg: "bg-slate-50" },
          { icon: <Crosshair className="w-6 h-6 text-slate-400" />, title: "ZONE HEALTH INDEX", value: "68/100", trend: "-4%", trendUp: false, bg: "bg-slate-50" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${kpi.bg} flex items-center justify-center shrink-0`}>
              {kpi.icon}
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">{kpi.title}</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
                <div className={`text-xs font-bold ${kpi.trendUp ? 'text-orange-500' : 'text-slate-500'}`}>
                  {kpi.trendUp ? '↗' : '↘'} {kpi.trend}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-4 flex-grow">
        
        {/* Left Column */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-[#00d4ff]" />
            <h2 className="font-bold text-lg">Predictive Intelligence</h2>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-sm">Surge Prediction (72h)</h3>
              <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">CONFIDENCE: 92%</span>
            </div>
            <div className="h-32 w-full relative mb-4">
              <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                <path d="M0,40 Q20,35 40,25 T80,10 L100,15 L100,50 L0,50 Z" fill="rgba(0, 212, 255, 0.1)" />
                <path d="M0,40 Q20,35 40,25 T80,10 L100,15" fill="none" stroke="#00d4ff" strokeWidth="2" strokeDasharray="4 2" />
                <path d="M0,42 Q20,37 40,27 T80,12 L100,17" fill="none" stroke="#00d4ff" strokeWidth="2" />
              </svg>
            </div>
            <p className="text-[10px] text-slate-500 italic leading-relaxed">
              * Prediction model trained on real-time mobility and clinical intake data.
            </p>
          </div>

          <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-orange-500 font-bold text-sm mb-4">
              <AlertTriangle className="w-4 h-4" /> Risk Classification
            </div>
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <h4 className="font-bold text-sm mb-1">Extreme Surge: Zone X</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Hospital admissions expected to exceed capacity within 14 hours. 82% probability.</p>
            </div>
            <div className="flex gap-2">
              <button className="flex-grow bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors">
                IMMEDIATE ACTION
              </button>
              <button className="w-10 h-10 bg-white border border-orange-200 text-slate-400 rounded-lg flex items-center justify-center hover:bg-orange-50 transition-colors">
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="font-bold text-xs text-slate-500 tracking-wider mt-2 mb-1">EARLY SIGNAL MATRIX</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Wastewater DNA", value: "+18%", color: "text-slate-900" },
              { label: "Social Velocity", value: "High", color: "text-orange-500" },
              { label: "Air Mobility", value: "-4%", color: "text-[#00d4ff]" },
              { label: "Sensor Cluster", value: "Active", color: "text-[#00d4ff]" },
            ].map((signal, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-[10px] font-semibold text-slate-500 mb-1">{signal.label}</div>
                <div className={`font-bold text-sm ${signal.color}`}>{signal.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Column */}
        <div className="col-span-6 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-[#00d4ff]" />
              <h2 className="font-bold text-lg">Unified Intelligence Map</h2>
            </div>
            <div className="flex gap-2">
              <button className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2 shadow-sm border border-slate-100 hover:bg-slate-50">
                <Layers className="w-4 h-4" /> Layers
              </button>
              <button className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2 shadow-sm border border-slate-100 hover:bg-slate-50">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl shadow-sm flex-grow relative overflow-hidden border border-slate-800 min-h-[500px] flex items-center justify-center">
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,20 Q25,10 50,20 T100,20 V100 H0 Z" fill="#1e293b" />
                <path d="M0,50 Q30,40 60,50 T100,50 V100 H0 Z" fill="#0f172a" />
              </svg>
            </div>
            
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 flex items-center justify-center opacity-10"
            >
              <Globe2 className="w-[600px] h-[600px] text-teal-500" />
            </motion.div>

            <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
              <h2 className="text-5xl font-bold text-white/10 uppercase tracking-[0.2em]">Geospatial Intelligence</h2>
            </div>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-6 h-6 bg-[#00d4ff] rounded-full border-4 border-white shadow-lg mb-2 relative">
                <div className="absolute inset-0 rounded-full bg-[#00d4ff] animate-ping opacity-50"></div>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg">
                CENTRAL COMMAND HUB
              </div>
            </div>

            <div className="absolute right-4 bottom-24 flex flex-col gap-2">
              <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50">
                <Plus className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50">
                <Globe className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50">
                <Layers className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-1.5 shadow-lg flex gap-1">
              <button className="px-6 py-2 rounded-full bg-[#e0fbfc] text-[#00d4ff] text-xs font-bold">Biological</button>
              <button className="px-6 py-2 rounded-full text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors">Atmospheric</button>
              <button className="px-6 py-2 rounded-full text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors">Civilian Flow</button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-slate-700" />
            <h2 className="font-bold text-lg">Resource + Action Layer</h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-6">Resource Monitoring</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">ICU Capacity</span>
                  <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded">CRITICAL</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                  <div className="bg-red-500 h-1.5 rounded-full" style={{width: '88%'}}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>88 / 100 Units</span>
                  <span className="text-red-500">+4%</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">Ambulance Fleet</span>
                  <span className="text-[10px] font-bold bg-[#00d4ff]/20 text-[#00d4ff] px-2 py-0.5 rounded">STABLE</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                  <div className="bg-[#00d4ff] h-1.5 rounded-full" style={{width: '70%'}}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>14 / 20 Units</span>
                  <span>0%</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">Oxygen Supply</span>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">WARNING</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                  <div className="bg-[#00d4ff] h-1.5 rounded-full" style={{width: '42%'}}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>420 / 1000 Units</span>
                  <span>-12%</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">Ventilators</span>
                  <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded">CRITICAL</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                  <div className="bg-[#00d4ff] h-1.5 rounded-full" style={{width: '26%'}}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>12 / 45 Units</span>
                  <span className="text-red-500">+2%</span>
                </div>
              </div>
            </div>

            <button className="w-full mt-6 text-xs text-slate-500 font-medium flex items-center justify-center gap-1 hover:text-slate-800 transition-colors">
              View Detailed Logistics <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white border border-[#00d4ff]/30 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00d4ff]"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#e0fbfc] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#00d4ff]" />
              </div>
              <div>
                <h3 className="font-bold text-sm">AI Recommendation</h3>
                <div className="text-[9px] font-bold text-slate-500 tracking-wider">CONFIDENCE SCORE: 94.8%</div>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Redeploy <span className="font-bold text-[#00d4ff]">8 Response Units</span> from Sector-02 to Metropolitan East. Predicted ROI: 18% reduction in wait times.
            </p>
            <div className="flex gap-2">
              <button className="flex-grow bg-[#00d4ff] hover:bg-[#00b8e6] text-white text-xs font-bold py-2.5 rounded-lg transition-colors">
                Execute Action
              </button>
              <button className="px-4 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
                Decline
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mt-2 mb-1">
            <h3 className="font-bold text-xs text-slate-500 tracking-wider">PRIORITY QUEUE</h3>
            <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200">3 ACTIVE</span>
          </div>
          
          <div className="space-y-2">
            {[
              { id: "#EV-8291", title: "Zone 4: Cluster Outbre", loc: "Metropolitan East", eta: "4m", color: "bg-orange-500" },
              { id: "#EV-8294", title: "District 2: Supply Shor", loc: "Riverside Clinic", eta: "12m", color: "bg-slate-300" },
              { id: "#EV-8297", title: "Zone 7: Power Failure", loc: "St. Mary General", eta: "18m", color: "bg-[#00d4ff]" },
            ].map((item, i) => (
              <div key={i} className="bg-white p-3 rounded-xl shadow-sm flex gap-3 items-center">
                <div className={`w-1 h-8 rounded-full ${item.color}`}></div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400">{item.id}</span>
                    <span className="text-xs font-bold truncate max-w-[120px]">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-slate-500">
                    <span className="flex items-center gap-1"><Map className="w-3 h-3" /> {item.loc}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA: {item.eta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action Log */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mt-2">
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-xs tracking-wider">GLOBAL ACTION LOG</h3>
          </div>
          <div className="flex gap-4 text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1 cursor-pointer hover:text-slate-600"><Filter className="w-3 h-3"/> Zone: All</span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-slate-600"><Filter className="w-3 h-3"/> Type: All</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          {[
            { time: "14:22:10", loc: "Zone 4", action: "Drone Deployment", icon: <Globe className="w-4 h-4 text-slate-500"/> },
            { time: "14:20:45", loc: "System", action: "Surge Prediction Recalibrated", icon: <Cpu className="w-4 h-4 text-slate-500"/> },
            { time: "14:18:02", loc: "Sector 02", action: "Ambulance Reroute (EV-442)", icon: <Navigation className="w-4 h-4 text-slate-500"/> },
            { time: "14:15:22", loc: "Zone 1", action: "Supply Drop Dispatched", icon: <Zap className="w-4 h-4 text-slate-500"/> },
            { time: "14:10:00", loc: "Metropolitan East", action: "Priority Level Escalation", icon: <AlertTriangle className="w-4 h-4 text-slate-500"/> },
          ].map((log, i) => (
            <div key={i} className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                {log.icon}
              </div>
              <div>
                <div className="text-[9px] text-slate-500 font-medium mb-0.5">{log.time} • {log.loc}</div>
                <div className="text-xs font-bold text-slate-800 truncate">{log.action}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-[9px] font-bold text-slate-400 tracking-widest mt-2">
        ENCRYPTION: AES-256 QUANTUM SECURE
      </div>
    </div>
  );
}


import { DisasterProvider, useDisaster } from './context/DisasterContext';

function DisasterDashboard({ onBack, onSwitchMode }: { onBack: () => void, onSwitchMode: () => void, key?: React.Key }) {
  const [activeSection, setActiveSection] = useState<'earthquake' | 'tsunami' | 'sos' | 'triage' | 'walkie' | 'dispatch'>(() => {
    return (localStorage.getItem('sentinel_disaster_section') as any) || 'earthquake';
  });

  useEffect(() => {
    localStorage.setItem('sentinel_disaster_section', activeSection);
  }, [activeSection]);

  return (
    <DisasterProvider>
      <DisasterDashboardContent onBack={onBack} onSwitchMode={onSwitchMode} activeSection={activeSection} setActiveSection={setActiveSection} />
    </DisasterProvider>
  );
}

function DisasterDashboardContent({ onBack, onSwitchMode, activeSection, setActiveSection }: any) {
  const { events, riskLevel } = useDisaster();
  const [showEvents, setShowEvents] = useState(false);
  const hideAuxPanelsForSection = activeSection === 'earthquake' || activeSection === 'tsunami' || activeSection === 'sos';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-[#12141a] text-slate-300 flex font-sans overflow-hidden"
    >
      {/* Sidebar */}
      <div className="w-16 bg-[#161920] border-r border-slate-800/50 flex flex-col items-center py-6 gap-8 z-20">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Back to Common Dashboard">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col gap-6 w-full items-center">
          <button 
            onClick={() => setActiveSection('earthquake')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'earthquake' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            title="Earthquake Detection"
          >
            <Activity className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveSection('tsunami')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'tsunami' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            title="Tsunami Detection"
          >
            <Waves className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveSection('sos')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'sos' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            title="Emergency SOS Broadcast"
          >
            <Siren className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveSection('triage')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'triage' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            title="Patient Intake & AI Triage"
          >
            <Stethoscope className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveSection('walkie')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'walkie' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            title="Walkie-Talkie Integration"
          >
            <Radio className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveSection('dispatch')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'dispatch' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            title="Priority Queue & Dispatch"
          >
            <Truck className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-auto flex flex-col gap-6 w-full items-center">
          <button className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-300 flex items-center justify-center transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 bg-[#12141a] border-b border-slate-800/50 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-slate-400">
              <ShieldAlert className="w-6 h-6" />
              <span className="font-bold text-lg tracking-widest">OVERVIEW</span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
              riskLevel === 'High' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
              riskLevel === 'Moderate' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
              'bg-blue-500/10 border-blue-500/20 text-blue-500'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                riskLevel === 'High' ? 'bg-red-500' :
                riskLevel === 'Moderate' ? 'bg-amber-500' :
                'bg-blue-500'
              }`}></div>
              <span className="text-xs font-bold tracking-wider uppercase">LEVEL: {riskLevel === 'High' ? 'CRITICAL' : riskLevel === 'Moderate' ? 'WARNING' : 'STABLE'}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full">
              <Activity className="w-3 h-3 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">Monitoring: Active</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button onClick={onSwitchMode} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition-colors tracking-wider">
              <Activity className="w-3.5 h-3.5" />
              SWITCH TO DISEASE MODE
            </button>
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleTimeString()} UTC</span>
            </div>
            <div className="h-4 w-px bg-slate-800"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold tracking-wider">STATUS:</span>
              <span className="text-xs text-white font-bold tracking-wider uppercase">{riskLevel === 'None' ? 'STABLE' : 'ALERT'}</span>
            </div>
            <div className="flex items-center gap-4 ml-4">
              <button className="text-slate-400 hover:text-white transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowEvents(!showEvents)}
                className={`text-slate-400 hover:text-white transition-colors relative ${showEvents ? 'text-white' : ''}`}
              >
                <Bell className="w-5 h-5" />
                {events.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 p-4 md:p-6 flex flex-col xl:flex-row gap-6 overflow-hidden min-h-0 relative">
          {/* Main Content Area */}
          <div className="flex-1 min-h-0 flex flex-col gap-6 overflow-hidden">
            {activeSection === 'earthquake' && <EarthquakeDetection />}
            {activeSection === 'tsunami' && <TsunamiWarning />}
            {activeSection === 'sos' && <EmergencySOS />}
            {activeSection === 'triage' && <PatientTriage />}
            {activeSection === 'walkie' && <WalkieTalkiePanel />}
            {activeSection === 'dispatch' && <PriorityQueuePanel />}
          </div>
          
          {/* Persistent Priority Queue Sidebar */}
          {!hideAuxPanelsForSection && activeSection !== 'dispatch' && (
            <div className="hidden xl:block xl:w-[340px] 2xl:w-[400px] shrink-0 border-l border-slate-800/50 bg-[#12141a]">
              <PriorityQueuePanel />
            </div>
          )}
          {/* Floating Walkie-Talkie Button */}
          {!hideAuxPanelsForSection && activeSection !== 'walkie' && (
            <button 
              onClick={() => setActiveSection('walkie')}
              className="hidden lg:flex absolute bottom-6 right-6 xl:right-[370px] 2xl:right-[430px] w-14 h-14 bg-blue-600 rounded-full shadow-lg items-center justify-center text-white hover:bg-blue-700 transition-all z-30"
              title="Walkie-Talkie"
            >
              <Radio className="w-6 h-6" />
            </button>
          )}
          {/* Event Log Overlay */}
          <AnimatePresence>
            {showEvents && (
              <motion.div 
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className="absolute top-0 right-0 bottom-0 w-80 bg-[#161920] border-l border-slate-800 z-40 shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">System Event Log</h3>
                  <button onClick={() => setShowEvents(false)} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                  {events.length === 0 ? (
                    <div className="text-center text-slate-600 text-xs py-10 italic">No events logged</div>
                  ) : (
                    events.map(event => (
                      <div key={event.id} className="flex gap-3">
                        <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                          event.severity === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                          event.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{event.message}</p>
                          <p className="text-[9px] text-slate-600 mt-1 font-mono uppercase">
                            {new Date(event.timestamp).toLocaleTimeString()} • {event.type}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Bar */}
        <footer className="h-10 bg-[#12141a] border-t border-slate-800/50 flex items-center justify-between px-6 shrink-0 text-[10px] font-bold text-slate-500 tracking-wider">
          <div className="flex gap-6">
            <span>SERVER: DC-EAST-01</span>
            <span>LAT: 40.7128° N</span>
            <span>LON: 74.0060° W</span>
          </div>
          <div className="flex gap-6">
            <span className="text-slate-400">SYSTEM SYNCED</span>
            <span>DISASTER SENTINEL V2.4.1-STABLE</span>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'disease-dashboard' | 'disaster-dashboard'>(() => {
    return (localStorage.getItem('sentinel_view') as any) || 'landing';
  });

  useEffect(() => {
    localStorage.setItem('sentinel_view', view);
  }, [view]);

  return (
    <AnimatePresence mode="wait">
      {view === 'disaster-dashboard' && (
        <DisasterDashboard key="disaster-dashboard" onBack={() => setView('dashboard')} onSwitchMode={() => setView('disease-dashboard')} />
      )}
      {view === 'disease-dashboard' && (
        <BioIntelligenceDashboard key="disease-dashboard" onBack={() => setView('dashboard')} onSwitchMode={() => setView('disaster-dashboard')} />
      )}
      {view === 'dashboard' && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Dashboard onBack={() => setView('landing')} onDiseaseMode={() => setView('disease-dashboard')} onDisasterMode={() => setView('disaster-dashboard')} />
        </motion.div>
      )}
      {view === 'landing' && (
        <motion.div
          key="landing"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="min-h-screen bg-slate-50 font-sans text-slate-900"
        >
          <Navbar onEnterDashboard={() => setView('dashboard')} />
          <main>
            <Hero onEnterDashboard={() => setView('dashboard')} />
            <PredictiveIntelligence />
            <Features />
            <Modes />
            <MobileTriage />
          </main>
          <Footer />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
