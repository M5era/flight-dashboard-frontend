// Utility to hash itinerary data using SHA-256
export async function hashItinerary(itinerary: object): Promise<string> {
  const data = JSON.stringify(itinerary);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// src/api.ts

// Define the structure of a flight segment based on your backend response
export interface FlightSegment {
  id: string; // Unique ID for the flight offer
  price: number;
  airline: string;
  duration: string;
  departureTime: string;
  arrivalTime: string;
  origin: string;
  destination: string;
  segments: Array<{
    carrierCode: string;
    number: string;
    departure: { iataCode: string; at: string };
    arrival: { iataCode: string; at: string };
    duration: string;
  }>;
}

// Define the structure for the API response
export interface FlightData {
  flights: FlightSegment[];
}

// Define the structure for a saved flight
export interface SavedFlight extends FlightSegment {
  savedAt: string;
}

// Define the structure for a recent search
export interface RecentSearch {
  id: string;
  origin: string;
  destination: string;
  date: string;
  createdAt: string;
}

// Helper to get the auth token from localStorage
const getToken = () => localStorage.getItem('token');

// Fetch flights from your backend
export const fetchFlights = async (departure: string, arrival: string, date: string): Promise<FlightData> => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body = {
    originLocationCode: departure,
    destinationLocationCode: arrival,
    departureDateTimeRange: { date: date },
  };

  const apiUrl = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiUrl}/api/flights`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch flights' }));
    throw new Error(errorData.message || 'Failed to fetch flights');
  }

  const json = await response.json();
  console.log('[fetchFlights] raw response json:', json);

  // Backend may return either an array directly OR an object with a `data` array
  const rawFlights: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

  if (!Array.isArray(rawFlights)) {
    console.warn('[fetchFlights] Unexpected flights payload shape, returning empty list');
    return { flights: [] };
  }

  const adaptedFlights: FlightSegment[] = rawFlights.map((flight: any) => {
    try {
      const firstItin = flight.itineraries?.[0];
      const segments = firstItin?.segments || [];
      const firstSeg = segments[0] || {};
      const lastSeg = segments[segments.length - 1] || firstSeg;
      return {
        id: String(flight.id ?? crypto.randomUUID()),
        price: parseFloat(flight?.price?.grandTotal) || 0,
        airline: flight?.validatingAirlineCodes?.[0] || 'NA',
        duration: firstItin?.duration || '',
        departureTime: firstSeg?.departure?.at || '',
        arrivalTime: lastSeg?.arrival?.at || '',
        origin: firstSeg?.departure?.iataCode || '',
        destination: lastSeg?.arrival?.iataCode || '',
        segments: segments,
      } as FlightSegment;
    } catch (e) {
      console.warn('[fetchFlights] Failed to adapt flight offer', e, flight);
      return null as any;
    }
  }).filter(Boolean);

  return { flights: adaptedFlights };
};

// Save a flight for a user
export const saveFlight = async (flight: FlightSegment): Promise<any> => {
  const token = getToken();
  if (!token) throw new Error('You must be logged in to save flights.');

  // Hash the itinerary to generate a unique ID
  const itineraryToHash = flight.segments;
  const id = await hashItinerary(itineraryToHash);
  const flightWithHash = { ...flight, id };

  const apiUrl = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiUrl}/api/user/saved-flights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(flightWithHash),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to save flight.');
  }
  return response.json();
};

// Get all saved flights for a user
export const getSavedFlights = async (): Promise<SavedFlight[]> => {
  const token = getToken();
  if (!token) return [];

  const apiUrl = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiUrl}/api/user/saved-flights`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get saved flights.');
  }
  return response.json();
};

// Delete a saved flight
export const deleteSavedFlight = async (flightId: string): Promise<any> => {
  const token = getToken();
  if (!token) throw new Error('Authentication error.');

  const apiUrl = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiUrl}/api/user/saved-flights/${flightId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete flight.');
  }
  return response.json();
};

// Get recent searches for a user
export const getRecentSearches = async (): Promise<RecentSearch[]> => {
  const token = getToken();
  if (!token) return [];

  const apiUrl = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiUrl}/api/user/recent-searches`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get recent searches.');
  }
  return response.json();
};

// This function seems to be for airport search, which is public
export const fetchAirportOptions = async (q: string) => {
    if (!q) return [];
    try {
  const apiUrl = import.meta.env.VITE_API_URL;
  const res = await fetch(`${apiUrl}/api/airports/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).slice(0, 10);
    } catch {
      return [];
    }
};
