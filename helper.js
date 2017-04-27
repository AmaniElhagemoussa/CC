/*
 * This module is used to store all helper methods which should be available in the server.
 */

var sha256 = require('js-sha256').sha256;
var fs = require("fs");
var request = require('request');

module.exports = {
    /*
     * Check if a given bluemix service is available.
     */
    isServiceAvailable: function(bluemixService) {
        return (bluemixService !== null && bluemixService !== undefined);
    },
    /*
     * Generate a salt.
     * Taken from: //https://codepen.io/Jvsierra/pen/BNbEjW
     */
    generateSalt: function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    },

    /*
     * Encrypt the password by concatenating it with a generated salt und hashing it with sha256.
     */
    hashPassword: function(password, salt) {
        return sha256(password + salt);
    },
   
};