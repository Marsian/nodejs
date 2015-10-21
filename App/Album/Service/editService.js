var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var lwip = require('lwip');
var AWS = require('aws-sdk');
var Photo = require('../Model/photoModel');

var app = module.exports = express();

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

// Help function for update photo to S3
var _updatePhoto = function(id, photo, callback) {
    if (!id || !photo)
        return;

    var params = { Key: "" + id, Body: photo };
    s3bucket.putObject(params, function(err, data) {
        if (err) {
            callback(err);
            console.log("Error updating data: ", err);
        } else {
            callback();
            console.log("Successfully updating data to yanxi-album");
        }
    });
};

// Edit help function
var _rotateImage = function(buffer, angle, extension, callback) {
    lwip.open(buffer, extension, function(err, image){
        if (err) {
            res.status(500).json({ err: "Empty file!" });
            return;
        } 
        // use one percent of originam image for preview
        image.rotate(angle, function(err, image) {
            if (err) {
                callback({ err: "Empty file!" });
                return;
            }
            image.toBuffer(extension, function(err, buffer) {
                if (err) {
                    callback({ err: "Empty file!" });
                    return;
                }
                callback({ buffer: buffer});
            });
        });
    });

};

var _rotateCloudImage = function (photoId, angle, extension, callback) {
    var params = { Key: "" + photoId };
    s3bucket.getObject(params, function(err, data) {
        if (err) {
            callback({ err: err });
            console.log(err);
            return;
        }

        if (data && data.Body) {
            _rotateImage(data.Body, angle, extension, function (data) {
                if (data.err) {
                    callback({ err: data.err})
                } else if (data.buffer) {
                    // Update the original photo to S3
                    _updatePhoto(photoId, data.buffer, function(err) {
                        if (err) {
                            err.id = photo._id;
                            callback({ err: err });
                        } else {
                            callback( { id: photo._id } );
                        }
                     });
                } else {
                    callback({ err: "No buffer returned!" });
                }
            });
        }
        else 
            callback({ err: 'Photo not found!'});
    });


};

var _rotatePreviewImage = function(photoId, preview, angle, extension, callback) {
    _rotateImage(preview, angle, extension, function (data) {
        if (data.err) {
            callback({ err: data.err})
        } else if (data.buffer) {
            // Update the preview 
            Photo.update({ _id: photoId }, { $set: { preview: data.buffer } }, function(err, photo) {
                if (err) {
                    err.id = photo._id;
                    callback({ err: err });
                } else {
                    callback( { id: photo._id } );
                }
             });
        } else {
            callback({ err: "No buffer returned!" });
        }
    });

};

// rotate image
app.post('/api/rotateImage', function(req, res) {
    var photoId = req.body.photoId;
    var angle = req.body.angle;
    var errMsg = null;
    var callbackCount = 0;
    var totalCallback = 2;

    var _callback = function(data) {
        callbackCount ++;
        if (data.err) {
            errMsg += data.err;
        }

        if (callbackCount == totalCallback) {
            res.send({ err: errMsg, data: true });
        }
    };

    Photo.find({ _id: photoId }, function(err, data) {
        if (err) {
            res.status(500).json({ err: err });
        } else {
            if (data && data.length > 0) {
                photo = data[0];
                var extension = photo.mimeType.replace("image/", "");
                if (extension == "jepg")
                    extension = "jpg";
                _rotateCloudImage(photoId, angle, extension, _callback);                
                _rotatePreviewImage(photoId, photo.preview, angle, extension, _callback);

            } else {
                res.status(500).json({ err: "Photo not found!" });
            }
        }
    });  
});
