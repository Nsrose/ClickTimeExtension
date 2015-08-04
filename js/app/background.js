// Constants
var API_BASE = "https://app.clicktime.com/api/1.3/";
// Time before asking user again if they want to enter time. Remind every 4 hours
var NOTIFICATION_POLL_PERIOD = 14400000; 
// Delayed if User says "remind me later"
var DELAYED_NOTIFICATION_POLL_PERIOD  = NOTIFICATION_POLL_PERIOD * 2;


// Listen for API url change:
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.changeUrl) {
            API_BASE = request.url
        }
    }
)

//////////////////////////////////////////////////////////////////////////

// this timer is for display purposes only
// stopping/starting it will have no effect on 
// the internal sync timer
var timer;

var updateBadge = function(StopwatchService) {
    var badgeHrs, badgeMin, badgeSec;
    timer = setInterval(function() {
        StopwatchService.getElapsedTime(function(elapsedObj) {
            badgeSec = elapsedObj.elapsedSec % 60;
            badgeMin = elapsedObj.elapsedMin % 60;
            badgeHrs = elapsedObj.elapsedHrs;
            if (badgeHrs > 9) {
                chrome.browserAction.setBadgeText({text: badgeHrs + "+"});
                stopBadge();
                updateBadgeHours(StopwatchService);
            } else {
                badgeMin += '';
                badgeHrs += '';
                if (badgeMin.length == 1) {
                    badgeMin = "0" + badgeMin;
                }
                chrome.browserAction.setBadgeText({text: badgeHrs + ':' + badgeMin});
            }

            // // test with seconds
            // if (badgeSec > 9) {
            //     chrome.browserAction.setBadgeText({text: "10+"});
            //     stopBadge(); //stops current badge, wtimer will be reset in next call
            //     updateBadgeSeconds(StopwatchService);

            // } else {
            //     badgeMin += '';
            //     badgeSec += '';

            //     if (badgeSec.length == 1) {
            //         badgeSec = "0" + badgeSec;
            //     }
            //     chrome.browserAction.setBadgeText({text: badgeMin + ':' + badgeSec});
            // }
        })
    }, 1000);
}

// updates the badge at every hour after 10 to be 10+, 11+ ... etc
var updateBadgeHours = function(StopwatchService) {
    var badgeHrs;
    timer = setInterval(function() {
        // every hour after 10
        StopwatchService.getElapsedTime(function(elapsedObj) {
            badgeHrs = elapsedObj.elapsedHrs + '';
            chrome.browserAction.setBadgeText({text: badgeHrs + "+"})
        })
    }, 3600000);
}

// // test function for updateBadgeHours
// var updateBadgeSeconds = function(StopwatchService) {
//     var badgeSec;
//     timer = setInterval(function() {
//         // every second after 10
//         getElapsedTime(function(elapsedObj) {
//             badgeSec = elapsedObj.elapsedSec + '';
//             chrome.browserAction.setBadgeText({text: badgeSec + "+"})
//         })
//     }, 1000);
// }

var stopBadge = function() {
    clearInterval(timer);
}

///////// Notifications /////////////////////////////////////////////////

var options = {
    type: "basic",
    title: "Clicktime Extension",
    message: "Let's track your time!",
    iconUrl: "../../img/clicktime128x128.png",
}

//notifications function (declared here to avoid hoisting confusion)
var notificationInterval;

/* create notifications if user allowed it. Self invoking function, so starts upon notification */
var createNotifications = function(poll_period) {
    chrome.storage.sync.get(['session', 'allowReminders'], function(items) {
        if (('allowReminders' in items) && 
            (items.allowReminders.permission) && ('session' in items)) {
            //reminders are allowed. poll the user every x mins to enter time
            notificationInterval = setInterval(function() {
                chrome.storage.sync.get('stopwatch', function (items) {
                    if (!('stopwatch' in items) || (('stopwatch' in items) && (!items.stopwatch.running))) {                         
                        chrome.notifications.create("enterTimeNotification", options);
                    }
                })
            }, poll_period)
        }
    })
}

var stopNotifications = function() {
    clearInterval(notificationInterval);
}

// clicking on the body of the message will open the webapp
chrome.notifications.onClicked.addListener(function (notificationId) {
    chrome.tabs.create({
            url: chrome.extension.getURL('../templates/main.html'),
            active: false
        }, function(tab) {
            // After the tab has been created, open a window to inject the tab
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                focused: true,
                width: 580,
                height: 430
            });
        }
    );
});

chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
    stopNotifications();    
    createNotifications(DELAYED_NOTIFICATION_POLL_PERIOD);
});

////////////////////////////////////////////////////////////////////

////////////////  API ////////////////////////////////////

// Make an api call.
function apiCall(requestURL, email, password, requestMethod, callback) {
    var credentials = btoa(email + ":" + password);

    var beforeSend = function (xhr) {
        xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
    }

    $.ajax({
        method: requestMethod,
        beforeSend: beforeSend, 
        url: requestURL,
        contentType: "application/json",
        success: function (res) {
            var response = {
                "data" : res
            }
            callback(response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            callback(response);
        }
    })
}

// Make an API call to locally store the newest entities from clicktime. 
function refreshFromApi(session) {
    var companyURL = API_BASE + "Companies/" + session.CompanyID;
    var userURL = companyURL + "/Users/" + session.UserID;
    var clientsURL = userURL + "/Clients";
    var jobsURL = userURL + "/Jobs";
    var tasksURL = userURL + "/Tasks";
    apiCall(companyURL, session.UserEmail, session.Token, "GET", function (response) {
        if (response.data != null) {
            chrome.storage.local.set({
                "company" : response
            })
        }
    });

    apiCall(userURL, session.UserEmail, session.Token, "GET", function (response) {
        if (response.data != null) {
            chrome.storage.local.set({
                "user" : response
            })
        }
    });

    apiCall(tasksURL, session.UserEmail, session.Token, "GET", function (response) {
        if (response.data != null) {
            chrome.storage.local.set({
                "tasksList" : response
            })
        }
    });

    apiCall(jobsURL, session.UserEmail, session.Token, "GET", function (response) {
        if (response.data != null) {
            var jobsList = response.data;
            apiCall(clientsURL, session.UserEmail, session.Token, 'GET', function (response) {
                var clientsList = response.data;
                var jobClientsList = [];
                for (i in jobsList) {
                    var job = jobsList[i];
                    for (j in clientsList) {
                        var client = clientsList[j];
                       
                        if (job.ClientID == client.ClientID) {
                            var jobClient = {
                                'client' : client,
                                'job' : job,
                                'DisplayName' : client.DisplayName + " - " + job.DisplayName
                            }
                            jobClientsList.push(jobClient);
                        }
                    }
                }
                var stringJobClientsList = JSON.stringify(jobClientsList);
                chrome.storage.local.set({
                    "stringJobClientsList" : stringJobClientsList
                })
            })  
        }      
    })
 }

chrome.runtime.onStartup.addListener(function() {
    chrome.storage.sync.get('session', function (items) {
        if ('session' in items) {
            // User is already logged in, make API call
            var session = items.session.data;
            refreshFromApi(session);
        }
    })
})
