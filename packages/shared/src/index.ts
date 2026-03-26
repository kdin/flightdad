/**
 * Shared types, constants, and utilities for flightdad.
 *
 * This package is consumed by both the mobile app and backend service.
 * Add domain models, enums, and pure helper functions here.
 */

// ─── Flight domain types ──────────────────────────────────────────────────────

export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: Airport;
  destination: Airport;
  scheduledDeparture: string; // ISO-8601
  scheduledArrival: string; // ISO-8601
  status: FlightStatus;
}

export interface Airport {
  iataCode: string;
  name: string;
  city: string;
  country: string;
}

export type FlightStatus =
  | "SCHEDULED"
  | "BOARDING"
  | "DEPARTED"
  | "IN_FLIGHT"
  | "LANDED"
  | "ARRIVED"
  | "CANCELLED"
  | "DELAYED"
  | "DIVERTED";

// ─── Itinerary types ──────────────────────────────────────────────────────────

export type JourneyStatus = "PENDING" | "IN-PROGRESS" | "COMPLETED";

export type CabinClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export interface BaggageAllowance {
  /** Number of carry-on pieces allowed. */
  carryOnPieces: number;
  /** Checked baggage allowance in kilograms. */
  checkedWeightKg: number;
}

export interface Passenger {
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // ISO-8601
  passportNumber?: string;
  nationality?: string;
  seatNumber?: string;
  ticketNumber?: string;
  frequentFlyerNumber?: string;
  mealPreference?: string;
}

export interface ItineraryFlight {
  flightNumber: string;
  airline: string;
  origin: Airport;
  destination: Airport;
  scheduledDeparture: string; // ISO-8601
  scheduledArrival: string; // ISO-8601
  cabinClass: CabinClass;
  terminal?: string;
  gate?: string;
  aircraft?: string;
  baggageAllowance?: BaggageAllowance;
}

/** Payload for POST /flights/itinerary — mirrors a flight confirmation email. */
export interface FlightItinerary {
  /** Airline booking reference / confirmation code (e.g. "ABC123"). */
  bookingReference: string;
  /** ISO-8601 timestamp of when the ticket was purchased. */
  bookedAt: string;
  contactEmail: string;
  contactPhone?: string;
  /** One or more passengers travelling on this itinerary. */
  passengers: Passenger[];
  /** Ordered list of flight legs in this itinerary. */
  flights: ItineraryFlight[];
  totalPrice: number;
  /** ISO-4217 currency code (e.g. "USD"). */
  currency: string;
  paymentMethod?: string;
  /** Current progress of the journey. */
  journeyStatus: JourneyStatus;
}

// ─── Check-in types ───────────────────────────────────────────────────────────

export interface CheckIn {
  flightId: string;
  passengerId: string;
  seatNumber: string;
  boardingPassUrl?: string;
  checkedInAt: string; // ISO-8601
}

// ─── Notification types ───────────────────────────────────────────────────────

export type NotificationType =
  | "CHECK_IN_REMINDER"
  | "GATE_CHANGE"
  | "DELAY"
  | "CANCELLATION"
  | "BOARDING_CALL"
  | "FLIGHT_ARRIVED";

export interface Notification {
  id: string;
  type: NotificationType;
  flightId: string;
  message: string;
  sentAt: string; // ISO-8601
}
