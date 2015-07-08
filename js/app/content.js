var API_BASE = "https://dev99.clicktime.com:8443/api/1.3/";
var TIMEOUT = 10000;

// Try to send locally stored time entries
chrome.storage.sync.get(['storedTimeEntries', 'session'], function (items) {
    if ('storedTimeEntries' in items && 'session' in items) {
        var unsuccessfulStoredEntries = [];
        var numSuccessfulUploads = 0;
        var storedTimeEntries = items.storedTimeEntries;
        var session = items.session.data;
        for (i in storedTimeEntries) {
            storedEntry = storedTimeEntries[i];
            var url = API_BASE + "https://app.clicktime.com/api/1.3/" + session.CompanyID + /Users/ + session.UserID + /TimeEntries;
            var credentials = btoa(session.UserEmail + ":" + session.Token);

            var beforeSend = function (xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
            }

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
        chrome.storage.sync.set({
            'storedTimeEntries' : unsuccessfulStoredEntries
        });
        if (numSuccessfulUploads != 0) {
            alert("Successfully uploaded " + numSuccessfulUploads + " time entries.");
        }
       
    }
})

