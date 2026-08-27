# Prototype architecture

This project deliberately uses only synthetic data. It does not call, inspect, scrape, or imitate a government system.

## Built patterns

- **Role-specific reads:** `/api/roles/citizen`, `/api/roles/manufacturer`, and `/api/roles/commercial` expose separate payloads. The browser does not download a shared all-role data set and filter it locally.
- **Explicit application state machines:** new applications and renewals have independent allowed-transition maps in `server.js`. Every valid change is written to an audit log. Invalid requests receive `409 Conflict`.
- **Async work:** document checks, test results, payment confirmation, and licence issuance enqueue timed demo jobs and return `202 Accepted`; the UI polls the small status endpoint.
- **Atomic reservations:** one synchronous capacity check-and-increment reserves a fixed-capacity slot without an `await` gap. This makes simultaneous requests to the last remaining seat safe in this single-process demo. A production deployment would use a conditional database update or row lock.
- **Fast status path:** `/api/applications/:id/status` returns a compact status payload separately from the detail/audit endpoint.

## Production-scale decisions to explain in the submission

- Put a short-TTL Redis-style cache before the status read endpoint.
- Rate-limit lookup reads per IP/session more tightly than authenticated write actions.
- Partition data by state/RTO, keeping cross-state lookup as an exception.
- Replace in-memory maps and timed jobs with a durable database, queue and workers; integrate authorised identity, document and payment providers only under appropriate government approval.
