// All services for making API requests. All of these require user to be logged in.
// The apiCall function is intended to be used with promises, not callbacks.

myApp.service('APIService', ['$http', '$q', '$apiBase', function ($http, $q, $apiBase) {
    var me = this;
    var manifest = chrome.runtime.getManifest();
    var version = manifest.version;

    // internet connectivity bootbox display
    var offlineBox;

    /* listens for internet. 
        note: this code only runs when the chrome extension is open.
        due to the ephermeral nature of chrome extensions, extension will probably not be open most of the time.
        the solution is to detect connectivity errors in every new API call (see function "this.apiCall")
    */
    window.addEventListener('offline', function(e) {
        me.reportNoInternet();
    }, false);
    
    window.addEventListener('online', function(e) {
        offlineBox.modal('hide');
    }, false);

    // tell you there's no internet
    this.reportNoInternet = function() {
        offlineBox = bootbox.dialog({
            message: "We're sorry, you don't appear to have an internet connection. Please try again when you have connectivity.",       
            show: true,
            backdrop: true,
            closeButton: false,
            animate: true,
            className: "no-internet-modal",
        });
    }

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
                'Authorization' : 'Basic ' + credentials,
                'client': btoa(JSON.stringify({
                    'appname': 'chromeExtension',
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
                // your internet is bogus go fix it
                me.reportNoInternet();
            } else {
                bootbox.alert(data);
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

