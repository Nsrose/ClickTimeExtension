// All services for making API requests. All of these require user to be logged in.
// The apiCall function is intended to be used with promises, not callbacks.

myApp.service('APIService', ['$http', '$q', '$apiBase', 'InternetConnectivity', function ($http, $q, $apiBase, InternetConnectivity) {
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

        // if internet fails during non-runtime
        if (chrome.extension.getBackgroundPage().isOnline == false) {
            InternetConnectivity.displayOfflineModal();
            return;
        }
        if (typeof offlineBox !== 'undefined') {
            InternetConnectivity.hideOfflineModal();
        }
        
        var credentials = btoa(email + ":" + password);
    
        var request = {
            method: requestMethod,
            url: requestURL,
            headers: {
                'Authorization' : 'Basic ' + credentials,
                'client': btoa(JSON.stringify({
                    'appname': 'ClickTime Chrome Extension',
                    'version': version
                }))
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
                    console.log("error getting data")
                } else {
                    console.log(data);
                }
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

