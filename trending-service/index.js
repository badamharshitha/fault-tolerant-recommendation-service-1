const express = require('express');

const app = express();
const PORT = process.env.PORT || 8083;

const TRENDING_MOVIES = [
  { movieId: 99, title: "Trending Movie 1", genre: "Action" },
  { movieId: 100, title: "Trending Movie 2", genre: "Comedy" }
];

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/trending', (req, res) => {
  res.json(TRENDING_MOVIES);
});

app.listen(PORT, () => {
  console.log(`Trending service listening on port ${PORT}`);
});
