myApp.controller("TimeEntryController", ['$scope', '$q', '$interval', '$timeout', '$location', 'APIService', 'CTService', 'EntityService', 'TimeEntryService', 'StopwatchService', '$http',
                                function ($scope, $q, $interval, $timeout, $location, APIService, CTService, EntityService, TimeEntryService, StopwatchService, $http) {
    
    //google analytics
    ga('send', 'pageview', '/main.html'); 

    // Google analytics tracking for link back to Day View
    $('#total-hours-log-link').on('click', function() {
        ga('send', 'event', 'Time Entry Page', 'click', 'total-hours-link-to-timesheet');
    })

    // Google analytics tracking for link back to Day View
    $('#edit-entry-link').on('click', function() {
        ga('send', 'event', 'Time Entry Page', 'click', 'edit-entry-link');
    })

    // Hacky function to display the horizontal line between 'Recent' and 'All' in the entity dropdowns
    // display only
    function appendRecentAll() {
        var recent = '<li style="color:grey" class="recent-add" role="presentation"><strong> Recent</strong></li>';
        var all = '<li style="color:grey" class="all-add" role="presentation"><strong> All</strong></li>';
        $(".recent-add").remove();
        $(".all-add").remove();
        $("#jobClient-dropdown ul[role=menu] li[role=presentation]").first().before(recent);
        $("#jobClient-dropdown ul[role=menu] li[role=presentation]:nth-child(7)").before(all)
        $("#task-dropdown ul[role=menu] li[role=presentation]").first().before(recent);
        $("#task-dropdown ul[role=menu] li[role=presentation]:nth-child(7)").before(all)
    }
    
    //Company custom terms
    $scope.customTerms = {};

    // All tasks for a company. Used to filter by permitted Task ID.
    $scope.allTasks = [];

    // True iff saving is in progress
    $scope.saving = false;

    // Client, job, or task is empty in db
    $scope.HasEmptyEntities = false;

    // True if a stopwatch is running
    $scope.runningStopwatch = false;

    // True if a stopwatch has expired from yesterday or before
    $scope.abandonedStopwatch = false;

    // True if a time entry has expired from yesterday or before
    $scope.abandonedEntry = false;

    // Whether to show pop out icon
    $scope.showPopupArrow = chrome.extension.getBackgroundPage().showPopupArrow;

    // How much time has been logged, total
    $scope.totalHrs = 0;
    $scope.totalMin = 0;
  
    // Link to the settings page
    $scope.settingsPage = function () {
        $location.path("/settings");
    }

    // opens popup
    $scope.openPopup = function() {
        chrome.extension.getBackgroundPage().createWindow();
    }

    // Function to test sending an error to API
    function tesetError() {
        APIService.reportError($scope.Session.UserEmail,
            $scope.Session.Token,
            {'Message' : 'Hey there I am an error',
                'DeviceName' : 'Chrome Ext',
                'DevicePlatform': 'GOogle chrome'
            });
    }
    
    /////////////////////////////////////////////////////////////////////////

    /* Listen for update from the following things:
        - from an integration
        - from popup arrow broadcasting
        - forced page refresh
    */ 
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.updateIntegration) {
                $scope.timeEntry.ISOStartTime = new Date(JSON.parse(request.startTime));
                $scope.timeEntry.ISOEndTime = new Date(JSON.parse(request.endTime));
                $scope.timeEntry.Comment = request.timeInfo;
                $scope.showStartTimer = false;
                $scope.$apply();
            }
            if (request.showPopupArrow == false) {
                $scope.showPopupArrow = false;
                $scope.$apply();
            }
            if (request.refresh) {
                $scope.$apply();
            }
        }     
    )

    /////////////////////////////////////////// Interface logic /////////////////////////////////////

    // Send a notification immediately for demonstration purposes
    $scope.sendNotification = function () {
        chrome.extension.getBackgroundPage().sendOneNotification();
    }

    // Update in progress entry notes on blur
    $scope.updateNotes = function() {
        if ($scope.timeEntry.Comment && $scope.timeEntry.Comment != "") {
            $scope.clearError("notes");
            TimeEntryService.updateInProgressEntry("Comment", $scope.timeEntry.Comment);
        }
    }

    // Focus on notes and clear errors
    $scope.focusNotes = function() {
        $scope.clearError("notes");
        if ($scope.showHourEntryField && !$scope.timeEntry.Hours) {
            $scope.showStartTimer = true;
        } else if ($scope.showStartEndTimes && (!$scope.timeEntry.ISOStartTime 
            && !$scope.timeEntry.ISOEndTime)) {
            $scope.showStartTimer = true;
        } 
        else {
            clearSuccessMessage();
            $scope.showStartTimer = false;
        }
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
                clearSuccessMessage();
                $scope.showStartTimer = false;
                return;
            }
            return;
        }
        if ($scope.showStartTimer) {
            clearSuccessMessage();
            $scope.showStartTimer = false;
        } else {
            $scope.showStartTimer = true;
        }
    }
    
    // For the stopwatch display on start/end times:
    $scope.endTimePromise = undefined;

    // Start a stopwtach and the end time promise
    $scope.startStopwatch = function () {
        clearSuccessMessage();
        $scope.showStartTimer = false;
        if ($scope.showHourEntryField) {
            $scope.$broadcast("startStopwatch");
        } else {
            $scope.noValidateStartEndTimes = true;
            $scope.$broadcast("startStopwatch");
            var now = new Date();
            var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                now.getHours(), now.getMinutes(), 0);
            $scope.timeEntry.ISOStartTime = start;
            $scope.timeEntry.ISOEndTime = start;
            TimeEntryService.updateInProgressEntry('startEndTimes',
                    [$scope.timeEntry.ISOStartTime, $scope.timeEntry.ISOEndTime]);
            $scope.endTimePromise = $interval(function() {
                var now = new Date();
                var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                    now.getHours(), now.getMinutes(), 0);
                $scope.timeEntry.ISOEndTime = end;
                TimeEntryService.updateInProgressEntry('startEndTimes',
                    [$scope.timeEntry.ISOStartTime, $scope.timeEntry.ISOEndTime]);
            }, 1000);
        }    
    }

    // Clear the successful save message
    function clearSuccessMessage() {
        if ($scope.generalSuccess == true) {
            $scope.generalSuccess = false;
            $scope.$apply();
        }
    }

    // Stop a stopwatch and end a timer promise
    $scope.stopStopwatch = function() {
        $scope.saveFromTimer = true;
        $scope.$broadcast("stopStopwatch");
        $scope.showStartTimer = true;
        $scope.noValidateStartEndTimes = true;
        $scope.saveTimeEntry($scope.Session, $scope.timeEntry);
    }

    // Clear an in progress stopwatch
    $scope.clearStopwatch = function() {
        $scope.$broadcast("clearStopwatch");
        $scope.timerDisplay = "00:00:00";
        $interval.cancel($scope.endTimePromise);
    }

    // Display fields for running stopwatch
    $scope.elapsedHrs = 0;
    $scope.elapsedMin = 0;
    $scope.elapsedSec = 0;

    $scope.$on("updateStopwatch", function() {
        $scope.timerDisplay = $scope.elapsedHrs + ":" + $scope.elapsedMin + ":" + $scope.elapsedSec;    
    })


    // Clear in progress entry hours
    $scope.clearHours = function() {
        $scope.timeEntry.Hours = DEFAULT_EMPTY_HOURS;
        $scope.showStartTimer = true;
        $scope.clearAllErrors();
        TimeEntryService.removeInProgressEntry();
    }

    // Validate and round hour input field on blur.
    $scope.roundHour = function (time, timeToIncrement) {
        $scope.generalError = false;
        if (time == null || time == "") {
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
            $scope.showStartTimer = false;
            TimeEntryService.updateInProgressEntry('Hours', $scope.timeEntry.Hours, function () {
                TimeEntryService.updateInProgressEntry('inProgress', true);
            });
        }      
    }

    // Validate start end times on blur.
    $scope.validateStartEndTimes = function(startTime, endTime) {
        if ($scope.showStartEndTimes) {
            if ($scope.noValidateStartEndTimes) {
                // don't validate if saving from timer
                return;
            }
            if (!startTime && !endTime) {
                $scope.showStartTimer = true;
                return;
            }
            else if (!startTime) {
                TimeEntryService.updateInProgressEntry('ISOEndTime', endTime);
            }
            else if (!endTime) {
                TimeEntryService.updateInProgressEntry('ISOStartTime', startTime);
            }
            else {
                var hourDiff = CTService.difference(endTime, startTime, $scope.company.MinTimeIncrement);
                if (hourDiff <= 0) {
                     $scope.setError("startEndTimes", "Oops! Please enter an end time later than your start time.");
                     return;
                }
                if (hourDiff > 24) {
                    $scope.setError("startEndTimes", "Please make sure your daily hourly total is less than 24 hours.");
                } else {
                    $scope.clearError('startEndTimes');
                    clearSuccessMessage();
                    $scope.showStartTimer = false;
                    TimeEntryService.updateInProgressEntry('startEndTimes', [startTime, endTime]);
                }
            }
        }       
    }

    // Clear in progress start end times
    $scope.clearStartEndTimes = function() {
        $scope.timeEntry.ISOStartTime = null;
        $scope.timeEntry.ISOEndTime = null;
        $scope.showStartTimer = true;
        $scope.clearAllErrors();
        TimeEntryService.removeInProgressEntry();
    }

    // Clear all template errors
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

    // Clear a specific error by errorfield
    $scope.clearError = function (errorField) {
        $scope.generalError = false;
        switch (errorField) {
            case "hours":
                $("#time-entry-form-hours").removeClass('field-error');
                $("#time-entry-field-hours-title").removeClass('text-error');
                break;
            case "notes":
                $("#notes-field").removeClass('field-error');
                $("#fieldtitle-notes").removeClass('text-error')
                break;
            case "startTime":
                $("#time-entry-form-start").removeClass('field-error');
                $("#time-entry-form-start-title").removeClass('text-error');
                break;
            case "endTime":
                $("#time-entry-form-end").removeClass('field-error');
                $("#time-entry-form-end-title").removeClass('text-error')
                break;
            case "startEndTimes":
                $scope.clearError('startTime');
                $scope.clearError('endTime');
                break;
            case "jobClient":
                $("#jobClient-dropdown > a.dropdown-toggle").removeClass('field-error');
                $("#fieldtitle-jobclient").removeClass('text-error');
                break;
            case "task":
                $("#task-dropdown > a.dropdown-toggle").removeClass('field-error');
                $("#fieldtitle-task").removeClass('text-error');
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
                $("#time-entry-form-hours").addClass('field-error');
                $("#time-entry-field-hours-title").addClass('text-error');
                ga('send', 'event', 'User Error', 'post', 'hours/time format'); 
                break;
            case "notes":
                $("#notes-field").addClass('field-error');
                $("#fieldtitle-notes").addClass('text-error');
                $scope.generalError = false;
                ga('send', 'event', 'User Error', 'post', 'Missing notes'); 
                break;
            case "startTime":
                $("#time-entry-form-start").addClass('field-error');
                $("#time-entry-form-start-title").addClass('text-error');
                ga('send', 'event', 'User Error', 'post', 'hours/time format'); 
                break;
            case "endTime":
                $("#time-entry-form-end").addClass('field-error');
                $("#time-entry-form-end-title").addClass('text-error');
                ga('send', 'event', 'User Error', 'post', 'hours/time format'); 
                break;
            case "startEndTimes":
                $scope.setError('startTime', errorMessage);
                $scope.setError('endTime', errorMessage);
                ga('send', 'event', 'User Error', 'post', 'hours/time format'); 
                break;
            case "jobClient":
                $("#jobClient-dropdown > a.dropdown-toggle").addClass('field-error');
                $("#fieldtitle-jobclient").addClass('text-error');
                ga('send', 'event', 'User Error', 'post', 'Missing or conflicting job/task'); 
                break;
            case "task":
                $("#task-dropdown > a.dropdown-toggle").addClass('field-error');
                $("#fieldtitle-task").addClass('text-error');
                ga('send', 'event', 'User Error', 'post', 'Missing or conflicting job/task'); 
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
                ga('send', 'event', 'Other Error', 'post', 'Unsuccessful time entry completion');
                break;
        }
    }

    // If there's been an error on saving a time entry, stop the stopwatch
    $scope.$on("timeEntryError", function() {
        $scope.saving = false;
        $scope.clearStopwatch();
    })

    // Actions to take upon successful time entry save
    $scope.$on("timeEntrySuccess", function() {
        $scope.timeEntry.Hours = DEFAULT_EMPTY_HOURS;
        $scope.timeEntry.Comment = "";
        $scope.$broadcast("clearStopwatch");
        $scope.timeEntry.ISOStartTime = null;
        $scope.timeEntry.ISOEndTime = null;
        $interval.cancel($scope.endTimePromise);
        $scope.clearAllErrors();
        $scope.saveFromTimer = false;
        $scope.showStartTimer = true;
       
        $scope.abandonedStopwatch = false;
        $scope.abandonedEntry = false;
        $scope.pageReady = true;
        $scope.saving = false;
        ga('send', 'event', 'Successful Saves', 'post', 'successfully post a time entry'); // google analytics
    })

    // Clear an in progress entry and remove display fields
    $scope.clearTimeEntry = function() {
        $scope.abandonedEntry = false;
        if ($scope.showStartEndTimes) {
            $scope.clearStartEndTimes();
        } else if ($scope.showHourEntryField) {
            $scope.clearHours();
        }
        $scope.clearStopwatch();
    }

    /* Update the hour display if you're using duration as your time entry method*/
    function updateDurationDisplay() {
        if ($scope.timeEntryMethod == "duration") {
            TimeEntryService.getInProgressEntry(function (inProgressEntry) {
                $scope.timeEntry.Hours = inProgressEntry.Hours;
                if (($scope.timeEntryMethod == "duration" && !inProgressEntry.Hours)
                    || ($scope.timeEntryMethod == "start-end" && (!inProgressEntry.ISOEndTime || 
                    !inProgressEntry.ISOStartTime))) {
                    $scope.showStartTimer = true;    
                }
            })
        }
    }
    
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////// Time entry ////// 

    // Time entry methods
    $scope.timeEntryMethods = ['duration', 'start-end'];
    $scope.timeEntryMethod = $scope.timeEntryMethods[0];

    // Change the template time entry method
    function changeTimeEntryMethod(timeEntryMethod) {
      $scope.timeEntryMethod = timeEntryMethod;
    	switch (timeEntryMethod) {
    		case "duration":
    			$scope.showHourEntryField = true;
    			$scope.showStopwatch = false;
    			$scope.showStartEndTimes = false;
    			break;
    		case "start-end":
    			$scope.showHourEntryField = false;
    			$scope.showStartEndTimes = true;
    			$scope.showStopwatch = false;
    			break;
    		default:
    			bootbox.alert("Invalid time entry method");
    			break;
    	}
    }

    /** Prevalidate a time entry. We have to convert the scope's timeEntry into a suitable
        clickTimeEntry that can actually be POSTed to the API. This requires some conversion
        of formats. Also, this will check for preliminary errors in user input.
        Call the callback on the new clickTimeEntry
    */
    $scope.prevalidateTimeEntry = function (timeEntry, clickTimeEntry, callback) {

        if ($scope.showHourEntryField && !$scope.saveFromTimer && !$scope.abandonedStopwatch) {
            if (!timeEntry.Hours) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                return;
            }
            clickTimeEntry.Hours = CTService.toDecimal(timeEntry.Hours);
        }

        if (!$scope.saveFromTimer && $scope.showStartEndTimes || $scope.abandonedStopwatch) {
            if (!timeEntry.ISOStartTime) {
                $scope.setError("startTime", "Oops! Please enter a start time to save this entry.");
                return;
            }
            if (!timeEntry.ISOEndTime) {
                $scope.setError("endTime", "Oops! Please enter an end time to save this entry.");
                return;
            }
            var hourDiff = CTService.difference(timeEntry.ISOEndTime, timeEntry.ISOStartTime, $scope.company.MinTimeIncrement);
            clickTimeEntry.Hours = hourDiff;
            timeEntry.Hours = hourDiff;
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
            if ($scope.showStartEndTimes) {
                var ISOEndTime = CTService.convertISO(timeEntry.ISOEndTime);
                var ISOStartTime = CTService.convertISO(timeEntry.ISOStartTime);
                if (ISOStartTime == ISOEndTime) {
                    var endSplit = ISOEndTime.split(":");
                    ISOEndTime = endSplit[0] + ":" + (parseInt(endSplit[1]) + 1) + ":" + endSplit[2];
                }
                clickTimeEntry.ISOStartTime = ISOStartTime;
                clickTimeEntry.ISOEndTime = ISOEndTime;
            }
        }

        if ($scope.user.RequireStopwatch) {
            var ISOEndTime = CTService.convertISO(timeEntry.ISOEndTime);
            var ISOStartTime = CTService.convertISO(timeEntry.ISOStartTime);
            if (ISOStartTime == ISOEndTime) {
                var endSplit = ISOEndTime.split(":");
                ISOEndTime = endSplit[0] + ":" + (parseInt(endSplit[1]) + 1) + ":" + endSplit[2];
            }
            clickTimeEntry.ISOStartTime = ISOStartTime;
            clickTimeEntry.ISOEndTime = ISOEndTime;
        }
        callback(clickTimeEntry);
    }

    /* First, refresh all entity lists. (see below) Then, validate the entry.
       If successful, broadcast a success. If failed, show an error. */
    $scope.saveTimeEntry = function (session, timeEntry) {
        $scope.saving = true;
        $scope.clearAllErrors();
        doneRefresh.length = 0; // necessary to have both before and after refresh because just in case
        $scope.refresh().then(function() {
            doneRefresh.length = 0;
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

            $scope.prevalidateTimeEntry(timeEntry, clickTimeEntry, function (clickTimeEntry) {
                if (!clickTimeEntry) {
                    return;
                }

                if (!validateTimeEntry(timeEntry)) {
                    $scope.$broadcast("timeEntryError");
                    return;
                } else {
                    $scope.pageReady = false;
                    TimeEntryService.saveTimeEntry(session, clickTimeEntry)
                    .then(function (response) {
                        var d = new Date();
                        TimeEntryService.removeInProgressEntry();
                        var successMessageTotalRaw = CTService.roundToNearestDecimal(clickTimeEntry.Hours, $scope.company.MinTimeIncrement);
                        var successHoursAsTimeClock = CTService.toHoursForSuccessMessage(successMessageTotalRaw);
                        var successMessageHrsMinsFormatted = CTService.getSuccessTotalFormatted(successHoursAsTimeClock);

                        $scope.successMessage = successMessageHrsMinsFormatted + " saved!";
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
                            $scope.totalHrs = hrs;
                            $scope.totalMin = min;
                            $scope.zeroHoursEncouragementMessage = CTService.getZeroHoursMessage(hrs, min);
                        });
                    })
                    .catch(function (response) {
                        if (response.data == null) {
                            var d = new Date();
                            $scope.$broadcast("timeEntryError");
                            TimeEntryService.removeInProgressEntry();
                            TimeEntryService.storeTimeEntry(clickTimeEntry, function() {
                                $scope.setError(null, 'Currently unable to upload entry. Entry saved locally at ' + 
                                d.toTimeString() + '. Your entry will be uploaded once a connection can be established');
                            })
                        } else if (response.data['Detail'] == 'The day is locked') {
                            $scope.setError(null, "Sorry, your time entry cannot be saved because your timesheet is locked. Please contact your ClickTime administrator for further details.");
                            if (!$scope.abandonedStopwatch) {
                                $scope.$broadcast("timeEntryError");
                            }
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

        })
    }

    // True iff time entry is valid. Will also throw red error messages.
    function validateTimeEntry(timeEntry) {

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
            $scope.notesError = true;
            $scope.setError("notes", "");
            return;
        }

        
        if (!$scope.noValidateStartEndTimes && $scope.showStartEndTimes || $scope.abandonedStopwatch) {
            if (!timeEntry.ISOStartTime) {
                $scope.setError("startTime", "Oops! Please enter a start time to save this entry.");
                return false;
            }
            if (!timeEntry.ISOEndTime) {
                $scope.setError("endTime", "Oops! Please enter an end time to save this entry.");
                return false;
            }
            var hourDiff = CTService.difference(timeEntry.ISOEndTime, timeEntry.ISOStartTime, $scope.company.MinTimeIncrement);
            if (hourDiff <=0 ) {
                $scope.setError("startEndTimes", "Please enter an end time later than your start time.");
                return false;
            } else if (hourDiff > 24) {
                $scope.setError("startEndTimes", "Please make sure your daily hourly total is less than 24 hours.");
                return false;
            } else if (!timeEntry.Hours) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                return false;
            } else {
                var totalMin = $scope.totalMin;
                var totalHrs = $scope.totalHrs;
                if ((totalMin + '').length == 1) {
                    totalMin = "0" + totalMin;
                }
                var timeSoFar = CTService.toDecimal(totalHrs + ":" + totalMin);
                if (timeSoFar + hourDiff > 24) {
                    $scope.setError("startEndTimes", "Please make sure your daily hourly total is less than 24 hours.");
                    return false;
                }
            }
        }

        if ($scope.showHourEntryField || $scope.showStopwatch && !$scope.abandonedStopwatch
            && !$scope.saveFromTimer) {
            if (timeEntry.Hours == DEFAULT_EMPTY_HOURS || timeEntry.Hours == 0) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                return false;
            }
            if (timeEntry.Hours > 24) {
                $scope.setError("hours", "Please make sure your daily hourly total is less than 24 hours.");
                return false;
            }

            if (timeEntry.Hours <= 0) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");    
                return false;
            }

            if (!CTService.isNumeric(timeEntry.Hours)) {
                $scope.setError("hours", "Please enter time using a valid format.");
                return false;
            } else {
                var totalMin = $scope.totalMin;
                var totalHrs = $scope.totalHrs;
                if ((totalMin + '').length == 1) {
                    totalMin = "0" + totalMin;
                }
                var timeSoFar = CTService.toDecimal(totalHrs + ":" + totalMin);
                var thisTime = CTService.toDecimal(timeEntry.Hours);
                if (timeSoFar + thisTime > 24) {
                    $scope.setError("hours", "Please make sure your daily hourly total is less than 24 hours.");
                    return false;
                }
            }
        }

        return true;
    }

    // Cancel an abandoned stopwatch
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

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// Logging out and dealing with local storage /////

    // Logout function - will remove local and sync storage variables.
    $scope.logout = function() {
        chrome.storage.sync.get('stopwatch', function (items) {
            if ('stopwatch' in items && items.stopwatch.running) {
                bootbox.confirm("Warning! If you logout, your timer will be erased. Are you sure you want to logout?", function (result) {
                    if (!result) {
                        return;
                    } else {
                        $location.path("/login");
                        $scope.removeLocalStorageVars();
                        $scope.removeSyncStorageVars();
                        chrome.extension.getBackgroundPage().stopNotifications();
                        chrome.extension.getBackgroundPage().stopBadge();
                        $scope.$apply();
                    }
                })
            } else {
                $location.path("/login");
                $scope.removeLocalStorageVars();
                $scope.removeSyncStorageVars();
                chrome.extension.getBackgroundPage().stopNotifications();
                chrome.extension.getBackgroundPage().stopBadge();
                $scope.$apply();
            }
        })
    }

    // Remove local storage variables from chrome
    $scope.removeLocalStorageVars = function(vars) {
        if (vars) {
            chrome.storage.local.remove(vars, function() {
                chrome.browserAction.setBadgeText({text:""});
            })
        } else {
            chrome.storage.local.remove(CHROME_LOCAL_STORAGE_VARS, function () {
                chrome.browserAction.setBadgeText({text:""});
            })
        }        
    }

    // Rmove sync storage variables from chrome
    $scope.removeSyncStorageVars = function() {
        chrome.storage.sync.remove(CHROME_SYNC_STORAGE_VARS);
    }

    /* 
      Set time entry settings according to the managerial permissions set by the CT admin. 

      Since allowReminder is not a ct-specified property, We will look to see if allow reminders has been set before. 
        - if it's been set before
            - same user: keep their old settings (don't do anything -- old settings already in storage)
            - not same user: allow reminders by default (we can't make it persistent with the user because
              no database)
        - if it's not been set before
            - allow reminders by default

       Notifications are started either way. (notification permissions specified in function 
       found in background.js).
    */
    function updateTimeEntryMethodInStorage() {
        var UserID, RequireStopwatch, RequireStartEndTime, method;
        var pollPeriod = chrome.extension.getBackgroundPage().NOTIFICATION_POLL_PERIOD;

        function timeEntryMethodSyncSetter() {
            chrome.storage.sync.set({
                'timeEntryMethod' : {
                    'method' : method,
                    'UserID' : UserID
                }
            }, function() {
                // console.log('method is ' + method)
                changeTimeEntryMethod(method);
                updateDurationDisplay();
                chrome.extension.getBackgroundPage().createNotifications(pollPeriod);
            });
        }

        function allowRemindersSyncSetter() {
            chrome.storage.sync.get(['allowReminders'], function (items) {
                if (!('allowReminders' in items) || !(UserID == items.allowReminders.UserID)) {
                    chrome.storage.sync.set({
                        'allowReminders' : {
                            'permission' : true,
                            'UserID' : UserID 
                        }
                    });
                }
            })     
        }

        // grab permissions
        UserID = $scope.user.UserID;
        RequireStopwatch = $scope.user.RequireStopwatch;
        RequireStartEndTime = $scope.user.RequireStartEndTime;

        if (RequireStartEndTime || RequireStopwatch) {
            method = 'start-end'
            timeEntryMethodSyncSetter()
        } else {
            // method could be either. if s&e has never been set before, then method = duration. 
            // but if has been set before, then method is whatever you have
            chrome.storage.sync.get('timeEntryMethod', function(items) {
                if ('timeEntryMethod' in items) {
                    method = items.timeEntryMethod.method;
                } else {
                    method = 'duration'
                }
                timeEntryMethodSyncSetter()
            })
        }
        // set allowReminder
       allowRemindersSyncSetter()
    }

    // Check for update to jobClient and reset permitted task list.
    $scope.$watch('jobClient', function (newJobClient) {
        if (newJobClient && $scope.company && $scope.company.TaskRestrictionMethod == "byjob") {
            var tasksList = $scope.allTasks;
            var permittedTaskIDs = newJobClient.job.PermittedTasks.split(",");
            var permittedTasks = [];
            for (i in tasksList) {
                var t = tasksList[i];
                if (EntityService.hasTaskID(permittedTaskIDs, t.TaskID)) {
                    permittedTasks.push(t);
                }
            }
            if (permittedTasks.length > 0) {
                $scope.task = permittedTasks[0];
            } else {
                $scope.task = undefined;
            }
            $scope.tasks = permittedTasks;

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
                $scope.task = permittedTasks[0];
                if ($scope.task) {
                    $scope.timeEntry.task = $scope.task;
                    $scope.timeEntry.TaskID = $scope.task.TaskID;
                }
                TimeEntryService.updateInProgressEntry("task", $scope.task);
                $scope.$apply();
            })
        }
    })

    // If populated with 4 entites, then scope is done refreshing:
    var doneRefresh = [];

    // Refresh function
    /** Force an update to all entity lists from the API. Do not check local storage first.
        This method also deals with conflicts -- for example, if you try to save a time entry
        with a job that no longer exists in Clicktime, this will set an error. */
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
       
        var toRemove = [
            'user',
            'company',
            'tasksList',
            'jobClientsList',
            'storedTimeEntries',
            'stringJobClientsList'
        ]

        $scope.removeLocalStorageVars(toRemove);

        function afterGetJobClients(jobClientsList) {
            var currentJobClient = {
                'job' : $scope.timeEntry.job,
                'client' : $scope.timeEntry.client,
                'DisplayName' :  $scope.timeEntry.client.DisplayName + " - " 
                                + $scope.timeEntry.job.DisplayName 
            }
            if (!EntityService.hasJobClient(jobClientsList, currentJobClient)) {
                $scope.setError("jobConflict", "We're sorry but the "
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
                var currentJob = $scope.jobClient.job;
                var currentTask = $scope.task;
                if (currentTask && $scope.company && $scope.company.TaskRestrictionMethod == "byjob") {
                    var permittedTaskIDs = currentJob.PermittedTasks.split(",");
                    if (!EntityService.hasTaskID(permittedTaskIDs, currentTask.TaskID)) {
                        $scope.setError("taskConflict", "We're sorry but the "
                                + $scope.customTerms.taskTermSingLow + " "
                                + currentTask.DisplayName + " you've chosen is no longer available. "
                                + "Please choose a different "
                                + $scope.customTerms.taskTermSingLow
                                + " or contact your company's ClickTime administrator for more details.");
                    }
                }
            }

            if (jobClientsList.length == 0) {
                $scope.HasEmptyEntities = true;
            }

            doneRefresh.push("jobClients");
            if (doneRefresh.length >= 4) {
                deferred.resolve();
            }
            $scope.$apply();
        }

        function afterGetTasks(tasksList) {
            var currentTask = $scope.timeEntry.task;
            if (currentTask) {
                if (!EntityService.hasTask(tasksList, currentTask)) {
                    $scope.setError("taskConflict", "We're sorry but the "
                                + $scope.customTerms.taskTermSingLow + " "
                                + currentTask.DisplayName + " you've chosen is no longer available. "
                                + "Please choose a different "
                                + $scope.customTerms.taskTermSingLow
                                + " or contact your company's ClickTime administrator for more details.");
                    $scope.allTasks = tasksList;
                    if ($scope.jobClient && $scope.company && $scope.company.TaskRestrictionMethod == "byjob") {
                        var permittedTaskIDs = $scope.jobClient.job.PermittedTasks.split(",");
                        var permittedTasks = [];
                        for (i in tasksList) {
                            var t = tasksList[i];
                            if (EntityService.hasTaskID(permittedTaskIDs, t.TaskID)) {
                                permittedTasks.push(t);
                            }
                        }
                        $scope.tasks = permittedTasks;
                    } else {
                        $scope.tasks = tasksList;    
                    }
                    if ($scope.tasks.length > 0) {
                        $scope.task = $scope.tasks[0];
                    }
                    if ($scope.task) {
                        $scope.timeEntry.task = $scope.task;
                        $scope.timeEntry.TaskID = $scope.task.TaskID;
                    }
                    TimeEntryService.updateInProgressEntry('task', $scope.timeEntry.task);
                    $scope.$apply();
                } else {
                    var currentJob = $scope.timeEntry.job;
                    if ($scope.company && $scope.company.TaskRestrictionMethod == "byjob") {
                        var permittedTaskIDs = currentJob.PermittedTasks.split(",");
                        if (!EntityService.hasTaskID(permittedTaskIDs, currentTask.TaskID)) {
                            $scope.setError("taskConflict", "We're sorry but the "
                                    + $scope.customTerms.taskTermSingLow + " "
                                    + currentTask.DisplayName + " you've chosen is no longer available. "
                                    + "Please choose a different "
                                    + $scope.customTerms.taskTermSingLow
                                    + " or contact your company's ClickTime administrator for more details.");
                            $scope.allTasks = tasksList;
                            if ($scope.jobClient) {
                                var permittedTaskIDs = $scope.jobClient.job.PermittedTasks.split(",");
                                var permittedTasks = [];
                                for (i in tasksList) {
                                    var t = tasksList[i];
                                    if (EntityService.hasTaskID(permittedTaskIDs, t.TaskID)) {
                                        permittedTasks.push(t);
                                    }
                                }
                                $scope.tasks = permittedTasks;
                            } else {
                                $scope.tasks = tasksList;    
                            }
                            if ($scope.tasks.length > 0) {
                                $scope.task = $scope.tasks[0];
                            }
                            if ($scope.task) {
                                $scope.timeEntry.task = $scope.task;
                                $scope.timeEntry.TaskID = $scope.task.TaskID;
                            }
                            TimeEntryService.updateInProgressEntry('task', $scope.timeEntry.task);                    
                            $scope.$apply();
                        } else {
                            $scope.allTasks = tasksList;
                            if ($scope.jobClient) {
                                var permittedTaskIDs = $scope.jobClient.job.PermittedTasks.split(",");
                                var permittedTasks = [];
                                for (i in tasksList) {
                                    var t = tasksList[i];
                                    if (EntityService.hasTaskID(permittedTaskIDs, t.TaskID)) {
                                        permittedTasks.push(t);
                                    }
                                }
                                $scope.tasks = permittedTasks;
                            } else {
                                $scope.tasks = tasksList;    
                            }
                            // if ($scope.tasks.length > 0) {
                            //     $scope.task = $scope.tasks[0];
                            // }
                            var taskIndex = EntityService.indexTask($scope.tasks, currentTask);
                            if (taskIndex != -1) {
                                $scope.task = $scope.tasks[taskIndex];
                            } else {
                                $scope.task = $scope.tasks[0];
                            }
                            
                            if ($scope.task) {
                                $scope.timeEntry.task = $scope.task;
                                $scope.timeEntry.TaskID = $scope.task.TaskID;
                            }
                            TimeEntryService.updateInProgressEntry('task', $scope.timeEntry.task);
                            $scope.$apply();
                        }
                    }
                }
            }
            doneRefresh.push("tasks");
            if (doneRefresh.length >= 4) {
                deferred.resolve();
            }
        }

        function afterGetUser(user) {
            var currentUser = $scope.user;

            if (currentUser.RequireStartEndTime != user.RequireStartEndTime) {
                $scope.setError("userConflict", "We're sorry but the "
                            + "time entry method" + " "
                            + " you've chosen is no longer available. "
                            + "Please contact your company's ClickTime administrator for more details.");
                if (user.RequireStartEndTime) {
                  changeTimeEntryMethod("start-end");
                  chrome.storage.sync.set({
                    'timeEntryMethod' : {
                      UserID: user.UserID,
                      method: 'start-end'
                    }
                  })
                } else {
                  changeTimeEntryMethod("duration");
                  chrome.storage.sync.set({ 
                    'timeEntryMethod' : {
                      UserID: user.UserID,
                      method: 'duration'
                    }
                  })
                }
              $scope.$apply();
              return;
            }
            $scope.user = user;

            doneRefresh.push("user");
            if (doneRefresh.length >= 4) {
                deferred.resolve();
            }
            $scope.$apply();
        }

        function afterGetCompany(company) {
            $scope.company = company;
            if (company.DCAALoggingEnabled || company.HasModuleSubJob) {
                $scope.$parent.DCAASubJobError = true;
                $scope.logout();
            }

            if (company.DisplayClientSelector == true) {
                $scope.customTerms = {
                    'clientSlash' : ' / ',
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
            } else if (company.DisplayClientSelector == false) {
                $scope.customTerms = {
                    'clientTermSingLow' : '',
                    'clientTermPlurLow' : '',
                    'clientTermSingHigh' : '',
                    'clientTermPlurHigh' : '',
                    'jobTermSingLow' : company.JobTermSingular,
                    'jobTermPlurLow' : company.JobTermPlural,
                    'jobTermSingHigh' : company.JobTermSingular.capitalize(),
                    'jobTermPlurHigh' : company.JobTermPlural.capitalize(),
                    'taskTermSingLow' : company.TaskTermSingular,
                    'taskTermPlurLow' : company.TaskTermPlural,
                    'taskTermSingHigh' : company.TaskTermSingular.capitalize(),
                    'taskTermPlurHigh' : company.TaskTermPlural.capitalize(),
                }
            }
          
            doneRefresh.push("company");
            if (doneRefresh.length >= 4) {
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

    ///// ONLOAD: This will get executed upon opening the chrome extension. /////////

    // Once page has loaded, send a message that this was loaded.
    $scope.sendPageReady = function() {
        chrome.runtime.sendMessage({
            pageReady: true
        })

        $(function () {
            $(".dropdown-toggle").on("click", function() {
                appendRecentAll();
                $('.dropdown-menu').each(function (i, e) {
                    var dropdown_menu = $(e).children().first().children();
                    dropdown_menu.on("keyup", function(e) {
                        var text = e.target.value;
                        if (text) {
                            $(".recent-add").remove();
                            $(".all-add").remove();
                        } else {
                            appendRecentAll();
                        }
                    })
                })
            })
        })
    }
    
    // When this list is populated with 4 entities, the scope is ready. 
    var doneLoading = [];

    /** Get the session, from sync storage if it exists, otherwise call the API.
        Then get all entities. */
    function afterGetSession(session) {
        // Default empty entry
        var dateString = CTService.getDateString();

        $scope.timeEntry = {
            "BreakTime":0.00,
            "Comment":"",
            "Date":dateString,
            "Hours":null,
            "ISOEndTime":null,
            "ISOStartTime":null,
            "JobID":"",
            "PhaseID":"",
            "SubPhaseID":null,
            "TaskID":""
        }

        $scope.IsManagerOrAdmin = EntityService.SecurityLevel == 'manager'
            || EntityService.SecurityLevel == 'admin';

        $scope.HasEmptyEntities = false;

        // Go fetch the in progress entry and fill out scope fields, if necessary
        TimeEntryService.getInProgressEntry(function (inProgressEntry) {
            if (inProgressEntry.Date) {
                var yearStr = inProgressEntry.Date.substring(0, 4);
                var monthStr = inProgressEntry.Date.substring(4, 6);
                var monthCorrected = (parseInt(monthStr) - 1) + '';
                var dayStr = inProgressEntry.Date.substring(6, 8);
                var then = new Date(yearStr, monthCorrected, dayStr);
                var now = new Date();
                var msDay = 60*60*24*1000;
                var dayDiff = Math.floor((now - then) / msDay);
                if (dayDiff >= 1 && !$scope.abandonedStopwatch) {
                    if (inProgressEntry.Hours || inProgressEntry.ISOStartTime || inProgressEntry.ISOEndTime) {
                        $scope.abandonedDateString = yearStr + "/" + monthStr + "/" + dayStr;
                        $scope.abandonedEntry = true;
                    }
                   
                }
            }
            $scope.showStartTimer = true;
            $scope.timeEntry.Comment = inProgressEntry.Comment;
            $scope.timeEntry.Date = inProgressEntry.Date;
            if (inProgressEntry.Hours) {
                clearSuccessMessage();
                $scope.showStartTimer = false;
            }
            if (inProgressEntry.ISOStartTime) {
                clearSuccessMessage();
                $scope.showStartTimer = false;
                $scope.timeEntry.ISOStartTime = inProgressEntry.ISOStartTime;
            }
            if (inProgressEntry.ISOEndTime) {
                clearSuccessMessage();
                $scope.showStartTimer = false;
                $scope.timeEntry.ISOEndTime = inProgressEntry.ISOEndTime;
            }
        })

        function afterGetTasks(tasksList) {
            $scope.allTasks = tasksList;
            if ($scope.jobClient && $scope.company && $scope.company.TaskRestrictionMethod == "byjob") {
                var permittedTaskIDs = $scope.jobClient.job.PermittedTasks.split(",");
                var permittedTasks = [];
                for (i in tasksList) {
                    var t = tasksList[i];
                    if (EntityService.hasTaskID(permittedTaskIDs, t.TaskID)) {
                        permittedTasks.push(t);
                    }
                }
                $scope.tasks = permittedTasks;
            } else {
                $scope.tasks = tasksList;    
            }
            if (tasksList.length == 0) {
                $scope.HasEmptyEntities = true;
                doneLoading.push('tasks');
                if (doneLoading.length >= 4) {
                    $scope.sendPageReady();
                    $scope.$emit("pageReady");
                }
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
                        doneLoading.push('tasks');
                        if (doneLoading.length >= 4) {
                            $scope.sendPageReady();
                            $scope.$emit("pageReady");
                        }
                        $scope.$apply();
                        return;
                    }           
                }
                // No in progress entity
                $scope.task = tasksList[0];
                if ($scope.task) {
                    $scope.timeEntry.task = $scope.task;
                    $scope.timeEntry.TaskID = $scope.task.TaskID;
                }
                TimeEntryService.updateInProgressEntry("task", $scope.task);
                doneLoading.push('tasks');
                if (doneLoading.length >= 4) {
                    $scope.sendPageReady();
                    $scope.$emit("pageReady");
                }
                $scope.$apply();
            })
        }

        function afterGetUser(user) {
            if (user.RequireStopwatch) {
                $scope.$parent.RequireStopwatch = true;
                $scope.logout();
            }

            $scope.user = user;
            doneLoading.push('user');
            if (doneLoading.length >= 4) {
                $scope.sendPageReady();
                $scope.$emit("pageReady");
            }
            updateTimeEntryMethodInStorage();      
            chrome.storage.sync.get(['stopwatch'], function (items) {
                // Check for abandoned stopwatch
                if ('stopwatch' in items) {
                    var now = new Date();
                    var stopwatch = items.stopwatch;
                    if (stopwatch.running) {
                        var stopwatchDate = new Date(stopwatch.startYear, stopwatch.startMonth,
                            stopwatch.startDay, now.getHours(), now.getMinutes(), now.getSeconds(),
                            now.getMilliseconds());

                        if (now > stopwatchDate) {
                            // There is an abandoned stopwatch
                            StopwatchService.getStartTime(function (startTime) {
                                var start = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(),
                                    startTime.getHours(), startTime.getMinutes(), 0);
                                var midnight = new Date(2015, 0, 1, 23, 59, 0);
                                $scope.timeEntry.ISOStartTime = start;
                                $scope.timeEntry.ISOEndTime = midnight;
                                TimeEntryService.updateInProgressEntry('startEndTimes', [start, midnight]);
                            })
                            $scope.abandonedStopwatch = true;
                            $scope.runningStopwatch = false;

                            
                            $('#notes-field').css({'width': '448px', 'max-width': '448px'});
                        } else {
                            // There is a running stopwatch, but it isn't abandoned
                            var now = new Date();
                            var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                                now.getHours(), now.getMinutes(), 0);
                            $scope.timeEntry.ISOStartTime = new Date(stopwatch.startYear, stopwatch.startMonth,
                            stopwatch.startDay, stopwatch.startHrs, stopwatch.startMin, 0);
                            $scope.timeEntry.ISOEndTime = end;
                            TimeEntryService.updateInProgressEntry('startEndTimes',
                                    [$scope.timeEntry.ISOStartTime, $scope.timeEntry.ISOEndTime]);

                            $scope.endTimePromise = $interval(function() {
                                var now = new Date();
                                var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                                    now.getHours(), now.getMinutes(), 0);
                                $scope.timeEntry.ISOEndTime = end;
                                TimeEntryService.updateInProgressEntry('startEndTimes',
                                    [$scope.timeEntry.ISOStartTime, $scope.timeEntry.ISOEndTime]);
                            }, 1000);
                            $scope.$apply();
                        }
                    }
                }
            })
        }
        
        function afterGetCompany(company) {
            if (company.DCAALoggingEnabled || company.HasModuleSubJob) {
                $scope.$parent.DCAASubJobError = true;
                $scope.logout();
            }
            $scope.company = company;

            if (company.DisplayClientSelector == true) {
                $scope.customTerms = {
                    'clientSlash' : ' / ',
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
            } else if (company.DisplayClientSelector == false) {
                $scope.customTerms = {
                    'clientTermSingLow' : '',
                    'clientTermPlurLow' : '',
                    'clientTermSingHigh' : '',
                    'clientTermPlurHigh' : '',
                    'jobTermSingLow' : company.JobTermSingular,
                    'jobTermPlurLow' : company.JobTermPlural,
                    'jobTermSingHigh' : company.JobTermSingular.capitalize(),
                    'jobTermPlurHigh' : company.JobTermPlural.capitalize(),
                    'taskTermSingLow' : company.TaskTermSingular,
                    'taskTermPlurLow' : company.TaskTermPlural,
                    'taskTermSingHigh' : company.TaskTermSingular.capitalize(),
                    'taskTermPlurHigh' : company.TaskTermPlural.capitalize(),
                }
            }

            doneLoading.push('company');
            if (doneLoading.length >= 4) {
                $scope.sendPageReady();
                $scope.$emit("pageReady");
            }
        }

        function afterGetTimeEntries(timeEntries) {
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
            $scope.zeroHoursEncouragementMessage = CTService.getZeroHoursMessage(hrs, min);
            $scope.totalHrs = hrs;
            $scope.totalMin = min;
        }

        function afterGetJobClients(jobClientsList) {
            $scope.jobClients = jobClientsList;

            if ($scope.jobClients.length == 0) {
                $scope.HasEmptyEntities = true;
                $scope.jobClient = undefined;
                doneLoading.push("jobClients");
                if (doneLoading.length >= 4) {
                    $scope.sendPageReady();
                    $scope.$emit("pageReady");
                }
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
                            doneLoading.push("jobClients");
                            if (doneLoading.length >= 4) {
                                $scope.sendPageReady();
                                $scope.$emit("pageReady");
                            }
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
                    doneLoading.push("jobClients");
                    if (doneLoading.length >= 4) {
                        $scope.sendPageReady();
                        $scope.$emit("pageReady");
                    }
                    $scope.$apply();
                
                })
            }
        }

        EntityService.getJobClients(session, true).then(afterGetJobClients);
        EntityService.getTasks(session, true).then(afterGetTasks);
        EntityService.getUser(session, true).then(afterGetUser);
        EntityService.getCompany(session, true).then(afterGetCompany);
        EntityService.getTimeEntries(session).then(afterGetTimeEntries);

    }
    EntityService.getSession()
        .then(afterGetSession, function() {bootbox.alert('Session could not be found');})
      
}])
