var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var multer  = require('multer');
var lwip = require('lwip');
var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var archiver = require('archiver');
var request = require('request');
// Mongoose model
var Photo = require('./Model/photoModel');
var Export = require('./Model/exportModel');
// local service
var EditService = require('./Service/editService.js');
var DownloadService = require('./Service/downloadService.js');
var UploadService = require('./Service/uploadService.js');

var app = module.exports = express();

// configuration =================
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());
app.use(EditService);
app.use(DownloadService);
app.use(UploadService);

// page cache
var cache = { 
    'index.html': fs.readFileSync('App/Album/albumApp.html'),
};

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login?app=Album-Admin');
  }
}

// main route =================
app.get('/Album', function( req, res ) {
    res.setHeader('Content-Type', 'text/html');
    res.send(cache['index.html']);
});

app.get('/Album-Admin', restrict, function( req, res ) {
    res.setHeader('Content-Type', 'text/html');
    res.send(cache['index.html']);
});

app.get('/Album-Logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
    req.session.destroy(function(){
        res.redirect('/Album');
    });
});

// Create AWS S3 instance
var bucket = null;
if (typeof process.env.OPENSHIFT_APP_NAME === "undefined") {
    bucket = "yanxi-album-test";
} else {
    bucket = "yanxi-album";
}
var s3bucket = new AWS.S3({params: { Bucket: bucket }});
s3bucket.listBuckets(function(error, data) {
    if (error) {
        console.log(error); // error is Response.error
    } else {
        console.log(data); // data is Response.data
    }
});

// initial api
app.get('/api/album', function(req, res) {
    var data = {};

    data.loggedIn = false; 
    data.user = "";

    if (req.session.user) { 
        data.loggedIn = true;
        data.user = req.session.user.name;
    }

    res.json(data);
});

// get photo data in a range (for lazy loading)
app.post('/api/getPhotoData', function(req, res) {
    var data = { photoData: [] };
    var begin = req.body.begin;
    var end = req.body.end;
    var mode = req.body.mode;
    var sortOrder = "-posted";
    if (mode && mode == "timeline") {
        sortOrder = "-date";
    }

    Photo.find({}, '_id name user date posted comments', { sort: sortOrder }, function(err, ret) {
        if (err)
            res.status(500).send(err);
        
        // return the photo data in the range
        if (ret.length > 0) { 
            if (begin > ret.length) {
                res.json({ info: "End" });
                return;
            }
            begin --; // index position in the array
            end = ret.length > end ? end : ret.length;
            data.photoData = ret.slice(begin, end);
        }
        res.json(data);
    });
});

// get image of a photo
app.get('/api/getPhotoImage/:photo_id', function(req, res) {
    var params = { Key: "" + req.params.photo_id };
    s3bucket.getObject(params, function(err, data) {
        if (err) {
            res.status(500).send(err);
            console.log(err);
            return;
        }

        if (data && data.Body) {
            res.send(data.Body);
        }
        else 
            res.status(500).send('Photo not found!');
    });
});

// get preview of a photo
app.get('/api/getPhotoPreview/:photo_id', function(req, res) {
    Photo.find({ _id: req.params.photo_id }, function(err, data) {
        if (err) {
            res.status(500).send(err);
            return;
        }

        if (data && data.length > 0) {
            var photo = data[0];
            res.send(photo.preview);
        }
        else 
            res.status(500).send('Photo not found!');
    });
});

// delete a photo
app.post('/api/deletePhoto', function(req, res) {
    if (!req.session.user) {
        res.status(500).send("Not logged in!");
    }

    Photo.remove({
        _id : req.body.id,
    }, function(err, data) {
        if (err) {
            res.status(500).send(err);
        } else {
            var params = { Key: "" + req.body.id };
            s3bucket.deleteObject(params, function(err, data) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.send('Success');
                }
            });
        }
    });
});

// delete a list of photos
app.post('/api/deletePhotoByIds', function(req, res) {
    if (!req.session.user) {
        res.status(500).send("Not logged in!");
    }

    Photo.remove({
        _id : { $in:
            req.body.ids,
        }
    }, function(err, data) {
        if (err) {
            res.status(500).send(err);
        } else {
            var params = { Delete: { Objects: [] } };
            for (var i in req.body.ids) {
                var id = "" + req.body.ids[i];
                params.Delete.Objects.push({ Key: id });
            }
            s3bucket.deleteObjects(params, function(err, data) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.send('Success');
                }
            })
        }
    });
});

// post a comment to the photo
app.post('/api/postPhotoComment', function(req, res) {
    var user = "";
    if (req.session && req.session.user != null) {
        user = req.session.user.name;
    } else {
        user = "Anonymous";
    }
    
    // fint the photo and push a comment to it
    Photo.update({ _id: req.body.id }, { $push: { comments: {user: user, text: req.body.comment } } }, {}, 
        function(err, photo){ 
            if (err) {
                res.status(500).send(err);
            } else {
                Photo.find({ _id: req.body.id }, 'comments', function(err, comments) {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        if (comments && comments.length > 0) {
                            res.json(comments[0]);
                        } else {
                            res.send("No result");
                        }
                    }
                });
            }
    });
});

// delete a comment from the photo
app.post('/api/deletePhotoComment', function(req, res) {
    var user = "";
    if (req.session && req.session.user != null) {
        user = req.session.user.name;
    } else {
        user = "Anonymous";
    }
    
    // find the photo and delete a comment from it
    Photo.update({ _id: req.body.id }, { $pull: { comments: { _id: req.body.commentId } } }, {}, 
        function(err, photo){ 
            if (err) {
                res.status(500).send(err);
            } else {
                Photo.find({ _id: req.body.id }, 'comments', function(err, comments) {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        if (comments && comments.length > 0) {
                            res.json(comments[0]);
                        } else {
                            res.send("No result");
                        }
                    }
                });
            }
    });
});

// get location info
app.post('/api/getLocation', function(req, res) {
    var id = req.body.id;

    Photo.find({ _id: id }, function(err, photo) {
        if (err) {
            res.status(500).send(err);
        } else if (photo && photo.length > 0) {
            photo = photo[0];
            if (photo.latitude == 0 && photo.longitude == 0) {
                res.send({ err: "No location info." });
                return;
            }
            
            var apiKey = process.env.GOOGLE_API_KEY;
            if (typeof apiKey === "undefined") {
                res.send({ err: "No Google Api key." });
            } else {
                var query = "https://maps.google.com/maps/api/geocode/json";
                query += "?latlng=" + photo.latitude + ',' + photo.longitude;
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
                    
                    res.json({ results: data.results, 
                               coordinate: { lat: photo.latitude, lng: photo.longitude } });
                });            

            }
        } else {
            res.send({ err: "Photo not found" });
        }
    });
});
