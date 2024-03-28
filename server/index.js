// server.js
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 5000;
const cors = require('cors');

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb+srv://coolsquareup754:SCunoUDEQTo6f8ro@cluster0.roqwz7y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Cab Model
const CabModel = mongoose.model('Cab', {
    source: String,
    destination: String,
    time: Number,
    cost: Number,
    isBooked: Boolean,
});

// Adjacency List
const adjList = {
    1: { 2: 5, 3: 7 },
    2: { 1: 5, 4: 15, 5: 20 },
    3: { 1: 7, 4: 5, 5: 35 },
    4: { 2: 15, 3: 5, 6: 20 },
    5: { 2: 20, 3: 35, 6: 10 },
    6: { 4: 20, 5: 10 },
};

// Dijkstra's Algorithm
function dijkstra(source, destination, adjList) {
    const n = Object.keys(adjList).length;
    const distances = {};
    const paths = {};
    const visited = new Set();

    for (let node in adjList) {
        distances[node] = Infinity;
        paths[node] = [];
    }
    distances[source] = 0;

    while (visited.size < n) {
        let minDist = Infinity;
        let minNode = null;

        // Find the unvisited node with the minimum distance
        for (let node in distances) {
            if (!visited.has(node) && distances[node] < minDist) {
                minDist = distances[node];
                minNode = node;
            }
        }

        if (minNode === null) break; // No reachable nodes left

        // Mark the selected node as visited
        visited.add(minNode);

        // Update distances and paths for adjacent nodes
        for (let neighbor in adjList[minNode]) {
            if (!visited.has(neighbor)) {
                const dist = distances[minNode] + adjList[minNode][neighbor];
                if (dist < distances[neighbor]) {
                    distances[neighbor] = dist;
                    paths[neighbor] = [...paths[minNode], minNode];
                }
            }
        }
    }

    // Return the shortest path and time from source to destination
    return { shortestPath: [...paths[destination], destination], shortestTime: distances[destination] };
}

// Email Notification
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-password',
    },
});

// Route for booking a cab
app.post('/book-cab', async (req, res) => {
    const { source, destination, email } = req.body;

    // Calculate shortest path and time
    const { shortestPath, shortestTime: time } = dijkstra(source, destination, adjList);

    // Calculate cost
    const cost = time * 10; // Assuming 10 rupees per minute

    // Save cab booking to MongoDB
    const cabBooking = new CabModel({ source, destination, time, cost , isBooked : true});
    await cabBooking.save();

    // Send email notification
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Cab Booking Confirmation',
        text: `Your cab from ${source} to ${destination} has been booked. Estimated time: ${time} minutes. Estimated cost: ${cost} rupees.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    res.json({ shortestPath, time, cost });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
