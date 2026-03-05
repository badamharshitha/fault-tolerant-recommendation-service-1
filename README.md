# Fault-Tolerant Microservices with Circuit Breakers

A fault-tolerant movie recommendation system built using **Node.js, Express, Docker, and the Circuit Breaker pattern**.

This project demonstrates how microservices remain resilient when dependent services fail by implementing **timeouts, failure thresholds, fallback responses, and recovery mechanisms**. The system simulates real-world distributed system failures and shows how services degrade gracefully instead of crashing.

The application consists of multiple containerized services orchestrated using **Docker Compose**.

---

## System Architecture

The system consists of four microservices communicating over a Docker network.


```

Client
|
v
recommendation-service (Main API)
|
|---- user-profile-service
|
|---- content-service
|
|---- trending-service (Fallback)

```

---

# Microservices Overview

## 1. recommendation-service (Main API)

- Acts as the primary entry point.
- Orchestrates calls to dependent services.
- Implements a custom **Circuit Breaker pattern**.
- Handles fallback responses when dependencies fail.

Endpoint example:

```

GET /recommendations/{userId}

```

---

## 2. user-profile-service

Provides user profile information and preferences.

Example response:

```

{
"userId": "123",
"preferences": ["Action", "Sci-Fi"]
}

```

Simulation modes available:

- normal
- slow (3 second delay)
- fail (HTTP 500 error)

---

## 3. content-service

Provides movie catalog data used for recommendations.

Example response:

```

{
"movieId": 101,
"title": "Inception",
"genre": "Sci-Fi"
}

```

Supports simulation endpoints to test failures.

---

## 4. trending-service

Acts as a reliable fallback service when personalized recommendations cannot be generated.

Example response:

```

[
{ "movieId": 99, "title": "Trending Movie 1" }
]

```

---

# Circuit Breaker Implementation

The **Circuit Breaker pattern** protects the recommendation service from cascading failures caused by slow or failing dependencies.

Circuit breaker states:

### CLOSED
Normal state where requests are sent to dependencies.

### OPEN
Triggered when failure thresholds are exceeded.  
Requests fail immediately without calling the failing service.

### HALF_OPEN
After a cooldown period, limited test requests are allowed to check if the service has recovered.

If successful, the breaker transitions back to **CLOSED**.

---

# Circuit Breaker Configuration

| Parameter | Value |
|-----------|------|
Request Timeout | 2 seconds |
Failure Threshold | 5 consecutive failures |
Failure Rate Threshold | 50% failure rate over 10 requests |
Open State Duration | 30 seconds |
Half Open Trial Requests | 3 |

---

# Technologies Used

- Node.js
- Express.js
- Docker
- Docker Compose
- REST APIs
- Microservices Architecture
- Circuit Breaker Pattern

---

# Project Structure

```

fault-tolerant-recommendation-service
│
├── recommendation-service
│   ├── CircuitBreaker.js
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── user-profile-service
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── content-service
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── trending-service
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md

```

---

# Getting Started

## Prerequisites

Install the following:

- Docker
- Docker Compose
- Node.js (optional for local development)

---

# Running the Application

### 1 Create environment variables

```

cp .env.example .env

```

---

### 2 Start the services

```

docker compose up -d --build

```

All services will start automatically.

The **recommendation-service waits for dependencies to become healthy** before starting.

---

# API Endpoints

## Recommendation API

```

GET /recommendations/{userId}

```

Example:

```

curl [http://localhost:8080/recommendations/123](http://localhost:8080/recommendations/123)

```

---

# Simulation Endpoints

Used to test fault tolerance.

## Simulate user-profile failure

```

curl -X POST [http://localhost:8080/simulate/user-profile/fail](http://localhost:8080/simulate/user-profile/fail)

```

## Simulate slow response

```

curl -X POST [http://localhost:8080/simulate/user-profile/slow](http://localhost:8080/simulate/user-profile/slow)

```

## Restore normal behavior

```

curl -X POST [http://localhost:8080/simulate/user-profile/normal](http://localhost:8080/simulate/user-profile/normal)

```

Same endpoints exist for the content service:

```

curl -X POST [http://localhost:8080/simulate/content/fail](http://localhost:8080/simulate/content/fail)
curl -X POST [http://localhost:8080/simulate/content/slow](http://localhost:8080/simulate/content/slow)
curl -X POST [http://localhost:8080/simulate/content/normal](http://localhost:8080/simulate/content/normal)

```

---

# Circuit Breaker Metrics

```

GET /metrics/circuit-breakers

```

Example:

```

curl [http://localhost:8080/metrics/circuit-breakers](http://localhost:8080/metrics/circuit-breakers)

```

Example response:

```

{
"userProfileCircuitBreaker": {
"state": "OPEN",
"failureRate": "70%",
"successfulCalls": 3,
"failedCalls": 7
}
}

```

---

# Testing Fault Tolerance

## 1 Normal Behavior

```

curl [http://localhost:8080/recommendations/123](http://localhost:8080/recommendations/123)

```

Returns personalized recommendations.

---

## 2 Simulate dependency failure

```

curl -X POST [http://localhost:8080/simulate/user-profile/fail](http://localhost:8080/simulate/user-profile/fail)

```

Send multiple requests:

```

curl [http://localhost:8080/recommendations/123](http://localhost:8080/recommendations/123)

```

The circuit breaker will open and fallback responses will be returned.

---

## 3 Complete fallback

Break both dependencies:

```

curl -X POST [http://localhost:8080/simulate/user-profile/fail](http://localhost:8080/simulate/user-profile/fail)
curl -X POST [http://localhost:8080/simulate/content/fail](http://localhost:8080/simulate/content/fail)

```

Now the system will return trending movies.

---

## 4 Recovery

Restore services:

```

curl -X POST [http://localhost:8080/simulate/user-profile/normal](http://localhost:8080/simulate/user-profile/normal)
curl -X POST [http://localhost:8080/simulate/content/normal](http://localhost:8080/simulate/content/normal)

```

After **30 seconds**, the circuit breaker transitions:

```

OPEN → HALF_OPEN → CLOSED

```

---

# Author

**B.N.S Harshitha**

---

# License

This project is created for educational purposes and demonstrates resilience patterns in microservices architecture.


