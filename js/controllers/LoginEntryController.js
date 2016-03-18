myApp.controller("LoginEntryController", ['$scope', 'APIService', '$http', '$location', '$apiBase',
                                function ($scope, APIService, $http, $location, $apiBase) {

    // google analytics
    ga('send', 'pageview', '/login.html')
    
    $scope.rerouting = false;

    // if session already exists, Do not pass Go. Do not collect $200.
    // don't log in. routes user directly to time entry page
    chrome.storage.sync.get('session', function(items) {
        if ('session' in items) {
            $location.path("/time_entry");
            $scope.$apply();
            return;
        }
    })

    $scope.focusedEmail = false;
    $scope.focusedPassword = false;

    $scope.unfocus = function (model) {
        switch (model) {
            case "email":
                $scope.focusedEmail = false;
                break;
            case "password":
                $scope.focusedPassword = false;
                break;
            default:
                break;
        }
    }

    $scope.clearError = function (model) {
        switch (model) {
            case "email":
                $scope.focusedEmail = true;
                break;
            case "password":
                $scope.focusedPassword = true;
                break;
            default:
                break;
        }
    }

    // Secret options menu
    $scope.environmentOptions = ['dev11', 'dev99', 'qa', 'stage', 'test1', 'itest', 'otest', 'live'];


    // Dropdown menu with environments has been clicked, and the environment should change
    $scope.changeEnvironment = function (environment) {
        $scope.$emit('environmentChange', environment);
    }


    // Redirect to the time entry page.
    function loginHelper() {
        $location.path("/time_entry");
        $scope.$apply();
    }


    // Validate the user credentials, and if valid, populate data and redirect to time entry.
    $scope.login = function(user) {
        if (!user) {
            $scope.loginError = true;
            $('#email-input').css('border', '1px solid #de6a66');
            $('#password-input').css('border', '1px solid #de6a66');
            return;
        }
        if (!user.email || !user.password) {
            $scope.loginError = true;
            $('#email-input').css('border', '1px solid #de6a66');
            $('#password-input').css('border', '1px solid #de6a66');
            return;
        }
        $scope.rerouting = true;
        var sessionURL = $apiBase.url + "Session";
        // Get the session for the user. If it exists, store it in local storage.
        APIService.apiCall(sessionURL, user.email, user.password, 'GET').then(
         function (session) {
            var d = new Date();
            var data = session.data;
            data.lastLoginYear = d.getFullYear();
            data.lastLoginMonth = d.getMonth();
            data.lastLoginDay = d.getDate();
            data.lastLoginHrs = d.getHours();
            data.lastLoginMin = d.getMinutes();
            data.lastLoginSec = d.getSeconds();
            chrome.storage.sync.set({
                'session' : session
            }, loginHelper);
        })
        .catch(function (error) {
            $scope.loginError = true;
            $scope.rerouting = false;
            $location.path("/login");
        })
    }
}])
