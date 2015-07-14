myApp.controller("TimeEntryController", ['$scope', '$q', '$interval', '$location', 'APIService', 'CTService', 'EntityService', 'TimeEntryService', '$http', function ($scope, $q, $interval, $location, APIService, CTService, EntityService, TimeEntryService, $http) {
    // if(navigator.onLine) {
    $scope.variables = [];
    $scope.UserName = null;
    $scope.UserID = null;
   
    $scope.jobsList = null;
    $scope.HasEmptyEntities = false;
    // if true, indicate to user that they can set default time entry method in extension options
    $scope.showOptionsMessage = false;

    $scope.runningStopwatch = false;

    //// Interface logic ////

    // Watch for a clientID change in the dropdown to show available jobs
    $scope.$watch('client.ClientID', function (clientID) {
        if ($scope.jobsList) {
            $scope.jobs = $scope.jobsList.filter(function (job) {return job.ClientID == clientID});
            $scope.job = $scope.jobs[0];
            $scope.timeEntry.job = $scope.job;
            $scope.timeEntry.JobID = $scope.job.JobID;
            TimeEntryService.updateInProgressEntry("job", $scope.job);
        }
    })

    // Update in progress entry notes
    $scope.updateNotes = function() {
        TimeEntryService.updateInProgressEntry("Comment", $scope.timeEntry.Comment);
    }

    $scope.clearAllErrors = function () {
        $scope.clearError("hours");
        $scope.clearError("startEndTimes");
        $scope.clearError("activeStopwatch");
        $scope.clearError("timeEntryErrorMissingNotes");
    }

    $scope.clearError = function (error) {
        switch (error) {
            case "hours":
                $scope.timeEntryErrorHoursZero = false;
                $scope.timeEntryErrorHoursInvalid = false;
                $scope.timeEntryErrorHoursNumeral = false;
                break;
            case "startEndTimes":
                $scope.timeEntryErrorStartEndTimes = false;
                break;
            case "activeStopwatch":
                $scope.timeEntryErrorActiveStopwatch = false;
                break;
            case "timeEntryErrorMissingNotes":
                $scope.timeEntryErrorMissingNotes = false;
                break;
            default:
                break;
        }
    }

    $scope.$on("timeEntryError", function() {
        chrome.storage.sync.remove('stopwatch');
    })

    $scope.$on("timeEntrySuccess", function() {
        $scope.clearError('hours');
        $scope.clearError('startEndTimes');
    })

    $scope.$on("stoppedStopwatch", function() {
        $scope.clearError('activeStopwatch');
    })

    
    //////////////////////////////////////////////////////////////////

    ////// Time entry ////// 

    // Time entry methods
    $scope.timeEntryMethods = ['Hours', 'Start/End Times', 'Stopwatch'];
    $scope.timeEntryMethod = $scope.timeEntryMethods[0];
    $scope.changeTimeEntryMethod = function (timeEntryMethod) {
    	switch (timeEntryMethod) {
    		case "Hours":
    			$scope.showHourEntryField = true;
    			$scope.showStopwatch = false;
    			$scope.showStartEndTimes = false;
    			break;
    		case "Start/End Times":
    			$scope.showHourEntryField = false;
    			$scope.showStartEndTimes = true;
    			$scope.showStopwatch = false;
    			break;
    		case "Stopwatch":
    			$scope.showHourEntryField = false;
    			$scope.showStartEndTimes = false;
    			$scope.showStopwatch = true;
    			break;
    		default:
    			bootbox.alert("Invalid time entry method");
    			break;
    	}
    }

    $scope.saveTimeEntry = function (session, timeEntry) {
        if ($scope.runningStopwatch) {
            $scope.timeEntryErrorActiveStopwatch = true;
            return;
        }

        console.log($scope.job);
        console.log($scope.timeEntry.job);

        var clickTimeEntry = {
            "BreakTime" : timeEntry.BreakTime,
            "Comment" : timeEntry.Comment,
            "Date" : timeEntry.Date,
            "JobID" : timeEntry.JobID,
            "PhaseID" : timeEntry.PhaseID,
            "SubPhaseID" : timeEntry.SubPhaseID,
            "TaskID" : timeEntry.TaskID,
            "job" : timeEntry.job,
            "task" : timeEntry.task,
            "client" : timeEntry.client
        }
      
        if ($scope.showHourEntryField) {
            clickTimeEntry.Hours = timeEntry.Hours;
        }

        if ($scope.showStartEndTimes) {
            var hourDiff = (timeEntry.ISOEndTime - timeEntry.ISOStartTime) / 36e5;
            clickTimeEntry.Hours = hourDiff;
            var ISOEndTime = CTService.convertISO(timeEntry.ISOEndTime);
            var ISOStartTime = CTService.convertISO(timeEntry.ISOStartTime);
            clickTimeEntry.ISOStartTime = ISOStartTime;
            clickTimeEntry.ISOEndTime = ISOEndTime;
        }

        if ($scope.showStopwatch) {
            var hrs = parseInt($("#hrs").text());
            var min = parseInt($("#min").text());
            var sec = parseInt($("#sec").text());
            clickTimeEntry.Hours = CTService.compileHours(hrs, min, sec);
            timeEntry.Hours = clickTimeEntry.Hours;
        }
        
        if (!validateTimeEntry(timeEntry)) {
            console.log(timeEntry);
            $scope.$broadcast("timeEntryError");
            return;
        }

        $scope.pageReady = false;
        TimeEntryService.saveTimeEntry(session, clickTimeEntry)
        .then(function (response) {
            var d = new Date();
            TimeEntryService.removeInProgressEntry();
            bootbox.alert("Entry successfully uploaded at " + d.toTimeString() + ".");
            $scope.$broadcast("timeEntrySuccess");
            $scope.pageReady = true;
        })
        .catch(function (response) {
            if (response.data == null) {
                var d = new Date();
                $scope.$broadcast("timeEntryError");
                TimeEntryService.removeInProgressEntry();
                TimeEntryService.storeTimeEntry(clickTimeEntry, function() {
                    bootbox.alert('Currently unable to upload entry. Entry saved locally at ' + d.toTimeString() + '. Your entry will be uploaded once a connection can be established'); 
                }) 
            } else {
                bootbox.alert("An error occured.");
                $scope.$broadcast("timeEntryError");
            }
            $scope.pageReady = true;
        });
        EntityService.updateRecentEntities(timeEntry);
    }



    // True iff time entry is valid. Will also throw red error messages.
    var validateTimeEntry = function (timeEntry) {
        if (timeEntry.JobID == undefined || timeEntry.TaskID == undefined) {
            bootbox.alert("Job or task cannot be empty.");
            return false;
        }

        if (timeEntry.JobID == "" || timeEntry.TaskID == "") {
            bootbox.alert("Job or task cannot be empty.");
            return false;
        }

        if ($scope.user.RequireComments && (timeEntry.Comment == undefined || 
            timeEntry.Comment == "")) {
            $scope.timeEntryErrorMissingNotes = true;
            return;
        }

        
        if ($scope.showStartEndTimes) {
            if (timeEntry.ISOStartTime == null || timeEntry.ISOEndTime == null) {
                $scope.timeEntryErrorStartEndTimes = true;
                return false;
            }
            var hourDiff = (timeEntry.ISOEndTime - timeEntry.ISOStartTime) / 36e5;
            if (hourDiff <=0 ) {
                $scope.timeEntryErrorStartEndTimesNegative = true;
                return false;
            } else if (hourDiff > 24) {
                $scope.timeEntryErrorStartEndTimesInvalid = true;
                return false;
            }
        }

        if ($scope.showHourEntryField || $scope.showStopwatch) {
            if (timeEntry.Hours == 0.00 || timeEntry.Hours == 0) {
                $scope.timeEntryErrorHoursZero = true;
                return false;
            }
            if (timeEntry.Hours > 24.00 || timeEntry.Hours < 0) {
                $scope.timeEntryErrorHoursInvalid = true;
                return false;
            }
        }


        
        return true;
    }



    // Add an entity to the scope's time entry. Called with every selection of a dropdown.
    $scope.addEntityTimeEntry = function (entityType, entity) {
        switch (entityType) {
            case "client":
                $scope.timeEntry.client = entity;
                $scope.timeEntry.job = $scope.job;
                $scope.timeEntry.JobID = $scope.job.JobID;
                TimeEntryService.updateInProgressEntry("client", $scope.timeEntry.client, function() {
                    TimeEntryService.updateInProgressEntry("job", $scope.job);
                });
                break;
            case "job":
                $scope.timeEntry.job = entity;
                $scope.timeEntry.JobID = entity.JobID;
                TimeEntryService.updateInProgressEntry("job", $scope.job);
                break;
            case "task":
                $scope.timeEntry.task = entity;
                $scope.timeEntry.TaskID = entity.TaskID;
                TimeEntryService.updateInProgressEntry("task", $scope.timeEntry.task);
                break;
            default:
                bootbox.alert("Improper entity of type: " + entityType);
                break;
        }
    }

    // Returns true iff the stopwatch should be shown for this user.
    var showStopwatch = function () {
        if ($scope.user != null) {
            return $scope.user.RequireStopwatch;    
        }
        bootbox.alert("Need to get user before calling showStopwatch");
    }

    // Returns true iff start and end time fields should be shown for this user.
    // True iff start and end times are required AND the stopwatch shouldn't be shown.
    var showStartEndTimes = function() {
        if ($scope.user != null) {
            return !$scope.showStopwatch && $scope.user.RequireStartEndTime;
        }
        bootbox.alert("Need to get user before calling showStartEndTimes");
    }

    // Returns true iff the regular hour entry field should be shown for this user.
    var showHourEntryField = function() {
        if ($scope.user != null) {
            return !$scope.showStopwatch && !$scope.showStartEndTimes;
        }
        bootbox.alert("Need to get user before calling showHourEntryField");
    }

    // Round hour inputs
    $scope.roundHour = function (time, timeToIncrement) {
        if (!CTService.isNumeric(time)) {
            $scope.timeEntryErrorHoursNumeral = true;
            return;
        }
        if (time) {
            $scope.timeEntry.Hours = CTService.roundToNearest(time, timeToIncrement);
            TimeEntryService.updateInProgressEntry('Hours', $scope.timeEntry.Hours, function () {
                TimeEntryService.updateInProgressEntry('inProgress', true);
            });
        }
        
    }

    ////////////////////////////




    // Logout function
    $scope.logout = function() {
        chrome.storage.sync.remove(CHROME_SYNC_STORAGE_VARS);
        chrome.storage.local.remove(CHROME_LOCAL_STORAGE_VARS, function () {
            chrome.browserAction.setBadgeText({text:""});
            bootbox.alert("Logged out.");
            $location.path("/login");
            $scope.$apply();
        })

    }

    // Refresh function
    // This forces an API call for the jobs, clients, and tasks dropdown menus
    $scope.refresh = function() {
        console.log("Fetching the most recent data from Clicktime");
        $scope.clearAllErrors();
        $scope.$parent.$broadcast("pageLoading");

        TimeEntryService.removeInProgressEntry();
        var afterGetClients = function (clientsList) {
            $scope.clients = clientsList;
            if (clientsList.length == 0) {
                $scope.HasEmptyEntities = true;
            }
            $scope.client = clientsList[0];
            $scope.timeEntry.client = $scope.client;
            $scope.$apply();
        }

        var afterGetJobs = function (jobsList) {
            if ($scope.client) {
                $scope.jobs = jobsList.filter(function (job) { return job.ClientID == $scope.client.ClientID})
            } else {
                 $scope.jobs = jobsList;
            }

            // Extra assign to global jobsList variable, which will always contain the full jobsList
            $scope.jobsList = jobsList;
            ///////

            if ($scope.jobs.length == 0) {
                $scope.HasEmptyEntities = true;
            }
            $scope.job = $scope.jobs[0];
            $scope.timeEntry.job = $scope.job;
            $scope.timeEntry.JobID = $scope.job.JobID;
            $scope.$apply();
        }

        var afterGetTasks = function (tasksList) {
            $scope.tasks = tasksList;
            if (tasksList.length == 0) {
                $scope.HasEmptyEntities = true;
            }
            $scope.task = tasksList[0];
            $scope.timeEntry.task = $scope.task;
            $scope.timeEntry.TaskID = $scope.task.TaskID;
            $scope.$apply();
        }

        var afterGetUser = function (user) {
            $scope.user = user;
            $scope.$apply();
        }

        var afterGetCompany = function (company) {
            $scope.company = company;
            $scope.$parent.$broadcast("pageReady");
            $scope.$apply();
        }


        EntityService.getClients($scope.Session, false, afterGetClients);
        EntityService.getJobs($scope.Session, false, afterGetJobs);
        EntityService.getTasks($scope.Session, false, afterGetTasks);
        EntityService.getUser($scope.Session, false, afterGetUser);
        EntityService.getCompany($scope.Session, false, afterGetCompany);
    }

  

    ///// ONLOAD: This will get executed upon opneing the chrome extension. /////////
    
    // Get the session of the user from storage.
    var afterGetSession = function (session) {
        $scope.$parent.Session = session;
        $scope.variables.push('session');
        
        // Default empty entry
        var dateString = CTService.getDateString();
        var now = new Date();
        $scope.timeEntry = {
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

        TimeEntryService.getInProgressEntry(function (inProgressEntry) {
            $scope.timeEntry.Comment = inProgressEntry.Comment;
            TimeEntryService.updateInProgressEntry('Date', $scope.timeEntry.Date);
        })
       
        $scope.IsManagerOrAdmin = EntityService.SecurityLevel == 'manager'
            || EntityService.SecurityLevel == 'admin';

        $scope.HasEmptyEntities = false;

        var afterGetClients = function (clientsList) {
            $scope.clients = clientsList;
            if (clientsList.length == 0) {
                $scope.HasEmptyEntities = true;
            }
            TimeEntryService.getInProgressEntry(function (inProgressEntry) {
                if (inProgressEntry.client != undefined) {
                    var filteredClients = $scope.clients.filter(function (client) { 
                        return client.ClientID == inProgressEntry.client.ClientID
                    })

                    if (filteredClients.length > 0) {
                        // If in progress entity is in the entity list
                        $scope.client = filteredClients[0];
                        $scope.timeEntry.client = inProgressEntry.client;
                        $scope.variables.push('clients');
                        $scope.$apply();
                        return;
                    }           
                } 
                // No in progress entity
                $scope.client = clientsList[0];
                $scope.timeEntry.client = $scope.client;
                TimeEntryService.updateInProgressEntry("client", $scope.client);
                $scope.variables.push('clients');
                $scope.$apply();
            })
        }

        var afterGetJobs = function (jobsList) {
            if ($scope.client) {
                $scope.jobs = jobsList.filter(function (job) { return job.ClientID == $scope.client.ClientID})
            } else {
                 $scope.jobs = jobsList;
            }

            // Extra assign to global jobsList variable, which will always contain the full jobsList
            $scope.jobsList = jobsList;
            ///////

            if ($scope.jobs.length == 0) {
                $scope.HasEmptyEntities = true;
                $scope.job = undefined;
                $scope.variables.push('jobs');
                $scope.$apply();
            } else {
               TimeEntryService.getInProgressEntry(function (inProgressEntry) {
                if (inProgressEntry.job != undefined) {
                    var filteredJobs = $scope.jobs.filter(function (job) { 
                        return job.JobID == inProgressEntry.job.JobID
                    })

                    if (filteredJobs.length > 0) {
                        // If in progress entity is in the entity list
                        $scope.job = filteredJobs[0];
                        $scope.timeEntry.job = inProgressEntry.job;
                        $scope.timeEntry.JobID = inProgressEntry.JobID;
                        $scope.variables.push('jobs');
                        $scope.$apply();
                        return;
                    }           
                } 
                // No in progress entity
                $scope.job = $scope.jobs[0];
                $scope.timeEntry.job = $scope.job;
                $scope.timeEntry.JobID = $scope.job.JobID;
                TimeEntryService.updateInProgressEntry("job", $scope.job);
                $scope.variables.push('jobs');
                $scope.$apply();
            
            })
                
            }
           
        }

        var afterGetTasks = function (tasksList) {
            $scope.tasks = tasksList;
            if (tasksList.length == 0) {
                $scope.HasEmptyEntities = true;
            }
            TimeEntryService.getInProgressEntry(function (inProgressEntry) {
                if (inProgressEntry.task != undefined) {
                    var filteredTasks = $scope.tasks.filter(function (task) { 
                        return task.TaskID == inProgressEntry.task.TaskID
                    })

                    if (filteredTasks.length > 0) {
                        // If in progress entity is in the entity list
                        $scope.task = filteredTasks[0];
                        $scope.timeEntry.task = inProgressEntry.task;
                        $scope.timeEntry.TaskID = inProgressEntry.TaskID;
                        $scope.variables.push('tasks');
                        $scope.$apply();
                        return;
                    }           
                } 
                // No in progress entity
                $scope.task = tasksList[0];
                $scope.timeEntry.task = $scope.task;
                $scope.timeEntry.TaskID = $scope.task.TaskID;
                TimeEntryService.updateInProgressEntry("task", $scope.task);
                $scope.variables.push('tasks');
                $scope.$apply();
            
            })
            
        }

        var afterGetUser = function (user) {
            $scope.user = user;
            $scope.variables.push('user');
            $scope.$apply();

             // Set the default time entry method
            chrome.storage.sync.get('defaultTimeEntryMethod', function (items) {
                if ('defaultTimeEntryMethod' in items) {
                    $scope.timeEntryMethod = items.defaultTimeEntryMethod;
                    $scope.changeTimeEntryMethod(items.defaultTimeEntryMethod);
                    if ($scope.timeEntryMethod == "Hours") {
                        TimeEntryService.getInProgressEntry(function (inProgressEntry) {
                            $scope.timeEntry.Hours = inProgressEntry.Hours;
                        })
                    }
                    $scope.$apply();
                } else {
                    $scope.showOptionsMessage = true;
                    $scope.$apply();  
                }
            })
        }

        var afterGetCompany = function (company) {
            $scope.company = company;
            $scope.variables.push('company');
            $scope.$apply();
            $scope.$parent.$broadcast("pageReady"); 

        }

        var afterGetTimeEntries = function (timeEntries) {
            

            var totalHours = 0;
            var timeEntries = timeEntries[0].TimeEntries;
            var arrayLength = timeEntries.length;
            for (var i = 0; i < arrayLength; i++) {
                totalHours += timeEntries[i].Hours;
            }
            $scope.totalHours = totalHours;
        }

        EntityService.getClients(session, true, afterGetClients);
        EntityService.getJobs(session, true, afterGetJobs);
        EntityService.getTasks(session, true, afterGetTasks);
        EntityService.getUser(session, true, afterGetUser);
        EntityService.getCompany(session, true, afterGetCompany);
        EntityService.getTimeEntries(session, afterGetTimeEntries);
    }
    EntityService.getSession(afterGetSession);

    var offlineBox;
    window.addEventListener('offline', function(e) {
        offlineBox = bootbox.dialog({
            message: "We're sorry, you don't appear to have an internet connection. Please try again when you have connectivity.",       
            show: true,
            backdrop: true,
            closeButton: false,
            animate: true,
            className: "no-internet-modal",
        });
    }, false);
    
    setInterval(function(){ 
        window.addEventListener('online', function(e) {
            offlineBox.modal('hide');
        }, false);
    }, 3000);

    
}])
