// Services for accessing entities
// These will only work once the session is open
myApp.service('EntityService', function ($http) {
	// The users session
	this.Session = null;
	this.UserName = null;
    this.UserID = null;
    this.CompanyID = null;
    this.UserEmail = null;
    this.Token = null;
    this.SecurityLevel = null;


	// Base URL for making API calls to the three main GET methods
    // baseURL = API_BASE + "Companies/" + CompanyID + "/Users/" + UserID;


    // Function to get the session of a user
    // callback will be called on the session
    this.getSession = function (callback) {
    	chrome.storage.sync.get('session', function (items) {
    		if ('session' in items) {
    			session = items.session.data;
    			if (session != null) {
    				// Session was found
    				this.Session = session;
    				this.UserName = session.UserName;
	                this.UserID = session.UserID;
	                this.CompanyID = session.CompanyID;
	                this.UserEmail = session.UserEmail;
	                this.Token = session.Token;
	                this.SecurityLevel = session.SecurityLevel;

	                callback(session);



    			} else {
    				// Session couldn't be found
			        alert('Session could not be found');
			        return;
    			}
    		} else {
    			// Session couldn't be found
			    alert('Session could not be found');
			    return;
    		}
    	})
    }

	// Function for making async API calls.
    // Entity must be plural 
    this.api = function (entity, email, token, method) {
        if (baseURL == "") {
            alert("Need to get user session before making API calls");
            return;
        }

        var url = baseURL + "/" + entity;

        return APIService.apiCall(url, email, token, method)
            .then(function (response) {
                if (response.data == null) {
                    alert("We're sorry, there was an error fetching the " + entity + " list");
                }

                return response;
            })
    }


    // Get clients list for this session and save to local storage
    // Calls the callback on the clientsList
    this.getClients = function (session, callback) {
        // Fetch the clients
        // First check local storage. 
        chrome.storage.sync.get('clientsList', function (items) {
            if ('clientsList' in items) {
                // Clients were stored locally, great!
                var clientsList = items.clientsList.data;
                if (clientsList != null) {
                    console.log("Fetched clients list from local storage");
                    callback(clientsList);
                } 
            } else {
                // Clients don't exist in local storage. Need to call API
                this.api('Clients', session.UserEmail, session.Token, 'GET')
                .then (function (response) {
                    chrome.storage.sync.set({
                        'clientsList' : response,
                    }, function () {
                        console.log("Set clients list to local storage");
                        callback(response.data);
                    })
                })
            }
        })
    }

    // Get jobs list for this session and save to local storage
    // Calls the callback on the jobsList
    this.getJobs = function (session, callback) {
        // Fetch the jobs
        // First check local storage. 
        chrome.storage.sync.get('jobsList', function (items) {
            if ('jobsList' in items) {
                // jobs were stored locally, great!
                var jobsList = items.jobsList.data;
                if (jobsList != null) {
                    console.log("Fetched jobs list from local storage");
                    callback(jobsList);
                } 
            } else {
                // Clients don't exist in local storage. Need to call API
                this.api('Jobs', session.UserEmail, session.Token, 'GET')
                .then (function (response) {
                    chrome.storage.sync.set({
                        'jobsList' : response,
                    }, function () {
                        console.log("Set jobs list to local storage");
                        callback(response.data);
                    })
                })
            }
        })
    }

    // Get tasks list for this session and save to local storage
    // Calls the callback on the tasksList
    this.getTasks = function (session, callback) {
        // Fetch the tasks
        // First check local storage. 
        chrome.storage.sync.get('tasksList', function (items) {
            if ('tasksList' in items) {
                // tasks were stored locally, great!
                var tasksList = items.tasksList.data;
                if (tasksList != null) {
                    console.log("Fetched tasks list from local storage");
                    callback(tasksList);
                } 
            } else {
                // Tasks don't exist in local storage. Need to call API
                this.api('Tasks', session.UserEmail, session.Token, 'GET')
                .then (function (response) {
                    chrome.storage.sync.set({
                        'tasksList' : response,
                    }, function () {
                        console.log("Set tasks list to local storage");
                        callback(response.data);
                    })
                })
            }
        })
    }

})