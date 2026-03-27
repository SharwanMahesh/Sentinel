import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Edit3, 
  Circle as CircleIcon, 
  Trash2, 
  Save, 
  X, 
  AlertCircle, 
  Truck, 
  Hospital, 
  Info,
  ChevronRight,
  Plus,
  Minus,
  Navigation
} from 'lucide-react';
import { useHospitalData } from '../hooks/useHospitalData';

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const ambulanceIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-4.893-1.631A2 2 0 0 0 14 13v5"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const hospitalIcon = (capacity: number) => {
  const color = capacity > 80 ? '#ef4444' : capacity > 50 ? '#f59e0b' : '#10b981';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="relative w-10 h-10 flex items-center justify-center">
            <div class="absolute inset-0 rounded-full border-4 border-slate-200"></div>
            <div class="absolute inset-0 rounded-full border-4" style="border-color: ${color}; clip-path: inset(0 0 ${100 - capacity}% 0);"></div>
            <div class="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/></svg>
            </div>
          </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

interface Zone {
  id: string;
  type: 'polygon' | 'circle';
  coordinates: any;
  riskLevel: 'Low' | 'Medium' | 'High';
  alertMessage: string;
}

interface Ambulance {
  id: string;
  position: [number, number];
  destination: string;
  eta: string;
}

interface HospitalData {
  id: string;
  name: string;
  position: [number, number];
  capacity: number;
  bedsAvailable: number;
  status: 'Stable' | 'Critical';
}

export function ContainmentSection({ initialCenter }: { initialCenter?: [number, number] }) {
  const [activeTool, setActiveTool] = useState<'polygon' | 'radius' | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<any[]>([]);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [tempZone, setTempZone] = useState<Partial<Zone> | null>(null);
  const [heatmapLayers, setHeatmapLayers] = useState({
    sewage: true,
    symptoms: false,
    resources: false
  });
  const [alerts, setAlerts] = useState<{id: number, message: string}[]>([]);
  const [userPos, setUserPos] = useState<[number, number]>(initialCenter || [13.0827, 80.2707]);
  const { hospitals: allHospitals } = useHospitalData();

  // Map all available state hospitals
  const hospitals: HospitalData[] = useMemo(
    () =>
      allHospitals.map((hospital, index) => ({
        id: `H-${index + 1}`,
        name: `${hospital.name} (${hospital.city})`,
        position: [hospital.lat, hospital.lng] as [number, number],
        capacity: hospital.capacity,
        bedsAvailable: hospital.availableBeds,
        status: hospital.status === 'Critical' ? 'Critical' : 'Stable',
      })),
    [allHospitals]
  );

  const ambulances: Ambulance[] = useMemo(() => {
    if (hospitals.length === 0) {
      return [
        { id: 'AMB-01', position: [13.086, 80.271], destination: 'Fallback Dispatch', eta: '6m' },
      ];
    }

    // Distribute 15 ambulances roughly uniformly across the hospital dataset
    const distributedHospitals = hospitals.filter((_, i) => i % Math.max(1, Math.floor(hospitals.length / 15)) === 0).slice(0, 15);

    return distributedHospitals.map((hospital, idx) => ({
      id: `AMB-${String(idx + 1).padStart(2, '0')}`,
      position: [hospital.position[0] + (Math.random() * 0.04 - 0.02), hospital.position[1] + (Math.random() * 0.04 - 0.02)] as [number, number],
      destination: hospital.name,
      eta: `${Math.floor(Math.random() * 15) + 3}m`,
    }));
  }, [hospitals]);

  // Geofence detection
  useEffect(() => {
    const checkGeofences = () => {
      zones.forEach(zone => {
        let inside = false;
        if (zone.type === 'polygon') {
          const poly = turf.polygon([zone.coordinates]);
          const pt = turf.point([userPos[1], userPos[0]]);
          inside = turf.booleanPointInPolygon(pt, poly);
        } else if (zone.type === 'circle') {
          const center = [zone.coordinates.center[1], zone.coordinates.center[0]];
          const pt = [userPos[1], userPos[0]];
          const distance = turf.distance(turf.point(center), turf.point(pt), { units: 'kilometers' });
          inside = distance <= zone.coordinates.radius / 1000;
        }

        if (inside && zone.riskLevel === 'High') {
          addAlert(`Entering High Risk Zone: ${zone.alertMessage}`);
        }
      });
    };

    checkGeofences();
  }, [userPos, zones]);

  const addAlert = (message: string) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);
  };

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (activeTool === 'polygon') {
          setCurrentDrawing(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
        } else if (activeTool === 'radius') {
          const newZone: Zone = {
            id: Date.now().toString(),
            type: 'circle',
            coordinates: { center: [e.latlng.lat, e.latlng.lng], radius: 500 },
            riskLevel: 'Medium',
            alertMessage: 'Radius alert'
          };
          setTempZone(newZone);
          setConfigPanelOpen(true);
          setActiveTool(null);
        }
      }
    });
    return null;
  };

  const handleSavePolygon = () => {
    if (currentDrawing.length < 3) return;
    const newZone: Zone = {
      id: Date.now().toString(),
      type: 'polygon',
      coordinates: [...currentDrawing, currentDrawing[0]],
      riskLevel: 'Medium',
      alertMessage: 'Polygon alert'
    };
    setTempZone(newZone);
    setConfigPanelOpen(true);
    setCurrentDrawing([]);
    setActiveTool(null);
  };

  const saveZone = () => {
    if (tempZone) {
      setZones(prev => [...prev, tempZone as Zone]);
      setTempZone(null);
      setConfigPanelOpen(false);
      addAlert("Zone saved successfully");
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-[#F5F7FB] rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
      {/* Map Canvas */}
      <div className="flex-grow relative">
        <MapContainer center={initialCenter || [11.1271, 78.6569]} zoom={initialCenter ? 11 : 6.5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          <MapEvents />

          {/* User Marker (Simulated) */}
          <Marker position={userPos} draggable={true} eventHandlers={{ dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            setUserPos([position.lat, position.lng]);
          }}}>
            <Popup>You (Drag to test geofences)</Popup>
          </Marker>

          {/* Zones */}
          {zones.map(zone => (
            zone.type === 'polygon' ? (
              <Polygon 
                key={zone.id} 
                positions={zone.coordinates} 
                pathOptions={{ 
                  fillColor: zone.riskLevel === 'High' ? '#ef4444' : zone.riskLevel === 'Medium' ? '#f59e0b' : '#3b82f6',
                  fillOpacity: 0.2,
                  color: zone.riskLevel === 'High' ? '#ef4444' : zone.riskLevel === 'Medium' ? '#f59e0b' : '#3b82f6',
                  weight: 2
                }} 
              />
            ) : (
              <Circle 
                key={zone.id} 
                center={zone.coordinates.center} 
                radius={zone.coordinates.radius}
                pathOptions={{ 
                  fillColor: zone.riskLevel === 'High' ? '#ef4444' : zone.riskLevel === 'Medium' ? '#f59e0b' : '#3b82f6',
                  fillOpacity: 0.2,
                  color: zone.riskLevel === 'High' ? '#ef4444' : zone.riskLevel === 'Medium' ? '#f59e0b' : '#3b82f6',
                  weight: 2
                }}
              />
            )
          ))}

          {/* Current Drawing */}
          {currentDrawing.length > 0 && (
            <Polygon positions={currentDrawing} pathOptions={{ color: '#3b82f6', dashArray: '5, 5' }} />
          )}

          {/* Ambulances */}
          {ambulances.map(amb => (
            <Marker key={amb.id} position={amb.position} icon={ambulanceIcon}>
              <Popup>
                <div className="p-2">
                  <div className="font-bold text-blue-600 mb-1">{amb.id}</div>
                  <div className="text-xs text-slate-500">Destination: {amb.destination}</div>
                  <div className="text-xs font-bold">ETA: {amb.eta}</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Hospitals */}
          {hospitals.map(hosp => (
            <Marker key={hosp.id} position={hosp.position} icon={hospitalIcon(hosp.capacity)}>
              <Popup>
                <div className="p-2">
                  <div className="font-bold mb-1">{hosp.name}</div>
                  <div className="text-xs text-slate-500 mb-2">Beds Available: {hosp.bedsAvailable}</div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${hosp.status === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    Status: {hosp.status}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Heatmap Layers (Simulated with Circles) */}
          {heatmapLayers.sewage && (
            <Circle center={[13.09, 80.26]} radius={2000} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.1, stroke: false }} />
          )}
          {heatmapLayers.symptoms && (
            <Circle center={[13.07, 80.29]} radius={1500} pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.1, stroke: false }} />
          )}
          {heatmapLayers.resources && (
            <Circle center={[13.04, 80.24]} radius={1200} pathOptions={{ fillColor: '#10b981', fillOpacity: 0.1, stroke: false }} />
          )}
        </MapContainer>

        {/* Top-left: Heatmap Controls */}
        <div className="absolute top-4 left-4 z-[1000] flex gap-2">
          {(['sewage', 'symptoms', 'resources'] as const).map(layer => (
            <button
              key={layer}
              onClick={() => setHeatmapLayers(prev => ({ ...prev, [layer]: !prev[layer] }))}
              className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm border transition-all ${
                heatmapLayers[layer] 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {layer.charAt(0).toUpperCase() + layer.slice(1)}
            </button>
          ))}
        </div>

        {/* Top-right: Fence Editor Tool */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <div className="bg-white p-1.5 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-1">
            <button 
              onClick={() => setActiveTool(activeTool === 'polygon' ? null : 'polygon')}
              className={`p-2 rounded-lg transition-all ${activeTool === 'polygon' ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Polygon Draw"
            >
              <Edit3 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTool(activeTool === 'radius' ? null : 'radius')}
              className={`p-2 rounded-lg transition-all ${activeTool === 'radius' ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Radius Tool"
            >
              <CircleIcon className="w-5 h-5" />
            </button>
            <div className="h-px bg-slate-100 mx-1"></div>
            <button 
              onClick={() => { setZones([]); setCurrentDrawing([]); setActiveTool(null); }}
              className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
              title="Clear All"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {activeTool === 'polygon' && currentDrawing.length > 0 && (
            <button 
              onClick={handleSavePolygon}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce"
            >
              <Save className="w-4 h-4" /> Finish Polygon
            </button>
          )}
        </div>

        {/* Bottom-left: Legend */}
        <div className="absolute bottom-6 left-6 z-[1000]">
          <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 w-48">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Map Legend</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-200"></div>
                <span className="text-xs font-bold text-slate-700">High Risk Zone</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-400 shadow-sm shadow-orange-200"></div>
                <span className="text-xs font-bold text-slate-700">Medium Spread</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></div>
                <span className="text-xs font-bold text-slate-700">Active Monitoring</span>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">Ambulance</span>
              </div>
              <div className="flex items-center gap-3">
                <Hospital className="w-3 h-3 text-emerald-500" />
                <span className="text-xs font-bold text-slate-700">Hospital</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-right: Alerts */}
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2 items-end">
          <AnimatePresence>
            {alerts.map(alert => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className="bg-white border-l-4 border-red-500 p-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px]"
              >
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-grow">
                  <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Security Alert</div>
                  <div className="text-xs font-bold text-slate-900">{alert.message}</div>
                </div>
                <button onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))} className="text-slate-300 hover:text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Side Configuration Panel */}
      <AnimatePresence>
        {configPanelOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfigPanelOpen(false)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-[1001]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl z-[1002] border-l border-slate-100 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900">Zone Configuration</h3>
                <button onClick={() => setConfigPanelOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex-grow space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Risk Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Low', 'Medium', 'High'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => setTempZone(prev => ({ ...prev!, riskLevel: level }))}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          tempZone?.riskLevel === level 
                          ? level === 'High' ? 'bg-red-500 text-white border-red-500' : level === 'Medium' ? 'bg-orange-500 text-white border-orange-500' : 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Alert Message</label>
                  <textarea 
                    value={tempZone?.alertMessage || ''}
                    onChange={(e) => setTempZone(prev => ({ ...prev!, alertMessage: e.target.value }))}
                    className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    placeholder="Enter alert message for this zone..."
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                    Automated alerts will be triggered for all personnel entering this geofenced area.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100">
                <button 
                  onClick={saveZone}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" /> Save Zone
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
