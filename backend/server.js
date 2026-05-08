require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Internship = require('./models/Internship');
const Student = require('./models/Student');

const app = express();
app.use(express.json());
app.use(cors()); // Allows your frontend to talk to your backend

// Serve static files from frontend directory
app.use(express.static('../frontend'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect...', err));

// Professional GET route: Fetching from the DB
app.get('/api/internships', async (req, res) => {
    try {
        const internships = await Internship.find();
        res.json(internships);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Professional POST route: Saving a new internship
app.post('/api/internships', async (req, res) => {
    try {
        let internship = new Internship(req.body);
        internship = await internship.save();
        res.send(internship);
    } catch (err) {
        res.status(500).send('Error creating internship');
    }
});

// POST route for applications
app.post('/api/applications', async (req, res) => {
    const { studentEmail, internshipId } = req.body;
    // For simplicity, just log or handle the application
    console.log(`Application received: ${studentEmail} applied for ${internshipId}`);
    res.send({ message: 'Application submitted successfully!' });
});

// POST route for saving student profiles
app.post('/api/students', async (req, res) => {
    try {
        const profileData = req.body;
        const existingStudent = await Student.findOne({ email: profileData.email });
        
        if (existingStudent) {
            // Update existing student
            const updated = await Student.findByIdAndUpdate(existingStudent._id, profileData, { new: true });
            res.send(updated);
        } else {
            // Create new student
            let student = new Student(profileData);
            student = await student.save();
            res.send(student);
        }
    } catch (err) {
        res.status(500).send('Error saving profile');
    }
});

// GET route for fetching student profile
app.get('/api/students/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const student = await Student.findOne({ email });
        if (student) {
            res.json(student);
        } else {
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
