const express = require('express');

const app = express();
const PORT = process.env.PORT || 8082;

let currentState = 'normal';

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Endpoint to simulate failures
app.post('/simulate/:behavior', (req, res) => {
    const behavior = req.params.behavior;
    if (['normal', 'slow', 'fail'].includes(behavior)) {
        currentState = behavior;
        res.json({ message: `content-service behavior set to ${behavior}` });
    } else {
        res.status(400).json({ error: 'Invalid behavior' });
    }
});

app.get('/content', async (req, res) => {
    if (currentState === 'fail') {
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (currentState === 'slow') {
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    res.json([
        { movieId: 101, title: "Inception", genre: "Sci-Fi" },
        { movieId: 102, title: "The Dark Knight", genre: "Action" }
    ]);
});

app.listen(PORT, () => {
    console.log(`Content service listening on port ${PORT}`);
});
