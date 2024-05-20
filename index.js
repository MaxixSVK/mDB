const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
require('dotenv').config();

app.get('/', (req, res) => {
    res.send('mDatabase-chan: Ahoooj!');
});

app.get('/data', (req, res) => {
    fs.readFile('data.json', 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.send('No data found');
            } else {
                res.status(500).send('Error reading data');
            }
        } else {
            res.send(JSON.parse(data));
        }
    });
});

const apiKey = process.env.API_KEY;

app.post('/data', (req, res) => {
    if (req.headers['api-key'] !== apiKey) {
        res.status(401).send('Unauthorized');
        return;
    }
    fs.writeFile('data.json', JSON.stringify(req.body), 'utf8', (err) => {
        if (err) {
            res.status(500).send('Error saving data');
        } else {
            res.send('Data saved successfully');
        }
    });
});

app.listen(7000, () => {
    console.log('mDatabase-chan: Bežím na porte 7000');
});