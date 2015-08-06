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
/* notifications options */
var options = {
    type: "basic",
    title: "Clicktime Extension",
    message: "Let's track your time!",
    iconUrl: "../../img/lgLogo.png",
}

//notifications function (declared here to avoid hoisting confusion)
var notificationInterval;

/* create notifications if all conditions true:
    - user allows it
    - user is logged in
    - there isn't a running stopwatch. */
var createNotifications = function(pollPeriod) {
    notificationInterval = setInterval(function() {
       chrome.storage.sync.get(['session', 'allowReminders', 'stopwatch'], function(items) {
            if ((('allowReminders' in items) && (items.allowReminders.permission)) && 
                ('session' in items) && 
                (!('stopwatch' in items) || (('stopwatch' in items) && (!items.stopwatch.running)))) {
                  chrome.notifications.create("enterTimeNotification", options);
             }
       })
    }, pollPeriod)
};

/* 
   stop generation of new notifications, 
   clear any notifications in tray
*/
var stopNotifications = function() {
    clearInterval(notificationInterval);
    chrome.notifications.clear('enterTimeNotification');
}

/* Create a new notification and send, for demonstration purposes.*/
var sendOneNotification = function() {
    chrome.notifications.create('enterTimeNotification', options);
}


/*  
    clicking on the body of the message will open the webapp in a window
    if there is no current window open.
    if there is a window open, the program will prompt you by flashing
    the window in your face
*/
var windowID = null;

// TImeString from integration
var timeString = null;

chrome.notifications.onClicked.addListener(function (notificationId) {
    if (!windowID) { // if id has never beeen set before    
        createWindow();
    } else {        
        chrome.windows.update(windowID, {drawAttention: true});
    }
});

// Listen for Create Window request from content:
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.integrateTimeEntry) {
            console.log("Got request to integrate time entry");
            integrateTimeEntry(request.timeString);
        }
        if (request.openWindow) {
            timeString = request.timeString;
            console.log("Got request to open window");
            createWindow(request.timeString);
        }
    }
)

// Listen for page ready after create window
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.pageReady && timeString) {
            integrateTimeEntry(timeString);
            timeString = null;
        }
    }
)

/** Integrate a time entry from google calendar. Save to local in prog entry. */
function integrateTimeEntry (timeString) {
    var splitTime = timeString.split(",");
    var timeDate = splitTime[1];
    var timeDelta = splitTime[2];
    var splitTimeDelta = timeDelta.split(" ");
    var startTimeString = splitTimeDelta[1];
    var endTimeString = splitTimeDelta[3];

    var startTimeProper = toProperTimeString(startTimeString);
    var endTimeProper = toProperTimeString(endTimeString);

    var now = new Date();
    var timeEntryDate = new Date(now.getFullYear() + timeDate);

    var startTime = toTime(startTimeProper);
    var endTime = toTime(endTimeProper);

    var startEndTimes = [JSON.stringify(startTime), JSON.stringify(endTime)];
    chrome.runtime.sendMessage({
        updateInProgressEntry: true,
        startTime: JSON.stringify(startTime),
        endTime : JSON.stringify(endTime)
    })

}

// Convert format '12:15pm' to '12:15 pm' for Date parsing
function toProperTimeString (timeString) {
    var amSplit = timeString.split("am");
    if (amSplit.length == 1) {
        // PM time
        var pmSplit = timeString.split("pm");
        return pmSplit[0] + " pm";
    } else {
        // AM time
        return amSplit[0] + " am";
    }
}

// Convert "2 pm" or "2:14 pm" to a Date object
function toTime (time) {
    if (time.indexOf(":") == -1) {
        time = time.split(" ")[0] + ":00" + " " + time.split(" ")[1];
    }
    var startTime = new Date();
    var parts = time.match(/(\d+):(\d+) (am|pm)/);
    if (parts) {
        var hours = parseInt(parts[1]),
            minutes = parseInt(parts[2]),
            tt = parts[3];
        if (tt === 'pm' && hours < 12) hours += 12;
        startTime.setHours(hours, minutes, 0, 0);
    }
    return startTime;
}

/* Create a new chrome ext window and update windowID. */
function createWindow(timeString) {
    chrome.windows.create({
    url: chrome.extension.getURL('../templates/main.html'),
    type: 'popup',
    focused: true,
    width: 580,
    height: 450
    }, function (window) {
        windowID = window.id;
    })  
}

/** Integrate a time entry from google calendar.*/

/* on window close, reset the windowID to null to indicate that 
   there does not exist a current window open */
chrome.windows.onRemoved.addListener(function (closedWindowID) {
    if (closedWindowID == windowID) windowID = null;
})

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
