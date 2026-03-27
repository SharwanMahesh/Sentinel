import hospitalCsv from '../../resources/TNHospitals (1).csv?raw';

type ResourceStatus = 'Normal' | 'Warning' | 'Critical';

export interface TamilNaduHospital {
	id: string;
	name: string;
	state: string;
	city: string;
	address: string;
	pincode: string;
	totalBeds: number;
	occupiedBeds: number;
	availableBeds: number;
	icuBeds: number;
	availableIcuBeds: number;
	oxygenLiters: number;
	vaccineDoses: number;
	capacity: number;
	status: ResourceStatus;
	lat: number;
	lng: number;
}

const EXCLUDED_HOSPITAL_PATTERN = /(\beye\b|ophthalm|retina|vision care|eye care)/i;

const CITY_COORDINATES: Record<string, [number, number]> = {
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

const seeded = (seed: string): number => {
	let hash = 0;
	for (let i = 0; i < seed.length; i += 1) {
		hash = (hash << 5) - hash + seed.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
};

const parseCsvLine = (line: string): string[] => {
	const out: string[] = [];
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

const withCityCoordinates = (city: string, seedInput: string): [number, number] => {
	const normalizedKey = Object.keys(CITY_COORDINATES).find(k => k.toLowerCase() === String(city).toLowerCase().trim());
	const base = normalizedKey ? CITY_COORDINATES[normalizedKey] : CITY_COORDINATES.Chennai;
	const seedValue = seeded(seedInput);
	// Increase distribution radius from ~1km to ~25km spread so they are visually distinct even zoomed out
	const latShift = ((seedValue % 60) - 30) / 100;
	const lngShift = ((Math.floor(seedValue / 10) % 60) - 30) / 100;
	return [base[0] + latShift, base[1] + lngShift];
};

const buildHospital = (raw: {
	id: string;
	name: string;
	state: string;
	city: string;
	address: string;
	pincode: string;
}): TamilNaduHospital => {
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
	const status: ResourceStatus = capacity >= 90 ? 'Critical' : capacity >= 75 ? 'Warning' : 'Normal';
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

const parseHospitals = (): TamilNaduHospital[] => {
	const lines = hospitalCsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
	if (lines.length < 2) return [];

	const headers = parseCsvLine(lines[0]);
	const indexOf = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

	const idIdx = indexOf('S.NO');
	const hospitalIdx = indexOf('Hospital');
	const stateIdx = indexOf('State');
	const cityIdx = indexOf('City');
	const addrIdx = indexOf('LocalAddress');
	const pinIdx = indexOf('Pincode');

	const dedupe = new Set<string>();
	const parsed: TamilNaduHospital[] = [];

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
			})
		);
	}

	return parsed;
};

export const tamilNaduHospitals: TamilNaduHospital[] = parseHospitals();

export const tamilNaduHospitalMetrics = (() => {
	const totalBeds = tamilNaduHospitals.reduce((sum, h) => sum + h.totalBeds, 0);
	const occupiedBeds = tamilNaduHospitals.reduce((sum, h) => sum + h.occupiedBeds, 0);
	const availableBeds = tamilNaduHospitals.reduce((sum, h) => sum + h.availableBeds, 0);
	const totalIcuBeds = tamilNaduHospitals.reduce((sum, h) => sum + h.icuBeds, 0);
	const availableIcuBeds = tamilNaduHospitals.reduce((sum, h) => sum + h.availableIcuBeds, 0);
	const oxygenLiters = tamilNaduHospitals.reduce((sum, h) => sum + h.oxygenLiters, 0);
	const vaccineDoses = tamilNaduHospitals.reduce((sum, h) => sum + h.vaccineDoses, 0);

	return {
		hospitalCount: tamilNaduHospitals.length,
		totalBeds,
		occupiedBeds,
		availableBeds,
		bedOccupancy: totalBeds === 0 ? 0 : Math.round((occupiedBeds / totalBeds) * 100),
		totalIcuBeds,
		availableIcuBeds,
		oxygenLiters,
		vaccineDoses,
	};
})();

export const topTamilNaduHospitals = (count: number): TamilNaduHospital[] => {
	return [...tamilNaduHospitals].sort((a, b) => b.availableBeds - a.availableBeds).slice(0, count);
};

export const pickDispatchHospital = (cityPreference?: string): TamilNaduHospital | undefined => {
	const inCity = cityPreference
		? tamilNaduHospitals.filter((h) => h.city.toLowerCase() === cityPreference.toLowerCase())
		: [];

	const preferredPool = inCity.length > 0 ? inCity : tamilNaduHospitals;
	return [...preferredPool].sort((a, b) => {
		if (b.availableIcuBeds !== a.availableIcuBeds) return b.availableIcuBeds - a.availableIcuBeds;
		return b.availableBeds - a.availableBeds;
	})[0];
};
