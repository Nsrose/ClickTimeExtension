// Services for entering time.

myApp.service('TimeEntryService', function ($http, APIService, CTService, $apiBase) {
	var me = this;

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

	// Save a time entry
	// This does NO checks on the validity of a time entry! By this point, the time entry object is assumed
	// to be 100% valid for which user and company it is being saved for.
	this.saveTimeEntry = function (session, clickTimeEntry) {
		var url = $apiBase.url + "Companies/" + session.CompanyID + "/Users/" + session.UserID + "/TimeEntries";
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
				var stringStartTime = inProgressEntry.ISOStartTime;
				var stringEndTime = inProgressEntry.ISOEndTime;
				inProgressEntry.ISOStartTime = new Date(JSON.parse(stringStartTime));
				inProgressEntry.ISOEndTime = new Date(JSON.parse(stringEndTime));
				if (stringEndTime == null) {
					inProgressEntry.ISOEndTime = null;
				}
				if (stringStartTime == null) {
					inProgressEntry.ISOStartTime = null;
				}
				callback(inProgressEntry);
			} else {
				var dateString = CTService.getDateString();
        		var now = new Date();
        		var min = null;
		        if ((now.getMinutes() + '').length == 1) {
		            min = "0" + now.getMinutes(); 
		        } else {
		            min = now.getMinutes();
		        }
				var newEntry = {
		            "BreakTime":0.00,
		            "Comment":"",
		            "Date":dateString,
		            "Hours":DEFAULT_EMPTY_HOURS,
		            "ISOEndTime": null,
		            "ISOStartTime": null,
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
	this.updateInProgressEntry = function (property, value, callback) {
		chrome.storage.sync.get('inProgressEntry', function (items) {
			if ('inProgressEntry' in items) {
				var inProgressEntry = items.inProgressEntry;
				switch (property) {
					case "Date":
						inProgressEntry.Date = value;
						break;
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
						if (value) {
							inProgressEntry.TaskID = value.TaskID;	
						} else {
							inProgressEntry.TaskID = null;
						}
						break;
					case "inProgress":
						inProgressEntry.inProgress = value;
						break;
					case "ISOStartTime":
						var stringStartTime = JSON.stringify(value);
						inProgressEntry.ISOStartTime = stringStartTime;
						break;
					case "ISOEndTime":
						var stringEndTime = JSON.stringify(value);
						inProgressEntry.ISOEndTime = stringEndTime;
						break;
					case "startEndTimes":
						var stringStartTime = JSON.stringify(value[0]);
						var stringEndTime = JSON.stringify(value[1]);
						inProgressEntry.ISOStartTime = stringStartTime;
						inProgressEntry.ISOEndTime = stringEndTime;
						break;
					default:
						bootbox.alert("Invalid time entry property: " + property);
				}
				chrome.storage.sync.set({
					'inProgressEntry' : inProgressEntry
				}, function() {
					if (callback != undefined) {
						callback();
					}
				})
			}
		})
	}

	//Listen for an update in prog entry request from background:
	chrome.runtime.onMessage.addListener(
	    function (request, sender, sendResponse) {
	        if (request.updateInProgressEntry) {
	        	var startTime = JSON.parse(request.startTime);
	        	var endTime = JSON.parse(request.endTime);
	        	var startEndTimes = [startTime, endTime];

	            me.updateInProgressEntry("startEndTimes", startEndTimes, function() {
	            	console.log("Updated in progres entyr. Now sending update integration.");
	            	chrome.runtime.sendMessage({
	            		updateIntegration: true,
	            		startTime: request.startTime,
	            		endTime: request.endTime
	            	})
	            });
	        }
	    }
	)

	// Remove an in progress entry
	this.removeInProgressEntry = function() {
		chrome.storage.sync.remove('inProgressEntry');
	}
})