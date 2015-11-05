myApp.controller("LoginEntryController", ['$scope', 'APIService', '$http', '$location', '$apiBase',
                                function ($scope, APIService, $http, $location, $apiBase) {

    // google analytics
    ga('send', 'pageview', '/login.html')
    
    $scope.rerouting = false;
    // Get the session, if it exists, go to time entry. Otherwise, stay here.
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
    $scope.environmentOptions = ['dev99', 'qa', 'stage', 'live'];

    $scope.changeEnvironment = function (environment) {
        $scope.$emit('environmentChange', environment);
    }

    $("#email-input").keypress(function(e) {

        if (e.which == 13 && this.value != "" && (typeof this.value != 'undefined')) {
            $scope.login($scope.user);
        }
    })

    $("#password-input").keypress(function(e) {
     
        if (e.which == 13 && this.value != "" && (typeof this.value != 'undefined')) {
            $scope.login($scope.user);
        }
    })

    function loginHelper() {
        $location.path("/time_entry");
        $scope.$apply();
    }

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
    var offlineBox;
    window.addEventListener('offline', function(e) {
        offlineBox = bootbox.dialog({
            message: "We're sorry, you don't appear to have an internet connection. Please try again when you have connectivity.",       
            show: true,
            backdrop: true,
            closeButton: false,
            animate: true,
            className: "no-internet-modal",
        });
    }, false);
    
    setInterval(function(){ 
        window.addEventListener('online', function(e) {
            offlineBox.modal('hide');
        }, false);
    }, 3000);

}])
