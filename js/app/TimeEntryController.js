myApp.controller("TimeEntryController", ['$scope', '$q', '$interval', '$timeout', '$location', 'APIService', 'CTService', 'EntityService', 'TimeEntryService', 'StopwatchService', '$http', 
                                function ($scope, $q, $interval, $timeout, $location, APIService, CTService, EntityService, TimeEntryService, StopwatchService, $http) {
    $scope.variables = [];
    $scope.UserName = null;
    $scope.UserID = null;

    //Company custom terms
    $scope.customTerms = {};

    // True iff saving is in progress
    $scope.saving = false;

    // Client, job, or task is empty in db
    $scope.HasEmptyEntities = false;
    // if true, indicate to user that they can set default time entry method in extension options
    $scope.showOptionsMessage = false;

    $scope.runningStopwatch = false;
    $scope.abandonedStopwatch = false;

    $scope.settingsPage = function () {
        $location.path("/settings");
    }

    $scope.testError = function() {
        APIService.reportError($scope.Session.UserEmail,
            $scope.Session.Token,
            {'Message' : 'Hey there I am an error',
                'DeviceName' : 'Chrome Ext',
                'DevicePlatform': 'GOogle chrome'
            });
    }

    //// Interface logic ////
    //Default start end time display

    $scope.defaultStartEndTime = CTService.getNowString();

    /////////////////////////////////////////// Interface logic /////////////////////////////////////

    //// Handling keypress events ////

    // disable backspace (weird behavior)
    // $(document).keydown(function(e) {
    //     if (e.which == 8) {
    //         return false;
    //     }
    // })

    // start stopwatch, if there
    $(document).keypress(function(e) {
        if (e.which == 13) {
            if ($scope.showStartTimer && !$scope.runningStopwatch) {
                $("#start-stopwatch").click();
            } else if ($scope.runningStopwatch) {
                $scope.stopStopwatch();
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
        if ($scope.timeEntry.Comment && $scope.timeEntry.Comment != "") {
            $scope.clearError("notes");
            TimeEntryService.updateInProgressEntry("Comment", $scope.timeEntry.Comment);
        }
        
    }

    // Focus on notes
    $scope.focusNotes = function() {
        $scope.clearError("notes");
        TimeEntryService.getInProgressEntry(function (inProgressEntry) {
            if (!inProgressEntry.Hours) {
                $scope.showStartTimer = true;
                $scope.$apply();
            } else {
                $scope.showStartTimer = false;
                $scope.$apply();
            }
        })
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
        if ($scope.showHourEntryField && $scope.timeEntry.Hours) {
            // Cannot swap action if user has entered hours
            return;
        }
        if ($scope.showStartEndTimes) {
            if ($scope.showStartTimer) {
                $scope.showStartTimer = false;
                return;
            }
            return;
        }
        // if (
        //     ( $scope.showStartEndTimes &&
        //     ( !$scope.timeEntry.ISOStartTime
        //     || !$scope.timeEntry.ISOEndTime))) {
        //     // cannot swap action with empty fields
        //     return;
        // }
        if ($scope.showStartTimer) {
            $scope.showStartTimer = false;
        } else {
            $scope.showStartTimer = true;
        }
    }

    $scope.showStartTimer = true;
     // For the stopwatch display on start/end times:
    $scope.endTimePromise = undefined;

    $scope.startStopwatch = function () {
        $scope.showStartTimer = false;
        // if ($scope.user.RequireComments
        //     && (!$scope.timeEntry.Comment
        //         || $scope.timeEntry.Comment == "")) {
        //     $scope.setError("notes", "Oops! Please enter some notes in order to start this timer.")
        //     return;
        // }
        if ($scope.showHourEntryField) {
            $scope.$broadcast("startStopwatch");
        } else {
            $scope.noValidateStartEndTimes = true;
            $scope.$broadcast("startStopwatch");
            $scope.timeEntry.ISOStartTime = CTService.getNowString();
            $scope.timeEntry.ISOEndTime = CTService.getNowString();
            TimeEntryService.updateInProgressEntry('startEndTimes',
                    [$scope.timeEntry.ISOStartTime, $scope.timeEntry.ISOEndTime]);
            $scope.endTimePromise = $interval(function() {
                $scope.timeEntry.ISOEndTime = CTService.getNowString();
                TimeEntryService.updateInProgressEntry('startEndTimes',
                    [$scope.timeEntry.ISOStartTime, $scope.timeEntry.ISOEndTime]);
            }, 60000);
        }
       
    }

    $scope.stopStopwatch = function() {
        $scope.saveFromTimer = true;
        $scope.$broadcast("stopStopwatch");
        $scope.showStartTimer = true;
        $scope.noValidateStartEndTimes = false;
        $scope.saveTimeEntry($scope.Session, $scope.timeEntry);
    }

    $scope.clearStopwatch = function() {
        $scope.$broadcast("clearStopwatch");
        $scope.timerDisplay = "00:00:00";
        $interval.cancel($scope.endTimePromise);
    }

    $scope.saveAbandonedStopwatch = function() {
        $scope.saveTimeEntry($scope.Session, $scope.timeEntry);
    }

    $scope.$on("stoppedStopwatch", function() {
        $scope.clearError('activeStopwatch');
    })


    $scope.elapsedHrs = 0;
    $scope.elapsedMin = 0;
    $scope.elapsedSec = 0;

   

    $scope.$on("updateStopwatch", function() {
        $scope.timerDisplay = $scope.elapsedHrs + ":" + $scope.elapsedMin + ":" + $scope.elapsedSec;    
    })


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
            $scope.showStartTimer = true;
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
        if ($scope.noValidateStartEndTimes) {
            // don't validate if saving from timer
            return;
        }
        if (!startTime && !endTime) {
            $scope.showStartTimer = true;
            return;
        }
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
                $scope.clearError('startEndTimes');
                $scope.showStartTimer = false;
                TimeEntryService.updateInProgressEntry('startEndTimes', [startTime, endTime]);
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
        $scope.clearError("jobClient");
        $scope.clearError("task");
    }

    $scope.clearError = function (errorField) {
        $scope.generalError = false;
        switch (errorField) {
            case "hours":
                $("#time-entry-form-hours").css("border", "1px solid #bcbcbc");
                $("#time-entry-field-hours-title").css("color", "black");
                break;
            case "notes":
                $("#notes-field").css("border", "1px solid #bcbcbc");
                $("#fieldtitle-notes").css("color", "black");
                break;
            case "startTime":
                $("#time-entry-form-start").css("border", "1px solid #bcbcbc");
                $("#time-entry-form-start-title").css("color", "black");
                break;
            case "endTime":
                $("#time-entry-form-end").css("border", "1px solid #bcbcbc");
                $("#time-entry-form-end-title").css("color", "black");
                break;
            case "startEndTimes":
                $("#time-entry-form-start").css("border", "1px solid #bcbcbc");
                $("#time-entry-form-end").css("border", "1px solid #bcbcbc");
                $("#time-entry-form-end-title").css("color", "black");
                $("#time-entry-form-start-title").css("color", "black");
                break;
            case "jobClient":
                $("#jobClient-dropdown > a.dropdown-toggle").css("border", "1px solid #bcbcbc");
                $("#fieldtitle-jobclient").css("color", "black");
                break;
            case "task":
                $("#task-dropdown > a.dropdown-toggle").css("border", "1px solid #bcbcbc");
                $("#fieldtitle-task").css("color", "black");
                break;
            case "activeStopwatch":
                $scope.timeEntryErrorActiveStopwatch = false;
                break;
            default:
                break;
        }
    }

    // Display an error message and highlight the specified field in red.
    $scope.setError = function (errorField, errorMessage) {
        $scope.errorMessage = errorMessage;
        $scope.generalError = true;
        switch (errorField) {
            case "hours":
                $("#time-entry-form-hours").css("border", "1px solid red");
                $("#time-entry-field-hours-title").css("color", "red");
                break;
            case "notes":
                $("#notes-field").css("border", "1px solid red");
                $("#fieldtitle-notes").css("color", "red");
                break;
            case "startTime":
                $("#time-entry-form-start").css("border", "1px solid red");
                $("#time-entry-form-start-title").css("color", "red");
                break;
            case "endTime":
                $("#time-entry-form-end").css("border", "1px solid red");
                $("#time-entry-form-end-title").css("color", "red");
                break;
            case "startEndTimes":
                $("#time-entry-form-start").css("border", "1px solid red");
                $("#time-entry-form-end").css("border", "1px solid red");
                $("#time-entry-form-start-title").css("color", "red");
                $("#time-entry-form-end-title").css("color", "red");
                break;
            case "jobClient":
                $("#jobClient-dropdown > a.dropdown-toggle").css("border", "1px solid red");
                $("#fieldtitle-jobclient").css("color", "red");
                break;
            case "task":
                $("#task-dropdown > a.dropdown-toggle").css("border", "1px solid red");
                $("#fieldtitle-task").css("color", "red");
                break;
            case "jobConflict":
                $scope.setError('jobClient', errorMessage);
                break;
            case "clientConflict":
                $scope.setError('jobClient', errorMessage);
                break;
            case "taskConflict":
                $scope.setError('task', errorMessage);
                break;
            default:
                break;
        }
    }  

    $scope.$on("timeEntryError", function() {
        $scope.saving = false;
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
        $scope.saving = false;
        $scope.abandonedStopwatch = false;
        $scope.pageReady = true;
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
    $scope.timeEntryMethods = ['duration', 'start-end'];
    $scope.timeEntryMethod = $scope.timeEntryMethods[0];
    $scope.changeTimeEntryMethod = function (timeEntryMethod) {
    	switch (timeEntryMethod) {
    		case "duration":
    			$scope.showHourEntryField = true;
    			$scope.showStopwatch = false;
    			$scope.showStartEndTimes = false;
                $('#notes-field').css({'width': '390px', 'max-width': '390px'});
    			break;
    		case "start-end":
    			$scope.showHourEntryField = false;
    			$scope.showStartEndTimes = true;
    			$scope.showStopwatch = false;
                $('#notes-field').css({'width': '276px', 'max-width': '276px'});
    			break;
    		default:
    			bootbox.alert("Invalid time entry method");
    			break;
    	}
    }

    $scope.saveTimeEntry = function (session, timeEntry) {
        // if ($scope.runningStopwatch && !$scope.abandonedStopwatch) {
        //     $scope.timeEntryErrorActiveStopwatch = true;
        //     return;
        // }
        $scope.saving = true;
        $scope.clearAllErrors();
        $scope.refresh().then(function() {
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
          
            if ($scope.showHourEntryField && !$scope.saveFromTimer && !$scope.abandonedStopwatch) {
                if (!timeEntry.Hours) {
                    $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                    return;
                }
                clickTimeEntry.Hours = CTService.toDecimal(timeEntry.Hours);
            }

            if ($scope.showStartEndTimes || $scope.abandonedStopwatch) {
                if (!timeEntry.ISOStartTime && !timeEntry.ISOEndTime) {
                    $scope.setError("startEndTimes", "Oops! Please enter a start and end time to save this entry.");
                    return;
                }
                if (!timeEntry.ISOStartTime) {
                    $scope.setError("startTime", "Oops! Please enter a start time to save this entry.");
                    return;
                }
                if (!timeEntry.ISOEndTime) {
                    $scope.setError("endTime", "Oops! Please enter an end time to save this entry.");
                    return;
                }
                var startTimeDecimal = CTService.toDecimal(timeEntry.ISOStartTime);
                var endTimeDecimal = CTService.toDecimal(timeEntry.ISOEndTime);
                var hourDiff = (endTimeDecimal - startTimeDecimal);
                clickTimeEntry.Hours = hourDiff;
                timeEntry.Hours = hourDiff;
                var ISOEndTime = CTService.convertISO(timeEntry.ISOEndTime);
                var ISOStartTime = CTService.convertISO(timeEntry.ISOStartTime);
                clickTimeEntry.ISOStartTime = ISOStartTime;
                clickTimeEntry.ISOEndTime = ISOEndTime;
            }

            if ($scope.saveFromTimer && !$scope.showStartEndTimes || $scope.showStopwatch && !$scope.abandonedStopwatch) {
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
            } else {
                $scope.pageReady = false;
                TimeEntryService.saveTimeEntry(session, clickTimeEntry)
                .then(function (response) {
                    var d = new Date();
                    TimeEntryService.removeInProgressEntry();

                    //ALEX JONES
                    console.log(clickTimeEntry.Hours);
                    console.log($scope.company.MinTimeIncrement);

                    var successMessageTotalRaw = CTService.roundToNearestDecimal(clickTimeEntry.Hours, $scope.company.MinTimeIncrement);
                    console.log(successMessageTotalRaw);


                    var successHoursAsTimeClock = CTService.toHours(successMessageTotalRaw);
                    var successMessageHrsMinsFormatted = CTService.getSuccessTotalFormatted(successHoursAsTimeClock);

                    $scope.successMessage = successMessageHrsMinsFormatted + " saved!";

                    //ALEX JONES

                    // $scope.successMessage = "Entry successfully uploaded at " + d.toTimeString() + ".";
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
                        var splitHrs = (totalHours + '').split(".");
                        var hrs = parseInt(splitHrs[0]);
                        var min = null;
                        if (splitHrs.length == 2) {
                            var min = parseFloat('0.' + splitHrs[1]);
                            min = Math.floor(min * 60);
                        }
                        $scope.totalHoursLogMessage = CTService.getLogMessage(hrs, min);
                        
                        //ALEX JONES
                        $scope.zeroHoursEncouragementMessage = CTService.getZeroHoursMessage(hrs, min);
                        //ALEX JONES
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
                        $scope.setError(null, "There has been an unknown error. Please contact customer support at support@clicktime.com.");
                        if (!$scope.abandonedStopwatch) {
                            $scope.$broadcast("timeEntryError");
                        }
                    }
                    $scope.pageReady = true;
                });
            }  
        })
    }
    
    // True iff time entry is valid. Will also throw red error messages.
    var validateTimeEntry = function (timeEntry) {
        if ($scope.generalError) {
            return false;
        }
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
            if (!timeEntry.ISOStartTime) {
                $scope.setError("startTime", "Oops! Please enter a start time to save this entry.");
                return false;
            }
            if (!timeEntry.ISOEndTime) {
                $scope.setError("endTime", "Oops! Please enter an end time to save this entry.");
                return false;
            }
            var startTimeDecimal = CTService.toDecimal(timeEntry.ISOStartTime);
            var endTimeDecimal = CTService.toDecimal(timeEntry.ISOEndTime);
            var hourDiff = (endTimeDecimal - startTimeDecimal);
            var roundedDecHrs = CTService.roundToNearestDecimal(hourDiff, $scope.company.MinTimeIncrement);
            if (roundedDecHrs <=0 ) {
                $scope.setError("startEndTimes",  "Please enter an end time later than your start time.");
                return false;
            } else if (roundedDecHrs > 24) {
                $scope.setError("startEndTimes",  "Please make sure your daily hourly total is less than 24 hours.");
                return false;
            } else if (!timeEntry.Hours) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                return false;
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
        $scope.clearTimeEntry();
        TimeEntryService.removeInProgressEntry();
        $scope.abandonedStopwatch = false;
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
        chrome.storage.sync.get('stopwatch', function (items) {
            if ('stopwatch' in items && items.stopwatch.running) {
                bootbox.confirm("Warning! If you logout, your timer will be erased. Are you sure you want to logout?", function (result) {
                    if (result) {
                        $scope.removeLocalStorageVars();
                        $scope.removeSyncStorageVars();
                        $location.path("/login");
                    }
                })
            } else {
                $location.path("/login");
                $scope.removeLocalStorageVars();
                $scope.removeSyncStorageVars();
                $scope.$apply();
            }
        })
        
    }

    $scope.removeLocalStorageVars = function() {
        chrome.storage.local.remove(CHROME_LOCAL_STORAGE_VARS, function () {
            chrome.browserAction.setBadgeText({text:""});
        })
    }

    $scope.removeSyncStorageVars = function() {
        chrome.storage.sync.remove(CHROME_SYNC_STORAGE_VARS);
    }

    $scope.doneRefresh = [];

    // Refresh function
    // This forces an API call for the jobs, clients, and tasks dropdown menus
    $scope.refresh = function() {
        var deferred = $q.defer();
        if ($location.url() == '/settings') {
            $scope.$emit("refresh");
        }
        
        $scope.HasEmptyEntities = false;

        $scope.clearAllErrors();
        $scope.$parent.$broadcast("pageLoading");
        if (!$scope.saving) {
            TimeEntryService.removeInProgressEntry();
        }
       

        $scope.removeLocalStorageVars();

        var afterGetJobClients = function (jobClientsList) {

            var currentJobClient = {
                'job' : $scope.timeEntry.job,
                'client' : $scope.timeEntry.client,
                'DisplayName' :  $scope.timeEntry.client.DisplayName + " - " 
                                + $scope.timeEntry.job.DisplayName 
            }
            if (!EntityService.hasJobClient(jobClientsList, currentJobClient)) {
                $scope.setError("jobClientConflict", "We're sorry but the "
                            + $scope.customTerms.clientTermSingLow + "/"
                            + $scope.customTerms.jobTermSingLow + " "
                            + currentJobClient.DisplayName + " you've chosen is no longer available. "
                            + "Please choose a different "
                            + $scope.customTerms.clientTermSingLow + "/"
                            + $scope.customTerms.jobTermSingLow
                            + " or contact your company's ClickTime administrator for more details.");
                $scope.jobClients = jobClientsList;
                $scope.jobClient = jobClientsList[0];
                if ($scope.jobClient) {
                    $scope.timeEntry.job = $scope.jobClient.job;
                    $scope.timeEntry.JobID = $scope.jobClient.job.JobID;
                    $scope.timeEntry.client = $scope.jobClient.client;
                }
                TimeEntryService.updateInProgressEntry("job", $scope.timeEntry.job, function() {
                    TimeEntryService.updateInProgressEntry("client", $scope.timeEntry.client);
                })
            } else {
                $scope.jobClients = jobClientsList;
                var index = EntityService.indexJobClient(jobClientsList, currentJobClient);
                $scope.jobClient = jobClientsList[index];
            }

            if (jobClientsList.length == 0) {
                $scope.HasEmptyEntities = true;
            }

            $scope.doneRefresh.push("jobClients");
            if ($scope.doneRefresh.length >= 4) {
                deferred.resolve();
            }
            $scope.$apply();

        }

        var afterGetTasks = function (tasksList) {
            var currentTask = $scope.timeEntry.task;
            if (!EntityService.hasTask(tasksList, currentTask)) {
                $scope.setError("taskConflict", "We're sorry but the "
                            + $scope.customTerms.taskTermSingLow + " "
                            + currentTask.DisplayName + " you've chosen is no longer available. "
                            + "Please choose a different "
                            + $scope.customTerms.taskTermSingLow
                            + " or contact your company's ClickTime administrator for more details.");
                $scope.tasks = tasksList;
                $scope.task = tasksList[0];
                if ($scope.task) {
                    $scope.timeEntry.task = $scope.task;
                    $scope.timeEntry.TaskID = $scope.task.TaskID;
                }
                TimeEntryService.updateInProgressEntry('task', $scope.timeEntry.task);
            } else {
                $scope.tasks = tasksList;
                var index = EntityService.indexTask(tasksList, currentTask);
                $scope.task = tasksList[index];
            }

            if (tasksList.length == 0) {
                $scope.HasEmptyEntities = true;
            }

            $scope.doneRefresh.push("tasks");
            if ($scope.doneRefresh.length >= 4) {
                deferred.resolve();
            }

            $scope.$apply();
        }

        var afterGetUser = function (user) {
            var currentUser = $scope.user;
            if (currentUser.RequireStartEndTime != user.RequireStartEndTime) {
                $scope.setError("userConflict", "We're sorry but the "
                            + "entry method" + " "
                            + " you've chosen is no longer available. "
                            + "Please choose a different "
                            + "entry method in the settings"
                            + " or contact your company's ClickTime administrator for more details.");
            }
            $scope.user = user;
            $scope.doneRefresh.push("user");
            if ($scope.doneRefresh.length >= 4) {
                deferred.resolve();
            }
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
            $scope.doneRefresh.push("company");
            if ($scope.doneRefresh.length >= 4) {
                deferred.resolve();
            }
            $scope.$parent.$broadcast("pageReady");
            $scope.$apply();
        }
       
        EntityService.getJobClients($scope.Session, false, afterGetJobClients);
        EntityService.getTasks($scope.Session, false, afterGetTasks);
        EntityService.getUser($scope.Session, false, afterGetUser);
        EntityService.getCompany($scope.Session, false, afterGetCompany);

        return deferred.promise;
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
            if (inProgressEntry.ISOStartTime && inProgressEntry.ISOEndTime) {
                $scope.timeEntry.ISOStartTime = inProgressEntry.ISOStartTime;
                $scope.timeEntry.ISOEndTime = CTService.getNowString();
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
                return;
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
            chrome.storage.sync.get(['timeEntryMethod', 'stopwatch'], function (items) {
                if ('timeEntryMethod' in items) {
                    $scope.timeEntryMethod = items.timeEntryMethod.method;
                    $scope.changeTimeEntryMethod(items.timeEntryMethod.method);
                    if ($scope.timeEntryMethod == "duration") {
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
                                StopwatchService.getStartTime(function (startTime) {
                                    $scope.timeEntry.ISOStartTime = startTime;
                                    $scope.timeEntry.ISOEndTime = "23:59";
                                    TimeEntryService.updateInProgressEntry('ISOStartTime', startTime, function() {
                                        TimeEntryService.updateInProgressEntry('ISOEndTime', '23:59');
                                    })
                                })
                                $scope.abandonedStopwatch = true;
                                $scope.runningStopwatch = false;

                                $('#notes-field').css({'width': '276px', 'max-width': '276px'});
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
            var splitHrs = (totalHours + '').split(".");
            var hrs = parseInt(splitHrs[0]);
            var min = null;
            if (splitHrs.length == 2) {
                var min = parseFloat('0.' + splitHrs[1]);
                min = Math.floor(min * 60);
            }
            $scope.totalHoursLogMessage = CTService.getLogMessage(hrs, min);

            //ALEX JONES
            $scope.zeroHoursEncouragementMessage = CTService.getZeroHoursMessage(hrs, min);
            //ALEX JONES
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
