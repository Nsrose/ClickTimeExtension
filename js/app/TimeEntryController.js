myApp.controller("TimeEntryController", ['$scope', '$q', '$interval', '$location', 'APIService', 'CTService', 'EntityService', 'TimeEntryService', '$http', function ($scope, $q, $interval, $location, APIService, CTService, EntityService, TimeEntryService, $http) {
    // if(navigator.onLine) {
    $scope.variables = [];
    $scope.UserName = null;
    $scope.UserID = null;

    //Company custom terms
    $scope.customTerms = {};
   

    $scope.HasEmptyEntities = false;
    // if true, indicate to user that they can set default time entry method in extension options
    $scope.showOptionsMessage = false;

    $scope.runningStopwatch = false;
    $scope.abandonedStopwatch = false;

    //// Interface logic ////

    // Update in progress entry notes
    $scope.updateNotes = function() {
        TimeEntryService.updateInProgressEntry("Comment", $scope.timeEntry.Comment);
    }

    $scope.clearAllErrors = function () {
        $scope.clearError("hours");
        $scope.clearError("startEndTimes");
        $scope.clearError("activeStopwatch");
        $scope.clearError("timeEntryErrorMissingNotes");

        $scope.generalError = false;
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
        $scope.timeEntry.Hours = 0;
        $scope.timeEntry.Comment = "";
        $scope.$broadcast("clearStopwatch");
        var now = new Date();
        $scope.timeEntry.ISOStartTime = new Date(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds());
        $scope.timeEntry.ISOEndTime = new Date(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds());
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
        if ($scope.runningStopwatch && !$scope.abandonedStopwatch) {
            $scope.timeEntryErrorActiveStopwatch = true;
            return;
        }

        $scope.clearAllErrors();

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

        if ($scope.showStartEndTimes || $scope.abandonedStopwatch) {
            if (!timeEntry.ISOStartTime || !timeEntry.ISOEndTime) {
                $scope.timeEntryErrorStartEndTimesInvalid = true;
                return;
            }
            var hourDiff = (timeEntry.ISOEndTime - timeEntry.ISOStartTime) / 36e5;
            clickTimeEntry.Hours = hourDiff;
            var ISOEndTime = CTService.convertISO(timeEntry.ISOEndTime);
            var ISOStartTime = CTService.convertISO(timeEntry.ISOStartTime);
            clickTimeEntry.ISOStartTime = ISOStartTime;
            clickTimeEntry.ISOEndTime = ISOEndTime;
        }

        if ($scope.showStopwatch && !$scope.abandonedStopwatch) {
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
            $scope.successMessage = "Entry successfully uploaded at " + d.toTimeString() + ".";
            $scope.generalSuccess = true;
            $scope.$broadcast("timeEntrySuccess");
            $scope.abandonedStopwatch = false;
            $scope.pageReady = true;
            $scope.clearAllErrors();
            EntityService.updateRecentEntities(timeEntry);
        })
        .catch(function (response) {
            if (response.data == null) {
                var d = new Date();
                $scope.$broadcast("timeEntryError");
                TimeEntryService.removeInProgressEntry();
                TimeEntryService.storeTimeEntry(clickTimeEntry, function() {
                    $scope.errorMessage = 'Currently unable to upload entry. Entry saved locally at ' + d.toTimeString() + '. Your entry will be uploaded once a connection can be established';
                    $scope.generalError = true;
                })
            } else {
                $scope.errorMessage = "An unknown error occurred.";
                $scope.generalError = true;
                if (!$scope.abandonedStopwatch) {
                    $scope.$broadcast("timeEntryError");
                }   
            }
            $scope.pageReady = true;
        });
        
    }



    // True iff time entry is valid. Will also throw red error messages.
    var validateTimeEntry = function (timeEntry) {
        if (timeEntry.JobID == undefined || timeEntry.TaskID == undefined) {
            $scope.errorMessage = "Job or task cannot be empty.";
            $scope.generalError = true;
            return false;
        }

        if (timeEntry.JobID == "" || timeEntry.TaskID == "") {
            $scope.errorMessage = "Job or task cannot be empty.";
            $scope.generalError = true;
            return false;
        }

        if ($scope.user.RequireComments && (timeEntry.Comment == undefined || 
            timeEntry.Comment == "")) {
            $scope.timeEntryErrorMissingNotes = true;
            $scope.errorMessage = "Oops! Please enter some notes in order to save this entry.";
            $scope.generalError = true;
            return;
        }

        
        if ($scope.showStartEndTimes || $scope.abandonedStopwatch) {
            if (timeEntry.ISOStartTime == null || timeEntry.ISOEndTime == null) {
                $scope.timeEntryErrorStartEndTimes = true;
                return false;
            }
            var hourDiff = (timeEntry.ISOEndTime - timeEntry.ISOStartTime) / 36e5;
            if (hourDiff <=0 ) {
                $scope.timeEntryErrorStartEndTimesNegative = true;

                $scope.errorMessage = "Please enter an end time later than your start time.";
                $scope.generalError = true;
                return false;
            } else if (hourDiff > 24) {
                $scope.timeEntryErrorStartEndTimesInvalid = true;
                return false;
            }
        }

        if ($scope.showHourEntryField || $scope.showStopwatch && !$scope.abandonedStopwatch) {
            if (timeEntry.Hours == 0.00 || timeEntry.Hours == 0) {
                $scope.timeEntryErrorHoursZero = true;
                $scope.errorMessage = "Oops! Please log some time in order to save this entry.";
                $scope.generalError = true;
                return false;
            }
            if (timeEntry.Hours > 24.00 || timeEntry.Hours < 0) {
                $scope.timeEntryErrorHoursInvalid = true;
                $scope.errorMessage = "Please make sure your daily hourly total is less than 24 hours.";
                $scope.generalError = true;
                return false;
            }
        }


        
        return true;
    }

    $scope.cancelAbandonedStopwatch = function() {
        $scope.$broadcast("clearStopwatch");
        chrome.storage.sync.remove('inProgressEntry', function () {
            $scope.abandonedStopwatch = false;
            $scope.$apply();
        })
    }



    // Add an entity to the scope's time entry. Called with every selection of a dropdown.
    $scope.addEntityTimeEntry = function (entityType, entity) {
        switch (entityType) {
            case "task":
                $scope.timeEntry.task = entity;
                $scope.timeEntry.TaskID = entity.TaskID;
                TimeEntryService.updateInProgressEntry("task", $scope.timeEntry.task);
                break;
            case "jobClient":
                $scope.timeEntry.job = entity.job;
                $scope.timeEntry.JobID = entity.job.JobID;
                $scope.timeEntry.client = entity.client;
                TimeEntryService.updateInProgressEntry("client", $scope.timeEntry.client, function() {
                    TimeEntryService.updateInProgressEntry("job", $scope.timeEntry.job)
                })
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
            $scope.errorMessage = "Please enter time using only numerals and decimals.";
            $scope.generalError = true;
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

        var afterGetJobClients = function (jobClientsList) {
            $scope.jobClients = jobClientsList;
            $scope.jobClient = jobClientsList[0];
            $scope.timeEntry.job = $scope.jobClient.job;
            $scope.timeEntry.JobID = $scope.jobClient.job.JobID;
            $scope.timeEntry.client = $scope.jobClient.client;

            if ($scope.jobClients.length == 0) {
                $scope.HasEmptyEntities = true;
                $scope.jobClient = undefined;
            }
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
            $scope.customTerms = {
                'clientTermSingLow' : company.ClientTermSingular,
                'clientTermPlurLow' : company.ClientTermPlural,
                'clientTermSingHigh' : company.ClientTermSingular.capitalize(),
                'clientTermPlurHigh' : company.ClientTermPlural.capitalize(),
                'jobTermSingLow' : company.JobTermSingular,
                'jobTermPlurLow' : company.JobTermPlural,
                'jobTermSingHigh' : company.JobTermSingular.capitalize(),
                'jobTermPlurHigh' : company.JobTermPlural.capitalize(),
                'taskTermSingLow' : company.TaskTermSingular,
                'taskTermPlurLow' : company.TaskTermPlural,
                'taskTermSingHigh' : company.TaskTermSingular.capitalize(),
                'taskTermPlurHigh' : company.TaskTermPlural.capitalize(),
            }
            $scope.$parent.$broadcast("pageReady");
            $scope.$apply();
        }


       
        EntityService.getJobClients($scope.Session, false, afterGetJobClients);
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
            chrome.storage.sync.get(['defaultTimeEntryMethod', 'stopwatch'], function (items) {
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

                // Check for abandoned stopwatch
                if ('stopwatch' in items) {
                    var now = new Date();
                    var stopwatch = items.stopwatch;
                    if (stopwatch.running) {
                        if (now.getDate() - stopwatch.startDay > 0) {
                            if (now.getMonth() - stopwatch.startMonth == 0 
                                || now.getFullYear() - stopwatch.startYear == 0) {
                                $scope.abandonedStopwatch = true;
                                $scope.runningStopwatch = false;
                            }
                        }
                    }
                }
            })
        }

        var afterGetCompany = function (company) {
            $scope.company = company;
            $scope.customTerms = {
                'clientTermSingLow' : company.ClientTermSingular,
                'clientTermPlurLow' : company.ClientTermPlural,
                'clientTermSingHigh' : company.ClientTermSingular.capitalize(),
                'clientTermPlurHigh' : company.ClientTermPlural.capitalize(),
                'jobTermSingLow' : company.JobTermSingular,
                'jobTermPlurLow' : company.JobTermPlural,
                'jobTermSingHigh' : company.JobTermSingular.capitalize(),
                'jobTermPlurHigh' : company.JobTermPlural.capitalize(),
                'taskTermSingLow' : company.TaskTermSingular,
                'taskTermPlurLow' : company.TaskTermPlural,
                'taskTermSingHigh' : company.TaskTermSingular.capitalize(),
                'taskTermPlurHigh' : company.TaskTermPlural.capitalize(),
            }
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

        var afterGetJobClients = function (jobClientsList) {
            $scope.jobClients = jobClientsList;

            if ($scope.jobClients.length == 0) {
                $scope.HasEmptyEntities = true;
                $scope.jobClient = undefined;
                $scope.$apply();
            } else {
                TimeEntryService.getInProgressEntry(function (inProgressEntry) {
                    if (inProgressEntry.job != undefined) {
                        var filteredJobClients = $scope.jobClients.filter(function (jobClient) { 
                            return jobClient.job.JobID == inProgressEntry.job.JobID 
                                && jobClient.job.ClientID == inProgressEntry.client.ClientID
                                && jobClient.client.ClientID == inProgressEntry.client.ClientID;
                        })

                        if (filteredJobClients.length > 0) {
                            // If in progress entity is in the entity list
                            $scope.jobClient = filteredJobClients[0];
                            $scope.timeEntry.job = inProgressEntry.job;
                            $scope.timeEntry.JobID = inProgressEntry.JobID;
                            $scope.timeEntry.client = inProgressEntry.client;
                            $scope.$apply();
                            return;
                        }           
                    } 
                    // No in progress entity
                    $scope.jobClient = $scope.jobClients[0];
                    $scope.timeEntry.job = $scope.jobClient.job;
                    $scope.timeEntry.JobID = $scope.jobClient.job.JobID;
                    $scope.timeEntry.client = $scope.jobClient.client;
                    TimeEntryService.updateInProgressEntry("job", $scope.jobClient.job, function () {
                        TimeEntryService.updateInProgressEntry("client", $scope.jobClient.client);
                    });
                    $scope.$apply();
                
                })
            }

            
        }
        EntityService.getJobClients(session, true, afterGetJobClients);
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
