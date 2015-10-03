var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var session = require('express-session');
var multer  = require('multer');
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
    secret: 'shhhh, very secret'
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
    date : { type: Date, default: Date.now },
    image: { type: Buffer, contentType: String },
    comments: [ { text: String, 
                  user: String, 
                  date: { type: Date, default: Date.now } } ]
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
    Photo.find({}, '_id name user date comments', function(err, ret) {
        if (err)
            res.status(500).send(err);
        data.photoData = ret;
        if (req.session.user) { 
            data.loggedIn = true;
            data.user = req.session.user.name;
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
    Photo.create({
            name: req.file.originalname,
            user: req.session.user.name,
            mimeType: req.file.mimetype,
            date: req.body.lastModified,
            image: req.file.buffer
        }, function(err, photo) {
            if (err)
                res.status(500).send(err);

            res.json( { id: photo._id } );
        });
});

// get image of a photo
app.get('/api/getPhotoImage/:photo_id', function(req, res) {
    Photo.find({ _id: req.params.photo_id }, function(err, data) {
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

        res.send('Success');
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

        res.send('Success');
    });
});
