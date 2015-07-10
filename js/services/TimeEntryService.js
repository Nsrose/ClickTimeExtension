// Services for entering time.

myApp.service('TimeEntryService', function ($http, APIService, CTService) {


	// Function for making async API calls.
    var api = function (url, email, token, method, data) {
        return APIService.apiCall(url, email, token, method, data)
            .then(function (response) {
                if (response.data == null) {
                    bootbox.alert("We're sorry, there was an error fetching the time entries.");
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
	// This does NO checks on the validity of a time entry! By this point, the time entry object is assumed
	// to be 100% valid for which user and company it is being saved for.
	this.saveTimeEntry = function (session, clickTimeEntry) {
		var url = API_BASE + "Companies/" + session.CompanyID + "/Users/" + session.UserID + "/TimeEntries";
		return api(url, session.UserEmail, session.Token, "POST", clickTimeEntry)
	}

	// Store a time entry to local storage if no internet connection
	this.storeTimeEntry = function (timeEntry, callback) {
		chrome.storage.local.get('storedTimeEntries', function (items) {
			if ('storedTimeEntries' in items) {
				storedTimeEntries = items.storedTimeEntries;
				storedTimeEntries.push(timeEntry);
				chrome.storage.local.set({
					'storedTimeEntries' : storedTimeEntries
				}, function() {
					callback();
				})
			} else {
				storedTimeEntries = [];
				storedTimeEntries.push(timeEntry);
				chrome.storage.local.set({
					'storedTimeEntries' : storedTimeEntries
				}, function() {
					callback();
				})
			}
		})
	}

	// Get the in progress time entry of a user, if it exists.
	this.getInProgressEntry = function (callback) {
		chrome.storage.sync.get('inProgressEntry', function (items) {
			if ('inProgressEntry' in items) {
				var inProgressEntry = items.inProgressEntry;
				var dateString = CTService.getDateString();
        		inProgressEntry.Date = dateString;
        		chrome.storage.sync.set({
        			'inProgressEntry' : inProgressEntry
        		}, function() {
        			callback(inProgressEntry);
        		})
			} else {

				var dateString = CTService.getDateString();
        		var now = new Date();
				var newEntry = {
		            "BreakTime":0.00,
		            "Comment":"",
		            "Date":dateString,
		            "Hours":0.00,
		            "ISOEndTime":new Date(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds()),
		            "ISOStartTime":new Date(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds()),
		            "JobID":"",
		            "PhaseID":"",
		            "SubPhaseID":null,
		            "TaskID":""
		        }
		        chrome.storage.sync.set({
        			'inProgressEntry' : newEntry
        		}, function() {
        			callback(newEntry);
        		})


			}
		})
	}

	// Change property in inProgressEntry to value.
	this.updateInProgressEntry = function (property, value) {
		chrome.storage.sync.get('inProgressEntry', function (items) {
			if ('inProgressEntry' in items) {
				var inProgressEntry = items.inProgressEntry;
				switch (property) {
					case "Comment":
						inProgressEntry.Comment = value;
						break;
					case "Hours":
						inProgressEntry.Hours = value;
						break;
					case "job":
						inProgressEntry.job = value;
						inProgressEntry.JobID = value.JobID;
						break;
					case "client":
						inProgressEntry.client = value;
						break;
					case "task":
						inProgressEntry.task = value;
						inProgressEntry.TaskID = value.TaskID;
						break;
					default:
						bootbox.alert("Invalid time entry property: " + property);
				}
				chrome.storage.sync.set({
					'inProgressEntry' : inProgressEntry
				})
			}
		})
	}

	// Remove an in progress entry
	this.removeInProgressEntry = function() {
		chrome.storage.sync.remove('inProgressEntry');
	}


})