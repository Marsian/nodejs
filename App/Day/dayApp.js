var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var request = require('request');
var lunarCalendar = require('lunar-calendar');

var app = module.exports = express();

// configuration =================
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

// page cache
var cache = { 
    'index.html': fs.readFileSync('App/Day/index.html'),
    'huangli': JSON.parse(fs.readFileSync('Assets/Data/huangli.json'))
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
        query += "&result_type=locality";
        query += "&key=" + apiKey;
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

// get lunar calendar
app.get('/api/getLunarCalendar', function(req, res) {
    var date = new Date();
    if (req.params.date) {
        var date = new Date(req.params.date);
    }

    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    result = lunarCalendar.solarToLunar(year, month, day);
    result.date = date;

    var month_pad = ("0" + month).slice(-2);
    var day_pad = ("0" + day).slice(-2);
    var entry = year + '-' + month_pad + '-' + day_pad;
    var huangli = cache.huangli.data[entry];
    result.yi = huangli.yi;
    result.ji = huangli.ji;

    res.json(result); 
});
