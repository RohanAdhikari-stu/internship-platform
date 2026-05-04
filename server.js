const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('./')); // This serves your index.html and script.js

// PASTE YOUR DATA HERE: Move the list from data.json to this variable
let internships = [
    {
        "id": 5,
        "title": "Marketing Analyst",
        "company": "BrandSync",
        "status": "Approved",
        "description": "Support marketing campaigns..."
    }
    // Add the rest of your internships from data.json here[cite: 1]
];

// This is your REAL API endpoint
app.get('/api/internships', (req, res) => {
    res.json(internships);
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});