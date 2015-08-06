var API_BASE = "https://app.clicktime.com/api/1.3/";
var TIMEOUT = 10000;

// Listen for API url change:
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.changeUrl) {
            API_BASE = request.url
        }
    }
)

// Append logo to google calendar bubble
function appendLogoGoogleCalendar(calendarHTML) {
    $(".bubblemain").append(calendarHTML);
    document.querySelector('#clicktime-calendar-integration').addEventListener("click", integrateTimeEntry);
}

// Record time entry with Google calendar integration
function integrateTimeEntry() {
    var timeString = $(".eb-date").text();
    chrome.runtime.sendMessage({
        createWindow: true,
        timeString: timeString
    })
}


// Try to send locally stored time entries
chrome.storage.local.get('storedTimeEntries', function (items) {
    if ('storedTimeEntries' in items) {
        var storedTimeEntries = items.storedTimeEntries;
        chrome.storage.sync.get('session', function (items) {
            if ('session' in items) {
                var unsuccessfulStoredEntries = [];
                var numSuccessfulUploads = 0;
                var session = items.session.data;
                var url = API_BASE + "/Companies/" + session.CompanyID + "/Users/" 
                    + session.UserID + "/TimeEntries";
                var credentials = btoa(session.UserEmail + ":" + session.Token);

                var beforeSend = function (xhr) {
                    xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
                }
                for (i in storedTimeEntries) {
                    var storedEntry = storedTimeEntries[i];
                    $.ajax({
                        method: "POST",
                        beforeSend: beforeSend, 
                        url: url,
                        data: JSON.stringify(storedEntry),
                        contentType: "application/json",
                        success: function (response) {
                            console.log("Uploaded time entry.");
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            console.log(errorThrown);
                            unsuccessfulStoredEntries.push(storedEntry);
                        }
                    })
                }
                chrome.storage.local.set({
                    'storedTimeEntries' : unsuccessfulStoredEntries
                });
                if (numSuccessfulUploads != 0) {
                    bootbox.alert("Successfully uploaded " + numSuccessfulUploads + " time entries.");
                }
            }
        })
    }
})

var calendarHTML = "<div style='width:20px;height:20px;position:absolute;top:0;left:0;z-index=999;' id='clicktime-calendar-integration'>";
var imgURL = chrome.extension.getURL("../../img/smallLogo.png");

calendarHTML += "<img src=" + imgURL + "></div>";


$(document).ready(function() {
    window.setTimeout(function() {
        appendLogoGoogleCalendar(calendarHTML);
    }, 3000);

})
