// Constants
// API base url for requests. Live version
// var API_BASE = "https://app.clicktime.com/api/1.3/";

// API base url for development.
var API_BASE = "https://dev99.clicktime.com:8443/api/1.3/";
var REQUEST_ERROR_MESSAGE = "We're sorry, there was an error processing your request.";

var myApp = angular.module('ClickTimeExtension', []);

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}