var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');

var app = module.exports = express();

app.get('/Todo', function( req, res ) {
    res.setHeader('Content-Type', 'text/html');
    var file = fs.readFileSync('index.html');
    res.send(file);
});

