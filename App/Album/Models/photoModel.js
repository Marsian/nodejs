var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var photoSchema = new Schema({
    name : String,
    user: String,
    mimeType: String,
    date: { type: Date, default: Date.now },
    posted: { type: Date, default: Date.now },
    preview: { type: Buffer, contentType: String },
    comments: [ { text: String, 
                  user: String, 
                  date: { type: Date, default: Date.now } } ]
});

module.exports = mongoose.model('Photo', photoSchema);   
