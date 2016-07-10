var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var request = require('request');
var lunarCalendar = require('lunar-calendar');
var OAuth = require('oauth');

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
app.post('/Day/getCurrentLocation', function(req, res) {
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

// get weather from Yahoo
app.post('/Day/getWeather', function(req, res) {
    var location = req.body.location;

    var consumerKey = 'dj0yJmk9V1ZaWkxiSXF0SEZBJmQ9WVdrOU5EUkRNRzFuTXpRbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD04Ng--';
    var consumerSecret = process.env.YAHOO_CONSUMER_SECRET;

    if (typeof consumerSecret === "undefined") {
        res.send({ err: "No Yahoo consumer secret found." });
    } else {
        var baseQuery = "https://query.yahooapis.com/v1/yql";
        authQuery = baseQuery + "?q=select * from weather.forecast where woeid in (select woeid from geo.places(0) where text='" + location + "') and u='c'&format=json";
        var oa = new OAuth.OAuth(baseQuery, authQuery, consumerKey, consumerSecret, "1.0", null, "HMAC-SHA1");

        oa.get(
            authQuery,
            '', // user token
            '', // user secret
            function (err, data){
                if (err) {
                    res.status(500).send({ err: err });
                    return;
                }

                data = JSON.parse(data);
                res.json( data );
            }
        );
    }
});

// get lunar calendar
app.post('/Day/getLunarCalendar', function(req, res) {
    var date = new Date();
    if (req.body.date) {
        var date = new Date(req.body.date);
    }

    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    result = lunarCalendar.solarToLunar(year, month, day);
    result.date = date;
    result.lunarDay = Math.round(result.lunarDay);

    var month_pad = ("0" + month).slice(-2);
    var day_pad = ("0" + day).slice(-2);
    var entry = year + '-' + month_pad + '-' + day_pad;
    var huangli = cache.huangli.data[entry];
    result.yi = huangli.yi;
    result.ji = huangli.ji;

    res.json(result);
});

// get News
app.post('/Day/getNews', function(req, res) {

    var nyTimesApiKey = process.env.NY_TIMES_API_KEY;
    if (typeof nyTimesApiKey === "undefined") {
        res.send({ err: "No NY-Times api key found." });
        return;
    }

    var query = "https://api.nytimes.com/svc/topstories/v2/home.json?&api-key=" +
                nyTimesApiKey;

    request.get(query, function(err, data) {
        if (err) {
            res.status(500).send({ err: err });
            return;
        }

        data = JSON.parse(data.body);
        if (data.message) {
            res.status(500).send({ err: data.message });
            return;
        }

        res.json({ results: data.results });
    });
});
