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
                chrome.browserAction.setBadgeText({text: "10+"});
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