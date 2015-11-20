// Services for accessing entities
// These will only work once the session is open
myApp.service('EntityService', function ($http, APIService, CTService, $apiBase, $q) {
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
    this.getSession = function () {
        var deferred = $q.defer();     
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
                    baseURL = $apiBase.url + "Companies/" + CompanyID + "/Users/" + UserID;
                    deferred.resolve(session);
                } else {
                    // error: Session couldn't be found
                    deferred.reject();
                }
            } else {
                // error: Session couldn't be found
                deferred.reject();
            }
        })
        return deferred.promise;
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
            url = $apiBase.url + "Companies/" + CompanyID;
        }

        if (entity == 'Jobs') {
            url += "?withChildIDs=true";
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

    this.getTimeEntries = function (session) {
        var deferred = $q.defer();
        CompanyID = session.CompanyID;
        UserID = session.UserID;
        isodate = getIsoDate();
        url = $apiBase.url + "Companies/" + CompanyID + "/Users/" + UserID + "/TimeEntries";
        APIService.apiCall(url, session.UserEmail, session.Token, 'GET')
            .then(function (response) {
                deferred.resolve(response.data)
            })
        return deferred.promise;
    }

    // Get tasks list for this session and save to local storage
    // Calls the callback on the tasksList
    this.getTasks = function (session, checkLocal) {
        var deferred = $q.defer();
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
                        deferred.resolve(entityList)
                    } 
                } else {
                    // Tasks don't exist in local storage. Need to call API
                    api('Tasks', session.UserEmail, session.Token, 'GET')
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
                            deferred.resolve(entityList)
                        })
                    })
                }
            })
        } else {
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            api('Tasks', session.UserEmail, session.Token, 'GET')
                .then (function (response) {
                    chrome.storage.local.set({
                        'tasksList' : response,
                    }, function () {
                        deferred.resolve(response.data)
                    })
                })
        }
        return deferred.promise;
    }

    // Sort "all" section of entitylists alphabetically
    function sorter (a, b) {
        if (a.DisplayName > b.DisplayName) {
            return 1;
        } else if (a.DisplayName == b.DisplayName) {
            return 0;
        }
        return -1;
    }

    // Get an interleaved list of client/job pairs
    this.getJobClients = function (session, checkLocal) {
        var deferred = $q.defer();
        if (checkLocal) {
            chrome.storage.local.get(['stringJobClientsList', 'jobClientsByRecent'], function (items) {
                if ('stringJobClientsList' in items) {
                    var jobClientsList = JSON.parse(items.stringJobClientsList);

                    var jobClientsByRecent = [];

                    if ('jobClientsByRecent' in items) {
                        jobClientsByRecent = items.jobClientsByRecent;
                    }

                    var entityList = [];
                    // First add any jobClient not in the recent list
                    for (j in jobClientsList) {
                        jobClient = jobClientsList[j];
                        if (jobClientsByRecent && !containsJobClient(jobClientsByRecent, jobClient)) {
                            entityList.push(jobClient);  
                        }
                    }

                    // Sort the 'all' section
                    entityList.sort(sorter);

                    // Then add the recent jobClients
                    for (i in jobClientsByRecent) {
                        r = jobClientsByRecent[i];
                        entityList.unshift(r);
                    }
                    deferred.resolve(entityList);
                } else {
                    // Job Clients don't exist in local storage. Need to call API.
                    api('Jobs', session.UserEmail, session.Token, 'GET')
                    .then(function (response) {
                        var jobsList = response.data;
                        api('Clients', session.UserEmail, session.Token, 'GET')
                        .then(function (response) {
                            var clientsList = response.data;
                            var jobClientsList = [];
                            for (i in jobsList) {
                                var job = jobsList[i];
                                for (j in clientsList) {
                                    var client = clientsList[j];
                                   
                                    if (job.ClientID == client.ClientID) {
                                        var jobClient = {
                                            'client' : client,
                                            'job' : job,
                                            'DisplayName' : client.DisplayName + " - " + job.DisplayName
                                        }
                                        jobClientsList.push(jobClient);
                                    }
                                }
                            }
                            var stringJobClientsList = JSON.stringify(jobClientsList);
                            chrome.storage.local.set({
                                'stringJobClientsList' : stringJobClientsList
                            }, function () {
                                var jobClientsByRecent = [];

                                if ('jobClientsByRecent' in items) {
                                    jobClientsByRecent = items.jobClientsByRecent;
                                }

                                var entityList = [];
                                // First add any jobClient not in the recent list
                                for (j in jobClientsList) {
                                    jobClient = jobClientsList[j];
                                    if (jobClientsByRecent && !containsJobClient(jobClientsByRecent, jobClient)) {
                                        entityList.push(jobClient);  
                                    }
                                }

                                // Sort the 'all' section
                                entityList.sort(sorter);

                                // Then add the recent jobClients
                                for (i in jobClientsByRecent) {
                                    r = jobClientsByRecent[i];
                                    entityList.unshift(r);
                                }
                                deferred.resolve(entityList)
                            })
                        })
                    })
                }
            })

        } else {
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            api('Jobs', session.UserEmail, session.Token, 'GET')
            .then(function (response) {
                var jobsList = response.data;
                api('Clients', session.UserEmail, session.Token, 'GET')
                .then(function (response) {
                    var clientsList = response.data;
                    var jobClientsList = [];
                    for (i in jobsList) {
                        var job = jobsList[i];
                        for (j in clientsList) {
                            var client = clientsList[j];
                            if (job.ClientID == client.ClientID) {
                                var jobClient = {
                                    'client' : client,
                                    'job' : job,
                                    'DisplayName' : client.DisplayName + " - " + job.DisplayName
                                }
                                jobClientsList.push(jobClient);
                            }
                        }
                    }
                    jobClientsList.sort(sorter);
                    var stringJobClientsList = JSON.stringify(jobClientsList);
                    chrome.storage.local.set({
                        'stringJobClientsList' : stringJobClientsList
                    }, function () {
                        deferred.resolve(jobClientsList)
                    })
                })
            })
        }
        return deferred.promise; 
    }

    // Returns the User
    this.getUser = function (session, checkLocal) {
        var deferred = $q.defer();     
        if (checkLocal) {
            chrome.storage.local.get('user', function (items) {
                if ('user' in items) {
                    var user = items.user.data;
                    if (user != null) {
                        deferred.resolve(user);
                    }
                } else {
                    // User doesn't exist in local storage. Need to call API.
                    api('User', session.UserEmail, session.Token, 'GET')
                    .then(function (response) {
                        chrome.storage.local.set({
                            'user' : response,
                        }, function () {
                            var user = response.data;
                            deferred.resolve(user);
                        })
                    })
                }
            })
        } else {
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            api('User', session.UserEmail, session.Token, 'GET')
            .then(function (response) {
                chrome.storage.local.set({
                    'user' : response,
                }, function () {
                    var user = response.data;
                    deferred.resolve(user);
                })
            })
        }
        return deferred.promise; 
    }

    // Returns the Company
    this.getCompany = function (session, checkLocal) {
        var deferred = $q.defer();     
        if (checkLocal) {
            chrome.storage.local.get('company', function (items) {
                if ('company' in items) {
                    var company = items.company.data;

                    if (company != null) {
                        deferred.resolve(company)
                    }
                } else {
                    // Compnay doesn't exist in local storage. Need to call API.
                    api('Company', session.UserEmail, session.Token, 'GET')
                    .then(function (response) {
                        chrome.storage.local.set({
                            'company' : response,
                        }, function () {
                            var company = response.data;
                            deferred.resolve(company)
                        })
                    })
                }
            })
        } else {
            CompanyID = session.CompanyID;
            UserID = session.UserID;
            api('Company', session.UserEmail, session.Token, 'GET')
            .then(function (response) {
                chrome.storage.local.set({
                    'company' : response,
                }, function () {
                    var company = response.data;
                    deferred.resolve(company)
                })
            })
        }
        return deferred.promise;
    }

    // Returns true iff list conatins the jobClient object.
    var containsJobClient = function (list, jobClient) {
        for (i in list) {
            var jc = list[i];
            if (jc.client.ClientID == jobClient.client.ClientID 
                && jc.job.JobID == jobClient.job.JobID
                && jc.job.ClientID == jobClient.job.ClientID) {
                return true;
            }
        }
        return false;
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

    // Returns the index of the jobClient object, or -1 if it doesn't exist.
    var indexOfJobClient = function (list, jobClient) {
        for (i in list) {
            var jc = list[i];
            if (jc.client.ClientID == jobClient.client.ClientID 
                && jc.job.JobID == jobClient.job.JobID
                && jc.job.ClientID == jobClient.job.ClientID) {
                return i;
            }
        }
        return -1;
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

        var jobClient = {
            'job' : job,
            'client' : client,
            'DisplayName' :  client.DisplayName + " - " + job.DisplayName 
        }


        //// Caching the most recent ////
        // Get caches from local storage and update them
        chrome.storage.local.get(['jobClientsByRecent', 'tasksByRecent'], function (items) {
          
            var jobClientsByRecent = [];
          
            var tasksByRecent = [];
            

            if ('jobClientsByRecent' in items) {
                jobClientsByRecent = items.jobClientsByRecent;
            }

            jcindex = indexOfJobClient(jobClientsByRecent, jobClient);
            if (jcindex != -1) {
                jobClientsByRecent.splice(jcindex, 1);
            }

            jobClientsByRecent.push(angular.copy(jobClient));

            // Keep list to 5 items
            if (jobClientsByRecent.length > 5) {
                jobClientsByRecent.splice(0, 1);
            }

            if ('tasksByRecent' in items) {
                tasksByRecent = items.tasksByRecent;
            }

            tindex = indexOfTask(tasksByRecent, task);
            if (tindex != -1) {
                tasksByRecent.splice(tindex, 1);
            }

            tasksByRecent.push(angular.copy(task));

            // Keep list to 5 items
            if (tasksByRecent.length > 5) {
                tasksByRecent.splice(0, 1);
            }

            chrome.storage.local.set({
                'jobClientsByRecent' : jobClientsByRecent,
                'tasksByRecent' : tasksByRecent
            }, function () {
                console.log("Saved most recent lists to local storage");
            })
        })

       
    }

    // Utils for entity lists to expose to TimeENtry controller
    this.hasJobClient = function (list, jobClient) {
        return containsJobClient(list, jobClient);
    }

    this.hasTask = function (list, task) {
        return containsTask(list, task);
    }

    this.hasTaskID = function (listIDs, taskID) {
        for (i in listIDs) {
            var id = listIDs[i];
            if (taskID == id) {
                return true;
            }
        }
        return false;
    }

    this.indexJobClient = function (list, jobClient) {
        return indexOfJobClient(list, jobClient);
    }

    this.indexTask = function (list, task) {
        return indexOfTask(list, task);
    }

})
