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

    function loginHelper() {
        $location.path("/time_entry");

        // notifications should start happening if allowReminders will be set to true
        chrome.storage.sync.get('allowReminders', function(items) {
            if (('allowReminders' in items) && (items.allowReminders.permission)) {
                var pollPeriod = chrome.extension.getBackgroundPage().NOTIFICATION_POLL_PERIOD;
                chrome.extension.getBackgroundPage().createNotifications(pollPeriod);
            }
        })
        $scope.$apply();
    }

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

            // timeEntryMethod and allowReminders will stay forever in the sync storage
            // it is updated if a different user is logged in, or if it has never been set before
            chrome.storage.sync.get(['timeEntryMethod', 'allowReminders'], function (items) {
                if (('timeEntryMethod' in items) || ('allowReminders' in items)) {
                    // not same user
                    if (session.data.UserID != items.timeEntryMethod.UserID) {
                        chrome.storage.sync.set({
                            'timeEntryMethod' : {
                                'method' : 'duration',
                                'UserID' : session.data.UserID
                            }
                        })
                    }
                    if (session.data.UserID != items.allowReminders.UserID) {
                        chrome.storage.sync.set({
                            'allowReminders' : {
                                'permission' : true,
                                'UserID' : session.data.UserID
                            }
                        })
                    } 
                    // regardless of same user, set session id
                    chrome.storage.sync.set({
                        'session' : session
                    }, loginHelper);
                } else {
                    // have never installed chrome extension before
                    chrome.storage.sync.set({
                        'session' : session,
                        'allowReminders' : {
                            'permission' : true,
                            'UserID' : session.data.UserID
                        },
                        'timeEntryMethod' : {
                            'method' : 'duration',
                            'UserID' : session.data.UserID
                        }
                    }, loginHelper);
                }
            })
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