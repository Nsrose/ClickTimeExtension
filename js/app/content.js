var API_BASE = "https://app.clicktime.com/api/1.3/";
var TIMEOUT = 10000;

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

