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
