var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var extend = require('util')._extend;
var User = require('../../Modules/userModel');

var app = module.exports = express();

// configuration =================
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

// page cache
var cache = { 
    'index.html': fs.readFileSync('App/Todo/todoApp.html'),
};

// define todo list model
var Todo = mongoose.model('Todo', {
    text : String,
    user: String,
    date : { type: Date, default: Date.now },
    priority: { type: Number, min: 0, max: 2, default: 0 },
    progress: { type: Number, min: 0, max: 10, default: 0 },
    comments: [ { text: String, 
                  user: String, 
                  date: { type: Date, default: Date.now } } ]
});

var TodoArchive = mongoose.model('TodoArchive', {
    text : String,
    user: String,
    createDate: { type: Date, default: Date.now },
    finishDate: { type: Date, default: Date.now },
    priority: { type: Number, min: 0, max: 2, default: 0 },
    comments: [ { text: String, 
                  user: String, 
                  date: { type: Date, default: Date.now } } ]
});

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login?app=Todo');
  }
}

// main route =================
app.get('/Todo', restrict, function( req, res ) {
    res.setHeader('Content-Type', 'text/html');
    res.send(cache['index.html']);
});

app.get('/Todo-Logout', function(req, res){
    // destroy the user's session to log them out
    // will be re-created next request
    req.session.destroy(function(){
        res.redirect('/');
    });
});

app.get('/api/todos', function(req, res) {
    var user = req.session.user.name; 
    // use mongoose to get all todos in the database
    User.find( {}, function(err, users) {
        if (err) {
            res.send(err);
            return;
        }

        var userList = [];
        for (var index in users ) {
            var name = users[index].name;
            if (name != 'admin')
                userList.push( { user: users[index].name, name: users[index].name } );
        }

        Todo.find( {}, '', { sort: '-priority' }, function(err, todos) {
            if (err) {
                res.send(err);
                return;
            }

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
        if (err) {
            res.send(err);
            return;
        }

        // get and return all the todos of the user
        Todo.find( { user: user }, '', { sort: '-priority' }, function(err, todos) {
            if (err) {
                res.send(err);
            } else {
                res.json(todos);
            }
        });
    });

});

// update todo and send back the todo after creation
app.post('/api/updateTodo', function(req, res) {
    var user = req.session.user.name; 
    var params = req.body;
    // update a todo, information comes from AJAX request from Angular
    Todo.update({ _id: req.body.id, user: user }, 
                { text: params.text, priority: params.priority, progress: params.progress }, {}, function(err, todo) {
        if (err) {
            res.send(err);
            return;
        }

        // get and return the updated todo
        Todo.find( { _id: req.body.id }, function(err, todo) {
            if (err) {
                res.send(err)
            } else if (todo && todo.length > 0) {
                res.json(todo[0]);
            } else {
                res.status(500).send("Todo not found!");
            }
        });
    });

});

// Archive the todo
var _archiveTodo = function(todo) {
    TodoArchive.create({ 
        text: todo.text,
        user: todo.user,
        createDate: todo.date,
        finishDate: Date.now(),
        priority: todo.priority,
        comments: todo.comments
    }, function(err) {
        if (err) {
            console.log(err);
        }
    });

};

// delete a todo
app.post('/api/deleteTodo', function(req, res) {
    var user = req.session.user.name; 
    Todo.find({ _id: req.body.id, user: user }, function(err, todo) { 
        if (err) {
            res.send(err);
            return;
        }
        
        if (todo && todo.length > 0)
            _archiveTodo(todo[0]);
        
        // Delete the todo
        Todo.remove({
            _id : req.body.id,
            user: user
        }, function(err, data) {
            if (err) {
                res.send(err);
                return;
            }

            // get and return all the todo of the user
            Todo.find( { user: user}, '', { sort: '-priority' },  function(err, todos) {
                if (err) {
                    res.send(err);
                } else {
                    res.json(todos);
                }
            });
        });
    });
});

// update todos by selected user
app.post('/api/updateTodoList', function(req, res) {
    // get and return all the todos for the selected user 
    var query = {};
    if (req.body.name) 
        query = { user: req.body.name };

    Todo.find( query, '', { sort: '-priority' }, function(err, todo) {
        if (err) {
            res.send(err)
        } else {
            res.json(todo);
        }
    });
});

// post a comment to the todo
app.post('/api/postComment', function(req, res) {
    var user = req.session.user.name;
    // find the todo and push a comment to it
    Todo.update({ _id: req.body.id }, { $push: { comments: { user: user, text: req.body.text } } }, {}, function(err, todo) {
        if (err) {
            res.send(err);
            return;
        }

        // get and return the updated todo
        Todo.find( { _id: req.body.id }, function(err, todo) {
            if (err) {
                res.send(err)
            } else {
                res.json(todo);
            }
        });
    });

});
