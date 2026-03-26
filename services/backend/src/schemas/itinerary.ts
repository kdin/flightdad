/**
 * Zod schemas for the POST /flights/itinerary endpoint.
 *
 * Schemas are the single source of truth for both runtime validation and
 * TypeScript types inside the backend service. The derived types (`z.infer`)
 * are compatible with the interfaces exported from @flightdad/shared.
 */

import { z } from "zod";

// ─── Re-usable building blocks ────────────────────────────────────────────────

export const AirportSchema = z.object({
  iataCode: z.string().length(3).toUpperCase(),
  name: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
});

export const CabinClassSchema = z.enum([
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
]);

export const BaggageAllowanceSchema = z.object({
  carryOnPieces: z.number().int().nonnegative(),
  checkedWeightKg: z.number().nonnegative(),
});

// ─── Passenger ───────────────────────────────────────────────────────────────

export const PassengerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z
    .iso.date()
    .refine((d) => new Date(d) <= new Date(), {
      message: "dateOfBirth cannot be in the future",
    })
    .optional(), // ISO-8601 date (YYYY-MM-DD)
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  seatNumber: z.string().optional(),
  ticketNumber: z.string().optional(),
  frequentFlyerNumber: z.string().optional(),
  mealPreference: z.string().optional(),
});

// ─── Flight leg ───────────────────────────────────────────────────────────────

export const ItineraryFlightSchema = z
  .object({
    flightNumber: z.string().min(1),
    airline: z.string().min(1),
    origin: AirportSchema,
    destination: AirportSchema,
    scheduledDeparture: z.iso.datetime(), // ISO-8601 date-time
    scheduledArrival: z.iso.datetime(),
    cabinClass: CabinClassSchema,
    terminal: z.string().optional(),
    gate: z.string().optional(),
    aircraft: z.string().optional(),
    baggageAllowance: BaggageAllowanceSchema.optional(),
  })
  .refine(
    (f) => new Date(f.scheduledArrival) > new Date(f.scheduledDeparture),
    { message: "scheduledArrival must be after scheduledDeparture" }
  );

// ─── Top-level itinerary (POST body) ─────────────────────────────────────────

export const FlightItinerarySchema = z.object({
  /** Airline booking reference / confirmation code (e.g. "ABC123"). */
  bookingReference: z.string().min(1),
  /** ISO-8601 timestamp of when the ticket was purchased. */
  bookedAt: z.iso.datetime().refine((d) => new Date(d) <= new Date(), {
    message: "bookedAt cannot be in the future",
  }),
  contactEmail: z.email(),
  contactPhone: z.string().optional(),
  /** One or more passengers travelling on this itinerary. */
  passengers: z.array(PassengerSchema).nonempty(),
  /** Ordered list of flight legs in this itinerary. */
  flights: z.array(ItineraryFlightSchema).nonempty(),
  totalPrice: z.number().nonnegative(),
  /** ISO-4217 currency code (e.g. "USD"). */
  currency: z.string().length(3).toUpperCase(),
  paymentMethod: z.string().optional(),
});

// ─── DB record (stored document shape) ───────────────────────────────────────

/**
 * Shape of an itinerary document as it is stored in the database.
 *
 * Extends the validated POST-body schema with two server-assigned fields:
 *  - `userId`      — opaque string that uniquely identifies the submitting user.
 *  - `timeToQuery` — native Date set at insertion time; stored as a real Date
 *                    object so the database layer can filter / index by time
 *                    ranges without parsing strings.
 */
export const ItineraryRecordSchema = FlightItinerarySchema.extend({
  /** Uniquely identifies the user who submitted this itinerary. */
  userId: z.string().min(1),

  /**
   * Server-assigned timestamp for when this record was stored.
   * Using a native Date (not an ISO string) enables efficient time-range
   * queries and optional index creation on the database side.
   */
  timeToQuery: z.date(),
});

// ─── Derived TypeScript types ─────────────────────────────────────────────────

export type FlightItineraryInput = z.infer<typeof FlightItinerarySchema>;

/** The full stored document shape, including server-assigned metadata. */
export type ItineraryRecord = z.infer<typeof ItineraryRecordSchema>;
