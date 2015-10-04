var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var multer  = require('multer');
var lwip = require('lwip');
var hash = require('../../Modules/pass').hash;
var User = require('../../Modules/userModel');

var app = module.exports = express();
var upload = multer();

// configuration =================
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());
app.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: 'shhhh, very secret',
    store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

// page cache
var cache = { 
    'index.html': fs.readFileSync('App/Album/albumApp.html'),
    'login.html': fs.readFileSync('App/Album/login.html')
};

// Authenticate using our plain-object database of doom!
function authenticate(name, pass, fn) {
    if (!module.parent) console.log('authenticating %s:%s', name, pass);

    // query the db for the given username
    User.find({ name: name }, function(err, user) {
        if (err) 
            throw err;
        if (user.length == 0) {
            fn( { err: 'Cannot find user' } );
            return;
        }
        
        // apply the same algorithm to the POSTed password, applying
        // the hash against the pass / salt, if there is a match we
        user = user[0];
        hash(pass, user.salt, function(err, hash){
            if (err) return fn(err);
            if (hash == user.hash) return fn(null, user);
            fn( {err: 'Invalid password' } );
        });
    });
}

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/Album-Login');
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

app.get('/Album-Login', function(req, res){
    res.setHeader('Content-Type', 'text/html');
    res.send(cache['login.html']);
});

// define photo list model =================
var Photo = mongoose.model('Photo', {
    name : String,
    user: String,
    mimeType: String,
    date: { type: Date, default: Date.now },
    posted: { type: Date, default: Date.now },
    comments: [ { text: String, 
                  user: String, 
                  date: { type: Date, default: Date.now } } ]
});
var PhotoImage = mongoose.model('PhotoImage', {
    image: { type: Buffer, contentType: String },
    preview: { type: Buffer, contentType: String },
});
// api ===============
app.post('/api/Album-Login', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
        // Regenerate session when signing in
        // to prevent fixation
        req.session.regenerate(function(){
            // Store the user's primary key
            // in the session store to be retrieved,
            // or in this case the entire user object
            req.session.user = user;
            var msg = { redirect: "/Album-Admin"};
            res.json(msg);
        });    
    } else if (err) {
        res.json(err);
    } else {
        var errorMsg = { err: 'Unknown error'};
        res.json(errorMsg);
    }
  });
});

// initial api
app.get('/api/album', function(req, res) {
    var data = {};

    data.loggedIn = false; 
    data.user = "";
    data.photoData = [];
    Photo.find({}, '_id name user date posted', { sort: '-posted' }, function(err, ret) {
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

   Photo.find({}, '_id name user date posted', { sort: '-posted' }, function(err, ret) {
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
                        image: req.file.buffer,
                        preview: image
                    }, function(err, photo) {
                        if (err)
                            res.status(500).send(err);
                        
                        PhotoImage.create( {
                            _id: photo._id,
                            image: req.file.buffer,
                            preview: image
                        }, function(err, photo) {
                            res.json( { id: photo._id } );
                        });
                    });
                });
                
            });
        });
    } else
        res.status(500).send("Empty file!");
});

// get image of a photo
app.get('/api/getPhotoImage/:photo_id', function(req, res) {
    PhotoImage.find({ _id: req.params.photo_id }, function(err, data) {
        if (err) {
            res.status(500).send(err);
            console.log(err);
            return;
        }

        if (data && data.length > 0) {
            var photo = data[0];
            res.send(photo.image);
        }
        else 
            res.status(500).send('Photo not found!');
    });
});

// get preview of a photo
app.get('/api/getPhotoPreview/:photo_id', function(req, res) {
    PhotoImage.find({ _id: req.params.photo_id }, function(err, data) {
        if (err) {
            res.status(500).send(err);
            console.log(err);
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
        if (err)
            res.status(500).send(err);
        PhotoImage.remove({
            _id: req.body.id,
        }, function(err, data) {
            if (err)
                res.status(500).send(err);
            res.send('Success');
        });
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
        if (err)
            res.status(500).send(err);
        PhotoImage.remove({
            _id : { $in:
                req.body.ids,
            }
        }, function(err, data) {
            if (err)
                res.status(500).send(err);
            res.send('Success');
        });
    });
});
