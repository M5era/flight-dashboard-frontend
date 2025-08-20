// src/api.ts

export interface FlightSegment {
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  segments?: FlightSegment[];
}

export interface FlightSearchResponse {
  flights: FlightSegment[];
}

export async function fetchFlights(departure: string, arrival: string, date: string): Promise<FlightSearchResponse> {
  const response = await fetch(
    'https://flight-track-fxe8hne7c6hhc6c0.germanywestcentral-01.azurewebsites.net/api/flights',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originLocationCode: departure,
        destinationLocationCode: arrival,
        departureDateTimeRange: { date },
      }),
    }
  );
  if (!response.ok) throw new Error('Failed to fetch flights');
  const apiData = await response.json();
  // Map API data to FlightSegment[]
  const flights: FlightSegment[] = (apiData.data || []).map((offer: any) => {
    const itinerary = offer.itineraries[0];
    const segments = itinerary.segments.map((seg: any) => ({
      airline: apiData.dictionaries?.carriers?.[seg.carrierCode] || seg.carrierCode,
      flightNumber: seg.number,
      departureTime: seg.departure.at,
      arrivalTime: seg.arrival.at,
      duration: seg.duration,
      price: Number(offer.price?.grandTotal || offer.price?.total || 0),
    }));
    return {
      airline: apiData.dictionaries?.carriers?.[offer.validatingAirlineCodes?.[0]] || offer.validatingAirlineCodes?.[0] || '',
      flightNumber: segments.map((s: any) => s.flightNumber).join(', '),
      departureTime: segments[0]?.departureTime,
      arrivalTime: segments[segments.length - 1]?.arrivalTime,
      duration: itinerary.duration,
      price: Number(offer.price?.grandTotal || offer.price?.total || 0),
      segments,
    };
  });
  return { flights };
}
