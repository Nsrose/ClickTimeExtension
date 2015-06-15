myApp.service('SessionService', function($http) {
    var session_url = API_BASE + "Session";

    // Calls callback function on the session data for a GET request to /Session/'
    function get_session($http, email, password, callback) {
       
    }

    this.getSession = function (email, password, callback) {
        var credentials = btoa(email + ":" + password);
        var request = {
            method: 'GET',
            url: session_url,
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



