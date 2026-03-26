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
 */

const BASE_URL = process.env.API_URL ?? "http://localhost:3000";

// ─── Sample itineraries ───────────────────────────────────────────────────────

const itineraries = [
  // 1. Short domestic flight
  {
    userId: "user-alice",
    body: {
      bookingReference: "DOM001",
      bookedAt: "2024-11-01T09:00:00Z",
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
          scheduledDeparture: "2025-02-14T08:00:00Z",
          scheduledArrival: "2025-02-14T11:30:00Z",
          cabinClass: "ECONOMY",
          terminal: "B",
          gate: "B12",
          baggageAllowance: { carryOnPieces: 1, checkedWeightKg: 23 },
        },
      ],
      totalPrice: 249.99,
      currency: "USD",
      paymentMethod: "Visa ending 4242",
    },
  },

  // 2. International business-class flight
  {
    userId: "user-bob",
    body: {
      bookingReference: "INT002",
      bookedAt: "2024-12-15T14:30:00Z",
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
          scheduledDeparture: "2025-03-10T22:00:00Z",
          scheduledArrival: "2025-03-11T10:00:00Z",
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

  // 3. Multi-leg connecting flight with two passengers
  {
    userId: "user-carol",
    body: {
      bookingReference: "MLT003",
      bookedAt: "2025-01-08T11:00:00Z",
      contactEmail: "carol@example.com",
      passengers: [
        { firstName: "Carol", lastName: "Williams", seatNumber: "24C" },
        { firstName: "Dave", lastName: "Williams", seatNumber: "24D" },
      ],
      flights: [
        {
          flightNumber: "UA500",
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
          scheduledDeparture: "2025-04-05T07:00:00Z",
          scheduledArrival: "2025-04-05T13:00:00Z",
          cabinClass: "ECONOMY",
          terminal: "3",
          gate: "G80",
        },
        {
          flightNumber: "UA702",
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
          scheduledDeparture: "2025-04-05T16:00:00Z",
          scheduledArrival: "2025-04-06T06:30:00Z",
          cabinClass: "ECONOMY",
          terminal: "1",
          gate: "C18",
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
