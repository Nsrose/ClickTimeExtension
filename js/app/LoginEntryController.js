myApp.controller("LoginEntryController", ['$scope', 'APIService', '$http', '$location', function ($scope, APIService, $http, $location) {
    console.log("Back to login")
    $scope.rerouting = false;
    // Get the session, if it exists, go to popup. Otherwise, stay here.
    chrome.storage.sync.get('session', function(items) {
        if ('session' in items) {
            // Session variable exists
            var session = items.session.data;
            if (session != null) {
                console.log("Logging in user from previous session");
                // User does not need to login.
                // window.location.href = "../../templates/popup.html";
                $location.path("/time_entry");
                $scope.$apply();
            }
        }
    })

    

    $scope.login = function(user) {
        $scope.rerouting = true;
        var sessionURL = API_BASE + "Session";
        // Get the session for the user. If it exists, store it in local storage.
        APIService.apiCall(sessionURL, user.email, user.password, 'GET').then(
         function (session) {
            chrome.storage.sync.set(
                {'session' : session},
                function() {
                    console.log("Set session in local storage.");
                    $location.path("/time_entry");
                    $scope.$apply();
                }
            )
        })
        .catch(function (error) {
            $scope.loginError = true;
            $scope.rerouting = false;
            $location.path("/login");
        })
    }
   
}])