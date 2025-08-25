import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchFlights } from './api';
import { hashItinerary } from './api';
import type { FlightSegment } from './api';
import './App.css';

// Airport type for dropdowns
type Airport = { code: string; iata?: string; name: string; city?: string };

function App() {
  // Track favorited flights by index or id
  const [favorited, setFavorited] = useState<{[key: string]: boolean}>({});

  // Toggle favorite state and sync with backend
  const toggleFavorite = (flightId: string | number, flight: FlightSegment) => {
    // Update UI immediately
    setFavorited(prev => ({ ...prev, [flightId]: !prev[flightId] }));
    // Then perform request in background
    if (!favorited[flightId]) {
      import('./api').then(api => api.saveFlight(flight)).catch(e => {
        alert('Failed to save flight: ' + (e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e)));
        // Optionally revert UI if needed
      });
    } else {
      async function saveFlight(itinerary: object) {
        const id = await hashItinerary(itinerary);
        // Save flight with id
        // ...existing save logic...
      }

      import('./api').then(api => api.deleteSavedFlight(String(flightId))).catch(e => {
        alert('Failed to delete saved flight: ' + (e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e)));
        // Optionally revert UI if needed
      });
    }
  }
  const [departure, setDeparture] = useState('JFK');
  const [arrival, setArrival] = useState('LAX');
  const [depQuery, setDepQuery] = useState('');
  const [arrQuery, setArrQuery] = useState('');
  const [depOptions, setDepOptions] = useState<Airport[]>([]);
  const [arrOptions, setArrOptions] = useState<Airport[]>([]);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [flights, setFlights] = useState<FlightSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/');
  };


  // Fetch airport suggestions from backend
  const fetchAirportOptions = async (q: string) => {
    if (!q) return [];
    try {
  const apiUrl = import.meta.env.VITE_API_URL;
  const res = await fetch(`${apiUrl}/api/airports/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      const data = await res.json();
      // Expecting array of airports with code, name, city
      return (data || []).slice(0, 10);
    } catch {
      return [];
    }
  };

  // Handlers for input changes (no debounce, fetch on every character)
  const handleDepInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDepQuery(val);
    const opts = await fetchAirportOptions(val);
    setDepOptions(opts);
  };
  const handleArrInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setArrQuery(val);
    const opts = await fetchAirportOptions(val);
    setArrOptions(opts);
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
    <div className="app-container" style={{ minHeight: '100vh', background: '#edf1fd', padding: 0, margin: 0, fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '24px 0 0 0', background: 'transparent', boxShadow: 'none', minHeight: 60 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginRight: 32 }}>
          {isAuthenticated ? (
            <>
              <Link to="/saved-flights" style={{
                textDecoration: 'none',
                color: '#2563eb',
                fontWeight: 600,
                fontSize: 22,
                background: 'none',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}>My Flights</Link>
              <button onClick={handleLogout} style={{
                background: '#e5e7eb',
                color: '#213547',
                fontWeight: 600,
                fontSize: 22,
                border: 'none',
                borderRadius: 8,
                padding: '8px 24px',
                cursor: 'pointer',
                marginLeft: 0,
                boxShadow: 'none',
                transition: 'background 0.2s',
              }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                textDecoration: 'none',
                color: '#213547',
                fontWeight: 600,
                fontSize: 22,
                background: '#e5e7eb',
                border: 'none',
                borderRadius: 8,
                padding: '8px 24px',
                cursor: 'pointer',
                marginLeft: 0,
                boxShadow: 'none',
                transition: 'background 0.2s',
              }}>Log in</Link>
              <Link to="/saved-flights" style={{
                textDecoration: 'none',
                color: '#2563eb',
                fontWeight: 600,
                fontSize: 22,
                background: 'none',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}>My Flights</Link>
            </>
          )}
        </div>
      </nav>
      <h1
        style={{
          textAlign: 'center',
          fontSize: 52,
          fontWeight: 600,
          color: '#213547',
          margin: '48px 0 32px 0',
          letterSpacing: '-1px',
          fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
        }}
      >
        Flight Radar
      </h1>
      <div
        className="search-form"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          background: 'rgba(255,255,255,0.95)',
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
                fontSize: 22,
                background: 'none',
                border: 'none',
                borderRadius: 8,
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
                    fontSize: 22,
                    background: '#e5e7eb',
                    border: 'none',
                    borderRadius: 8,
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
                fontSize: 22,
                background: '#e5e7eb',
                border: 'none',
                borderRadius: 8,
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
                    fontSize: 22,
                    background: 'none',
                    border: 'none',
                    borderRadius: 8,
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
            min={new Date().toISOString().split('T')[0]}
            style={{
              padding: '12px 16px',
              fontSize: 18,
              fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
              border: '1.5px solid #bfc7d1',
              borderRadius: 8,
              outline: 'none',
              marginTop: 4,
              boxSizing: 'border-box',
              color: '#213547',
              backgroundColor: '#fff',
            }}
          />
        </label>
          <label style={{ display: 'flex', flexDirection: 'column', minWidth: 160 }}>
            &nbsp;
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
                marginLeft: 0,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px 0 rgba(60,80,120,0.10)',
                transition: 'background 0.2s',
                outline: 'none',
                marginTop: 0,
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </label>
      </div>
  {error && <div className="error" style={{ color: '#dc2626', textAlign: 'center', marginTop: 16, fontSize: 18 }}>{error}</div>}
      <div className="results" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
        {/* No cache badge */}
  {Array.isArray(flights) && flights.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', marginTop: 32 }}>
            {flights.map((flight, idx) => {
              const numSegments = flight.segments ? flight.segments.length : 1;
              const stopovers = numSegments - 1;
              function formatTime(dt: string) {
                if (!dt) return '';
                const d = new Date(dt);
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              }
              const depTime = formatTime(flight.departureTime);
              const arrTime = formatTime(flight.arrivalTime);
              let plusOne = '';
              if (flight.departureTime && flight.arrivalTime) {
                const dep = new Date(flight.departureTime);
                const arr = new Date(flight.arrivalTime);
                if (arr.getDate() !== dep.getDate()) plusOne = ' (+1)';
              }
              function formatDuration(d: string) {
                if (!d) return '';
                const match = d.match(/PT(\d+)H(\d+)M/);
                if (match) {
                  const h = match[1], m = match[2];
                  return `${h}h ${m}m`;
                }
                return d;
              }
              let stopoverLabel = 'Nonstop';
              if (stopovers === 1) stopoverLabel = '1 Stopover';
              else if (stopovers > 1) stopoverLabel = `${stopovers} Stopovers`;
              return (
                <div
                  className="flight-card"
                  key={flight.id || idx}
                  style={{
                    background: 'rgba(255,255,255,0.97)',
                    boxShadow: '0 4px 24px 0 rgba(60,80,120,0.10)',
                    padding: '24px 32px',
                    minWidth: 600,
                    maxWidth: 900,
                    width: '100%',
                    flex: '1 1 600px',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    fontSize: 18,
                    position: 'relative',
                  }}
                >
                  {/* Main flight info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      {/* Airline - far left */}
                      <div style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginRight: 32 }}>
                        <div style={{ fontWeight: 700, fontSize: 22, color: '#3730a3' }}>{flight.airline}</div>
                      </div>
                      {/* Departure */}
                      <div style={{ textAlign: 'right', minWidth: 60, flexShrink: 1, marginRight: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{depTime}</div>
                      </div>
                      {/* Line with airplane and red dots for stopovers, then emoji and duration */}
                      <div style={{ display: 'flex', alignItems: 'center', minWidth: 120, marginRight: 16 }}>
                        <div style={{ position: 'relative', width: '120px', height: 32, display: 'flex', alignItems: 'center' }}>
                          <div style={{ position: 'absolute', left: 0, top: '50%', width: '100px', height: 4, background: '#e0e7ef', borderRadius: 2, transform: 'translateY(-50%)' }}></div>
                          {stopovers > 0 && Array.from({ length: stopovers }).map((_, i) => {
                            // Center the red dot on the line
                            const percent = ((i + 1) / (stopovers + 1)) * 100;
                            return (
                              <div key={i} style={{ position: 'absolute', left: `calc(${percent}% - 6px)`, top: '50%', transform: 'translate(-50%, -50%)', width: 12, height: 12, background: '#dc2626', borderRadius: '50%', zIndex: 2 }}></div>
                            );
                          })}
                        </div>
                        <span style={{ marginLeft: 12, marginRight: 12, fontSize: 24 }}>✈️</span>
                        <div style={{ color: '#64748b', fontSize: 16, minWidth: 60 }}>{formatDuration(flight.duration)}</div>
                      </div>
                      {/* Arrival */}
                      <div style={{ textAlign: 'left', minWidth: 80, marginRight: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{arrTime}{plusOne}</div>
                      </div>
                      {/* Vertical divider spanning almost full height of card */}
                      <div style={{ width: 1, height: 'calc(100% - 32px)', background: '#e0e7ef', margin: '0 32px', alignSelf: 'center' }}></div>
                    </div>
                    {/* Stopover and duration info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                      <div style={{ color: stopovers > 0 ? '#dc2626' : '#059669', fontWeight: 600, fontSize: 16 }}>{stopoverLabel}</div>
                    </div>
                  </div>
                  {/* Price, Check button, Heart button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginLeft: 32, position: 'relative', height: '100%', justifyContent: 'center' }}>
                    <div style={{ color: '#059669', fontWeight: 700, fontSize: 22, textAlign: 'center', width: '100%' }}>&euro;{Math.ceil(flight.price)}</div>
                    <button
                      style={{ background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 18, border: 'none', borderRadius: 8, padding: '10px 28px', cursor: 'pointer', boxShadow: '0 2px 8px 0 rgba(60,80,120,0.10)', outline: 'none', display: 'block', margin: '0 auto' }}
                      onClick={() => window.open('https://www.flightradar24.com/38.73,-9.14/6', '_blank', 'noopener,noreferrer')}
                    >
                      Check
                    </button>
                  </div>
                  {/* Heart button */}
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', marginLeft: 24 }}>
                    <button
                      aria-label={favorited[flight.id || idx] ? 'Unfavorite' : 'Favorite'}
                      onClick={() => toggleFavorite(flight.id || idx, flight)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        marginLeft: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        outline: 'none',
                        boxShadow: 'none',
                      }}
                    >
                      <img
                        src={favorited[flight.id || idx] ? '/icons/icon-saved.png' : '/icons/icon-unsaved.png'}
                        alt={favorited[flight.id || idx] ? 'Saved' : 'Unsaved'}
                        style={{ width: 24, height: 24, objectFit: 'contain', display: 'block' }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loading && <div style={{ textAlign: 'center', color: '#64748b', fontSize: 20, marginTop: 48 }}>No flights found.</div>
        )}
      </div>
    </div>
  );
}

export default App;
