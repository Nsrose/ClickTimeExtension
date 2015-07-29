// All services for making API requests. All of these require user to be logged in.
// The apiCall function is intended to be used with promises, not callbacks.

myApp.service('APIService', ['$http', '$q', function ($http, $q) {
    // Standard API call method. Params:
    // requestURL - URL to make a reques to.
    // email - user email
    // password - user password
    // requestMethod - GET or POST
    // data - data for POST requests
    this.apiCall = function (requestURL, email, password, requestMethod, data) {
        var credentials = btoa(email + ":" + password);

        var request = {
            method: requestMethod,
            url: requestURL,
            headers: {
                'Authorization' : 'Basic ' + credentials
            },
            data: data,
            timeout: TIMEOUT
        };


        return $http(request)
        .success(function(data, status, headers, config) {
            return data;
        }).
        error(function(data, status, headers, config) {
            var errorObj = {
                'Message' : 'Error from ClickTime Extension',
                'DeviceName' : 'Chrome Extension',
                'DevicePlatform' : 'Google Chrome'
            }
            this.reportError(email, password, errorObj);
            if (data == null) {
                console.log("timeout");
                return null;
            }
            bootbox.alert(data);
            return data;
        });
       
    }

    // Report an error to the api
    this.reportError = function (email, token, errorObj) {
        var credentials = btoa(email + ":" + token);
        var requestURL = API_BASE + "errors";

        var request = {
            method: 'POST',
            url: requestURL,
            headers: {
                'Authorization' : 'Basic ' + credentials
            },
            data: errorObj,
            timeout: TIMEOUT
        };

        return $http(request)
        .success(function(data, status, headers, config) {
            return data;
        })
        .error(function(data, status, headers, config) {
            return data;
        })
    }


    // Log an API interaction to local storage
    var logAPIInteraction = function(requestURL, email, requestMethod, data) {
        var deferred = $q.defer();
        chrome.storage.local.get('APIInteractions', function (items) {
            var APIInteractions = [];
            if ('APIInteractions' in items) {
                APIInteractions = items.APIInteractions;
            }
            var logID = APIInteractions.length;
            var interaction = {
                'logID' : logID,
                'time' : (new Date()).toString(),
                'requestURL' : requestURL,
                'email' : email,
                'requestMethod' : requestMethod,
                'data' : data
            }
            APIInteractions.push(interaction);
            chrome.storage.local.set({
                'APIInteractions' : APIInteractions
            }, function() {
                deferred.resolve(logID);
            });
        })
        return deferred.promise;
    }

    // Update an API interaction with either success or failure
    var updateAPIInteraction = function (logID, success, data) {
        chrome.storage.local.get('APIInteractions', function (items) {
            if ('APIInteractions' in items) {
                var APIInteractions = items.APIInteractions;
                var interaction = APIInteractions[logID];
                interaction['result'] = {
                    'success' : success,
                    'data' : data
                };
                chrome.storage.local.set({
                    'APIInteractions' : APIInteractions
                });
            }
        })
    }
}])



