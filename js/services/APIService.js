// All services for making API requests. All of these require user to be logged in.

myApp.service('APIService', function ($http) {
    // Standard API call method. Params:
    // requestURL - URL to make a reques to.
    // email - user email
    // password - user password
    // requestMethod - GET or POST
    // callback - function that decides what to do with the data returned.
    this.apiCall = function (requestURL, email, password, requestMethod, callback) {
        var credentials = btoa(email + ":" + password);
        var request = {
            method: requestMethod,
            url: requestURL,
            headers: {
                'Authorization' : 'Basic ' + credentials
            }
        };
        $http(request)
        .success(function(data, status, headers, config) {
            callback(data);
        }).
        error(function(data, status, headers, config) {
            callback(null); 
        });
    }
})



