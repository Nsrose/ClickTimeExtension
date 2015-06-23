// Services for accessing entities
// These will only work once the session is open
myApp.service('EntityService', function ($http, APIService) {
	// The users session
	var Session = null;
	var UserName = null;
    var UserID = null;
    var CompanyID = null;
    var UserEmail = null;
    var Token = null;
    var SecurityLevel = null;


	// Base URL for making API calls to the three main GET methods
    var baseURL = "";

    // Function to get the session of a user
    // callback will be called on the session
    this.getSession = function (callback) {
    	chrome.storage.sync.get('session', function (items) {
    		if ('session' in items) {
    			session = items.session.data;
    			if (session != null) {
    				// Session was found
    				Session = session;
    				UserName = session.UserName;
	                UserID = session.UserID;
	                CompanyID = session.CompanyID;
	                UserEmail = session.UserEmail;
	                Token = session.Token;
	                SecurityLevel = session.SecurityLevel;
                    baseURL = API_BASE + "Companies/" + CompanyID + "/Users/" + UserID;

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
    var api = function (entity, email, token, method) {
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
    // checkLocal - if true, check local storage first.
    this.getClients = function (session, checkLocal, callback) {
        if (checkLocal) {
            // Call to just get the entity. Check local storage first.
            chrome.storage.sync.get('clientsList', function (items) {
                if ('clientsList' in items) {
                    // Clients were stored locally, great!
                    var clientsList = items.clientsList.data;
                    if (clientsList != null) {
                        console.log("Fetched clients list from local storage");
                        callback(clientsList);
                    } 
                } else {
                    CompanyID = session.CompanyID;
                    UserID = session.UserID;
                    // Clients don't exist in local storage. Need to call API
                    api('Clients', session.UserEmail, session.Token, 'GET')
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
        } else {
            // This is a forced call to the api. Do not check local storage first.
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            // Clients don't exist in local storage. Need to call API
            api('Clients', session.UserEmail, session.Token, 'GET')
            .then (function (response) {
                console.log(response);
                chrome.storage.sync.set({
                    'clientsList' : response,
                }, function () {
                    console.log("Set clients list to local storage");
                    callback(response.data);
                })
            })
        }
       
    }

    // Get jobs list for this session and save to local storage
    // Calls the callback on the jobsList
    this.getJobs = function (session, checkLocal, callback) {
        if (checkLocal) {
            chrome.storage.sync.get('jobsList', function (items) {
                if ('jobsList' in items) {
                    // jobs were stored locally, great!
                    var jobsList = items.jobsList.data;
                    if (jobsList != null) {
                        console.log("Fetched jobs list from local storage");
                        callback(jobsList);
                    } 
                } else {
                    // This is a forced call to the api. Do not check local storage first.
                    CompanyID = session.CompanyID;
                    UserID = session.UserID;
                    // Jobs don't exist in local storage. Need to call API
                    api('Jobs', session.UserEmail, session.Token, 'GET')
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
        } else {
            // This is a forced call to the api. Do not check local storage first.
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            api('Jobs', session.UserEmail, session.Token, 'GET')
            .then (function (response) {
                chrome.storage.sync.set({
                    'jobsList' : response,
                }, function () {
                    console.log("Set jobs list to local storage");
                    callback(response.data);
                })
            })
        }       
    }

    // Get tasks list for this session and save to local storage
    // Calls the callback on the tasksList
    this.getTasks = function (session, checkLocal, callback) {
        if (checkLocal) {
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
                    api('Tasks', session.UserEmail, session.Token, 'GET')
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
        } else {
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            api('Tasks', session.UserEmail, session.Token, 'GET')
                .then (function (response) {
                    chrome.storage.sync.set({
                        'tasksList' : response,
                    }, function () {
                        console.log("Set tasks list to local storage");
                        callback(response.data);
                    })
                })
        }
       
    }

})