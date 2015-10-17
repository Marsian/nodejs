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
var Photo = require('../Models/photoModel');
var Export = require('../Models/exportModel');

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

// export photos to zip by ids
app.post('/api/exportPhotoByIds', function(req, res) {
    var ids = req.body.ids;

    var _updateStatus = function(token, progress) {
        Export.update({ token: token }, { $set: { progress: progress} }, function(err, data) {
            if (err)
                console.log(err);
        });
    };

    var _removeData = function(path) {
        if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file,index){
                var curPath = path + "/" + file;
                fs.unlinkSync(curPath);
            });
            fs.rmdirSync(path);
        }
    };

    var _createZip = function() {
        console.log('end');
        var zipPath = './temp/' + token + '.zip'; 
        var output = fs.createWriteStream(zipPath);
        var archive = archiver('zip');

        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
            _updateStatus(token, 100);

            var path = './temp/' + token;
            _removeData(path);
        });

        archive.on('error', function(err){
            throw err;
        });

        archive.pipe(output);
        archive.bulk([
            { expand: true, cwd: './temp/' + token, src: ['**'] }
        ]);
        archive.finalize();
    };

    var _getData = function(photo) {
        var params = { Key: "" + photo._id };
        s3bucket.getObject(params, function(err, data) {
            if (err) {
                getCount ++;
                if (getCount == ids.length)
                    _createZip();
                console.log(err);
                return;
            }

            if (data && data.Body) {
                fs.mkdir('./temp/' + token, function(err) {
                    if (err && err.code != "EEXIST") {
                        getCount ++;
                        if (getCount == ids.length)
                            _createZip();
                        console.log(err);
                        return;
                    }
                    var filePath = './temp/' + token + '/' + photo.name;
                    fs.appendFile(filePath, data.Body, function(err) {
                        if (err)
                            console.log(err);
                        getCount ++;
                        var progress = Math.floor( getCount / ids.length * 80 ); 
                        _updateStatus(token, progress);
                        console.log(getCount);
                        console.log(photo.name);
                        if (getCount == ids.length)
                            _createZip();
                    });
                })
            }
        });
    };

    var _exportPhoto = function(id) {
        Photo.find({ _id: id }, function(err, data) {
            if (err) {
                getCount ++;
                if (getCount == ids.length)
                    _createZip();
                console.log(err);
                return;
            }
            
            if (data && data.length > 0) {
                var photo = data[0];
                _getData(photo);
            } else {
                console.log('Photo not found in local db')
            }
        });

    };
    

    var getCount = 0;
    var token = uuid.v4();
    var exportTask = new Export({ token: token, progress: 0 });
    exportTask.save();
    for (var i in ids) {
        var id = ids[i];
        _exportPhoto(id);
    }
    res.end(token);
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

// download photo zip by token
app.get('/api/downloadPhotos/:token', function(req, res) {
    var token = req.params.token;
    Export.remove({ token: token }, function(err) {
        if (err)
            console.log(err);
    });
    res.setHeader('Content-disposition', 'attachment; filename=download.zip');
    res.setHeader('Content-type', 'application/zip');
    
    var filePath = './temp/' + token + '.zip';
    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);  
    readStream.on('end', function() {
        res.end()
        // delete the zip file
        fs.unlinkSync(filePath);
    });
});

// Get currnt export status by token
app.get('/api/getExportStatus/:token', function(req, res) {
    var token = req.params.token;
    Export.find({ token: token }, function(err, data) {
        if (err) {
            console.log(err);
            res.status(500).json( { err: err });
        } else {
            if (data && data.length > 0) {
                res.json({ status: data[0] });
            } else {
                console.log(err);
                res.status(500).json({ err: "Status not found!" });
            }
        }
    });
});


