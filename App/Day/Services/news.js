var request = require('request');

var news = module.exports = {};

var Sources = {
    NYTimes: 0,
    Guardians: 1
};

var _getNYTimesNews = function (callback) {
    var nyTimesApiKey = process.env.NY_TIMES_API_KEY;
    if (typeof nyTimesApiKey === "undefined") {
        callback({ err: "No NY-Times api key found." });
        return;
    }

    var query = "https://api.nytimes.com/svc/topstories/v2/home.json?&api-key=" +
                nyTimesApiKey;

    request.get(query, function(err, data) {
        if (err) {
            callback({ err: err });
            return;
        }

        data = JSON.parse(data.body);
        if (data.message) {
            callback({ err: data.message });
            return;
        }

        var results = [];
        try {
            for (var index in data.results) {
                var item = data.results[index];
                results.push({
                    title: item.title,
                    url: item.url,
                    abstract: item.abstract,
                    created_date: item.created_date
                });
            };

            callback({ results: results });
        } catch(e) {
            callback({ err: "Error: process news content." });
        }
    });
};

var _getGuardiansNews = function (callback) {
    var guardiansApiKey = process.env.GUARDIANS_API_KEY;
    if (typeof guardiansApiKey === "undefined") {
        callback({ err: "No Guardians api key found." });
        return;
    }

    var query = "http://content.guardianapis.com/search?section=world&show-fields=trailText&api-key=" +
                guardiansApiKey;

    request.get(query, function(err, data) {
        if (err) {
            callback({ err: err });
            return;
        }

        data = JSON.parse(data.body);
        if (data.message) {
            callback({ err: data.response.message });
            return;
        }

        var results = [];
        try {
            for (var index in data.response.results) {
                var item = data.response.results[index];
                results.push({
                    title: item.webTitle,
                    url: item.webUrl,
                    abstract: item.fields.trailText,
                    created_date: item.webPublicationDate
                });
            };

            callback({ results: results });
        } catch(e) {
            callback({ err: "Error: process news content." });
        }
    });
};

news.getNewsFromSource = function (source, callback) {
    switch (source) {
        case Sources.NYTimes:
            _getNYTimesNews(callback);
            break;
        case Sources.Guardians:
            _getGuardiansNews(callback);
            break;
        default:
            callback({ err: "Media not supported." });
    }
};

news.Sources = Sources;
