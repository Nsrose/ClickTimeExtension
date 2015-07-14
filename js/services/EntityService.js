// Services for accessing entities
// These will only work once the session is open
myApp.service('EntityService', function ($http, APIService, CTService) {
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
			        bootbox.alert('Session could not be found');
			        return;
    			}
    		} else {
    			// Session couldn't be found
			    bootbox.alert('Session could not be found');
			    return;
    		}
    	})
    }

    // Function for making async API calls.
    // Entity must be plural, except in case of user
    var api = function (entity, email, token, method) {
        if (baseURL == "") {
            bootbox.alert("Need to get user session before making API calls");
            return;
        }

        var url = baseURL;
        if (entity != 'User') {
            url += "/" + entity;
        }

        if (entity == 'Company') {
            url = API_BASE + "Companies/" + CompanyID;
        }


        return APIService.apiCall(url, email, token, method)
            .then(function (response) {
                if (response.data == null) {
                    bootbox.alert("We're sorry, there was an error fetching the " + entity + " list");
                }

                return response;
            })
    }

    var getIsoDate = function() {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1;
        var yyyy = today.getFullYear();

        if (dd < 10) {
            dd='0'+dd
        } 
        if (mm < 10) {
            mm='0' + mm
        }

        today = yyyy + mm + dd;
        return today;
    }

    this.getTimeEntries = function (session, callback) {
        CompanyID = session.CompanyID;
        UserID = session.UserID;
        isodate = getIsoDate();
        url = API_BASE + "Companies/" + CompanyID + "/Users/" + UserID + "/TimeEntries?date=" + isodate;
        APIService.apiCall(url, session.UserEmail, session.Token, 'GET')
            .then(function (response) {
                callback(response.data);
            })
    }

    // Get clients list for this session and save to local storage
    // Calls the callback on the clientsList
    // checkLocal - if true, check local storage first.
    this.getClients = function (session, checkLocal, callback) {
        if (checkLocal) {
            // Call to just get the entity. Check local storage first.
            chrome.storage.local.get(['clientsList', 'clientsByRecent'], function (items) {
                if ('clientsList' in items) {
                    // Clients were stored locally, great!
                    var clientsList = items.clientsList.data;
                    if (clientsList != null) {
                        var clientsByRecent = [];
                        // See if the recently used were available to reorder list
                        if ('clientsByRecent' in items) {
                            clientsByRecent = items.clientsByRecent;
                        }

                        var entityList = [];
                        // First add any client not in the recent list
                        for (i in clientsList) {
                            c = clientsList[i];
                            if (clientsByRecent && !containsClient(clientsByRecent, c)) {
                                entityList.push(c);  
                            }
                        }

                        // Then add the recent clients
                        for (i in clientsByRecent) {
                            r = clientsByRecent[i];
                            entityList.unshift(r);
                        }

                        console.log("Fetched clients list from local storage");
                        callback(entityList);
                    } 
                } else {
                    CompanyID = session.CompanyID;
                    UserID = session.UserID;
                    // Clients don't exist in local storage. Need to call API
                    return api('Clients', session.UserEmail, session.Token, 'GET')
                    .then (function (response) {
                        chrome.storage.local.set({
                            'clientsList' : response,
                        }, function () {
                            var clientsList = response.data;
                            var clientsByRecent = [];
                             // See if the recently used were available to reorder list
                            if ('clientsByRecent' in items) {
                                clientsByRecent = items.clientsByRecent;
                            }

                            var entityList = [];
                            // First add any client not in the recent list
                            for (i in clientsList) {
                                c = clientsList[i];
                                if (clientsByRecent && !containsClient(clientsByRecent, c)) {
                                    entityList.push(c);    
                                }
                            }

                            // Then add the recent clients
                            for (i in clientsByRecent) {
                                r = clientsByRecent[i];
                                entityList.unshift(r);
                            }

                            callback(entityList);
                        })
                    })
                }
            })
        } else {
            // This is a forced call to the api. Do not check local storage first.
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            // Clients don't exist in local storage. Need to call API
            return api('Clients', session.UserEmail, session.Token, 'GET')
            .then (function (response) {
                chrome.storage.local.set({
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
            chrome.storage.local.get(['jobsList', 'jobsByRecent'], function (items) {
                if ('jobsList' in items) {
                    // jobs were stored locally, great!
                    var jobsList = items.jobsList.data;
                    if (jobsList != null) {
                        var jobsByRecent = [];
                        // See if the recently used were available to reorder list
                        if ('jobsByRecent' in items) {
                            jobsByRecent = items.jobsByRecent;
                        }

                        var entityList = [];
                        // First add any job not in the recent list
                        for (i in jobsList) {
                            j = jobsList[i];
                            if (jobsByRecent && !containsJob(jobsByRecent, j)) {
                                entityList.push(j);  
                            }
                        }

                        // Then add the recent jobs
                        for (i in jobsByRecent) {
                            r = jobsByRecent[i];
                            entityList.unshift(r);
                        }
                        console.log("Fetched jobs list from local storage");
                        callback(entityList);
                    } 
                } else {
                    // This is a forced call to the api. Do not check local storage first.
                    CompanyID = session.CompanyID;
                    UserID = session.UserID;
                    // Jobs don't exist in local storage. Need to call API
                    return api('Jobs', session.UserEmail, session.Token, 'GET')
                    .then (function (response) {
                        chrome.storage.local.set({
                            'jobsList' : response,
                        }, function () {
                            var jobsList = response.data;
                            var jobsByRecent = [];

                            if ('jobsByRecent' in items) {
                                jobsByRecent = items.jobsByRecent;
                            }

                            var entityList = [];
                            // First add any job not in the recent list
                            for (i in jobsList) {
                                j = jobsList[i];
                                if (jobsByRecent && !containsJob(jobsByRecent, j)) {
                                    entityList.push(j);  
                                }
                            }

                            // Then add the recent jobs
                            for (i in jobsByRecent) {
                                r = jobsByRecent[i];
                                entityList.unshift(r);
                            }
                            console.log("Set jobs list to local storage");
                            callback(entityList);
                        })
                    })
                }
            })
        } else {
            // This is a forced call to the api. Do not check local storage first.
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            return api('Jobs', session.UserEmail, session.Token, 'GET')
            .then (function (response) {
                chrome.storage.local.set({
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
            chrome.storage.local.get(['tasksList', 'tasksByRecent'], function (items) {
                if ('tasksList' in items) {
                    // tasks were stored locally, great!
                    var tasksList = items.tasksList.data;
                    if (tasksList != null) {

                        var tasksByRecent = [];
                        // See if the recently used were available to reorder list
                        if ('tasksByRecent' in items) {
                            tasksByRecent = items.tasksByRecent;
                        }

                        var entityList = [];
                        // First add any task not in the recent list
                        for (i in tasksList) {
                            t = tasksList[i];
                            if (tasksByRecent && !containsTask(tasksByRecent, t)) {
                                entityList.push(t);  
                            }
                        }

                        // Then add the recent tasks
                        for (i in tasksByRecent) {
                            r = tasksByRecent[i];
                            entityList.unshift(r);
                        }
                        console.log("Fetched tasks list from local storage");
                        callback(entityList);
                    } 
                } else {
                    // Tasks don't exist in local storage. Need to call API
                    return api('Tasks', session.UserEmail, session.Token, 'GET')
                    .then (function (response) {
                        chrome.storage.local.set({
                            'tasksList' : response,
                        }, function () {
                            var tasksByRecent = [];
                            var tasksList = response.data;
                            // See if the recently used were available to reorder list
                            if ('tasksByRecent' in items) {
                                tasksByRecent = items.tasksByRecent;
                            }

                            var entityList = [];
                            // First add any task not in the recent list
                            for (i in tasksList) {
                                t = tasksList[i];
                                if (tasksByRecent && !containsTask(tasksByRecent, t)) {
                                    entityList.push(t);  
                                }
                            }

                            // Then add the recent tasks
                            for (i in tasksByRecent) {
                                r = tasksByRecent[i];
                                entityList.unshift(r);
                            }
                            console.log("Set tasks list to local storage");
                            callback(entityList);
                        })
                    })
                }
            })
        } else {
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            return api('Tasks', session.UserEmail, session.Token, 'GET')
                .then (function (response) {
                    chrome.storage.local.set({
                        'tasksList' : response,
                    }, function () {
                        console.log("Set tasks list to local storage");
                        callback(response.data);
                    })
                })
        }
       
    }

    // Returns the User
    this.getUser = function (session, checkLocal, callback) {
        if (checkLocal) {
            chrome.storage.local.get('user', function (items) {
                if ('user' in items) {
                    var user = items.user.data;

                    if (user != null) {
                        console.log("Fetched user object from local storage");
                        callback(user);
                    }
                } else {
                    // User doesn't exist in local storage. Need to call API.
                    return api('User', session.UserEmail, session.Token, 'GET')
                    .then(function (response) {
                        chrome.storage.local.set({
                            'user' : response,
                        }, function () {
                            var user = response.data;
                            console.log("Set user object to local storage");
                            callback(user);
                        })
                    })
                }
            })
        } else {
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            return api('User', session.UserEmail, session.Token, 'GET')
            .then(function (response) {
                chrome.storage.local.set({
                    'user' : response,
                }, function () {
                    var user = response.data;
                    console.log("Set user object to local storage");
                    callback(user);
                })
            })
        }
    }

    // Returns the Company
    this.getCompany = function (session, checkLocal, callback) {
        if (checkLocal) {
            chrome.storage.local.get('company', function (items) {
                if ('company' in items) {
                    var company = items.company.data;

                    if (company != null) {
                        console.log("Fetched company object from local storage");
                        callback(company);
                    }
                } else {
                    // Compnay doesn't exist in local storage. Need to call API.
                    return api('Company', session.UserEmail, session.Token, 'GET')
                    .then(function (response) {
                        chrome.storage.local.set({
                            'company' : response,
                        }, function () {
                            var company = response.data;
                            console.log("Set company object to local storage");
                            callback(company);
                        })
                    })
                }
            })
        } else {
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            return api('Company', session.UserEmail, session.Token, 'GET')
            .then(function (response) {
                chrome.storage.local.set({
                    'company' : response,
                }, function () {
                    var company = response.data;
                    console.log("Set company object to local storage");
                    callback(company);
                })
            })
        }
    }

   

    // Returns true iff list contains the client object.
    var containsClient = function (list, client) {
        for (i in list) {
            var c = list[i];
            if (c.ClientID == client.ClientID) {
                return true;
            }
        }
        return false;
    }

    // Returns true iff list contains the job object.
    var containsJob = function (list, job) {
        for (i in list) {
            var j = list[i];
            if (j.JobID == job.JobID) {
                return true;
            }
        }
        return false;
    }

    // Returns true iff list contains the task object.
    var containsTask = function (list, task) {
        for (i in list) {
            var t = list[i];
            if (t.TaskID == task.TaskID) {
                return true;
            }
        }
        return false;
    }

    // Returns the index of the client object, or -1 if it doesn't exist.
    var indexOfClient = function (list, client) {
        for (i in list) {
            var c = list[i];
            if (c.ClientID == client.ClientID) {
                return i;
            }
        }
        return -1;
    }

     // Returns the index of the job object, or -1 if it doesn't exist.
    var indexOfJob = function (list, job) {
        for (i in list) {
            var j = list[i];
            if (j.JobID == job.JobID) {
                return i;
            }
        }
        return -1;
    }

    // Returns the index of the task object, or -1 if it doesn't exist.
    var indexOfTask = function (list, task) {
        for (i in list) {
            var t = list[i];
            if (t.TaskID == task.TaskID) {
                return i;
            }
        }
        return -1;
    }

    // Update recently used list in local storage when saving a time entry
    this.updateRecentEntities = function (timeEntry) {
        var task = timeEntry.task;
        var client = timeEntry.client;
        var job = timeEntry.job;


        //// Caching the most recent ////
        // Get caches from local storage and update them
        chrome.storage.local.get(['clientsByRecent', 'jobsByRecent', 'tasksByRecent'], function (items) {
            
            var clientsByRecent = [];
            var tasksByRecent = [];
            var jobsByRecent = [];

            if ('clientsByRecent' in items) {
                clientsByRecent = items.clientsByRecent;
            }

            cindex = indexOfClient(clientsByRecent, client);
            if (cindex != -1) {
                clientsByRecent.splice(cindex, 1);
            }

            clientsByRecent.push(angular.copy(client));


            if ('jobsByRecent' in items) {
                jobsByRecent = items.jobsByRecent;
            }

            jindex = indexOfJob(jobsByRecent, job);
            if (jindex != -1) {
                jobsByRecent.splice(jindex, 1);
            }

            jobsByRecent.push(angular.copy(job));

            if ('tasksByRecent' in items) {
                tasksByRecent = items.tasksByRecent;
            }

            tindex = indexOfTask(tasksByRecent, task);
            if (tindex != -1) {
                tasksByRecent.splice(tindex, 1);
            }

            tasksByRecent.push(angular.copy(task));


            chrome.storage.local.set({
                'clientsByRecent' : clientsByRecent,
                'jobsByRecent' : jobsByRecent,
                'tasksByRecent' : tasksByRecent
            }, function () {
                console.log("Saved most recent lists to local storage");
            })
        })

       
    }

})
