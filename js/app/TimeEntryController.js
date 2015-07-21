myApp.controller("TimeEntryController", ['$scope', '$q', '$interval', '$timeout', '$location', 'APIService', 'CTService', 'EntityService', 'TimeEntryService', '$http', 
                                function ($scope, $q, $interval, $timeout, $location, APIService, CTService, EntityService, TimeEntryService, $http) {
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

    //Default start end time display

    $scope.defaultStartEndTime = CTService.getNowString();

    /////////////////////////////////////////// Interface logic /////////////////////////////////////

    //// Handling keypress events ////

    // disable backspace (weird behavior)
    $(document).keydown(function(e) {
        if (e.which == 8) {
            return false;
        }
    })

    // start stopwatch, if there
    $(document).keypress(function(e) {
        if (e.which == 13) {
            if ($scope.showStartTimer && !$scope.runningStopwatch) {
                $("#start-stopwatch").click();
            }
        }
    })

    $("#time-entry-form-hours").keypress(function(e) {
        if (e.which == 13) {
            $("#time-entry-form-hours").blur();
            $("#save-time-entry").click();
        }
    })

    $("#time-entry-form-start").keypress(function(e) {
        if (e.which == 13) {
            $("#time-entry-form-start").blur();
            $("#time-entry-form-end").blur();
            $("#save-time-entry").click();
        }
    })

    $("#time-entry-form-end").keypress(function(e) {
        if (e.which == 13) {
            $("#time-entry-form-start").blur();
            $("#time-entry-form-end").blur();
            $("#save-time-entry").click();
        }
    })


    // Update in progress entry notes
    $scope.updateNotes = function() {
        TimeEntryService.updateInProgressEntry("Comment", $scope.timeEntry.Comment);
    }

    // Swap action button from start timer to save and vice versa.
    // input is a string representing from what input field the action
    // was called from.
    $scope.swapAction = function(input) {
        if ($scope.generalError) {
            // cannot swap action with an active error
            $scope.clearError(input);
            return;
        }
        if (
            ( $scope.showStartEndTimes &&
            ( !$scope.timeEntry.ISOStartTime
            || !$scope.timeEntry.ISOEndTime))) {
            // cannot swap action with empty fields
            return;
        }
        if ($scope.showStartTimer) {
            $scope.showStartTimer = false;
        } else {
            $scope.showStartTimer = true;
        }
    }

    $scope.showStartTimer = true;

    $scope.startStopwatch = function () {
        $scope.$broadcast("startStopwatch");
        $scope.showStartTimer = false;
    }

    $scope.stopStopwatch = function() {
        $scope.saveFromTimer = true;
        $scope.$broadcast("stopStopwatch");
        $scope.showStartTimer = true;
    }

    $scope.clearStopwatch = function() {
        $scope.$broadcast("clearStopwatch");
    }


    $scope.clearHours = function() {
        $scope.timeEntry.Hours = DEFAULT_EMPTY_HOURS;
        $scope.showStartTimer = true;
        $scope.clearAllErrors();
        TimeEntryService.removeInProgressEntry();
    }


    // Validate and round hour input field on blur.
    $scope.roundHour = function (time, timeToIncrement) {
        $scope.generalError = false;
        if (time == null) {
            $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
            return;
        }
        if (!CTService.isNumeric(time)) {
            $scope.setError("hours", "Please enter time using a valid format.");
            return;
        }
        if (time) {
            var decimalHrs = time;
            if ((decimalHrs + '').indexOf(":") != -1) {
                // HH:MM format
                decimalHrs = CTService.toDecimal(time);   
            }

            var roundedDecHrs = CTService.roundToNearestDecimal(decimalHrs, timeToIncrement);

            if (roundedDecHrs == 0) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                return;
            }
            if (roundedDecHrs > 24) {
                $scope.setError("hours", "Please make sure your daily hourly total is less than 24 hours.");
                return; 
            }
           
            var hrs = CTService.roundToNearest(time, timeToIncrement);
            $scope.timeEntry.Hours = hrs;
            if ($scope.timeEntry.Hours != DEFAULT_EMPTY_HOURS) {
                $scope.showStartTimer = false;
            }
            TimeEntryService.updateInProgressEntry('Hours', $scope.timeEntry.Hours, function () {
                TimeEntryService.updateInProgressEntry('inProgress', true);
            });
        }
        
    }

    // Validate start end times on blur.
    $scope.validateStartEndTimes = function(startTime, endTime) {
        if (!startTime || !endTime) {
            return;
        }
        if (!CTService.isTime(startTime)) {
            $scope.setError("startTime", "Please enter time using a valid format.");
        } else if (!CTService.isTime(endTime)) {
            $scope.setError("endTime", "Please enter time using a valid format.");
        } else if (CTService.toDecimal(startTime) >= CTService.toDecimal(endTime)) {
            $scope.setError("startEndTimes", "Oops! Please enter a start time later than the end time.");
        } else {
            var startTimeDecimal = CTService.toDecimal(startTime);
            var endTimeDecimal = CTService.toDecimal(endTime);
            var hourDiff = (endTimeDecimal - startTimeDecimal);
            var roundedDecHrs = CTService.roundToNearestDecimal(hourDiff, $scope.company.MinTimeIncrement);
            if (roundedDecHrs > 24) {
                $scope.setError("startEndTimes", "Please make sure your daily hourly total is less than 24 hours.");
            } else {
                $scope.generalError = false;
                $scope.showStartTimer = false; 
            }
        }
    }


    $scope.clearStartEndTimes = function() {
        $scope.timeEntry.ISOStartTime = null;
        $scope.timeEntry.ISOEndTime = null;
        $scope.showStartTimer = true;
        $scope.clearAllErrors();
        TimeEntryService.removeInProgressEntry();
    }



    $scope.clearAllErrors = function () {
        $scope.generalError = false;
        $scope.clearError("hours");
        $scope.clearError("notes");
        $scope.clearError("startTime");
        $scope.clearError("endTime");
        $scope.clearError("startEndTimes");
    }

    $scope.clearError = function (errorField) {
        switch (errorField) {
            case "hours":
                $("#time-entry-form-hours").css("border", "1px solid grey");
                break;
            case "notes":
                $("#notes-field").css("border", "1px solid grey");
                break;
            case "startTime":
                $("#time-entry-form-start").css("border", "1px solid grey");
                break;
            case "endTime":
                $("#time-entry-form-end").css("border", "1px solid grey");
                break;
            case "startEndTimes":
                $("#time-entry-form-start").css("border", "1px solid grey");
                $("#time-entry-form-end").css("border", "1px solid grey");
                break;
            case "jobClient":
                $("#jobClient-dropdown").css("border", "1px solid grey");
                break;
            case "task":
                $("#task-dropdown").css("border", "1px solid grey");
                break;
            case "activeStopwatch":
                $scope.timeEntryErrorActiveStopwatch = false;
                break;
            default:
                break;
        }
    }

    // Display an error messagen and highlight the specified field in red.
    $scope.setError = function (errorField, errorMessage) {
        $scope.errorMessage = errorMessage;
        $scope.generalError = true;
        switch (errorField) {
            case "hours":
                $("#time-entry-form-hours").css("border", "1px solid red");
                break;
            case "notes":
                $("#notes-field").css("border", "1px solid red");
                break;
            case "startTime":
                $("#time-entry-form-start").css("border", "1px solid red");
                break;
            case "endTime":
                $("#time-entry-form-end").css("border", "1px solid red");
                break;
            case "startEndTimes":
                $("#time-entry-form-start").css("border", "1px solid red");
                $("#time-entry-form-end").css("border", "1px solid red");
                break;
            case "jobClient":
                $("#jobClient-dropdown").css("border", "1px solid red");
                break;
            case "task":
                $("#task-dropdown").css("border", "1px solid red");
                break;
            default:
                break;
        }
    }  

    $scope.$on("timeEntryError", function() {
        $scope.clearStopwatch();
    })

    $scope.$on("timeEntrySuccess", function() {
        $scope.timeEntry.Hours = DEFAULT_EMPTY_HOURS;
        $scope.timeEntry.Comment = "";
        $scope.$broadcast("clearStopwatch");
        $scope.timeEntry.ISOStartTime = null;
        $scope.timeEntry.ISOEndTime = null;
        $scope.clearAllErrors();
        $scope.saveFromTimer = false;
        $scope.abandonedStopwatch = false;
        $scope.pageReady = true;
    })

    $scope.$on("stoppedStopwatch", function() {
        $scope.clearError('activeStopwatch');
    })


    $scope.elapsedHrs = 0;
    $scope.elapsedMin = 0;
    $scope.elapsedSec = 0;


    $scope.$on("updateStopwatch", function() {
        $scope.timerDisplay = $scope.elapsedHrs + ":" + $scope.elapsedMin + ":" + $scope.elapsedSec;    
    })

    // Clear an in progress entry and remove display fields
    $scope.clearTimeEntry = function() {
        if ($scope.showStartEndTimes) {
            $scope.clearStartEndTimes();
        } else if ($scope.showHourEntryField) {
            $scope.clearHours();
        }
        $scope.clearStopwatch();
    }

    
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
      
        if ($scope.showHourEntryField && !$scope.saveFromTimer) {
            if (!timeEntry.Hours) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                return;
            }
            clickTimeEntry.Hours = CTService.toDecimal(timeEntry.Hours);
        }

        if ($scope.showStartEndTimes || $scope.abandonedStopwatch) {
            if (!timeEntry.ISOStartTime || !timeEntry.ISOEndTime) {
                $scope.timeEntryErrorStartEndTimesInvalid = true;
                return;
            }
            var startTimeDecimal = CTService.toDecimal(timeEntry.ISOStartTime);
            var endTimeDecimal = CTService.toDecimal(timeEntry.ISOEndTime);
            var hourDiff = (endTimeDecimal - startTimeDecimal);
            clickTimeEntry.Hours = hourDiff;
            var ISOEndTime = CTService.convertISO(timeEntry.ISOEndTime);
            var ISOStartTime = CTService.convertISO(timeEntry.ISOStartTime);
            clickTimeEntry.ISOStartTime = ISOStartTime;
            clickTimeEntry.ISOEndTime = ISOEndTime;
        }

        if ($scope.saveFromTimer || $scope.showStopwatch && !$scope.abandonedStopwatch) {
            var hrs = $scope.elapsedHrs;
            var min = $scope.elapsedMin;
            var sec = $scope.elapsedSec;
            var compiledHours = CTService.compileHours(hrs, min, sec, $scope.company.MinTimeIncrement);
            clickTimeEntry.Hours = CTService.toDecimal(compiledHours);
            timeEntry.Hours = compiledHours;
        }
        
        if (!validateTimeEntry(timeEntry)) {
            console.log(timeEntry);
            $scope.$broadcast("timeEntryError");
            return;
        }

        // console.log(clickTimeEntry);
        // return;

        $scope.pageReady = false;
        TimeEntryService.saveTimeEntry(session, clickTimeEntry)
        .then(function (response) {
            var d = new Date();
            TimeEntryService.removeInProgressEntry();
            $scope.successMessage = "Entry successfully uploaded at " + d.toTimeString() + ".";
            $scope.generalSuccess = true;
            $scope.$broadcast("timeEntrySuccess");
            EntityService.updateRecentEntities(timeEntry);
            EntityService.getTimeEntries($scope.Session, function (timeEntries) {
                var totalHours = 0;
                var timeEntries = timeEntries[0].TimeEntries;
                var arrayLength = timeEntries.length;
                for (var i = 0; i < arrayLength; i++) {
                    totalHours += timeEntries[i].Hours;
                }
                $scope.totalHours = totalHours;
            });
        })
        .catch(function (response) {
            if (response.data == null) {
                var d = new Date();
                $scope.$broadcast("timeEntryError");
                TimeEntryService.removeInProgressEntry();
                TimeEntryService.storeTimeEntry(clickTimeEntry, function() {
                    $scope.setError(null, 'Currently unable to upload entry. Entry saved locally at ' + d.toTimeString() + '. Your entry will be uploaded once a connection can be established');
                })
            } else {
                $scope.setError(null, "An unknown error occurred.");
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
            $scope.setError("jobClient", "Job or task cannot be empty.");
            return false;
        }

        if (timeEntry.JobID == "" || timeEntry.TaskID == "") {
            $scope.setError("jobClient", "Job or task cannot be empty.");
            return false;
        }

        if ($scope.user.RequireComments && (timeEntry.Comment == undefined || 
            timeEntry.Comment == "")) {
            $scope.setError("notes", "Oops! Please enter some notes in order to save this entry.");
            return;
        }

        
        if ($scope.showStartEndTimes || $scope.abandonedStopwatch) {
            if (timeEntry.ISOStartTime == null) {
                $scope.setError("startTime", "Oops! Please enter a start time to save this entry.");
                return false;
            }
            if (timeEntry.ISOEndTime == null) {
                $scope.setError("endTime", "Oops! Please enter an end time to save this entry.");
                return false;
            }
            var hourDiff = (timeEntry.ISOEndTime - timeEntry.ISOStartTime) / 36e5;
            if (hourDiff <=0 ) {
                $scope.setError("startEndTimes",  "Please enter an end time later than your start time.");
                return false;
            } else if (hourDiff > 24) {
                $scope.setError("startEndTimes",  "Please make sure your daily hourly total is less than 24 hours.");
                return false;e;
            }
        }

        if ($scope.showHourEntryField || $scope.showStopwatch && !$scope.abandonedStopwatch
            && !$scope.saveFromTimer) {
            if (timeEntry.Hours == DEFAULT_EMPTY_HOURS || timeEntry.Hours == 0) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                return false;
            }
            if (timeEntry.Hours > 24.00 || timeEntry.Hours < 0) {
                $scope.setError("hours", "Please make sure your daily hourly total is less than 24 hours.");
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
        $scope.timeEntry = {
            "BreakTime":0.00,
            "Comment":"",
            "Date":dateString,
            "Hours":DEFAULT_EMPTY_HOURS,
            "ISOEndTime":null,
            "ISOStartTime":null,
            "JobID":"",
            "PhaseID":"",
            "SubPhaseID":null,
            "TaskID":""
        }

        TimeEntryService.getInProgressEntry(function (inProgressEntry) {
            $scope.timeEntry.Comment = inProgressEntry.Comment;
            if (inProgressEntry.Hours != DEFAULT_EMPTY_HOURS) {
                $scope.showStartTimer = false;
            }
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
