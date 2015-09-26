var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var session = require('express-session');
var hash = require('../../Modules/pass').hash;
var hashUser = require('../../Modules/pass').hashUser;

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

// page cache
var cache = { 
    'index.html': fs.readFileSync('App/Todo/todoApp.html'),
    'login.html': fs.readFileSync('App/Todo/login.html')
};

mongoose.connect(url);

// dummy database

var initialUserList = [ 
  { name: 'boy', pwd: 'a' },
  { name: 'girl', pwd: 'b' },
  { name: 'admin', pwd: 'admin' }
];

// Push users to the database
// define user list model
var User = mongoose.model('user', {
    name : String,
    salt: String,
    hash : String 
});

// Remove existing user list and create a new one
User.remove({}, function(err) { 
    if (err) 
        throw err;

    for (var index in initialUserList) {
        var user = initialUserList[index];
        hashUser(user.name, user.pwd, function(err, name, salt, hash){
            if (err) 
                throw err;
            // create a user in the db
            User.create({
                name: name,
                salt: salt,
                hash: hash
            }, function(err, todo) {
                if (err)
                    res.send(err);
            });
        });
    }
});

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

// define todo list model =================
var Todo = mongoose.model('Todo', {
    text : String,
    user: String,
    date : { type: Date, default: Date.now },
    comments: [ { text: String, 
                  user: String, 
                  date: { type: Date, default: Date.now } } ]
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
    } else if (err) {
        res.json(err);
    } else {
        var errorMsg = { err: 'Unknown error'};
        res.json(errorMsg);
    }
  });
});


app.get('/api/todos', function(req, res) {
    var user = req.session.user.name; 
    // use mongoose to get all todos in the database
    User.find( {}, function(err, users) {
        if (err)
            res.send(err);

        var userList = [];
        for (var index in users ) {
            var name = users[index].name;
            if (name != 'admin')
                userList.push( { user: users[index].name, name: users[index].name } );
        }

        Todo.find( {}, function(err, todos) {
            if (err)
                res.send(err);

            var data = { todos: todos,
                         user: req.session.user.name,
                         userList: userList };
            res.json(data);
        });
    });
});

// create todo and send back all todos after creation
app.post('/api/todos', function(req, res) {
    var user = req.session.user.name; 
    // create a todo, information comes from AJAX request from Angular
    Todo.create({
        text : req.body.text,
        user: user 
    }, function(err, todo) {
        if (err)
            res.send(err);

        // get and return all the todos after you create another
        Todo.find( { user: user }, function(err, todos) {
            if (err)
                res.send(err)
            res.json(todos);
        });
    });

});

// update todo and send back the todo after creation
app.post('/api/updateTodo', function(req, res) {
    var user = req.session.user.name; 
    // update a todo, information comes from AJAX request from Angular
    Todo.update({ _id: req.body.id, user: user }, { text: req.body.text }, {}, function(err, todo) {
        if (err)
            res.send(err);

        // get and return all the todos after you create another
        Todo.find( { _id: req.body.id }, function(err, todo) {
            if (err)
                res.send(err)
            res.json(todo);
        });
    });

});


// delete a todo
app.post('/api/deleteTodo', function(req, res) {
    var user = req.session.user.name; 
    Todo.remove({
        _id : req.body.id,
        user: user
    }, function(err, todo) {
        if (err)
            res.send(err);

        // get and return all the todos after you create another
        Todo.find( { user: user}, function(err, todos) {
            if (err)
                res.send(err)
            res.json(todos);
        });
    });
});

// update todos by selected user
app.post('/api/updateTodoList', function(req, res) {
    // get and return all the todos for the selected user 
    var query = {};
    if (req.body.name) 
        query = { user: req.body.name };

    Todo.find( query, function(err, todo) {
        if (err)
            res.send(err)
        res.json(todo);
    });
});

// post a comment to the todo
app.post('/api/postComment', function(req, res) {
    var user = req.session.user.name;
    // find the todo and push a comment to it
    Todo.update({ _id: req.body.id }, { $push: { comments: { user: user, text: req.body.text } } }, {}, function(err, todo) {
        if (err)
            res.send(err);

        // get and return all the todos after you create another
        Todo.find( { _id: req.body.id }, function(err, todo) {
            if (err)
                res.send(err)
            res.json(todo);
        });
    });

});
