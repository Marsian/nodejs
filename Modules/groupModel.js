var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var groupSchema = new Schema({
    name : String,
    users: [ { name: String,
               status: { type: Number, default: 0 } } ]
});

module.exports = mongoose.model('group', groupSchema);   
