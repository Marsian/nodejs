var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var session = require('express-session');
var hash = require('../../Modules/pass').hash;

var app = module.exports = express();

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

var host = process.env.OPENSHIFT_MONGODB_DB_HOST;
var port = process.env.OPENSHIFT_MONGODB_DB_PORT;
var url = "";
if (typeof host === "undefined") {
    console.warn("No OPENSHIFT_MONGODB_DB_HOST var, using 127.0.0.1:27017");
    host = "127.0.0.1";
    port = "27017";
    url = 'mongodb://' + host + ':' + port + "/todo";
} else {
    url = 'mongodb://admin:b8Phd47qQr1n@' + host + ':' + port + "/nodejs";
}

mongoose.connect(url);

// dummy database

var users = {
  boy: { name: 'boy', pwd: 'a' },
  girl: { name: 'girl', pwd: 'b' }
};

// page cache
var cache = { 
    'index.html': fs.readFileSync('App/Todo/todoApp.html'),
    'login.html': fs.readFileSync('App/Todo/login.html')
};

// when you create a user, generate a salt
// and hash the password 
hash(users.boy.pwd, function(err, salt, hash){
    if (err) throw err;
    // store the salt & hash in the "db"
    users.boy.salt = salt;
    users.boy.hash = hash;
});
hash(users.girl.pwd, function(err, salt, hash){
    if (err) throw err;
    // store the salt & hash in the "db"
    users.girl.salt = salt;
    users.girl.hash = hash;
});


// Authenticate using our plain-object database of doom!

function authenticate(name, pass, fn) {
  if (!module.parent) console.log('authenticating %s:%s', name, pass);
  var user = users[name];
  // query the db for the given username
  if (!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  hash(pass, user.salt, function(err, hash){
    if (err) return fn(err);
    if (hash == user.hash) return fn(null, user);
    fn(new Error('invalid password'));
  });
}

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

// main route =================
app.get('/Todo', restrict, function( req, res ) {
    res.setHeader('Content-Type', 'text/html');
    res.send(cache['index.html']);
});

app.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
    req.session.destroy(function(){
        res.redirect('/');
    });
});

app.get('/login', function(req, res){
    res.setHeader('Content-Type', 'text/html');
    res.send(cache['login.html']);
});

// define mongoose model =================
var Todo = mongoose.model('Todo', {
    text : String
});

// api ===============
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

            var msg = { redirect: "/Todo"};
            res.json(msg);
        });    
    } else {
        var errorMsg = { err: 'Invalid username or password.'};
        res.json(errorMsg);
    }
  });
});


app.get('/api/todos', function(req, res) {

    // use mongoose to get all todos in the database
    Todo.find(function(err, todos) {

        // if there is an error retrieving, send the error. nothing after res.send(err) will execute
        if (err)
            res.send(err)

        res.json(todos); // return all todos in JSON format
    });
});

// create todo and send back all todos after creation
app.post('/api/todos', function(req, res) {
    console.log(req.session.user);
    // create a todo, information comes from AJAX request from Angular
    Todo.create({
        text : req.body.text,
        done : false
    }, function(err, todo) {
        if (err)
            res.send(err);

        // get and return all the todos after you create another
        Todo.find(function(err, todos) {
            if (err)
                res.send(err)
            res.json(todos);
        });
    });

});

// delete a todo
app.delete('/api/todos/:todo_id', function(req, res) {
    Todo.remove({
        _id : req.params.todo_id
    }, function(err, todo) {
        if (err)
            res.send(err);

        // get and return all the todos after you create another
        Todo.find(function(err, todos) {
            if (err)
                res.send(err)
            res.json(todos);
        });
    });
});


