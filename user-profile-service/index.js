const express = require('express');

const app = express();
const PORT = process.env.PORT || 8081;

let currentState = 'normal';

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Endpoint to simulate failures
app.post('/simulate/:behavior', (req, res) => {
    const behavior = req.params.behavior;
    if (['normal', 'slow', 'fail'].includes(behavior)) {
        currentState = behavior;
        res.json({ message: `user-profile-service behavior set to ${behavior}` });
    } else {
        res.status(400).json({ error: 'Invalid behavior' });
    }
});

app.get('/profile/:userId', async (req, res) => {
    const { userId } = req.params;

    if (currentState === 'fail') {
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (currentState === 'slow') {
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    res.json({
        userId: userId,
        preferences: ["Action", "Sci-Fi"]
    });
});

app.listen(PORT, () => {
    console.log(`User Profile service listening on port ${PORT}`);
});
