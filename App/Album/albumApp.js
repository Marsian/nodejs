var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var multer  = require('multer');
var lwip = require('lwip');
var AWS = require('aws-sdk');

var app = module.exports = express();
var upload = multer();

// configuration =================
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

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

// define photo list model =================
var Photo = mongoose.model('Photo', {
    name : String,
    user: String,
    mimeType: String,
    date: { type: Date, default: Date.now },
    posted: { type: Date, default: Date.now },
    preview: { type: Buffer, contentType: String },
    comments: [ { text: String, 
                  user: String, 
                  date: { type: Date, default: Date.now } } ]
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
}

// initial api
app.get('/api/album', function(req, res) {
    var data = {};

    data.loggedIn = false; 
    data.user = "";
    data.photoData = [];
    Photo.find({}, '_id name user date posted comments', { sort: '-posted' }, function(err, ret) {
        if (err)
            res.status(500).send(err);

        if (ret.length > 0) { 
            // returnt the first 10 results
            var end = ret.length > 9 ? 10 : ret.length;
            data.photoData = ret.slice(0, end);
        }
        if (req.session.user) { 
            data.loggedIn = true;
            data.user = req.session.user.name;
        }
        res.json(data);
    });

});

// get photo data in a range (for lazy loading)
app.post('/api/getPhotoData', function(req, res) {
   var data = { photoData: [] };
   var begin = req.body.begin;
   var end = req.body.end;

   Photo.find({}, '_id name user date posted comments', { sort: '-posted' }, function(err, ret) {
        if (err)
            res.status(500).send(err);
        
        // returnt the photo data in the range
        if (ret.length > 0) { 
            if (begin > ret.length) {
                res.send("Reach end");
                return;
            }
            begin --; // index position in the array
            end = ret.length > end ? end : ret.length;
            data.photoData = ret.slice(begin, end);
        }
        res.json(data);
   });
});

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
                            _uploadPhoto(photo._id, req.file.buffer, function(err) {
                                if (err) {
                                    err.id = photo._id;
                                    res.status(500).send(err);
                                } else {
                                    res.json( { id: photo._id } );
                                }
                            });
                        }
                    });
                });
                
            });
        });
    } else
        res.status(500).send("Empty file!");
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

// download single photo
app.get('/api/downloadSinglePhoto/:photo_id', function(req, res) {
    Photo.find({ _id: req.params.photo_id }, function(err, data) {
        if (err) {
            res.status(500).send(err);
            return;
        }

        if (data && data.length > 0) {
            var photo = data[0];
            var params = { Key: "" + req.params.photo_id };

            s3bucket.headObject(params, function(err, data) {
                if (err && err.code == "NotFound") {
                    console.log(err);
                    res.status(500).send(err);
                    return;
                }else {
                    res.setHeader('Content-disposition', 'attachment; filename=' + photo.name);
                    res.setHeader('Content-type', photo.mimeType);
                    var readStream = s3bucket.getObject(params).createReadStream();
                    readStream.pipe(res);
                    readStream.on('end', function() {
                        res.end()
                    });
                }
            });
        }
        else 
            res.status(500).send('Photo not found!');
    });
});

// download photo by ids
app.post('/api/downloadPhotoByIds', function(req, res) {
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

// delete a comment to the photo
app.post('/api/deletePhotoComment', function(req, res) {
    var user = "";
    if (req.session && req.session.user != null) {
        user = req.session.user.name;
    } else {
        user = "Anonymous";
    }
    
    // fint the photo and push a comment to it
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
