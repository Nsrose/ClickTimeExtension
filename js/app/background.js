// Constants
var API_BASE = "https://app.clicktime.com/api/1.3/";
// Time before asking user again if they want to enter time. Remind every 4 hours
var NOTIFICATION_POLL_PERIOD = 5000;

// Listen for API url change:
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.changeUrl) {
            API_BASE = request.url
        }
    }
)

//////////////////////////////////////////////////////////////////////////

/* 
   this timer is for badge display purposes only
   stopping/starting it will have no effect on the chrome sync timer
*/
var timer;

/* function taken from StopwatchService. 
   FAQ: 
   - Why not just use the service by passing it in as a param? 
        the service stops once the chrome extension page closes. Therefore,
        we can't rely on the service.
   - Okay, so then register the service in the manifest as a background script.
        Sure, that works. But then you will have to register the service here,
        and that wasn't worth it to register so many dependencies just for one
        function to work.  
*/
var getElapsedTime = function (callback) {
  chrome.storage.sync.get('stopwatch', function (items) {
    if ('stopwatch' in items) {
      var now = new Date();
      var storedWatch = items.stopwatch;
      var startTime = new Date(storedWatch.startYear, storedWatch.startMonth, storedWatch.startDay,
        storedWatch.startHrs, storedWatch.startMin, storedWatch.startSec);
      var elapsedTimeMS = now - startTime;
      var elapsedSec = Math.floor(elapsedTimeMS / 1000);
      var elapsedMin = Math.floor(elapsedSec / 60);
      var elapsedHrs = Math.floor(elapsedMin / 60);
      var elapsedObj = { 
        'elapsedHrs' : elapsedHrs,
        'elapsedMin' : elapsedMin,
        'elapsedSec' : elapsedSec,
        'running' : storedWatch.running
      };  
      callback(elapsedObj);
    } else {
      var elapsedObj = { 
        'elapsedHrs' : 0,
        'elapsedMin' : 0,
        'elapsedSec' : 0,
        'running' : false
      };  
      callback(elapsedObj);
    }   
  })  
}   

var updateBadge = function() {
    var badgeHrs, badgeMin, badgeSec;
    timer = setInterval(function() {
        getElapsedTime(function(elapsedObj) {

            badgeSec = elapsedObj.elapsedSec % 60; // unused except for testing
            badgeMin = elapsedObj.elapsedMin % 60;
            badgeHrs = elapsedObj.elapsedHrs;

            if (badgeHrs > 9) {
                stopBadge();
                chrome.browserAction.setBadgeText({text: badgeHrs + "+"});
                updateBadgeHours();
            } else {
                badgeMin += ''; //toString
                badgeHrs += '';
                if (badgeMin.length == 1) {
                    badgeMin = "0" + badgeMin;
                }
                chrome.browserAction.setBadgeText({text: badgeHrs + ':' + badgeMin});
            }
/*
             // test with seconds
             if (badgeSec > 9) {
                 stopBadge();
                 chrome.browserAction.setBadgeText({text: "10+"});
                 updateBadgeSeconds();
             } else {
                 badgeMin += '';
                 badgeSec += '';

                 if (badgeSec.length == 1) {
                     badgeSec = "0" + badgeSec;
                 }
                 chrome.browserAction.setBadgeText({text: badgeMin + ':' + badgeSec});
                 console.log("badge being called");
             }
*/
        })
    }, 1000);
}

// updates the badge at every hour after 10 to be 10+, 11+ ... etc
var updateBadgeHours = function() {
    var badgeHrs;
    timer = setInterval(function() {
        // every hour after 10
        getElapsedTime(function(elapsedObj) {
            badgeHrs = elapsedObj.elapsedHrs + '';
            chrome.browserAction.setBadgeText({text: badgeHrs + "+"})
        })
    }, 3600000);
}

 /* test function for updateBadgeHours. Is never called unless you are 
    testing with seconds */ 
 var updateBadgeSeconds = function() {
     var badgeSec;
     timer = setInterval(function() {
         // every second after 10
         getElapsedTime(function(elapsedObj) {
             badgeSec = elapsedObj.elapsedSec + '';
             chrome.browserAction.setBadgeText({text: badgeSec + "+"})
         })
     }, 1000);
 }

var stopBadge = function() {
    clearInterval(timer);
    chrome.browserAction.setBadgeText({text: ""});
}

///////// Notifications /////////////////////////////////////////////////
/* notifications options */
var options = {
    type: "basic",
    title: "Clicktime Extension",
    message: "Let's track your time!",
    iconUrl: "../../img/lgLogo.png",
}

//notifications function 
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

/*  
    clicking on the body of the message will open the webapp in a window
    if there is no current window open.
    if there is a window open, the program will prompt you by flashing
    the window in your face
*/
var windowID = null;
chrome.notifications.onClicked.addListener(function (notificationId) {
    if (!windowID) { // if id has never beeen set before 
        chrome.windows.create({
            url: chrome.extension.getURL('../templates/main.html'),
            type: 'popup',
            focused: true,
            width: 556,
            height: 380,
        }, function (window) {
            windowID = window.id;
            console.log(windowID);
        });    
    } else {        
        chrome.windows.update(windowID, {drawAttention: true});
    }
});

/* on window close, reset the windowID to null to indicate that 
   there does not exist a current window open */
chrome.windows.onRemoved.addListener(function (closedWindowID) {
    if (closedWindowID == windowID) windowID = null;
})

/* on notification close, create another notification later. */
chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
    stopNotifications();    
    createNotifications(NOTIFICATION_POLL_PERIOD);
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
