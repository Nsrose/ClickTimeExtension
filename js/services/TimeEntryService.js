// Services for entering time.

myApp.service('TimeEntryService', function ($http, APIService, CTService) {


	// Function for making async API calls.
    var api = function (url, email, token, method, data) {
        return APIService.apiCall(url, email, token, method, data)
            .then(function (response) {
                if (response.data == null) {
                    alert("We're sorry, there was an error fetching the time entries.");
                    console.log(url);
                }

                return response;
            })
    }

	// Get the time entries for the user.
	this.getTimeEntries = function (session, checkLocal, callback) {
		if (checkLocal) {
			chrome.storage.sync.get('timeEntries', function (items) {
				if ('timeEntries' in items) {
					var timeEntries = items.timeEntries.data;
					if (timeEntries != null) {

						console.log("Fetched time entries from local storage");
						callback(timeEntries);
					}
				} else {
					var url = API_BASE + "Companies/" + session.CompanyID + "/Users/" + session.UserID
						 + "/TimeEntries";
					api(url, session.UserEmail, session.Token, 'GET')
					.then(function (response) {
						chrome.storage.sync.set({
							'timeEntries' : response,
						}, function() {
							var timeEntries = response.data;
							console.log("Set time entries to local storage");
							callback(timeEntries);
						})
					})
				}
			})
		} else {
			var url = API_BASE + "Companies/" + session.CompanyID + "/Users/" + session.UserID
				 + "/TimeEntries";
			api(url, session.UserEmail, session.Token, 'GET')
			.then(function (response) {
				chrome.storage.sync.set({
					'timeEntries' : response,
				}, function() {
					var timeEntries = response.data;
					console.log("Set time entries to local storage");
					callback(timeEntries);
				})
			})
		}
	}

	// Save a time entry
	this.saveTimeEntry = function (session, timeEntry) {
		var ISOEndTime = CTService.convertISO(timeEntry.ISOEndTime);
		var ISOStartTime = CTService.convertISO(timeEntry.ISOStartTime);

		var clickTimeEntry = {
			"BreakTime" : timeEntry.BreakTime,
			"Comment" : timeEntry.Comment,
			"Date" : timeEntry.Date,
			"Hours" : timeEntry.Hours,
			"ISOEndTime" : ISOEndTime,
			"ISOStartTime" : ISOStartTime,
			"JobID" : timeEntry.JobID,
			"PhaseID" : timeEntry.PhaseID,
			"SubPhaseID" : timeEntry.SubPhaseID,
			"TaskID" : timeEntry.TaskID,
			"task" : timeEntry.task,
			"job": timeEntry.job,
			"client" : timeEntry.client
		}
		var url = API_BASE + "Companies/" + session.CompanyID + "/Users/" + session.UserID + "/TimeEntries";
		api(url, session.UserEmail, session.Token, "POST", clickTimeEntry)
		.then(function (response) {
			console.log(response);
		})
	}


})