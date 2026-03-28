import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  tamilNaduHospitals as fallbackHospitals,
  tamilNaduHospitalMetrics as fallbackMetrics,
  type TamilNaduHospital,
} from '../data/tamilNaduHospitals';
import { getHospitalMetrics, listHospitals, type HospitalMetrics } from '../services/backendApi';

const byBeds = (a: TamilNaduHospital, b: TamilNaduHospital) => b.availableBeds - a.availableBeds;

export const useHospitalData = () => {
  const [hospitals, setHospitals] = useState<TamilNaduHospital[]>(fallbackHospitals);
  const [metrics, setMetrics] = useState<HospitalMetrics>(fallbackMetrics);
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [remoteHospitals, remoteMetrics] = await Promise.all([
          listHospitals(),
          getHospitalMetrics(),
        ]);

        if (!isMounted) return;

        // Schema safety check: if the Node backend hasn't been rebooted, it returns the old schema. 
        // We reject the stale backend explicitly and rely on our client-side Vite-HMR parsed TS dataset.
        if (remoteMetrics && remoteMetrics.oxygenSupplyPercent != null) {
          if (remoteHospitals.length > 0) {
            setHospitals(remoteHospitals);
          }
          setMetrics(remoteMetrics);
        } else {
          console.warn('Backend returned stale schema. Falling back to frontend CSV parsing.');
          setHospitals(fallbackHospitals);
          setMetrics(fallbackMetrics);
        }
        setBackendConnected(true);
      } catch {
        if (!isMounted) return;
        setBackendConnected(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const topHospitals = useCallback(
    (count: number) => [...hospitals].sort(byBeds).slice(0, count),
    [hospitals],
  );

  const pickDispatchHospital = useCallback(
    (cityPreference?: string): TamilNaduHospital | undefined => {
      const inCity = cityPreference
        ? hospitals.filter((h) => h.city.toLowerCase() === cityPreference.toLowerCase())
        : [];

      const pool = inCity.length > 0 ? inCity : hospitals;
      return [...pool].sort((a, b) => {
        if (b.availableIcuBeds !== a.availableIcuBeds) return b.availableIcuBeds - a.availableIcuBeds;
        return b.availableBeds - a.availableBeds;
      })[0];
    },
    [hospitals],
  );

  const updateHospitalLocal = useCallback((id: string, updates: Partial<TamilNaduHospital>) => {
    setHospitals((current) =>
      current.map((h) => (String(h.id) === String(id) ? { ...h, ...updates } : h)),
    );
  }, []);

  const value = useMemo(
    () => ({
      hospitals,
      metrics,
      backendConnected,
      topHospitals,
      pickDispatchHospital,
      updateHospitalLocal,
    }),
    [hospitals, metrics, backendConnected, topHospitals, pickDispatchHospital, updateHospitalLocal],
  );

  return value;
};
