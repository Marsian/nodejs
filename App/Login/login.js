var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var hash = require('../../Modules/pass').hash;
var hashUser = require('../../Modules/pass').hashUser;
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

app.post('/api/newPassword', function(req, res){
    authenticate(req.body.username, req.body.password, function(err, user){
        if (user) {
            hashUser(user.name, req.body.newPassword, function(err, name, salt, hash){
                if (err) 
                    throw err;
                // update a user in the db
                User.update({ name: user.name }, { $set: {
                    salt: salt,
                    hash: hash
                } }, function( err, user ) {
                    if (err) {
                        res.json(err)
                        return;
                    }

                    var msg = { success: true };
                    res.json(msg);
                });
            });

        } else if (err) {
            res.json(err);
        } else {
            var errorMsg = { err: 'Unknown error'};
            res.json(errorMsg);
        }
    });
});

app.post('/api/createUser', function(req, res) {
    authenticate('admin', req.body.adminPassword, function(err, user){
        if (user) {
            User.find({ name: req.body.username }, function(err, data) {
                if (err) {
                    res.status(500).json({ err: err });
                } else if (data && data.length > 0) {
                    res.json({ err: "Username already exists"});
                } else {
                     hashUser(req.body.username, req.body.password, function(err, name, salt, hash){
                        if (err) { 
                            res.status(500).json({ err: err });
                            return;
                        }
                        // create a user in the db
                        User.create({ 
                            name: name, 
                            salt: salt,
                            hash: hash
                        }, function( err, user ) {
                            if (err) {
                                res.json({ err: err });
                                return;
                            }

                            var msg = { success: true };
                            res.json(msg);
                        });
                    });
                }
            })
        } else if (err) {
            res.json(err);
        } else {
            var errorMsg = { err: 'Unknown error'};
            res.json(errorMsg);
        }
    });

});

