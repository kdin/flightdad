/**
 * Seed script — stores a handful of sample itineraries via the local API.
 *
 * Usage:
 *   # Start the backend first (in a separate terminal):
 *   npm run backend
 *
 *   # Then run this script:
 *   npm run seed
 *
 * The script posts three sample itineraries (one domestic, one international,
 * one multi-leg) and prints the stored records returned by the API.
 *
 * Flight numbers are real daily-scheduled services so the seed data integrates
 * seamlessly with live flight-tracker APIs.
 */

const BASE_URL = process.env.API_URL ?? "http://localhost:3000";

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns an ISO-8601 string for a date N days from today at the given UTC hour. */
function utcDaysFromNow(days: number, utcHour: number, utcMinute = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(utcHour, utcMinute, 0, 0);
  return d.toISOString();
}

// ─── Sample itineraries ───────────────────────────────────────────────────────

const itineraries = [
  // 1. Domestic economy: AA100 JFK→LAX (daily, departs ~08:00 ET / 13:00 UTC)
  {
    userId: "user-alice",
    body: {
      bookingReference: "DOM001",
      bookedAt: new Date().toISOString(),
      contactEmail: "alice@example.com",
      passengers: [{ firstName: "Alice", lastName: "Smith" }],
      flights: [
        {
          flightNumber: "AA100",
          airline: "American Airlines",
          origin: {
            iataCode: "JFK",
            name: "John F. Kennedy International Airport",
            city: "New York",
            country: "US",
          },
          destination: {
            iataCode: "LAX",
            name: "Los Angeles International Airport",
            city: "Los Angeles",
            country: "US",
          },
          scheduledDeparture: utcDaysFromNow(7, 13, 0),
          scheduledArrival: utcDaysFromNow(7, 16, 30),
          cabinClass: "ECONOMY",
          terminal: "B",
          gate: "B12",
          aircraft: "Boeing 737-800",
          baggageAllowance: { carryOnPieces: 1, checkedWeightKg: 23 },
        },
      ],
      totalPrice: 249.99,
      currency: "USD",
      paymentMethod: "Visa ending 4242",
    },
  },

  // 2. Transatlantic business class: BA178 JFK→LHR (daily, departs ~22:00 ET / 02:00 UTC+1)
  {
    userId: "user-bob",
    body: {
      bookingReference: "INT002",
      bookedAt: new Date().toISOString(),
      contactEmail: "bob@example.com",
      contactPhone: "+1-555-0100",
      passengers: [
        {
          firstName: "Bob",
          lastName: "Jones",
          passportNumber: "AB123456",
          nationality: "US",
          seatNumber: "2A",
          frequentFlyerNumber: "BA999888",
        },
      ],
      flights: [
        {
          flightNumber: "BA178",
          airline: "British Airways",
          origin: {
            iataCode: "JFK",
            name: "John F. Kennedy International Airport",
            city: "New York",
            country: "US",
          },
          destination: {
            iataCode: "LHR",
            name: "London Heathrow Airport",
            city: "London",
            country: "GB",
          },
          scheduledDeparture: utcDaysFromNow(14, 22, 0),
          scheduledArrival: utcDaysFromNow(15, 10, 10),
          cabinClass: "BUSINESS",
          terminal: "7",
          aircraft: "Boeing 777-300ER",
          baggageAllowance: { carryOnPieces: 2, checkedWeightKg: 32 },
        },
      ],
      totalPrice: 3499.0,
      currency: "USD",
      paymentMethod: "Amex ending 1001",
    },
  },

  // 3. Multi-leg SFO→ORD→CDG: UA558 + UA832 (both daily on United)
  {
    userId: "user-carol",
    body: {
      bookingReference: "MLT003",
      bookedAt: new Date().toISOString(),
      contactEmail: "carol@example.com",
      passengers: [
        { firstName: "Carol", lastName: "Williams", seatNumber: "24C" },
        { firstName: "Dave", lastName: "Williams", seatNumber: "24D" },
      ],
      flights: [
        {
          // UA558 SFO→ORD — daily morning departure (~07:00 PT / 15:00 UTC)
          flightNumber: "UA558",
          airline: "United Airlines",
          origin: {
            iataCode: "SFO",
            name: "San Francisco International Airport",
            city: "San Francisco",
            country: "US",
          },
          destination: {
            iataCode: "ORD",
            name: "O'Hare International Airport",
            city: "Chicago",
            country: "US",
          },
          scheduledDeparture: utcDaysFromNow(21, 15, 0),
          scheduledArrival: utcDaysFromNow(21, 21, 15),
          cabinClass: "ECONOMY",
          terminal: "3",
          gate: "G80",
          aircraft: "Boeing 737 MAX 9",
        },
        {
          // UA832 ORD→CDG — daily evening departure (~17:30 CT / 22:30 UTC)
          flightNumber: "UA832",
          airline: "United Airlines",
          origin: {
            iataCode: "ORD",
            name: "O'Hare International Airport",
            city: "Chicago",
            country: "US",
          },
          destination: {
            iataCode: "CDG",
            name: "Charles de Gaulle Airport",
            city: "Paris",
            country: "FR",
          },
          scheduledDeparture: utcDaysFromNow(21, 22, 30),
          scheduledArrival: utcDaysFromNow(22, 12, 45),
          cabinClass: "ECONOMY",
          terminal: "1",
          gate: "C18",
          aircraft: "Boeing 767-300ER",
          baggageAllowance: { carryOnPieces: 1, checkedWeightKg: 23 },
        },
      ],
      totalPrice: 1180.0,
      currency: "USD",
    },
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function seedItineraries(): Promise<void> {
  console.log(`Seeding itineraries to ${BASE_URL}\n`);

  for (const { userId, body } of itineraries) {
    try {
      const response = await fetch(`${BASE_URL}/flights/itinerary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(body),
      });

      const json = await response.json();

      if (response.ok) {
        const { data } = json as { data: Record<string, unknown> };
        console.log(`✅ [${body.bookingReference}] stored`);
        console.log(`   _id          : ${data._id}`);
        console.log(`   userId       : ${data.userId}`);
        console.log(`   timeToQuery  : ${data.timeToQuery}`);
        console.log();
      } else {
        console.error(`❌ [${body.bookingReference}] failed (${response.status})`);
        console.error("   ", JSON.stringify(json, null, 2));
        console.log();
      }
    } catch (err) {
      console.error(
        `❌ [${body.bookingReference}] network error — is the backend running at ${BASE_URL}?`
      );
      console.error("   ", err);
      process.exit(1);
    }
  }
}

seedItineraries();
