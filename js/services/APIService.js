// All services for making API requests. All of these require user to be logged in.
// The apiCall function is intended to be used with promises, not callbacks.

myApp.service('APIService', ['$http', '$q', '$apiBase', function ($http, $q, $apiBase) {
    var me = this;
    var manifest = chrome.runtime.getManifest();
    var version = manifest.version;

    // Standard API call method. Params:
    // requestURL - URL to make a reques to.
    // email - user email
    // password - user password
    // requestMethod - GET or POST
    // data - data for POST requests
    this.apiCall = function (requestURL, email, password, requestMethod, data) {
        var credentials = btoa(email + ":" + password);

        console.log(version);
        
        var request = {
            method: requestMethod,
            url: requestURL,
            headers: {
                'Authorization' : 'Basic ' + credentials,
                'client': JSON.stringify({
                    'appname': 'chromeExtension',
                    'version': version
                })
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
            me.reportError(email, password, errorObj);
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
        var requestURL = $apiBase.url + "errors";

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

}])

