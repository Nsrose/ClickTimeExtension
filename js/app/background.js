// Constants
var API_BASE = "https://app.clicktime.com/api/1.3/";
// Time before asking user again if they want to enter time. Remind every 4 hours
var NOTIFICATION_POLL_PERIOD = 14400000;
// Whether to show pop out icon
var showPopupArrow = true;

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


// Get the elapsed time of the stopwatch. 
// If no running stopwatches, then this will be 0.
// Return an object with elapsed hours, minutes, and seconds.
function getElapsedTime(callback) {
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

function updateBadge() {
    var badgeHrs, badgeMin, badgeSec;
    chrome.browserAction.setBadgeText({text: "0:00"});
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
                chrome.browserAction.setBadgeText({text: badgeHrs + ":" + badgeMin});
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
    }, 60000);
}

// updates the badge at every hour after 10 to be 10+, 11+ ... etc
function updateBadgeHours() {
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
function updateBadgeSeconds() {
     var badgeSec;
     timer = setInterval(function() {
         // every second after 10
         getElapsedTime(function(elapsedObj) {
             badgeSec = elapsedObj.elapsedSec + '';
             chrome.browserAction.setBadgeText({text: badgeSec + "+"})
         })
     }, 1000);
 }

function stopBadge() {
    clearInterval(timer);
    chrome.browserAction.setBadgeText({text: ""});
}

///////// Notifications /////////////////////////////////////////////////
/* notifications options */
var options = {
    type: "basic",
    title: "ClickTime for Chrome",
    message: "Let's track your time!",
    iconUrl: "../../img/lgLogo.png",
}

//notifications function 
var notificationInterval;

/* create notifications if all conditions true:
    - user allows it
    - user is logged in
    - there isn't a running stopwatch. */
function createNotifications(pollPeriod) {
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
function stopNotifications() {
    clearInterval(notificationInterval);
    chrome.notifications.clear('enterTimeNotification');
}

/* Create a new notification and send, for demonstration purposes.*/
function sendOneNotification() {
    chrome.notifications.create('enterTimeNotification', options);
}

// TImeString from integration
var timeString = null;
// Info from latest google calendar reqeust
var timeInfo = null;

/*  
    clicking on the body of the message will open the webapp in a window
*/
chrome.notifications.onClicked.addListener(function (notificationId) {
  createWindow();
});

// Listen for Create Window request from content:
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.integrateTimeEntry) {
            integrateTimeEntry(request.timeString);
        }
        if (request.openWindow) {
            timeString = request.timeString;
            timeInfo = request.timeInfo;
            createWindow(request.timeString);
        }
    }
)

/* Create a new chrome ext window and update windowID.
    If timeString isn't null, send a message to the new window
    indicating that start and end time should be filled out.
    if there is no current window open. This is determined by the existence
    of windowID.
    If a current window exists, the program will bring the current window into focus
    and will not open a new window. 
*/
var windowID = null;

function createWindow(timeString) {
  if (!windowID || timeString) { // if current window does not exist
   chrome.windows.create({
      url: chrome.extension.getURL('../templates/main.html'),
      type: 'popup',
      focused: true,
      width: 510,
      height: 640
      }, function (window) {
          windowID = window.id;
          showPopupArrow = false
      })
  } else {    
      chrome.windows.update(windowID, {drawAttention: true, focused: true});
  }
}

// Listen for page ready after create window
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.pageReady && timeString) {
            integrateTimeEntry(timeString, timeInfo);
            timeString = null;
        }
    }
)

/** Integrate a time entry from google calendar. Save to local in prog entry. */
function integrateTimeEntry (timeString, timeInfo) {
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
        endTime : JSON.stringify(endTime),
        timeInfo : timeInfo
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

/** Integrate a time entry from google calendar.*/

/* on window close, reset the windowID to null to indicate that 
   there does not exist a current window open. It will also force a
   scope refresh on the time entry template to show the popout button. */
chrome.windows.onRemoved.addListener(function (closedWindowID) {
    if (closedWindowID == windowID) {
      windowID = null;
      showPopupArrow = true;
      chrome.runtime.sendMessage({
        refresh : true
      })
    }
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

///////////////////////internet //////////////////////////

/* listens for internet. 
*/
var isOnline = true;
window.addEventListener('offline', function(e) {
  console.log('im offline')
  isOnline = false;
  chrome.runtime.sendMessage({
    internetConnected: false
  });
}, false);

window.addEventListener('online', function(e) {
  console.log('im online')
  isOnline = true;
  chrome.runtime.sendMessage({
    internetConnected : true
  })
}, false);
