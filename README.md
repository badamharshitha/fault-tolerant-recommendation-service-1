# Fault-Tolerant Microservices with Circuit Breakers

A robust, fault-tolerant movie recommendation system built with Node.js, Express, and Docker. This project demonstrates resilience patterns in a microservices architecture, specifically focusing on the **Circuit Breaker** pattern to prevent cascading failures in distributed systems.

## Architecture Overview

The system consists of four containerized microservices communicating over a Docker bridge network:

1. **`recommendation-service` (Main API)**
   - The primary entry point orchestrating calls to backend dependencies.
   - Implements a custom **Circuit Breaker** to protect against slow or failing downstream services.
   - Handles graceful degradation and complex fallback strategies depending on which services are down.

2. **`user-profile-service` (Dependency)**
   - Provides user information and preferences.
   - Features endpoints to simulate slow network conditions or internal server errors (`500`).

3. **`content-service` (Dependency)**
   - Provides movie catalog data.
   - Also features mock behavior endpoints for simulating service degradation.

4. **`trending-service` (Fallback Dependency)**
   - Acts as a reliable fallback service when primary dependencies completely fail.

## Circuit Breaker Pattern implementation

The core of the resilience strategy is a custom `CircuitBreaker` class in the `recommendation-service`. It implements a state machine (`CLOSED`, `OPEN`, `HALF_OPEN`) with the following characteristics:
* **Request Timeout:** 2 seconds.
* **Failure Thresholds:** Opens on 5 consecutive timeouts OR a 50% failure rate over 10 requests.
* **Timeout Duration:** Remains `OPEN` for 30 seconds before attempting recovery.
* **Trial Period:** Allows 3 test requests in `HALF_OPEN` state to verify service recovery.

## Getting Started

### Prerequisites
* Docker and Docker Compose
* Node.js (for local development)

### Running the System
1. Create your environment variables file (or rely on defaults):
   ```bash
   cp .env.example .env
   ```
2. Build and start the services using docker-compose:
   ```bash
   docker-compose up -d --build
   ```
   > The `recommendation-service` will securely wait for its dependencies to report healthy before starting, thanks to `depends_on: { condition: service_healthy }`.

## API Endpoints

### 1. Main Recommendation API (`recommendation-service` port 8080)
* **`GET /recommendations/{userId}`**
  - Fetches the user's recommendations. Responses automatically degrade gracefully if dependencies fail.

### 2. Dependency Simulation Controls (To test fault tolerance)
* **`POST /simulate/user-profile/fail`** (Causes profile service to return 500s)
* **`POST /simulate/user-profile/slow`** (Causes profile service to hang for 3s, triggering timeouts)
* **`POST /simulate/user-profile/normal`** (Restores service to healthy state)
* Same endpoints exist for `content`, e.g., `POST /simulate/content/fail`

### 3. Circuit Breaker Metrics
* **`GET /metrics/circuit-breakers`**
  - Monitors the state (`CLOSED`, `OPEN`, `HALF_OPEN`), failure rate, and call statistics of each circuit breaker in real-time.

## Testing Resiliency (Step-by-Step)

1. **Happy Path:**
   - `curl http://localhost:8080/recommendations/123`. See full preferences and movie list.
2. **Graceful Degradation:**
   - Run `curl -X POST http://localhost:8080/simulate/user-profile/fail`
   - Hit `GET /recommendations/123` ~6 times to blow the circuit. Wait to see instant responses with hardcoded default preferences while still getting real movie recommendations.
3. **Complete Fallback:**
   - Run `curl -X POST http://localhost:8080/simulate/content/fail` to break the content service as well.
   - Hit `GET /recommendations/123`. You will now see the `trending-service` take over, serving a generic trending list instead of a personalized crash error!
4. **Recovery:**
   - Set both services back to `normal`. Wait 30 seconds.
   - Run a few requests. The breaker moves to `HALF_OPEN` then safely `CLOSED`.
