var crypto = require('crypto');

// Bytesize.
var len = 128;

// Iterations. ~300ms
var iterations = 12000;

/**
 * Hashes a password with optional `salt`, otherwise
 * generate a salt for `pass` and invoke `fn(err, salt, hash)`.
 *
 * @param {String} password to hash
 * @param {String} optional salt
 * @param {Function} callback
 * @api public
 */

exports.hash = function (pwd, salt, fn) {
    if (arguments.length == 3) {
        crypto.pbkdf2(pwd, salt, iterations, len, function(err, hash){
            fn(err, hash.toString('base64'));
        });
    } else {
        fn = salt;
        crypto.randomBytes(len, function(err, salt){
            if (err) return fn(err);
            salt = salt.toString('base64');
            crypto.pbkdf2(pwd, salt, iterations, len, function(err, hash){
                if (err) return fn(err);
                fn(null, salt, hash.toString('base64'));
            });
        });
  }
};

exports.hashUser = function (name, pwd, fn) {
    crypto.randomBytes(len, function(err, salt){
        if (err) return fn(err);
        salt = salt.toString('base64');
        crypto.pbkdf2(pwd, salt, iterations, len, function(err, hash){
            if (err) return fn(err);
            fn(null, name, salt, hash.toString('base64'));
        });
    });
};
