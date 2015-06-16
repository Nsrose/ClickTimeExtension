// Service for requesting the company of a user. Requires user to be logged in.

myApp.service('CompanyService', function($http) {

    this.getCompany = function (email, password, companyID, callback) {
        var companyURL = API_BASE + "Companies/" + companyID;
        var credentials = btoa(email + ":" + password);
        var request = {
            method: 'GET',
            url: companyURL,
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



