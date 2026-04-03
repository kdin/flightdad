/**
 * FlightStatusService — fetches real-time flight status from AviationStack
 * and maps the response to the shared FlightStatusInfo type.
 */

import type { FlightStatus, FlightStatusInfo } from "@flightdad/shared";
import { AviationStackClient } from "../clients/aviationstack";
import type { AviationStackFlight } from "../clients/aviationstack";
import config from "../config";

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Map an AviationStack `flight_status` string (plus delay values) to the
 * canonical FlightStatus enum used across flightdad.
 *
 * AviationStack statuses: scheduled | active | landed | cancelled |
 *                         incident  | diverted
 */
function mapFlightStatus(
  aviationStatus: string,
  departureDelay: number | null,
  arrivalDelay: number | null
): FlightStatus {
  // A positive departure or arrival delay overrides the base status.
  if ((departureDelay ?? 0) > 0 || (arrivalDelay ?? 0) > 0) {
    return "DELAYED";
  }

  switch (aviationStatus.toLowerCase()) {
    case "scheduled":
      return "SCHEDULED";
    case "active":
      return "IN_FLIGHT";
    case "landed":
      return "LANDED";
    case "cancelled":
      return "CANCELLED";
    case "diverted":
    case "incident":
      return "DIVERTED";
    default:
      return "SCHEDULED";
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class FlightStatusService {
  private readonly client: AviationStackClient;

  constructor(client?: AviationStackClient) {
    this.client =
      client ?? new AviationStackClient(config.aviationstack.apiKey);
  }

  /**
   * Retrieve the current status for a flight identified by its IATA flight
   * number (e.g. "AA100").
   *
   * Returns `null` when the flight is not found in AviationStack.
   * @throws {Error} on network or upstream API errors.
   */
  async getFlightStatus(flightNumber: string): Promise<FlightStatusInfo | null> {
    const results = await this.client.getFlightStatus(flightNumber);

    if (results.length === 0) {
      return null;
    }

    return this.mapToFlightStatusInfo(results[0]);
  }

  private mapToFlightStatusInfo(raw: AviationStackFlight): FlightStatusInfo {
    const status = mapFlightStatus(
      raw.flight_status,
      raw.departure.delay,
      raw.arrival.delay
    );

    return {
      id: raw.flight.iata,
      flightNumber: raw.flight.iata,
      airline: raw.airline.name,
      origin: {
        iataCode: raw.departure.iata,
        // AviationStack /v1/flights only returns the full airport name, not a
        // separate city or country field.  City falls back to the airport name;
        // country is left blank.  A richer airport dataset (e.g. from the
        // AviationStack /airports endpoint or a static IATA lookup) would be
        // needed to populate these fields accurately.
        name: raw.departure.airport,
        city: raw.departure.airport,
        country: "",
      },
      destination: {
        iataCode: raw.arrival.iata,
        name: raw.arrival.airport,
        city: raw.arrival.airport,
        country: "",
      },
      scheduledDeparture: raw.departure.scheduled,
      scheduledArrival: raw.arrival.scheduled,
      status,
      estimatedDeparture: raw.departure.estimated ?? null,
      estimatedArrival: raw.arrival.estimated ?? null,
      departureDelayMinutes: raw.departure.delay ?? null,
      arrivalDelayMinutes: raw.arrival.delay ?? null,
    };
  }
}

export const flightStatusService = new FlightStatusService();

