/**
 * AviationStack API client.
 *
 * AviationStack provides real-time and historical flight data including
 * departure/arrival status, delays, and estimated times.
 *
 * Documentation: https://aviationstack.com/documentation
 */

// ─── Response types ───────────────────────────────────────────────────────────

export interface AviationStackEndpoint {
  airport: string;
  iata: string;
  terminal: string | null;
  gate: string | null;
  scheduled: string;
  estimated: string | null;
  actual: string | null;
  /** Delay in minutes (positive = late). Null when not yet reported. */
  delay: number | null;
}

export interface AviationStackFlight {
  flight_date: string;
  flight_status: string;
  departure: AviationStackEndpoint;
  arrival: AviationStackEndpoint & { baggage: string | null };
  airline: {
    name: string;
    iata: string;
  };
  flight: {
    number: string;
    iata: string;
  };
}

interface AviationStackSuccessResponse {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: AviationStackFlight[];
}

interface AviationStackErrorResponse {
  error: {
    code: string;
    message: string;
    context: Record<string, unknown>;
  };
}

type AviationStackResponse =
  | AviationStackSuccessResponse
  | AviationStackErrorResponse;

// ─── Client ───────────────────────────────────────────────────────────────────

const BASE_URL = "https://api.aviationstack.com/v1";

export class AviationStackClient {
  constructor(private readonly apiKey: string) {}

  /**
   * Retrieve real-time status data for a flight identified by its IATA code
   * (e.g. "AA100").  Returns an empty array when no matching flight is found.
   *
   * @throws {Error} on network errors or a non-OK HTTP response.
   */
  async getFlightStatus(flightIata: string): Promise<AviationStackFlight[]> {
    const url =
      `${BASE_URL}/flights` +
      `?access_key=${encodeURIComponent(this.apiKey)}` +
      `&flight_iata=${encodeURIComponent(flightIata)}` +
      `&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `AviationStack request failed: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as AviationStackResponse;

    if ("error" in json) {
      throw new Error(`AviationStack API error: ${json.error.message}`);
    }

    return json.data;
  }
}
