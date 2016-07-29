myApp.controller("TimeEntryController", ['$scope', '$q', '$interval', '$timeout', '$location', 'CTService', 'EntityService', 'TimeEntryService', '$http', 'RefreshUtilMethods', 'AfterGetSessionUtilMethods',
    function ($scope, $q, $interval, $timeout, $location, CTService, EntityService, TimeEntryService, $http, RefreshUtilMethods, AfterGetSessionUtilMethods) {
    
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
    
    // All tasks for a company. kUsed to filter by permitted Task ID.
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

    // Placeholder text for hours field
    $scope.hoursPlaceHolder = '00:00'

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
    
    //////////////// listeners //////////////////////////////////

    /* Listen for update from the following things:
        - from an integration
        - from popup arrow broadcasting
        - forced page refresh
    */ 
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.updateIntegration) {
                $scope.timeEntry.ISOStartTime = null;//new Date(JSON.parse(request.startTime));
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

    $scope.clearHoursPlaceHolder = function () {
            $scope.hoursPlaceHolder = '';
    }

    $scope.replaceHoursPlaceHolder = function (timeEntryHours) {
        if (timeEntryHours === null || timeEntryHours === '')
            $scope.hoursPlaceHolder = '00:00';
    }
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
        } 
        else if ($scope.showStartEndTimes && (!$scope.timeEntry.ISOStartTime && !$scope.timeEntry.ISOEndTime)) {
            $scope.showStartTimer = true;
        } 
        else {
            $scope.clearSuccessMessage();
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
                $scope.clearSuccessMessage();
                $scope.showStartTimer = false;
                return;
            }
            return;
        }

        if ($scope.showStartTimer) {
            $scope.clearSuccessMessage();
            $scope.showStartTimer = false;
        } 
        else {
            $scope.showStartTimer = true;
        }
    }
    
    // For the stopwatch display on start/end times:
    $scope.endTimePromise = undefined;

    // Start a stopwtach and the end time promise
    $scope.startStopwatch = function () {
        $scope.clearSuccessMessage();
        $scope.showStartTimer = false;

        if ($scope.showHourEntryField) {
            $scope.$broadcast("startStopwatch");
        } 
        else {
            $scope.noValidateStartEndTimes = true;
            $scope.$broadcast("startStopwatch");
            var now = new Date();
            var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
            $scope.timeEntry.ISOStartTime = start;
            $scope.timeEntry.ISOEndTime = start;
            TimeEntryService.updateInProgressEntry('startEndTimes', [$scope.timeEntry.ISOStartTime, $scope.timeEntry.ISOEndTime]);
            $scope.endTimePromise = $interval(function() {
                var now = new Date();
                var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
                $scope.timeEntry.ISOEndTime = end;
                TimeEntryService.updateInProgressEntry('startEndTimes', [$scope.timeEntry.ISOStartTime, $scope.timeEntry.ISOEndTime]);
            }, 1000);
        }
    }

    // Clear the successful save message
    $scope.clearSuccessMessage = function() {
        if ($scope.generalSuccess == true) {
            $scope.generalSuccess = false;
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

            if (roundedDecHrs == 0 && !$scope.company.AllowZeroHourTimeEntries) {
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
        $scope.clearError("startTime");
        $scope.clearError("endTime");
        $scope.clearError("startEndTimes");

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
                $scope.setError("startTime", "Oops! Please enter a start time to save this entry.");
                TimeEntryService.updateInProgressEntry('ISOEndTime', endTime);
            } 
            else if (!endTime) {
                $scope.setError("endTime", "Oops! Please enter an end time to save this entry.");
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
                } 
                else {
                    $scope.clearError('startEndTimes');
                    $scope.clearSuccessMessage();
                    $scope.showStartTimer = false;
                    TimeEntryService.updateInProgressEntry('startEndTimes', [startTime, endTime]);
                }
            }
        }       
    }

    // Clear in progress start end times
    $scope.clearStartEndTimes = function() {
        var now = new Date();
        $scope.timeEntry.ISOStartTime =  new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
        $scope.timeEntry.ISOEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
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
                $scope.hoursError = false;
                break;
            case "notes":
                break;
            case "startTime":
                $scope.startTimeError = false;
                break;
            case "endTime":
                $scope.endTimeError = false;
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
                $scope.hoursError = true;
                ga('send', 'event', 'User Error', 'post', 'hours/time format'); 
                break;
            case "notes":
                $scope.generalError = false;
                $scope.notesError = true;
                ga('send', 'event', 'User Error', 'post', 'Missing notes'); 
                break;
            case "startTime":
                $scope.startTimeError = true;
                ga('send', 'event', 'User Error', 'post', 'hours/time format'); 
                break;
            case "endTime":
                $scope.endTimeError = true;
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
        var now = new Date();
        $scope.timeEntry.ISOStartTime =  new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
        $scope.timeEntry.ISOEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
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

    
    /////////////////////////////// Time entry ///////////////////////////////////////
 
    // Time entry methods
    $scope.timeEntryMethods = ['duration', 'start-end'];
    $scope.timeEntryMethod = $scope.timeEntryMethods[0];

    /** Check a time Entry object for general errors. If none, return a clickTimeEntry object that can be directly
        saved to the ClickTime API. */
    function validateTimeEntry(timeEntry) {
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
        };

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
            var hrs = parseFloat($scope.elapsedHrs);
            var min = parseFloat($scope.elapsedMin);
            var sec = parseFloat($scope.elapsedSec);
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

        if (timeEntry.JobID == undefined || timeEntry.TaskID == undefined) {
            $scope.setError("jobClient", "Job or task cannot be empty.");
            return;
        }

        if (timeEntry.JobID == "" || timeEntry.TaskID == "") {
            $scope.setError("jobClient", "Job or task cannot be empty.");
            return;
        }

        if ($scope.user.RequireComments && (timeEntry.Comment == undefined || timeEntry.Comment == "")) {
            $scope.setError("notes", "");
            return;
        }

        
        if (!$scope.noValidateStartEndTimes && $scope.showStartEndTimes || $scope.abandonedStopwatch) {
            if (!timeEntry.ISOStartTime) {
                $scope.setError("startTime", "Oops! Please enter a start time to save this entry.");
                return;
            }

            if (!timeEntry.ISOEndTime) {
                $scope.setError("endTime", "Oops! Please enter an end time to save this entry.");
                return;
            }

            var hourDiff = CTService.difference(timeEntry.ISOEndTime, timeEntry.ISOStartTime, $scope.company.MinTimeIncrement);
            if (hourDiff <=0 ) {
                $scope.setError("startEndTimes", "Please enter an end time later than your start time.");
                return;
            } 
            else if (hourDiff > 24) {
                $scope.setError("startEndTimes", "Please make sure your daily hourly total is less than 24 hours.");
                return;
            } 
            else if (!timeEntry.Hours) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                return;
            } 
            else {
                var totalMin = $scope.totalMin;
                var totalHrs = $scope.totalHrs;

                if ((totalMin + '').length == 1) {
                    totalMin = "0" + totalMin;
                }

                var timeSoFar = CTService.toDecimal(totalHrs + ":" + totalMin);
                if (timeSoFar + hourDiff > 24) {
                    $scope.setError("startEndTimes", "Please make sure your daily hourly total is less than 24 hours.");
                    return;
                }
            }
        }

        if ($scope.showHourEntryField || $scope.showStopwatch && !$scope.abandonedStopwatch
            && !$scope.saveFromTimer) {
            if (timeEntry.Hours == DEFAULT_EMPTY_HOURS || timeEntry.Hours == 0) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");
                return;
            }
            if (timeEntry.Hours > 24) {
                $scope.setError("hours", "Please make sure your daily hourly total is less than 24 hours.");
                return;
            }

            if (timeEntry.Hours <= 0) {
                $scope.setError("hours", "Oops! Please log some time in order to save this entry.");    
                return;
            }

            if (!CTService.isNumeric(timeEntry.Hours)) {
                $scope.setError("hours", "Please enter time using a valid format.");
                return;
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
                    return;
                }
            }
        }

        return clickTimeEntry;

    }

    /* First, refresh all entity lists. Then, validate the entry.
       If successful, broadcast a success. If failed, show an error. */
    $scope.saveTimeEntry = function (session, timeEntry) {
        $scope.saving = true;
        $scope.clearAllErrors();
        $scope.refresh().then(function() {
            var clickTimeEntry = validateTimeEntry(timeEntry);
            if (!clickTimeEntry) {
                $scope.$broadcast("timeEntryError");
                return;
            }
            // COntinue
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
                    EntityService.getTimeEntries($scope.Session).then(function(res) {
                        AfterGetSessionUtilMethods.afterGetTimeEntries(res, $scope)
                    })
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
        })
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


    /////////////////////////////// dealing with local storage /////////////////////////////////

    // Check for update to jobClient and reset permitted task list.
    $scope.$watch('jobClient', function (newJobClient) {
        if (newJobClient && $scope.company && $scope.company.TaskRestrictionMethod == "byjob") {
            var tasksList = $scope.allTasks;
            var permittedTaskIDs = newJobClient.job.PermittedTasks.split(",");
            var permittedTasks = [];
            for (var i in tasksList) {
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
            AfterGetSessionUtilMethods.resetInProgressTask(permittedTasks, $scope);
        }
    })

    //////// ONLOAD: Initialization. This will get executed upon opening the chrome extension. /////////
    $scope.sendPageReady = function() {
        $scope.pageReady = true;
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

        $scope.pageReady = false;

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

        chrome.storage.local.remove(toRemove);

        $q.all([EntityService.getJobClients($scope.Session, false).then(function(res) {
                    RefreshUtilMethods.afterGetJobClients(res, $scope);
                }),

                EntityService.getTasks($scope.Session, false).then(function(res) {
                    RefreshUtilMethods.afterGetTasks(res, $scope);
                }),

                EntityService.getUser($scope.Session, false).then(function(res) {
                    RefreshUtilMethods.afterGetUser(res, $scope);
                }),

                EntityService.getCompany($scope.Session, false).then(function(res) {
                    AfterGetSessionUtilMethods.afterGetCompany(res, $scope);
                })
            ])
            .then(function() {
                $scope.sendPageReady();
                deferred.resolve();
            })
        return deferred.promise;
    }

    /** Get the session, from sync storage if it exists, otherwise call the API.
        Then get all entities. */
    function afterGetSession(session) {
        // Default empty entry
        $scope.Session = session;
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
                $scope.clearSuccessMessage();
                $scope.showStartTimer = false;
            }
            if (inProgressEntry.ISOStartTime) {
                $scope.clearSuccessMessage();
                $scope.showStartTimer = false;
                $scope.timeEntry.ISOStartTime = inProgressEntry.ISOStartTime;
            }
            if (inProgressEntry.ISOEndTime) {
                $scope.clearSuccessMessage();
                $scope.showStartTimer = false;
                $scope.timeEntry.ISOEndTime = inProgressEntry.ISOEndTime;
            }
        })

        $q.all([EntityService.getJobClients(session, true).then(function(res) {
                    AfterGetSessionUtilMethods.afterGetJobClients(res, $scope)
                }),

                EntityService.getTasks(session, true).then(function(res) {
                    AfterGetSessionUtilMethods.afterGetTasks(res, $scope)
                }),

                EntityService.getUser(session, true).then(function(res) {
                    AfterGetSessionUtilMethods.afterGetUser(res, $scope)
                }),
                    
                EntityService.getCompany(session, true).then(function(res) {
                    AfterGetSessionUtilMethods.afterGetCompany(res, $scope)
                }),
                
                EntityService.getTimeEntries(session).then(function(res) {
                    AfterGetSessionUtilMethods.afterGetTimeEntries(res, $scope)
                })
            ]).then(function() {
                $scope.sendPageReady();
            })
    }

    // todo Yuan: on every getSession call, get the session from API to see if session has changed. 
    // if sesion has changed, log out. catches the case for when password has changed on clicktime
    // call on every page load
    EntityService.getSession()
        .then(function(res) {
                afterGetSession(res);
            }, function() {
                bootbox.alert('Session could not be found');
            })
}])
