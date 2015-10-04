var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var hash = require('../../Modules/pass').hash;
var User = require('../../Modules/userModel');

var app = module.exports = express();

// page cache
var cache = { 
    'login.html': fs.readFileSync('App/Login/login.html')
};

// route
app.get('/login', function(req, res){
    res.setHeader('Content-Type', 'text/html');
    var file = cache['login.html'].toString();
    file = file.replace('<%context%>', JSON.stringify(req.query));
    res.send(file);
});


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

app.post('/api/login', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
        // Regenerate session when signing in
        // to prevent fixation
        req.session.regenerate(function(){
            // Store the user's primary key
            // in the session store to be retrieved,
            // or in this case the entire user object
            req.session.user = user;
            var msg = { redirect: true};
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

