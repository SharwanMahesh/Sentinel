import express from 'express';
import { JSONFilePreset } from 'lowdb/node';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(fileURLToPath(import.meta.url), '../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const dbPath = path.join(dataDir, 'sentinel-db.json');
const csvPath = path.join(rootDir, 'resources', 'TNHospitals_CommandCenter_Dataset.csv');

const EXCLUDED_HOSPITAL_PATTERN = /(\beye\b|ophthalm|retina|vision care|eye care)/i;

const CITY_COORDINATES = {
  Chennai: [13.0827, 80.2707],
  Coimbatore: [11.0168, 76.9558],
  Madurai: [9.9252, 78.1198],
  Salem: [11.6643, 78.1460],
  Tirunelveli: [8.7139, 77.7567],
  Trichy: [10.7905, 78.7047],
  Tiruchirapalli: [10.7905, 78.7047],
  Erode: [11.3410, 77.7172],
  Karur: [10.9601, 78.0766],
  Kanchipuram: [12.8342, 79.7036],
  Tuticorin: [8.7642, 78.1348],
  Nagercoil: [8.1833, 77.4119],
  Theni: [10.0104, 77.4768],
  Namakkal: [11.2194, 78.1677],
  Cuddalore: [11.7447, 79.7680],
  Dindigul: [10.3673, 77.9803],
  Hosur: [12.7409, 77.8253],
  Pondicherry: [11.9416, 79.8083],
  Tanjore: [10.7867, 79.1378],
  Kanyakumari: [8.0883, 77.5385],
  Pollachi: [10.6583, 77.0089],
  Tirupur: [11.1085, 77.3411],
  Tiruppur: [11.1085, 77.3411],
  Dharmapuri: [12.1277, 78.1579],
  Virudhunagar: [9.5866, 77.9579],
  Nagapattanam: [10.7666, 79.8428],
  Sivakasi: [9.4493, 77.7974],
  Kuzhithurai: [8.3176, 77.1920],
};

const INITIAL_DISASTER_PATIENTS = [
  {
    id: 'P-047',
    score: 91,
    tag: 'RED',
    hospital: 'Rajiv Gandhi GH',
    eta: '9 min',
    status: 'dispatched',
    location: '12.927°N, 80.128°E',
    vitals: { heartRate: 112, bloodPressure: '90/60', oxygen: 88 },
  },
  {
    id: 'P-082',
    score: 75,
    tag: 'YELLOW',
    hospital: 'Apollo Hospital',
    eta: '14 min',
    status: 'awaiting',
    location: '12.935°N, 80.142°E',
    vitals: { heartRate: 98, bloodPressure: '110/70', oxygen: 94 },
  },
  {
    id: 'P-012',
    score: 45,
    tag: 'GREEN',
    hospital: 'Fortis',
    eta: '22 min',
    status: 'dispatched',
    location: '12.912°N, 80.115°E',
    vitals: { heartRate: 76, bloodPressure: '120/80', oxygen: 98 },
  },
];

const INITIAL_DISASTER_HOSPITALS = [
  { id: 'h1', name: 'Rajiv Gandhi GH', capacity: 92, incoming: 5, totalBeds: 500, availableBeds: 40 },
  { id: 'h2', name: 'Apollo Hospital', capacity: 75, incoming: 3, totalBeds: 350, availableBeds: 87 },
  { id: 'h3', name: 'Fortis', capacity: 40, incoming: 2, totalBeds: 200, availableBeds: 120 },
];

const defaultData = {
  hospitals: [],
  bioPatients: [],
  disasterState: {
    riskLevel: 'Moderate',
    patients: INITIAL_DISASTER_PATIENTS,
    hospitals: INITIAL_DISASTER_HOSPITALS,
    events: [],
  },
  meta: {
    initializedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'seed-on-first-run',
  },
};

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = await JSONFilePreset(dbPath, defaultData);

const seeded = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const parseCsvLine = (line) => {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  out.push(current.trim());
  return out;
};

const withCityCoordinates = (city, seedInput) => {
  const normalizedKey = Object.keys(CITY_COORDINATES).find(k => k.toLowerCase() === String(city).toLowerCase().trim());
  const base = normalizedKey ? CITY_COORDINATES[normalizedKey] : CITY_COORDINATES.Chennai;
  const seedValue = seeded(seedInput);
  // Increase distribution radius to ~25km spread
  const latShift = ((seedValue % 60) - 30) / 100;
  const lngShift = ((Math.floor(seedValue / 10) % 60) - 30) / 100;
  return [base[0] + latShift, base[1] + lngShift];
};

const buildHospital = (raw) => {
  // Discard header. In this dataset, raw[1] is 'Hospital'.
  if (raw[1] === 'Hospital') return null;

  const id = `HOSP-${raw[0]}`;
  const name = raw[1];
  const state = raw[2];
  const city = raw[3];
  const address = raw[4];
  const pincode = raw[5];

  const totalBeds = parseInt(raw[6], 10) || 0;
  const availableBeds = parseInt(raw[7], 10) || 0;
  const occupiedBeds = Math.max(0, totalBeds - availableBeds);

  const totalVentilators = parseInt(raw[8], 10) || 0;
  const availableVentilators = parseInt(raw[9], 10) || 0;

  const oxygenSupplyPercent = parseInt(raw[10], 10) || 0;
  const activeAmbulances = parseInt(raw[11], 10) || 0;
  const vaccineDoses = parseInt(raw[12], 10) || 0;
  const availableAmbulances = parseInt(raw[13], 10) || 0;

  const capacity = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const status = capacity >= 90 ? 'Critical' : capacity >= 75 ? 'Warning' : 'Normal';

  const seedKey = `${name}-${city}-${pincode}`;
  const [lat, lng] = withCityCoordinates(city, seedKey);

  return {
    id,
    name,
    state,
    city,
    address,
    pincode,
    totalBeds,
    occupiedBeds,
    availableBeds,
    totalVentilators,
    availableVentilators,
    oxygenSupplyPercent,
    activeAmbulances,
    availableAmbulances,
    vaccineDoses,
    capacity,
    status,
    lat,
    lng,
    incoming: Math.floor(Math.random() * 5), // Mock dynamic incoming traffic
  };
};

const parseHospitalsFromCsv = () => {
  if (!existsSync(csvPath)) {
    return [];
  }

  const csv = readFileSync(csvPath, 'utf8');
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const indexOf = (name) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const idIdx = indexOf('S.NO');
  const hospitalIdx = indexOf('Hospital');
  const stateIdx = indexOf('State');
  const cityIdx = indexOf('City');
  const addrIdx = indexOf('LocalAddress');
  const pinIdx = indexOf('Pincode');

  const dedupe = new Set();
  const parsed = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[1]?.trim() || '';
    if (!name || EXCLUDED_HOSPITAL_PATTERN.test(name)) continue;

    const city = cols[3]?.trim() || 'Chennai';
    const key = `${name.toLowerCase()}-${city.toLowerCase()}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);

    const hospital = buildHospital(cols);
    if (hospital) parsed.push(hospital);
  }

  return parsed;
};

const getHospitalMetrics = (hospitals) => {
  const totalBeds = hospitals.reduce((sum, h) => sum + h.totalBeds, 0);
  const occupiedBeds = hospitals.reduce((sum, h) => sum + h.occupiedBeds, 0);
  const availableBeds = hospitals.reduce((sum, h) => sum + h.availableBeds, 0);
  const totalVentilators = hospitals.reduce((sum, h) => sum + h.totalVentilators, 0);
  const availableVentilators = hospitals.reduce((sum, h) => sum + h.availableVentilators, 0);
  const oxygenPercentSum = hospitals.reduce((sum, h) => sum + h.oxygenSupplyPercent, 0);
  const activeAmbulances = hospitals.reduce((sum, h) => sum + h.activeAmbulances, 0);
  const availableAmbulances = hospitals.reduce((sum, h) => sum + h.availableAmbulances, 0);
  const vaccineDoses = hospitals.reduce((sum, h) => sum + h.vaccineDoses, 0);

  return {
    hospitalCount: hospitals.length,
    totalBeds,
    occupiedBeds,
    availableBeds,
    bedOccupancy: totalBeds === 0 ? 0 : Math.round((occupiedBeds / totalBeds) * 100),
    totalVentilators,
    availableVentilators,
    oxygenSupplyPercent: hospitals.length > 0 ? Math.round(oxygenPercentSum / hospitals.length) : 0,
    activeAmbulances,
    availableAmbulances,
    vaccineDoses,
  };
};

const pickDispatchHospital = (hospitals, cityPreference) => {
  const inCity = cityPreference
    ? hospitals.filter((h) => h.city.toLowerCase() === String(cityPreference).toLowerCase())
    : [];

  const pool = inCity.length > 0 ? inCity : hospitals;
  return [...pool].sort((a, b) => {
    if (b.availableVentilators !== a.availableVentilators) return b.availableVentilators - a.availableVentilators;
    return b.availableBeds - a.availableBeds;
  })[0];
};

const touchMeta = () => {
  db.data.meta.updatedAt = new Date().toISOString();
};

if (!Array.isArray(db.data.hospitals) || db.data.hospitals.length === 0) {
  db.data.hospitals = parseHospitalsFromCsv();
  db.data.meta.source = 'seeded-from-csv';
  touchMeta();
  await db.write();
}

if (!db.data.disasterState) {
  db.data.disasterState = defaultData.disasterState;
  touchMeta();
  await db.write();
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, updatedAt: db.data.meta.updatedAt, hospitalCount: db.data.hospitals.length });
});

app.get('/api/hospitals', (_req, res) => {
  res.json(db.data.hospitals);
});

app.get('/api/hospitals/metrics', (_req, res) => {
  res.json(getHospitalMetrics(db.data.hospitals));
});

app.get('/api/hospitals/top', (req, res) => {
  const count = Number(req.query.count || 10);
  const data = [...db.data.hospitals]
    .sort((a, b) => b.availableBeds - a.availableBeds)
    .slice(0, Math.max(1, Math.min(100, count)));
  res.json(data);
});

app.get('/api/hospitals/dispatch', (req, res) => {
  const hospital = pickDispatchHospital(db.data.hospitals, req.query.city);
  res.json(hospital || null);
});

app.patch('/api/hospitals/:id', async (req, res) => {
  const id = req.params.id;
  const index = db.data.hospitals.findIndex((h) => String(h.id) === String(id));
  if (index === -1) {
    res.status(404).json({ message: 'Hospital not found' });
    return;
  }

  db.data.hospitals[index] = {
    ...db.data.hospitals[index],
    ...req.body,
  };

  touchMeta();
  await db.write();
  res.json(db.data.hospitals[index]);
});

app.get('/api/bio/patients', (_req, res) => {
  const patients = [...db.data.bioPatients].sort((a, b) => {
    const aTs = new Date(a.timestamp || 0).getTime();
    const bTs = new Date(b.timestamp || 0).getTime();
    return bTs - aTs;
  });
  res.json(patients);
});

app.post('/api/bio/patients', async (req, res) => {
  const payload = req.body || {};
  const id = payload.id || `PAT-${Math.floor(Math.random() * 100000)}`;
  const patient = {
    ...payload,
    id,
    timestamp: payload.timestamp || new Date().toISOString(),
    lastCheckIn: payload.lastCheckIn || new Date().toISOString(),
  };

  const index = db.data.bioPatients.findIndex((p) => p.id === id);
  if (index >= 0) {
    db.data.bioPatients[index] = patient;
  } else {
    db.data.bioPatients.push(patient);
  }

  touchMeta();
  await db.write();
  res.status(201).json(patient);
});

app.patch('/api/bio/patients/:id', async (req, res) => {
  const id = req.params.id;
  const index = db.data.bioPatients.findIndex((p) => p.id === id);
  if (index === -1) {
    res.status(404).json({ message: 'Bio patient not found' });
    return;
  }

  db.data.bioPatients[index] = {
    ...db.data.bioPatients[index],
    ...req.body,
  };

  touchMeta();
  await db.write();
  res.json(db.data.bioPatients[index]);
});

app.delete('/api/bio/patients/:id', async (req, res) => {
  const id = req.params.id;
  const index = db.data.bioPatients.findIndex((p) => p.id === id);
  if (index === -1) {
    res.status(404).json({ message: 'Bio patient not found' });
    return;
  }

  db.data.bioPatients.splice(index, 1);
  touchMeta();
  await db.write();
  res.json({ message: 'Patient deleted successfully' });
});

// ==========================================
// MISTRAL AI CHATBOT ENDPOINTS
// ==========================================

const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3';

const MEDICAL_SYSTEM_PROMPT = `You are BioSentinel, an advanced AI medical triage assistant deployed in Tamil Nadu, India. You help patients describe their symptoms through natural conversation.

Guidelines:
- Be empathetic, professional, and concise (2-3 sentences per reply)
- Ask focused follow-up questions about symptom severity, duration, and associated symptoms
- Never diagnose — only assess urgency and recommend appropriate care level
- If symptoms sound critical (chest pain, breathing difficulty, stroke signs, heavy bleeding), immediately flag urgency
- Gather: symptom details, duration, severity (1-10), fever, breathing status, pain location, medical history
- After gathering enough info (usually 3-5 exchanges), tell the patient you have enough information for assessment`;

const callMistral = async (prompt, maxTokens = 200) => {
  const hfKey = process.env.HF_API_KEY || '';
  if (!hfKey) throw new Error('No HF_API_KEY configured');

  const response = await fetch(HF_MODEL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hfKey}`,
      'x-wait-for-model': 'true',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: maxTokens,
        return_full_text: false,
        temperature: 0.4,
        top_p: 0.9,
        do_sample: true,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error(`HF API error ${response.status}:`, errText);
    throw new Error(`HF API failed with status ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text.trim();
  }
  throw new Error('Unexpected HF response format');
};

// Smart keyword-based fallback scoring when AI is unavailable
const keywordTriageScore = (transcript) => {
  const text = transcript.toLowerCase();
  let score = 15; // baseline
  const detectedSymptoms = [];

  const criticalKeywords = {
    'chest pain': 25, 'heart attack': 30, 'stroke': 30, 'unconscious': 28,
    'can\'t breathe': 25, 'difficulty breathing': 22, 'shortness of breath': 20,
    'heavy bleeding': 25, 'seizure': 25, 'paralysis': 28, 'coughing blood': 25,
    'severe pain': 18, 'collapsed': 25, 'unresponsive': 28,
  };
  const moderateKeywords = {
    'fever': 10, 'high temperature': 10, 'vomiting': 8, 'diarrhea': 6,
    'headache': 5, 'dizzy': 8, 'dizziness': 8, 'nausea': 6, 'cough': 4,
    'infection': 8, 'swelling': 6, 'rash': 4, 'fatigue': 3,
    'body pain': 5, 'weakness': 6, 'sore throat': 3, 'cold': 2,
    'abdominal pain': 8, 'back pain': 5, 'joint pain': 4,
  };
  const escalators = {
    'diabetes': 5, 'asthma': 6, 'cardiac': 8, 'heart disease': 8,
    'hypertension': 5, 'cancer': 7, 'elderly': 5, 'pregnant': 6,
    'child': 4, 'infant': 6, 'baby': 6,
  };

  for (const [kw, pts] of Object.entries(criticalKeywords)) {
    if (text.includes(kw)) { score += pts; detectedSymptoms.push(kw); }
  }
  for (const [kw, pts] of Object.entries(moderateKeywords)) {
    if (text.includes(kw)) { score += pts; detectedSymptoms.push(kw); }
  }
  for (const [kw, pts] of Object.entries(escalators)) {
    if (text.includes(kw)) { score += pts; detectedSymptoms.push(`history: ${kw}`); }
  }

  score = Math.min(98, Math.max(5, score));
  const level = score >= 70 ? 'Critical' : score >= 40 ? 'Moderate' : 'Stable';

  return { score, level, detectedSymptoms: [...new Set(detectedSymptoms)] };
};

// Endpoint 1: Free-form conversation
app.post('/api/chatbot/chat', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Build Mistral [INST] prompt from conversation history
  let prompt = `<s>[INST] ${MEDICAL_SYSTEM_PROMPT}\n\n`;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user') {
      if (i > 0) prompt += `[INST] `;
      prompt += `${msg.content} [/INST]`;
    } else if (msg.role === 'assistant') {
      prompt += ` ${msg.content}</s>\n`;
    }
  }

  try {
    const reply = await callMistral(prompt, 250);
    // Clean up any stray tokens the model might emit
    const cleaned = reply.replace(/<\/?s>/g, '').replace(/\[INST\]|\[\/INST\]/g, '').trim();
    res.json({ reply: cleaned || 'Could you please describe your symptoms in more detail?' });
  } catch (error) {
    console.error('Chat error:', error.message);
    // Provide a contextual fallback response
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const fallbackReplies = [
      'I understand. Can you tell me how long you have been experiencing these symptoms?',
      'Thank you for sharing that. On a scale of 1-10, how severe is your discomfort right now?',
      'I see. Do you have any pre-existing medical conditions like diabetes, asthma, or heart disease?',
      'Got it. Are you experiencing any fever, chills, or difficulty breathing along with this?',
      'Thank you. Have you taken any medication for these symptoms so far?',
    ];
    const idx = messages.filter(m => m.role === 'user').length % fallbackReplies.length;
    res.json({ reply: fallbackReplies[idx], source: 'fallback' });
  }
});

// Endpoint 2: Analyze conversation for triage scoring
app.post('/api/chatbot/analyze-triage', async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'transcript is required' });
  }

  const prompt = `<s>[INST] You are a medical triage scoring engine. Analyze the following patient-doctor conversation transcript and provide a triage assessment.

TRANSCRIPT:
${transcript}

Respond ONLY with valid JSON in this exact format, no other text:
{"level":"Stable","score":25,"detectedSymptoms":["headache","mild fever"],"recommendation":"Monitor symptoms at home","reasoning":"Low severity symptoms with no red flags"}

Rules for scoring:
- score 0-30: Stable (minor issues, self-care adequate)
- score 31-60: Moderate (needs medical consultation within hours)
- score 61-100: Critical (needs immediate emergency care)
- Consider symptom severity, duration, combinations, and risk factors
[/INST]`;

  try {
    const raw = await callMistral(prompt, 300);
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON in triage response:', raw);
      throw new Error('No JSON output');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({
      level: parsed.level || 'Moderate',
      score: Math.max(0, Math.min(100, parsed.score || 50)),
      confidence: 0.85,
      detectedSymptoms: Array.isArray(parsed.detectedSymptoms) ? parsed.detectedSymptoms : [],
      recommendation: parsed.recommendation || 'Seek medical consultation',
      reasoning: parsed.reasoning || '',
      source: 'mistral',
      model: 'Mistral-7B-Instruct-v0.3',
    });
  } catch (error) {
    console.error('Triage analysis error:', error.message);
    // Smart keyword fallback instead of hardcoded 65
    const fallback = keywordTriageScore(transcript);
    const recommendation = fallback.level === 'Critical'
      ? 'Seek immediate emergency care. Call ambulance if necessary.'
      : fallback.level === 'Moderate'
        ? 'Schedule a medical consultation within the next few hours.'
        : 'Monitor symptoms at home. Seek care if symptoms worsen.';

    res.json({
      ...fallback,
      confidence: 0.7,
      recommendation,
      reasoning: 'Assessment based on symptom keyword analysis.',
      source: 'keyword-fallback',
      model: 'Sentinel Keyword Engine',
    });
  }
});

// Legacy endpoint — kept for backward compatibility
app.post('/api/chatbot/biomistral-triage', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.interviewData) {
    return res.status(400).json({ error: 'Missing interviewData' });
  }

  const transcript = `Patient: ${payload.interviewData.name || 'Unknown'}, Age: ${payload.interviewData.age || 'unknown'}. Symptoms: ${payload.interviewData.symptomsNarrative || 'none described'}. Fever: ${payload.interviewData.feverOrTemp || 'unknown'}. Breathing: ${payload.interviewData.breathingOrSpO2 || 'unknown'}. Chest Pain: ${payload.interviewData.chestPain || 'unknown'}. Chronic Conditions: ${payload.interviewData.chronicConditions || 'none'}. ${payload.transcript || ''}`;

  // Delegate to the new analyze-triage logic internally
  const prompt = `<s>[INST] You are a medical triage scoring engine. Analyze the following patient data and respond ONLY with valid JSON.

Patient: ${transcript}

Respond ONLY with this JSON format:
{"level":"Stable","score":25,"detectedSymptoms":["symptom1"],"recommendation":"advice","reasoning":"reasoning"}

Score 0-30=Stable, 31-60=Moderate, 61-100=Critical.
[/INST]`;

  try {
    const raw = await callMistral(prompt, 300);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    const parsed = JSON.parse(jsonMatch[0]);

    res.json({
      level: parsed.level || 'Moderate',
      score: Math.max(0, Math.min(100, parsed.score || 50)),
      confidence: 0.85,
      detectedSymptoms: Array.isArray(parsed.detectedSymptoms) ? parsed.detectedSymptoms : [],
      recommendation: parsed.recommendation || 'Seek medical attention',
      reasoning: parsed.reasoning || '',
      source: 'mistral',
      model: 'Mistral-7B-Instruct-v0.3',
    });
  } catch (error) {
    console.error('Legacy triage error:', error.message);
    const fallback = keywordTriageScore(transcript);
    res.json({
      ...fallback,
      confidence: 0.7,
      recommendation: fallback.level === 'Critical' ? 'Immediate emergency care recommended.' : 'Seek medical consultation.',
      reasoning: 'Keyword-based assessment (AI model temporarily unavailable).',
      source: 'keyword-fallback',
      model: 'Sentinel Keyword Engine',
    });
  }
});

app.get('/api/disaster/state', (_req, res) => {
  res.json(db.data.disasterState);
});

app.put('/api/disaster/state', async (req, res) => {
  const payload = req.body || {};
  db.data.disasterState = {
    riskLevel: payload.riskLevel || 'Moderate',
    patients: Array.isArray(payload.patients) ? payload.patients : [],
    hospitals: Array.isArray(payload.hospitals) ? payload.hospitals : [],
    events: Array.isArray(payload.events) ? payload.events : [],
  };

  touchMeta();
  await db.write();
  res.json({ ok: true, updatedAt: db.data.meta.updatedAt });
});

// ==========================================
// WALKIE-TALKIE BART NLP ENDPOINT
// ==========================================

const callBartZeroShot = async (text, labels) => {
  const hfKey = process.env.HF_API_KEY || '';
  if (!hfKey) throw new Error('No HF_API_KEY configured for BART');

  const MODEL = 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli';
  const response = await fetch(MODEL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hfKey}`,
      'x-wait-for-model': 'true',
    },
    body: JSON.stringify({
      inputs: text,
      parameters: { candidate_labels: labels },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error(`BART API error ${response.status}:`, errText);
    throw new Error(`BART API failed with status ${response.status}`);
  }

  return response.json();
};

app.post('/api/walkie/analyze-triage', async (req, res) => {
  const { transcript, hospitals, seismicAnomaly } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: 'transcript is required' });
  }

  // Identify Symptoms
  const symptomLabels = [
    'chest pain', 'cardiac arrest', 'heavy breathing', 'unconscious', 'severe bleeding', 
    'immobile', 'burn injury', 'crush injury', 'head trauma', 'shock', 'minor scrape'
  ];
  
  // Identify Urgency Level
  const urgencyLabels = [
    'critical emergency', 'moderate injury', 'minor condition', 'stable condition', 'deceased'
  ];

  try {
    const [symptomsData, urgencyData] = await Promise.all([
      callBartZeroShot(transcript, symptomLabels),
      callBartZeroShot(transcript, urgencyLabels)
    ]);
    
    // Convert to reasonable score based on BART model probabilities
    let score = 20; // baseline
    const matchedSymptoms = [];
    
    // Add strong symptom matches
    for (let i = 0; i < symptomsData.labels.length; i++) {
        if (symptomsData.scores[i] > 0.6) {
            matchedSymptoms.push(symptomsData.labels[i]);
            score += Math.round(symptomsData.scores[i] * 15); // max 15 pts per symptom
        }
    }
    
    const maxUrgencyLabel = urgencyData.labels[0];
    const maxUrgencyScore = urgencyData.scores[0];

    if (maxUrgencyLabel === 'critical emergency' || maxUrgencyLabel === 'deceased') {
      score += 40;
    } else if (maxUrgencyLabel === 'moderate injury') {
      score += 20;
    } else if (maxUrgencyLabel === 'minor condition') {
      score += 5;
    }
    
    // Score scaling & capping
    score = Math.min(100, Math.max(10, score));

    // Tag assignment logic
    let tag = 'GREEN';
    if (maxUrgencyLabel === 'deceased' && score > 90) tag = 'BLACK';
    else if (score >= 80) tag = 'RED';
    else if (score >= 50) tag = 'YELLOW';
    else tag = 'GREEN';

    // Figure out optimal hospital route
    let sortedHospitals = [...(hospitals || db.data.hospitals || [])];
    if (seismicAnomaly && seismicAnomaly.epicenter) {
      const [latE, lngE] = seismicAnomaly.epicenter;
      sortedHospitals = sortedHospitals
        .map(h => ({ ...h, dist: Math.sqrt(Math.pow(h.lat - latE, 2) + Math.pow(h.lng - lngE, 2)) }))
        .sort((a, b) => (a.dist || 0) - (b.dist || 0));
    } else {
      sortedHospitals = sortedHospitals.sort((a, b) => b.availableBeds - a.availableBeds);
    }
    
    const preferredHospital = sortedHospitals.find((h) => h.capacity < 95) || sortedHospitals[0] || { name: 'Nearest Hospital' };
    const etaMinutes = 8 + Math.floor(Math.random() * 8);

    const confidence = Math.round(maxUrgencyScore * 100);

    const generatedResponse = `Patient triaged ${tag} Priority with a severity score of ${score}. Detected conditions: ${matchedSymptoms.length > 0 ? matchedSymptoms.join(', ') : 'none'}. Responding units route to ${preferredHospital.name}. Estimated Time of Arrival is ${etaMinutes} minutes.`;

    const voiceTriageSignal = {
        selectedSymptoms: matchedSymptoms,
        notes: transcript,
        age: 'Unknown',
        consciousness: matchedSymptoms.includes('unconscious') ? 'UNCONSCIOUS' : 'CONSCIOUS',
        bleeding: matchedSymptoms.includes('severe bleeding') ? 'Severe' : 'None',
        mobility: matchedSymptoms.includes('immobile') ? 'Immobile' : 'Unknown',
    };

    res.json({
      score,
      tag,
      confidence,
      matchedSymptoms,
      hospitalName: preferredHospital.name,
      eta: `${etaMinutes} min`,
      responsePreview: generatedResponse,
      voiceTriageSignal,
      source: 'bart-zero-shot'
    });

  } catch (err) {
    console.error('BART Zero-Shot Error:', err);
    // Smart fallback strategy
    const fTag = 'YELLOW';
    res.json({
        score: 65,
        tag: fTag,
        confidence: 60,
        matchedSymptoms: ['symptom matching failed (fallback)'],
        hospitalName: (hospitals && hospitals[0] && hospitals[0].name) || 'Nearest Hospital',
        eta: '10 min',
        responsePreview: `System failure. Defaulting to ${fTag} Priority. Route to nearest location. ETA 10 minutes.`,
        voiceTriageSignal: { selectedSymptoms: [], notes: transcript, age: 'Unknown', consciousness: 'CONSCIOUS', bleeding: 'Unknown', mobility: 'Unknown' },
        source: 'fallback'
    });
  }
});

// ==========================================
// DISASTER WORKFLOW ORCHESTRATION PIPELINE
// ==========================================

let disasterClients = [];

app.get('/api/disaster/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  disasterClients.push(res);

  // Send initial connection heartbeat
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  // Automated Escalation Simulator
  // T=10s: Trigger Earthquake Warning
  const eqTimer = setTimeout(() => {
    res.write(`data: ${JSON.stringify({
      type: 'EARTHQUAKE',
      payload: { magnitude: 7.2, epicenter: [13.0827, 80.2707], depth: 15 }
    })}\n\n`);
  }, 10000);

  // T=25s: Trigger Cascading Tsunami Warning
  const tsTimer = setTimeout(() => {
    res.write(`data: ${JSON.stringify({
      type: 'TSUNAMI',
      payload: { active: true, eta: 45, maxWaveHeight: 4.5 }
    })}\n\n`);
  }, 25000);

  req.on('close', () => {
    clearTimeout(eqTimer);
    clearTimeout(tsTimer);
    disasterClients = disasterClients.filter(c => c !== res);
  });
});

app.post('/api/disaster/generate-report', async (req, res) => {
  const { epicenter, magnitude, affectedHospitalsCount } = req.body;

  const prompt = `[INST] You are BioIntelligence Sentinel, a cutting-edge command center AI. 
A major disaster has just occurred. Generate a 3-paragraph executive situation report.

DATA:
- Event: Magnitude ${magnitude} Earthquake followed by Tsunami Warning
- Epicenter Location: [${epicenter}]
- Automated Response Action: Reserved beds dynamically at ${affectedHospitalsCount} structurally safe regional hospitals. Sent fleet logistics. Broadcasted evacuation protocols.

Instruct: Write a highly professional, clinical 3 paragraph incident summary suitable for the state governor. Detail the geographic event, the automated medical response performed by Sentinel, and projected casualty stabilization. Do not include pleasantries. [/INST]`;

  try {
    const isMock = !process.env.HF_API_KEY || process.env.HF_API_KEY === 'your_huggingface_api_key_here';
    const fallbackSummary = `At ${new Date().toLocaleTimeString()}, a massive Magnitude ${magnitude} seismic event struck near coordinates [${epicenter}]. Immediate oceanographic sensor telemetry subsequently triggered a Category 4 coastal inundation warning (Tsunami ETA: 45m). Severe structural damage is projected along the immediate fault line.\n\nBioIntelligence Sentinel emergency SOS protocols have programmatically locked grid capacity at ${affectedHospitalsCount} structurally secure regional hospitals, actively diverting severe trauma cases away from the unstable coastal red zone. Fleet logistics have automatically auto-routed all available Idle ambulance units to Sector Alpha for immediate extraction support.\n\nProjected human casualty estimates are categorized as Moderate-to-Severe; however, the immediate automated load-balancing of the regional healthcare grid has successfully stabilized incoming triage queues. Statewide search, rescue, and evacuation coordinates have been continuously broadcasted.`;

    if (isMock) {
      return res.json({ summary: fallbackSummary });
    }

    const hfText = await callMistral(prompt, 400);
    res.json({ summary: hfText });
  } catch (err) {
    console.error('NLP Report formatting error:', err.message);
    const fallbackSummary = `At ${new Date().toLocaleTimeString()}, a massive Magnitude ${magnitude} seismic event struck near coordinates [${epicenter}]. Immediate oceanographic sensor telemetry subsequently triggered a Category 4 coastal inundation warning (Tsunami ETA: 45m). Severe structural damage is projected along the immediate fault line.\n\nBioIntelligence Sentinel emergency SOS protocols have programmatically locked grid capacity at ${affectedHospitalsCount} structurally secure regional hospitals, actively diverting severe trauma cases away from the unstable coastal red zone. Fleet logistics have automatically auto-routed all available Idle ambulance units to Sector Alpha for immediate extraction support.\n\nProjected human casualty estimates are categorized as Moderate-to-Severe; however, the immediate automated load-balancing of the regional healthcare grid has successfully stabilized incoming triage queues. Statewide search, rescue, and evacuation coordinates have been continuously broadcasted.`;
    res.json({ summary: fallbackSummary });
  }
});

const port = Number(process.env.API_PORT || 4000);
app.listen(port, () => {
  console.log(`[sentinel-backend] listening on http://localhost:${port}`);
  console.log(`[sentinel-backend] db: ${dbPath}`);
});
