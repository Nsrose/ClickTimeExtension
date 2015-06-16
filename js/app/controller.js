// Constants
var API_BASE = "https://app.clicktime.com/api/1.3/";
var REQUEST_ERROR_MESSAGE = "We're sorry, there was an error processing your request.";


// Main controller for the extension. 
myApp.controller("PageController", ['$scope', 'APIService', '$http',
    function ($scope, APIService, $http) {
    $scope.message = "Hello from AngularJS";
    $scope.UserName = null;
    $scope.UserID = null;

    var sessionURL =  API_BASE + "Session";

    // Get the session, if it exists, otherwise request a login.
    chrome.storage.sync.get('session', function (items) {
        var session = items['session'];
        if (session == null) {
            // User needs to login.
            window.location.href = "../../templates/login.html";
        } else {
            // User is good to go.
            $scope.UserID = session.UserID;
            $scope.UserName = session.UserName;
            window.location.href = "../../templates/main.html";
        }
    })


    $scope.login = function (user) {
        $scope.master = angular.copy(user);
        APIService.apiCall(sessionURL, $scope.master.email, $scope.master.password, 'GET',
            function (session) {
                if (session == null) {
                    alert(REQUEST_ERROR_MESSAGE);
                    return;
                }
                chrome.storage.sync.set({
                    'session' : session, 
                }, function() {
                    console.log("Set session in local storage.");
                })
            })
    }



    // var sessionURL =  API_BASE + "Session";
    // APIService.apiCall(sessionURL, USER_EMAIL, USER_PASSWORD, 'GET', function (session) {
    //     if (session == null) {
    //         alert(REQUEST_ERROR_MESSAGE);
    //         return;        }

    //     $scope.UserName = session.UserName;

    //     var companyURL = API_BASE + "Companies/" + session.CompanyID;
    //     APIService.apiCall(companyURL, USER_EMAIL, USER_PASSWORD, 'GET', function (company) {
    //         if (company == null) {
    //             alert(REQUEST_ERROR_MESSAGE);
    //             return;
    //         }
    //         $scope.CompanyName = company.Name;
    //     })
    // })
    

}]);



