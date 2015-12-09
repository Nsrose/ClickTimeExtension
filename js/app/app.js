// Constants

var REQUEST_ERROR_MESSAGE = "We're sorry, there was an error processing your request.";
var CHROME_LOCAL_STORAGE_VARS = [
	'user',
	'company',
	'tasksList',
	'jobClientsList',
	'jobClientsByRecent',
	'tasksByRecent',
	'storedTimeEntries',
	'stringJobClientsList'
];

var CHROME_SYNC_STORAGE_VARS = [
    'session',
    'timeEntries',
    'stopwatch',
    'inProgressEntry'
];

// Default timeout ms
var TIMEOUT = 30000;

// Time before user is automatically logged out
var TOKEN_EXPIRE_HOURS = 24;

// Default value for empty hours
var DEFAULT_EMPTY_HOURS = null;

var myApp = angular.module('ClickTimeExtension', ['ngRoute', 'ui.bootstrap'])
	.constant("$apiBases", {
		dev99: "https://dev99.clicktime.com:8443/api/1.3/",
		live: "https://app.clicktime.com/api/1.3/",
		stage: 'https://appstage.clicktime.com/api/1.3/',
		qa: 'https://apptest1.clicktime.com/api/1.3/',
		test1: '',
		irinatest: '',
		oshertest: ''
	})
	.constant("$apiBase", {
		url: "https://app.clicktime.com/api/1.3/"
	})

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
