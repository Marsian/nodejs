var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var exportSchema = new Schema({
    token: String,
    progress: { type: Number, min: 0, max: 100 }
});

module.exports = mongoose.model('Export', exportSchema);   
