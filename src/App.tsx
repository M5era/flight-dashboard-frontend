
import { useState, useRef } from 'react';
import { fetchFlights } from './api';
import type { FlightSegment } from './api';
import './App.css';

// Airport type for dropdowns
type Airport = { code: string; iata?: string; name: string; city?: string };

function App() {
  const [departure, setDeparture] = useState('JFK');
  const [arrival, setArrival] = useState('LAX');
  const [depQuery, setDepQuery] = useState('');
  const [arrQuery, setArrQuery] = useState('');
  const [depOptions, setDepOptions] = useState<Airport[]>([]);
  const [arrOptions, setArrOptions] = useState<Airport[]>([]);
  const depTimeout = useRef<number | null>(null);
  const arrTimeout = useRef<number | null>(null);
  // Fetch airport suggestions from backend
  const fetchAirportOptions = async (q: string) => {
    if (!q) return [];
    try {
      const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      const data = await res.json();
      // Expecting array of airports with code, name, city
      return (data || []).slice(0, 10);
    } catch {
      return [];
    }
  };

  // Handlers for input changes with debounce
  const handleDepInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDepQuery(val);
    if (depTimeout.current) clearTimeout(depTimeout.current);
    depTimeout.current = setTimeout(async () => {
      const opts = await fetchAirportOptions(val);
      setDepOptions(opts);
    }, 300);
  };
  const handleArrInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setArrQuery(val);
    if (arrTimeout.current) clearTimeout(arrTimeout.current);
    arrTimeout.current = setTimeout(async () => {
      const opts = await fetchAirportOptions(val);
      setArrOptions(opts);
    }, 300);
  };

  // When user selects an option
  const selectDep = (a: Airport) => {
    setDeparture(a.iata || a.code);
    setDepQuery(`${a.iata || a.code}${a.city ? ' - ' + a.city : ''}`);
    setDepOptions([]);
  };
  const selectArr = (a: Airport) => {
    setArrival(a.iata || a.code);
    setArrQuery(`${a.iata || a.code}${a.city ? ' - ' + a.city : ''}`);
    setArrOptions([]);
  };
  const [date, setDate] = useState('2025-08-21');
  const [flights, setFlights] = useState<FlightSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // No cache badge state needed

  // Helper for cache key
  const getCacheKey = (dep: string, arr: string, d: string) => `${dep}-${arr}-${d}`;

  // Check cache and fetch flights (cache valid for 3 days)
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    const cacheKey = getCacheKey(departure, arrival, date);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // 3 days = 72 hours = 259200000 ms
        if (parsed.timestamp && Date.now() - parsed.timestamp < 259200000) {
          console.log('Loaded flights from cache:', cacheKey, new Date(parsed.timestamp).toISOString());
          setFlights(parsed.flights || []);
          setLoading(false);
          return;
        }
      } catch {}
    }
    try {
      console.log('Fetching flights from API:', cacheKey);
      const data = await fetchFlights(departure, arrival, date);
      setFlights(data.flights || []);
      localStorage.setItem(cacheKey, JSON.stringify({ flights: data.flights, timestamp: Date.now() }));
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="app-container" style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #e0e7ff 0%, #f8fafc 100%)', padding: 0, margin: 0, fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', fontSize: 48, fontWeight: 800, color: '#1a2233', margin: '48px 0 32px 0', letterSpacing: -2 }}>Flight Dashboard</h1>
      <div
        className="search-form"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 8px 32px 0 rgba(60,80,120,0.10)',
          padding: '32px 32px 24px 32px',
          maxWidth: 1100,
          margin: '0 auto 36px auto',
          flexWrap: 'wrap',
        }}
      >
  <label style={{ position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 220 }}>
          Departure:
          <input
            type="text"
            value={depQuery}
            onChange={handleDepInput}
            placeholder="Type airport, city, or IATA code"
            style={{
              width: 320,
              padding: '12px 16px',
              fontSize: 18,
              border: '1.5px solid #bfc7d1',
              borderRadius: 8,
              outline: 'none',
              marginBottom: 0,
              boxSizing: 'border-box',
            }}
            autoComplete="off"
          />
          {depOptions.length > 0 && (
            <ul style={{
              position: 'absolute',
              zIndex: 20,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
              width: 320,
              margin: '6px 0 0 0',
              padding: 0,
              listStyle: 'none',
              maxHeight: 320,
              overflowY: 'auto',
              border: 'none',
            }}>
              {depOptions.map(a => (
                <li
                  key={a.code}
                  style={{
                    padding: '14px 20px',
                    cursor: 'pointer',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #f0f2f5',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => selectDep(a)}
                  onMouseOver={e => (e.currentTarget.style.background = '#f3f6fa')}
                  onMouseOut={e => (e.currentTarget.style.background = '#fff')}
                >
                  <span style={{ fontWeight: 700, fontSize: 20, minWidth: 56, color: '#1a2233' }}>{(a.iata || a.code)}</span>
                  <span style={{ marginLeft: 12, color: '#3b4252', fontWeight: 400, fontSize: 17 }}>{a.city || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </label>
  <label style={{ position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 220 }}>
          Arrival:
          <input
            type="text"
            value={arrQuery}
            onChange={handleArrInput}
            placeholder="Type airport, city, or IATA code"
            style={{
              width: 320,
              padding: '12px 16px',
              fontSize: 18,
              border: '1.5px solid #bfc7d1',
              borderRadius: 8,
              outline: 'none',
              marginBottom: 0,
              boxSizing: 'border-box',
            }}
            autoComplete="off"
          />
          {arrOptions.length > 0 && (
            <ul style={{
              position: 'absolute',
              zIndex: 20,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
              width: 320,
              margin: '6px 0 0 0',
              padding: 0,
              listStyle: 'none',
              maxHeight: 320,
              overflowY: 'auto',
              border: 'none',
            }}>
              {arrOptions.map(a => (
                <li
                  key={a.code}
                  style={{
                    padding: '14px 20px',
                    cursor: 'pointer',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #f0f2f5',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => selectArr(a)}
                  onMouseOver={e => (e.currentTarget.style.background = '#f3f6fa')}
                  onMouseOut={e => (e.currentTarget.style.background = '#fff')}
                >
                  <span style={{ fontWeight: 700, fontSize: 20, minWidth: 56, color: '#1a2233' }}>{(a.iata || a.code)}</span>
                  <span style={{ marginLeft: 12, color: '#3b4252', fontWeight: 400, fontSize: 17 }}>{a.city || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', minWidth: 160 }}>
          Date:
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              padding: '12px 16px',
              fontSize: 18,
              border: '1.5px solid #bfc7d1',
              borderRadius: 8,
              outline: 'none',
              marginTop: 4,
              boxSizing: 'border-box',
            }}
          />
        </label>
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            background: 'linear-gradient(90deg, #6366f1 0%, #2563eb 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 20,
            border: 'none',
            borderRadius: 10,
            padding: '14px 36px',
            marginLeft: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px 0 rgba(60,80,120,0.10)',
            transition: 'background 0.2s',
            outline: 'none',
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
  {error && <div className="error" style={{ color: '#dc2626', textAlign: 'center', marginTop: 16, fontSize: 18 }}>{error}</div>}
      <div className="results" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
        {/* No cache badge */}
        {flights.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', marginTop: 32 }}>
            {flights.map((flight, idx) => (
              <div
                className="flight-card"
                key={idx}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 4px 24px 0 rgba(60,80,120,0.10)',
                  padding: '28px 32px',
                  minWidth: 320,
                  maxWidth: 400,
                  flex: '1 1 320px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontSize: 18,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 22, color: '#3730a3', marginBottom: 4 }}>
                  {flight.airline} <span style={{ fontWeight: 400, color: '#64748b', fontSize: 18 }}>{flight.flightNumber}</span>
                </div>
                <div><span style={{ color: '#64748b' }}>Departure:</span> {flight.departureTime}</div>
                <div><span style={{ color: '#64748b' }}>Arrival:</span> {flight.arrivalTime}</div>
                <div><span style={{ color: '#64748b' }}>Duration:</span> {flight.duration}</div>
                <div><span style={{ color: '#64748b' }}>Price:</span> <span style={{ color: '#059669', fontWeight: 700 }}>${flight.price}</span></div>
                {/* Optional: show segments if present */}
                {flight.segments && flight.segments.length > 0 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 500 }}>Segments</summary>
                    {flight.segments.map((seg, sidx) => (
                      <div key={sidx} className="segment" style={{ marginLeft: 12, marginTop: 6, fontSize: 16, color: '#334155' }}>
                        <div>{seg.airline} {seg.flightNumber}</div>
                        <div>Departure: {seg.departureTime}</div>
                        <div>Arrival: {seg.arrivalTime}</div>
                        <div>Duration: {seg.duration}</div>
                      </div>
                    ))}
                  </details>
                )}
              </div>
            ))}
          </div>
        ) : (
          !loading && <div style={{ textAlign: 'center', color: '#64748b', fontSize: 20, marginTop: 48 }}>No flights found.</div>
        )}
      </div>
    </div>
  );
}

export default App;
