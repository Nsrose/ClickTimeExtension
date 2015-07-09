myApp.controller("LoginEntryController", ['$scope', 'APIService', '$http', '$location', function ($scope, APIService, $http, $location) {

    $scope.rerouting = false;
    // Get the session, if it exists, go to popup. Otherwise, stay here.
    chrome.storage.sync.get('session', function(items) {
        if ('session' in items) {
            // Session variable exists
            var session = items.session.data;
            if (session != null) {
                var now = new Date();
                var lastLoginDate = new Date(session.lastLoginYear, session.lastLoginMonth,
                    session.lastLoginDay, session.lastLoginHrs, session.lastLoginMin, session.lastLoginSec);
                var elapsedTimeMS = now - lastLoginDate;
                var elapsedSec = Math.floor(elapsedTimeMS / 1000);
                var elapsedMin = Math.floor(elapsedSec / 60);
                var elapsedHrs = Math.floor(elapsedMin / 60);
                if (elapsedHrs <= TOKEN_EXPIRE_HOURS) {
                    // User does not need to login.
                    $location.path("/time_entry");
                    $scope.$apply();
                    return;
                }
                // session has expired.
                chrome.storage.sync.remove(CHROME_SYNC_STORAGE_VARS);
                chrome.storage.local.remove(CHROME_LOCAL_STORAGE_VARS, function () {
                    chrome.browserAction.setBadgeText({text:""});
                })
            }
        }
    })

    $("#password-input").keypress(function(e) {
        if (e.which == 13) {
            $scope.login($scope.user);
        }
    })

    $scope.login = function(user) {
        $scope.rerouting = true;
        var sessionURL = API_BASE + "Session";
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