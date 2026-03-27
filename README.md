<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# BioIntelligence Sentinel
### AI-Powered Multi-Modal Disaster Triage & Live Logistics Dashboard
</div>

BioIntelligence Sentinel is an advanced, real-time command center designed for emergency dispatchers, first responders, and government logistics coordinators during mass-casualty events (Earthquakes, Tsunamis, etc.). 

## 🚀 Key Features Built So Far

1. **State-Wide Hospital Integration (Tamil Nadu)**
   - Fully integrated dataset of **150+ real hospitals** across Tamil Nadu.
   - Algorithms automatically determine the best destination for victims by calculating **geodesic distance** to the epicenter and checking **live bed availability** (simulating FHIR/HL7 EHR API syncs).

2. **Proactive AI Decision Engine**
   - **Executive NLP Reporting**: The system acts autonomously, generating professional, multi-paragraph situational awareness reports based on live local data streams instead of just relying on human input.
   - **Predictive Auto-Routing**: Actively auto-assigns critical (RED) patients to the most optimal facilities to prevent capacity bottlenecks.

3. **Walkie-Talkie NLP Triage System**
   - Live browser-based Web Speech Recognition.
   - Emergency operators can literally "talk" to the system to triage a patient over the radio. The AI extracts medical symptoms (e.g., "crushing chest pain", "unconscious"), age, and mobility, automatically scoring them and pushing them to an active "Analyzed Patients" tracking history.

4. **Live Geospatial Tracking (Tsunami & Earthquake)**
   - **Interactive Leaflet Maps**: Real-time interactive map of the Tamil Nadu coastline.
   - Visualizes the earthquake structural impact radius, tsunami wave velocity, safe shelters, and viable evacuation routes.
   - **Push Evacuation Ready**: UI built to support broadcasting structured evacuation SMS messages to devices in the affected zone.

5. **Streamlined Dispatch UI UX**
   - "Automated-first" design philosophy. The UI eliminates manual bottlenecks. Triage cards update asynchronously, and priority queues are entirely managed by the system, allowing human operators to focus entirely on logistics instead of data-entry.

---

## 💻 Run Locally

**Prerequisites:**  Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```

2. *(Optional)* Set `HF_API_KEY` in `.env.local` to a Hugging Face token to enable live remote inference for the Executive AI Report (currently defaults to an advanced native fallback simulation if omitted).

3. Run the application (Starts the frontend Vite server AND backend Express SSE endpoint natively):
   ```bash
   npm run dev
   ```

4. Open your browser: `http://localhost:3000`
