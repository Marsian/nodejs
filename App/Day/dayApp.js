var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var request = require('request');

var app = module.exports = express();

// configuration =================
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

// page cache
var cache = { 
    'index.html': fs.readFileSync('App/Day/index.html'),
};

// main route =================
app.get('/Day', function( req, res ) {
    res.setHeader('Content-Type', 'text/html');
    res.send(cache['index.html']);
});

// get location info
app.post('/api/getCurrentLocation', function(req, res) {
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
            
    var apiKey = process.env.GOOGLE_API_KEY;
    if (typeof apiKey === "undefined") {
        res.send({ err: "No Google Api key." });
    } else {
        var query = "https://maps.google.com/maps/api/geocode/json";
        query += "?latlng=" + latitude + ',' + longitude;
        //query += "&key=" + apiKey;
        request.get(query, function(err, data) {
            if (err) {
                res.status(500).send({ err: err });
                return;
            }

            data = JSON.parse(data.body);
            if (data.error_message) {
                res.status(500).send({ err: data.error_message });
                return;
            }
            
            res.json({ results: data.results[0] }); 
        });            

    }
});
