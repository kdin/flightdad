# Federated Authentication — AWS Cognito

## Overview

flightdad uses **AWS Cognito User Pools** as its identity provider. Cognito handles
all credential storage, email verification, MFA, and federated sign-in via third-party
identity providers (Google, Apple). The mobile app never receives or stores a user's
raw password.

```
Mobile app
    │
    │  (1) Sign-in / Sign-up
    ▼
AWS Cognito User Pool
    │   (+ optional federated IdP: Google / Apple)
    │  (2) ID token  +  Access token  +  Refresh token
    ▼
Mobile app (stores tokens in Keychain / Keystore)
    │
    │  (3) Authorization: Bearer <ID token>
    ▼
API Gateway → Lambda (Express)
    │
    │  (4) Verify JWT  →  extract sub (userId)
    ▼
DynamoDB / InMemoryDatabase
```

---

## Token types

When Cognito authenticates a user it issues three tokens:

| Token | Format | Default lifetime | Purpose |
|---|---|---|---|
| **ID token** | JWT | 1 hour | Proves the user's identity; contains profile claims (`sub`, `email`, `name`, …). This is the token the backend validates. |
| **Access token** | JWT | 1 hour | Authorises calls to Cognito's own APIs (e.g. `GetUser`, `ChangePassword`). Not sent to the flightdad backend. |
| **Refresh token** | Opaque string | 30 days | Exchanges for a fresh ID + access token pair without re-authentication. |

### ID token JWT structure

```
Header:  { "alg": "RS256", "kid": "<key-id>" }
Payload: {
  "sub":            "a1b2c3d4-…",     // Cognito-assigned user identifier
  "cognito:username": "a1b2c3d4-…",
  "email":          "user@example.com",
  "email_verified": true,
  "iss":            "https://cognito-idp.us-east-1.amazonaws.com/{userPoolId}",
  "aud":            "<appClientId>",   // Cognito app-client ID
  "iat":            1712000000,
  "exp":            1712003600
}
Signature: RS256 signed with Cognito's private key
```

The `sub` field is a stable UUID assigned by Cognito. It never changes even if the
user updates their email or links a social account. flightdad uses `sub` as the
canonical `userId` in every database collection.

---

## Sign-up flow (new user)

```
Mobile app          Cognito            Federated IdP      Lambda trigger       DynamoDB
    │                   │                    │                   │                 │
    │ 1. signUp()        │                    │                   │                 │
    │──────────────────►│                    │                   │                 │
    │ or tap "Sign in    │                    │                   │                 │
    │  with Google"      │                    │                   │                 │
    │                   │ 2. redirect to IdP  │                   │                 │
    │                   │────────────────────►│                   │                 │
    │                   │ 3. auth code        │                   │                 │
    │                   │◄────────────────────│                   │                 │
    │                   │ 4. exchange → IdP   │                   │                 │
    │                   │    tokens; upsert   │                   │                 │
    │                   │    user in pool     │                   │                 │
    │                   │                    │                   │                 │
    │                   │ 5. PostConfirmation │                   │                 │
    │                   │ trigger fires ──────────────────────────►                 │
    │                   │                    │                   │ 6. insert user  │
    │                   │                    │                   │──────────────── ►│
    │                   │                    │                   │  { userId: sub, │
    │                   │                    │                   │    email, … }   │
    │ 7. ID + Access +   │                    │                   │                 │
    │    Refresh tokens  │                    │                   │                 │
    │◄──────────────────│                    │                   │                 │
    │                   │                    │                   │                 │
    │ 8. store tokens in │                    │                   │                 │
    │    Keychain /      │                    │                   │                 │
    │    Keystore        │                    │                   │                 │
```

### Step-by-step

1. **User taps "Sign up"** in the mobile app. The app calls the Cognito SDK
   (`amazon-cognito-identity-js` or AWS Amplify) with the user's email and password,
   or the user taps "Sign in with Google / Apple" to start the OAuth 2.0 PKCE flow
   via the Cognito Hosted UI.

2. **Federated path only** — Cognito redirects the user's browser to the chosen
   identity provider (Google / Apple sign-in page).

3. **IdP returns an authorisation code** back to Cognito's redirect URI.

4. **Cognito exchanges the code** for the IdP's tokens, reads the user's profile,
   and **upserts** a record in the User Pool (creates on first sign-in; updates on
   subsequent sign-ins). The Cognito-assigned `sub` is stable across future sign-ins.

5. **PostConfirmation Lambda trigger** — Cognito fires this synchronously after a
   user's first confirmed sign-up. For federated users this fires on the very first
   successful sign-in (because federation implies instant confirmation).

   > **No separate Lambda needed.** Cognito trigger events are invoked directly
   > (not via API Gateway), exactly like the EventBridge Scheduler events the
   > existing lambda-lith already handles. The trigger is configured to point at
   > the same Lambda function; `lambda.ts` adds a dispatch branch for
   > `PostConfirmationTriggerEvent` alongside the existing EventBridge branch.
   > See [`src/lambda.ts`](../services/backend/src/lambda.ts).

6. **The Lambda writes a user record to DynamoDB** (the `users` collection). This is
   the canonical moment when the user enters the application database.

   ```ts
   // Inside the unified handler in src/lambda.ts
   if (isCognitoTrigger(event)) {
     if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
       const { sub, email, name } = event.request.userAttributes;
       await usersCollection.insert({
         userId: sub,       // Cognito sub — used everywhere as the foreign key
         email,
         displayName: name ?? email,
         createdAt: new Date().toISOString(),
       });
     }
     return event; // Cognito requires the event to be returned
   }
   ```

7. **Cognito returns the three tokens** (ID, Access, Refresh) to the mobile app.

8. **The app stores the tokens** in the platform's secure storage — iOS Keychain or
   Android Keystore. They must never be stored in AsyncStorage or any other
   unencrypted store.

---

## Sign-in flow (returning user)

```
Mobile app          Cognito            Federated IdP
    │                   │                    │
    │ 1. signIn()        │                    │
    │──────────────────►│                    │
    │ or PKCE flow for   │                    │
    │   social login     │                    │
    │                   │── (federated only) ►│
    │                   │◄────────────────────│
    │ 2. ID + Access +   │                    │
    │    Refresh tokens  │                    │
    │◄──────────────────│                    │
```

For a returning user Cognito skips the PostConfirmation trigger (the user record
already exists in DynamoDB). The app receives fresh tokens and updates its local
secure storage.

---

## Calling the backend API

Every request from the mobile app to the flightdad backend must include the
Cognito **ID token** in the `Authorization` header:

```
Authorization: Bearer eyJhbGci…<ID token>
```

The backend validates this token on every request (see [Token validation](#token-validation-in-the-backend)).
It never stores the raw token. After validation the backend extracts `sub` from
the JWT claims and uses it as `userId` for all database queries.

---

## Token validation in the backend

Cognito signs all JWTs with an RSA-256 key pair. The corresponding public keys are
published at a well-known JWKS endpoint:

```
https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
```

The backend middleware performs the following checks on every request:

```
Incoming request
    │
    │  1. Extract token from "Authorization: Bearer <token>" header
    ▼
    │  2. Decode JWT header → read "kid" (key ID)
    ▼
    │  3. Fetch / cache JWKS from Cognito → find matching public key
    ▼
    │  4. Verify RS256 signature
    ▼
    │  5. Verify "iss"  == expected Cognito issuer URL
    │     Verify "aud"  == expected app-client ID
    │     Verify "exp"  >= now  (not expired)
    ▼
    │  6. Extract "sub" → set req.userId
    ▼
    Route handler (e.g. GET /flights/itineraries)
```

### Recommended implementation

Use the [`aws-jwt-verify`](https://github.com/awslabs/aws-jwt-verify) library from
AWS Labs. It handles JWKS caching, automatic key rotation, and all the claims
validation in step 5.

```ts
// src/middleware/auth.ts (planned)
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request, Response, NextFunction } from "express";

// Extend Express's Request type so downstream handlers are fully typed.
declare module "express-serve-static-core" {
  interface Request {
    userId: string;
  }
}

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.COGNITO_APP_CLIENT_ID!,
});

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }
  try {
    const payload = await verifier.verify(header.slice(7));
    req.userId = payload.sub; // stable Cognito UUID
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
```

Mount the middleware globally (or per-router) in `src/index.ts`:

```ts
app.use(requireAuth); // all routes below this require a valid ID token
```

### JWKS caching

`aws-jwt-verify` caches the JWKS in memory and only refetches when it encounters a
`kid` that is not yet in the cache. This means the first request after a cold Lambda
start incurs one HTTP call to Cognito; subsequent requests in the same execution
environment hit the in-process cache. Cognito rotates keys infrequently (months),
so the cache is almost always warm.

---

## Token refresh flow

```
Mobile app          Cognito
    │                   │
    │ (detect expiry)    │
    │                   │
    │ 1. InitiateAuth    │
    │    REFRESH_TOKEN   │
    │──────────────────►│
    │                   │
    │ 2. New ID token +  │
    │    new Access token│
    │◄──────────────────│
    │                   │
    │ 3. Store new tokens│
    │    in Keychain /   │
    │    Keystore        │
```

The mobile app should check token expiry **before** making an API call. The recommended
strategy:

1. On every API call, read the stored ID token's `exp` claim from its JWT payload
   (no network needed — just base64-decode the payload).
2. If `exp < now + 60 seconds`, call the Cognito SDK `refreshSession()` (Amplify) or
   `initiateAuth` with `REFRESH_TOKEN_AUTH` before sending the request.
3. Replace the stored ID and Access tokens with the new ones. The Refresh token is
   **not** rotated by default (it keeps its original 30-day expiry).
4. Retry the original API call with the new ID token.

If the Refresh token has also expired the user must sign in again from scratch.

---

## How new users end up in the database

### Canonical approach: PostConfirmation Lambda trigger

The PostConfirmation trigger is the recommended approach because:

- It fires **exactly once** per user, immediately after their first confirmed sign-up.
- The Lambda runs synchronously inside the Cognito flow — if it fails, Cognito returns
  an error to the user and does **not** complete sign-up, keeping the User Pool and
  application DB in sync.
- No extra API call is needed from the mobile app; the user record exists before the
  app receives its first tokens.

```
Cognito PostConfirmation trigger
    │
    │  event.triggerSource == "PostConfirmation_ConfirmSignUp"  (email/password)
    │  event.triggerSource == "PostConfirmation_ConfirmForgotPassword"  (ignored)
    ▼
Lambda (existing lambda-lith): isCognitoTrigger() branch in src/lambda.ts
    │
    │  { userId: event.request.userAttributes.sub,
    │    email:  event.request.userAttributes.email,
    │    displayName: ...,
    │    createdAt: ISO-8601 }
    ▼
DynamoDB `users` collection
```

For **federated sign-up** (Google, Apple) Cognito uses a different trigger:
`PreTokenGeneration` fires on every sign-in. A conditional write (only if the user
does not already exist) in that trigger handles the first-time creation:

```ts
// Only insert on first sign-in (no existing record).
// usersCollection.find() returns Document<User>[] — an empty array means no match.
const existing = await usersCollection.find({ userId: sub });
if (existing.length === 0) {
  await usersCollection.insert({ userId: sub, email, createdAt: now });
}
```

Alternatively, enable **Cognito's built-in "Link Provider" trigger** and keep a single
PostConfirmation handler for all sign-up paths.

### Alternative: lazy creation on first API call

As a simpler fallback the `requireAuth` middleware can perform an upsert after
successfully verifying the ID token:

```ts
const payload = await verifier.verify(token);
let user = await usersCollection.find({ userId: payload.sub });
if (user.length === 0) {
  await usersCollection.insert({
    userId: payload.sub,
    email: payload.email as string,
    createdAt: new Date().toISOString(),
  });
}
```

This avoids a separate Lambda trigger but creates the record on the very first
successful request rather than at sign-up time. Either approach produces the same
eventual result; the PostConfirmation trigger is preferred because it keeps the
User Pool and application DB always in sync.

---

## User record shape

Regardless of which creation path is used, the `users` collection document is:

```ts
interface User {
  userId: string;      // Cognito sub — stable UUID; used as FK everywhere
  email: string;
  displayName?: string;
  createdAt: string;   // ISO-8601
}
```

`userId` is then used as the partition / lookup key in all other collections:
- `itineraries.userId`
- `user-friends.userId`

---

## Required AWS infrastructure additions

| Resource | Configuration |
|---|---|
| Cognito User Pool | Email sign-up enabled; Google / Apple configured as federated IdPs |
| Cognito App Client | "Generate client secret" off (mobile apps cannot keep secrets); Allowed flows: `ALLOW_USER_SRP_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH` |
| Cognito Hosted UI | Required for federated (OAuth 2.0 PKCE) flows; custom domain optional |
| PostConfirmation trigger config | Point the trigger at the **existing backend Lambda** (no separate function); configure `PostConfirmation_ConfirmSignUp`; IAM execution role needs `dynamodb:PutItem` on `users` table |
| Lambda env vars | `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID` (also needed by the backend) |
| IAM execution role (backend Lambda) | No Cognito API calls are needed — the backend only validates JWTs using JWKS; no extra IAM permissions required |

---

## Environment variables

Add to `.env.local` (development) and the Lambda execution environment (production):

```
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1
```

---

## Security notes

- Always use the **ID token** (not the Access token) as the bearer credential sent
  to the backend. The Access token's `aud` claim is the Cognito token endpoint, not
  the app client, and would fail audience validation.
- Store all tokens in platform secure storage only (iOS Keychain, Android Keystore).
  Never log tokens; never store them in plain files or AsyncStorage.
- The Refresh token does not expire unless revoked or the 30-day window elapses.
  Implement sign-out by calling Cognito's `GlobalSignOut` API to revoke the
  Refresh token server-side.
- The JWKS endpoint must be reachable from the Lambda execution environment. In a
  VPC-based deployment add a NAT gateway or a Cognito VPC endpoint.
