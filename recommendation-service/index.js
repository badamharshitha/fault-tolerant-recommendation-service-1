const express = require('express');
const axios = require('axios');
const CircuitBreaker = require('./CircuitBreaker');

const app = express();
app.use(express.json());

const PORT = process.env.API_PORT || 8080;
const USER_PROFILE_URL = process.env.USER_PROFILE_URL || 'http://user-profile-service:8081';
const CONTENT_URL = process.env.CONTENT_URL || 'http://content-service:8082';
const TRENDING_URL = process.env.TRENDING_URL || 'http://trending-service:8083';

const cbConfig = {
    timeout: 2000,
    failureThresholdRate: 0.5,
    volumeThreshold: 10,
    consecutiveTimeoutsThreshold: 5,
    resetTimeout: 30000,
    halfOpenTrials: 3
};

const userProfileBreaker = new CircuitBreaker('userProfileCircuitBreaker', cbConfig);
const contentBreaker = new CircuitBreaker('contentCircuitBreaker', cbConfig);

// Keep half-open state literal matched with expected metrics output
userProfileBreaker.getMetrics = function () {
    const m = CircuitBreaker.prototype.getMetrics.call(this);
    m.state = m.state === 'HALF_OPEN' ? 'HALF_OPEN' : m.state;
    return m;
}
contentBreaker.getMetrics = function () {
    const m = CircuitBreaker.prototype.getMetrics.call(this);
    m.state = m.state === 'HALF_OPEN' ? 'HALF_OPEN' : m.state;
    return m;
}

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Simulation endpoints for dependencies
app.post('/simulate/:service_name/:behavior', async (req, res) => {
    const { service_name, behavior } = req.params;

    if (!['normal', 'slow', 'fail'].includes(behavior)) {
        return res.status(400).json({ error: 'Invalid behavior' });
    }

    try {
        if (service_name === 'user-profile') {
            await axios.post(`${USER_PROFILE_URL}/simulate/${behavior}`);
            return res.json({ message: `Successfully set user-profile behavior to ${behavior}` });
        } else if (service_name === 'content') {
            await axios.post(`${CONTENT_URL}/simulate/${behavior}`);
            return res.json({ message: `Successfully set content behavior to ${behavior}` });
        } else {
            return res.status(400).json({ error: 'Invalid service_name' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Failed to set behavior on dependency' });
    }
});

app.get('/metrics/circuit-breakers', (req, res) => {
    res.json({
        userProfileCircuitBreaker: userProfileBreaker.getMetrics(),
        contentCircuitBreaker: contentBreaker.getMetrics()
    });
});

app.get('/recommendations/:userId', async (req, res) => {
    const { userId } = req.params;

    let userPrefs = null;
    let userPrefsFallback = false;

    try {
        const response = await userProfileBreaker.fire(() => axios.get(`${USER_PROFILE_URL}/profile/${userId}`));
        userPrefs = response.data;
    } catch (err) {
        userPrefsFallback = true;
        userPrefs = {
            userId: userId,
            preferences: ["default-genre-1", "default-genre-2"]
        };
    }

    let recommendations = null;
    let contentFallback = false;

    try {
        const response = await contentBreaker.fire(() => axios.get(`${CONTENT_URL}/content`));
        recommendations = response.data;
    } catch (err) {
        contentFallback = true;
    }

    // If BOTH are open/failed, then provide final fallback
    if (userPrefsFallback && contentFallback) {
        try {
            const trendingResponse = await axios.get(`${TRENDING_URL}/trending`);
            return res.json({
                message: "Our recommendation service is temporarily degraded. Here are some trending movies.",
                trending: trendingResponse.data,
                fallback_triggered_for: "user-profile-service, content-service"
            });
        } catch (e) {
            return res.status(500).json({ error: "Completely degraded" });
        }
    }

    // If one or neither failed
    const result = {
        userPreferences: userPrefs,
        recommendations: recommendations || []
    };

    const fallbacks = [];
    if (userPrefsFallback) fallbacks.push("user-profile-service");
    if (contentFallback) fallbacks.push("content-service");

    if (fallbacks.length > 0) {
        result.fallback_triggered_for = fallbacks.join(", ");
    }

    res.json(result);
});

app.listen(PORT, () => {
    console.log(`Recommendation service listening on port ${PORT}`);
});
