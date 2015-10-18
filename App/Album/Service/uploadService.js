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
var ExifImage = require('exif').ExifImage;
var Photo = require('../Model/photoModel');

var app = module.exports = express();
var upload = multer();

// Configuration =================
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

// Create AWS S3 instance
var bucket = null;
if (typeof process.env.OPENSHIFT_APP_NAME === "undefined") {
    bucket = "yanxi-album-test";
} else {
    bucket = "yanxi-album";
}
var s3bucket = new AWS.S3({params: { Bucket: bucket }});

// Help function for uploading photo to S3
var _uploadPhoto = function(id, photo, callback) {
    if (!id || !photo)
        return;

    var params = { Key: "" + id, Body: photo };
    s3bucket.upload(params, function(err, data) {
        if (err) {
            callback(err);
            console.log("Error uploading data: ", err);
        } else {
            callback();
            console.log("Successfully uploaded data to yanxi-album");
        }
    });
};

// Help function for extracting geo information
var _extractGeoInfo = function(id, photo) {
    try {
        new ExifImage({ image : photo }, function (error, exifData) {
            if (error) {
                console.log('Error: '+error.message);
            } else {
                console.log(exifData); // Do something with your data! 
                var gps = exifData.gps;
                var latitude = 0;
                var longitude = 0;
                if (gps && gps.GPSLatitude && gps.GPSLatitude.length > 2) {
                    var gpsL = gps.GPSLatitude;
                    latitude = gpsL[0] + gpsL[1] / 60 + gpsL[2] / 3600;
                    if (gps.GPSLatitudeRef && gps.GPSLatitudeReg == 'S') {
                        latitude = -1 * latitude;
                    }
                }
                if (gps && gps.GPSLongitude && gps.GPSLongitude.length > 2) {
                    var gpsL = gps.GPSLongitude;
                    longitude = gpsL[0] + gpsL[1] / 60 + gpsL[2] / 3600;
                    if (gps.GPSLongitudeRef && gps.GPSLongitudeRef == 'W') {
                        longitude = -1 * longitude;
                    }
                }
                
                Photo.update({_id: id}, 
                             { $set: { latitude: latitude, longitude: longitude } },
                             function(err) {
                        if (err)
                            console.log(err);
                    });
            }
        });
    } catch (error) {
        console.log('Error: ' + error.message);
    }
};


// add a photo
app.post('/api/photo', upload.single('file'), function (req, res, next) {
    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    console.log(req.file);
    console.log(req.body);
    if (req.file) {
        var extension = req.file.mimetype.replace("image/", "");
        if (extension == "jepg")
            extension = "jpg";
        lwip.open(req.file.buffer, extension, function(err, image){
            if (err) {
                res.status(500).send("Empty file!");
                return;
            } 
            // use one percent of originam image for preview
            image.scale(0.1, function(err, image) {
                if (err) {
                    res.status(500).send("Empty file!");
                    return;
                }
                image.toBuffer(extension, function(err, image) {
                    if (err) {
                        res.status(500).send("Empty file!");
                        return;
                    }
                    Photo.create({
                        name: req.file.originalname,
                        user: req.session.user.name,
                        mimeType: req.file.mimetype,
                        date: req.body.lastModified,
                        preview: image
                    }, function(err, photo) {
                        if (err) {
                            err.id = photo._id;
                            res.status(500).send(err);
                        } else {
                            // Upload the original photo to S3
                            _uploadPhoto(photo._id, req.file.buffer, function(err) {
                                if (err) {
                                    err.id = photo._id;
                                    res.status(500).send(err);
                                } else {
                                    res.json( { id: photo._id } );
                                }
                            });
                           
                            // Extract geo info 
                            _extractGeoInfo(photo._id, req.file.buffer);
                        }
                    });
                });
                
            });
        });
    } else
        res.status(500).send("Empty file!");
});


