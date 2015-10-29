var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    name : String,
    salt: String,
    hash : String, 
    groups: [ { groupId: String, 
                name: String, 
                status: { type: Number, default: 0 } } ]
});

module.exports = mongoose.model('user', userSchema);   
