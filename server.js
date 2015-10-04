#!/bin/env node
//  Mars Node application
var express = require('express');
var fs      = require('fs');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var hashUser = require('./Modules/pass').hashUser;
var todo = require('./App/Todo/todoApp.js');
var album = require('./App/Album/albumApp.js');
var login = require('./App/Login/Login.js');
var User = require('./Modules/userModel');


/**
 *  Define the main application.
 */
var MainApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating node server app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };
    };

    /**
     * Connect to mongoDB and initialize
     */
    self.initializeDatabase = function() {
        self.dbUrl = process.env.OPENSHIFT_MONGODB_DB_URL;
        if (typeof self.dbUrl === "undefined") {
            console.warn("No OPENSHIFT_MONGODB_DB_HOST var, using 127.0.0.1:27017");
            self.dbHost = "127.0.0.1";
            self.dbPort = "27017";
            self.dbUrl = 'mongodb://' + self.dbHost + ':' + self.dbPort + "/nodejs";
        } else { 
            self.dbUrl += "nodejs";
        }

        mongoose.connect(self.dbUrl);

        var initialUserList = [ 
              { name: 'boy', pwd: 'a' },
              { name: 'girl', pwd: 'b' },
              { name: 'admin', pwd: 'admin' }
            ];

        // Create user if it does not exist
        var _createUser = function(user) {
            User.find({ name: user.name }, function(err, ret) {
                if (err)
                    throw err;
                // Add user if it does not exist
                if (!ret.length) {
                    hashUser(user.name, user.pwd, function(err, name, salt, hash){
                        if (err) 
                            throw err;
                        // create a user in the db
                        User.create({
                            name: name,
                            salt: salt,
                            hash: hash
                        }, function( err, user ) {
                            if (err)
                                throw err;
                        });
                    });
                }
            });
        };

        for (var index in initialUserList) {
            _createUser(initialUserList[index]);
        }
    };

    /**
     * Initialize session. Use existing db connection to store the session.
     */
     self.initializeSession = function() {
        self.secret = process.env.OPENSHIFT_SECRET_TOKEN;
        if (typeof self.secret === "undefined") 
            self.secret = 'shhhh, very secret';
        self.app.use(session({
            resave: false, // don't save session if unmodified
            saveUninitialized: false, // don't create session until something stored
            secret: self.secret,
            store: new MongoStore({ mongooseConnection: mongoose.connection })
        }));
     };

    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }

        // Connect to mongoDB
        self.initializeDatabase();

        // Initialize session
        self.initializeSession();

        // Static files
        self.app.use("/Assets", express.static(__dirname + "/Assets"));
        self.app.use("/Template", express.static(__dirname + "/Template"));
        self.app.use("/js-src", express.static(__dirname + "/js-src"));
        self.app.use("/App", express.static(__dirname + "/App"));

        // Applications
        self.app.use(todo);
        self.app.use(album);
        self.app.use(login);
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Main Application.  */



/**
 *  main():  Main code.
 */
var zapp = new MainApp();
zapp.initialize();
zapp.start();

