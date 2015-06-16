// Constants
var API_BASE = "https://app.clicktime.com/api/1.3/";
var USER_EMAIL = 'nrose@clicktime.com';
var USER_PASSWORD = 'berkeleycs17';
var REQUEST_ERROR_MESSAGE = "We're sorry, there was an error processing your request.";


// Main controller for the extension. 
myApp.controller("PageController", ['$scope', 'APIService', '$http',
    function ($scope, APIService, $http) {
    $scope.message = "Hello from AngularJS";

    var sessionURL =  API_BASE + "Session";
    APIService.apiCall(sessionURL, USER_EMAIL, USER_PASSWORD, 'GET', function (session) {
        if (session == null) {
            alert(REQUEST_ERROR_MESSAGE);
            return;
        }
        $scope.UserName = session.UserName;

        var companyURL = API_BASE + "Companies/" + session.CompanyID;
        APIService.apiCall(companyURL, USER_EMAIL, USER_PASSWORD, 'GET', function (company) {
            if (company == null) {
                alert(REQUEST_ERROR_MESSAGE);
                return;
            }
            $scope.CompanyName = company.Name;
        })
    })
    

}]);



