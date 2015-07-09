// Constants

// API base url
var API_BASE = "https://dev11.clicktime.com:8443/api/1.3/";
var REQUEST_ERROR_MESSAGE = "We're sorry, there was an error processing your request.";
var CHROME_LOCAL_STORAGE_VARS = [
	'user',
	'company',
	'clientsList',
	'jobsList',
	'tasksList',
	'clientsByRecent',
	'tasksByRecent'
];

var CHROME_SYNC_STORAGE_VARS = [
    'session',
    'timeEntries',
    'stopwatch',
    'storedTimeEntries',
    'defaultTimeEntryMethod'
];

// Default timeout ms
var TIMEOUT = 10000;
// The number of scope variables that need to be rendered before removing the loading mask
var NUM_SCOPE_VARS = 6;

var myApp = angular.module('ClickTimeExtension', ['ngRoute', 'ui.bootstrap']);

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}