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
const csvPath = path.join(rootDir, 'resources', 'TNHospitals (1).csv');

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
  const seedKey = `${raw.name}-${raw.city}-${raw.pincode}`;
  const h1 = seeded(`${seedKey}-beds`);
  const h2 = seeded(`${seedKey}-occ`);
  const h3 = seeded(`${seedKey}-icu`);
  const h4 = seeded(`${seedKey}-oxy`);
  const h5 = seeded(`${seedKey}-vax`);

  const totalBeds = 80 + (h1 % 420);
  const occupancyPct = 45 + (h2 % 50);
  const occupiedBeds = Math.min(totalBeds, Math.round((totalBeds * occupancyPct) / 100));
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);

  const icuBeds = Math.max(8, Math.round(totalBeds * (0.12 + (h3 % 9) / 100)));
  const icuOccupied = Math.min(icuBeds, Math.round((icuBeds * (50 + (h2 % 45))) / 100));
  const availableIcuBeds = Math.max(0, icuBeds - icuOccupied);

  const oxygenLiters = 1500 + (h4 % 9000);
  const vaccineDoses = 300 + (h5 % 5200);
  const capacity = Math.round((occupiedBeds / totalBeds) * 100);
  const status = capacity >= 90 ? 'Critical' : capacity >= 75 ? 'Warning' : 'Normal';
  const [lat, lng] = withCityCoordinates(raw.city, seedKey);

  return {
    id: raw.id,
    name: raw.name,
    state: raw.state,
    city: raw.city,
    address: raw.address,
    pincode: raw.pincode,
    totalBeds,
    occupiedBeds,
    availableBeds,
    icuBeds,
    availableIcuBeds,
    oxygenLiters,
    vaccineDoses,
    capacity,
    status,
    lat,
    lng,
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
    const name = (cols[hospitalIdx] || '').trim();
    if (!name) continue;
    if (EXCLUDED_HOSPITAL_PATTERN.test(name)) continue;

    const city = (cols[cityIdx] || 'Chennai').trim() || 'Chennai';
    const key = `${name.toLowerCase()}-${city.toLowerCase()}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);

    parsed.push(
      buildHospital({
        id: (cols[idIdx] || `${i}`).trim() || `${i}`,
        name,
        state: (cols[stateIdx] || 'Tamilnadu').trim() || 'Tamilnadu',
        city,
        address: (cols[addrIdx] || '').trim(),
        pincode: (cols[pinIdx] || '').trim(),
      }),
    );
  }

  return parsed;
};

const getHospitalMetrics = (hospitals) => {
  const totalBeds = hospitals.reduce((sum, h) => sum + h.totalBeds, 0);
  const occupiedBeds = hospitals.reduce((sum, h) => sum + h.occupiedBeds, 0);
  const availableBeds = hospitals.reduce((sum, h) => sum + h.availableBeds, 0);
  const totalIcuBeds = hospitals.reduce((sum, h) => sum + h.icuBeds, 0);
  const availableIcuBeds = hospitals.reduce((sum, h) => sum + h.availableIcuBeds, 0);
  const oxygenLiters = hospitals.reduce((sum, h) => sum + h.oxygenLiters, 0);
  const vaccineDoses = hospitals.reduce((sum, h) => sum + h.vaccineDoses, 0);

  return {
    hospitalCount: hospitals.length,
    totalBeds,
    occupiedBeds,
    availableBeds,
    bedOccupancy: totalBeds === 0 ? 0 : Math.round((occupiedBeds / totalBeds) * 100),
    totalIcuBeds,
    availableIcuBeds,
    oxygenLiters,
    vaccineDoses,
  };
};

const pickDispatchHospital = (hospitals, cityPreference) => {
  const inCity = cityPreference
    ? hospitals.filter((h) => h.city.toLowerCase() === String(cityPreference).toLowerCase())
    : [];

  const pool = inCity.length > 0 ? inCity : hospitals;
  return [...pool].sort((a, b) => {
    if (b.availableIcuBeds !== a.availableIcuBeds) return b.availableIcuBeds - a.availableIcuBeds;
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

app.post('/api/chatbot/biomistral-triage', async (req, res) => {
  const payload = req.body;
  
  if (!payload || !payload.interviewData) {
    res.status(400).json({ error: 'Missing interviewData' });
    return;
  }

  const prompt = `[INST] You are an expert medical triage assistant. Analyze this patient data and respond ONLY in valid JSON format. Do not include any other text.
Patient Data:
Name: ${payload.interviewData.name}
Age: ${payload.interviewData.age}
Symptoms: ${payload.interviewData.symptomsNarrative}
Fever/Temp: ${payload.interviewData.feverOrTemp}
Breathing/SpO2: ${payload.interviewData.breathingOrSpO2}
Chest Pain: ${payload.interviewData.chestPain}
Chronic Conditions: ${payload.interviewData.chronicConditions}
Transcript: ${payload.transcript || 'none'}

Required JSON format:
{
  "level": "Stable" or "Moderate" or "Critical",
  "score": <0-100 number representing urgency, where 100 is most urgent>,
  "detectedSymptoms": ["symptom1", "symptom2", ...],
  "recommendation": "Brief actionable recommendation for the patient",
  "reasoning": "Brief clinical reasoning"
}
[/INST]`;

  try {
    const hfKey = process.env.HF_API_KEY || ''; 
    const response = await fetch('https://api-inference.huggingface.co/models/BioMistral/BioMistral-7B', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hfKey ? { Authorization: `Bearer ${hfKey}` } : {})
      },
      body: JSON.stringify({ 
        inputs: prompt,
        parameters: { max_new_tokens: 250, return_full_text: false, temperature: 0.1 }
      })
    });

    if (!response.ok) {
      console.warn(`HF API responded with status ${response.status}`);
      throw new Error('HF API failed');
    }
    
    const data = await response.json();
    let textResult = data[0].generated_text;
    
    const jsonMatch = textResult.match(/\\{[\\s\\S]*\\}/);
    if (!jsonMatch) {
      console.warn('Could not parse JSON from HF output:', textResult);
      throw new Error('No JSON output');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);

    res.json({
      level: parsed.level || 'Moderate',
      score: parsed.score || 50,
      confidence: 0.85,
      detectedSymptoms: parsed.detectedSymptoms || [],
      recommendation: parsed.recommendation || 'Seek medical attention',
      reasoning: parsed.reasoning || '',
      source: 'huggingface',
      model: 'BioMistral-7b'
    });
  } catch (error) {
    console.error("BioMistral Error:", error.message);
    res.json({
      level: 'Moderate',
      score: 65,
      confidence: 0.9,
      detectedSymptoms: ['Fallback Triage'],
      recommendation: 'Seek online consult within 1 hour.',
      reasoning: 'AI API unavailable - fallback activated.',
      source: 'fallback',
      model: 'Rule-based Engine'
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
    if (isMock) {
      return res.json({
        summary: `At ${new Date().toLocaleTimeString()}, a massive Magnitude ${magnitude} seismic event struck near coordinates [${epicenter}]. Immediate oceanographic sensor telemetry subsequently triggered a Category 4 coastal inundation warning (Tsunami ETA: 45m). Severe structural damage is projected along the immediate fault line.\n\nBioIntelligence Sentinel emergency SOS protocols have programmatically locked grid capacity at ${affectedHospitalsCount} structurally secure regional hospitals, actively diverting severe trauma cases away from the unstable coastal red zone. Fleet logistics have automatically auto-routed all available Idle ambulance units to Sector Alpha for immediate extraction support.\n\nProjected human casualty estimates are categorized as Moderate-to-Severe; however, the immediate automated load-balancing of the regional healthcare grid has successfully stabilized incoming triage queues. Statewide search, rescue, and evacuation coordinates have been continuously broadcasted.`
      });
    }

    const hfText = await callHuggingFace(prompt);
    
    res.json({ summary: hfText });
  } catch (err) {
    console.error('NLP Report formatting error:', err);
    res.json({ summary: `System Error: Unable to generate NLP impact report via external inference. Fallback operational logs note an earthquake of Magnitude ${magnitude} and automated lockdown of ${affectedHospitalsCount} facilities.` });
  }
});

const port = Number(process.env.API_PORT || 4000);
app.listen(port, () => {
  console.log(`[sentinel-backend] listening on http://localhost:${port}`);
  console.log(`[sentinel-backend] db: ${dbPath}`);
});
