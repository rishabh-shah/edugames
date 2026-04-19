# API

Purpose: Backend HTTP service for catalog delivery, launch flows, review operations, and platform APIs.

Current scope:
- Fastify app with installation register/refresh and profile lifecycle endpoints.
- In-memory persistence for the first API slice.
- Signed installation access tokens and rotated refresh tokens.

Testing:
- unit tests cover token logic and service behavior.
- integration tests use Fastify injection across the live routes.
