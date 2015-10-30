var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var extend = require('util')._extend;
var User = require('../../Modules/userModel');
var Group = require('../../Modules/groupModel');

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
    group : { groupId: String, name: String }, 
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
    group: { groupId: String, name: String }, 
    priority: { type: Number, min: 0, max: 2, default: 0 },
    comments: [ { text: String, 
                  user: String, 
                  date: { type: Date, default: Date.now } } ]
});

var GroupStatus = {
    pending: 0,
    accepted: 1
};

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
    var username = req.session.user.name; 
    // use mongoose to get all todos in the database
    User.find( { name: username }, function(err, user) {
        if (err) {
            res.send(err);
        } else if (user && user.length > 0) {
            var data = { user: username,
                         groupList: user[0].groups };
            res.json(data);
        } else {
            res.json({ err: "User not found" });
        }
    });
});

// create todo and send back all todos after creation
app.post('/api/todos', function(req, res) {
    var user = req.session.user.name; 
    var text = req.body.text;
    var list = req.body.list;
    var group = list.groupId == '0' ? undefined : { groupId: list.groupId, name: list.name };
    // create a todo, information comes from AJAX request from Angular
    Todo.create({
        text : req.body.text,
        user: user,
        group: group
        }, function(err, todo) {
        if (err) {
            res.send(err);
            return;
        }
        res.send("Success");
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
    // get and return all the todos for the selected user or group
    var groupId = req.body.groupId;
    var name = req.session.user.name; 
    
    // Get user list
    if (groupId == "0") {
        Todo.find( { user: name, group: undefined }, '', { sort: '-priority' }, function(err, todo) {
            if (err) {
                res.send({ err: err });
            } else {
                res.json(todo);
            }
        });

    } else { // Get group list
        Todo.find( { "group.groupId": groupId }, '', { sort: '-priority' }, function(err, todo) {
            if (err) {
                res.send({ err: err });
            } else {
                res.json(todo);
            }
        });
    }

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

// search for users
app.post('/api/searchUser', function(req, res) {
    var search = req.body.search;

    User.find({ name: { "$regex": search, "$options": "i" } }, 'name', function(err, users) {
        if (err) {
            res.status(500).json({ err: err });
            return;
        }

        res.json({ results: users });
    });
});

// get group member
app.post('/api/getGroupMember', function(req, res) {
    var groupId = req.body.groupId;

    Group.find({ _id: groupId }, function(err, group) {
        if (err) {
            res.status(500).json({ err: err } );
        } else if (group && group.length > 0) {
            group = group[0];
            res.json({ users: group.users });
        } else {
            res.status(500).json({ err: "Group not found" });
        }
    });
});

var _purgeGroup = function(groupId) {
    // Remove all todos belong to the group
    Todo.remove({ "group.groupId": groupId }, function(err) {
        if (err) {
            console.log(err);
        }
    });

    // Remove the group
    Group.remove({ _id: groupId }, function(err) {
        if (err) {
            console.log(err);
        }
    });
};

// create a new group
app.post('/api/addGroup', function(req, res) {
    var creator = req.session.user.name;
    var users = req.body.users;
    var name = req.body.name;
    var callbackCount = 0;
    var errMessage = "";

    var _callback = function(err, data) {
        callbackCount ++;
        if (err)
            errMessage += err.Message;

        if (callbackCount == users.length) {
            res.send({ err: errMessage });
        }
    };

    for(var i in users) {
        if (users[i].name == creator) {
            users[i].status = GroupStatus.accepted;
        } else {
            users[i].status = GroupStatus.pending;
        }
    }
    
    Group.create({ name: name, users: users }, function(err, group) {
        if (err) {
            res.status(500).json({ err: err });
            return;
        }

        for (var i in users) {
            user = users[i];
            if (user.name == creator) {
                var params = { groupId: group._id, name: group.name, status: GroupStatus.accepted };
            } else {
                var params = { groupId: group._id, name: group.name, status: GroupStatus.pending };
            }
            User.update({ name: user.name }, 
                        { $push: { groups : params } }, {},
                        _callback);
        }
    });
});

// refuse group invitation
app.post('/api/quitGroup', function(req, res) {
    var user = req.body.user;
    var group = req.body.group;

    User.find({ name: user }, function(err, user) {
        if (err) {
            res.status(500).json({ err: err });
            return;
        }
        if (!user || user.length == 0) {
            res.status(500).json({ err: "User not found" });
            return;
        }

        user = user[0];
        User.update({ name: user.name }, { $pull: { groups: { groupId: group.groupId } } }, {}, function(err) {
            if (err) {
                res.status(500).json({ err: err });
            } else {
                res.send('Success');

                Group.update({ _id: group.groupId }, { $pull: { users: { name: user.name } } }, {}, function(err, result) {
                    if (err)
                        console.log(err);
                    Group.find({ _id: group.groupId }, function(err, result) {
                        if (err)
                            console.log(err);
                        if (result && result.length > 0) {
                            if (result[0].users.length == 0)
                                _purgeGroup(result[0]._id);
                        }
                    });
                });
            }
        });
    });
});

// accept group invitation
app.post('/api/acceptGroupInvitation', function(req, res) {
    var username= req.body.user;
    var group = req.body.group;

    User.find({ name: username }, function(err, user) {
        if (err) {
            res.status(500).json({ err: err });
            return;
        }
         if (!user || user.length == 0) {
            res.status(500).json({ err: "User not found" });
            return;
        }

        user = user[0];
        User.update({ name: user.name, 'groups.groupId': group.groupId }, 
                    { $set: { 'groups.$.status': GroupStatus.accepted } }, {}, function(err, user) {
            if (err) {
                res.status(500).json({ err: err });
            } else {
                res.send('Success');

                Group.update({ _id: group.groupId, 'users.name': user.name  }, 
                             { $set: { 'users.$.status': GroupStatus.accepted } }, {}, function(err) {
                    if (err)
                        console.log(err);
                });
            }
        });
    });
});
