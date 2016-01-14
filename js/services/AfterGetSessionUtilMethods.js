// getSession service methods, for use in afterGetSession function in TimeEntryController.js
myApp.service('AfterGetSessionUtilMethods', ['TimeEntryService', 'CTService', 'EntityService', function (TimeEntryService, CTService, EntityService) {

	var me = this;
    var now = new Date();

    /* Update the hour display if you're using duration as your time entry method*/
    function updateDurationDisplay($scope) {
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

	// Change the template time entry method
    function changeTimeEntryMethod(timeEntryMethod, $scope) {
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

    /* 
      Set time entry settings according to the managerial permissions set by the CT admin. 

      Since allowReminder is not a ct-specified property, We will look to see if allow reminders has been set before. 
        - if it's been set before
            - same user: keep their old settings (don't do anything -- old settings already in storage)
            - not same user: allow reminders by default (we can't make it persistent with the user because
              no database)
        - if it's not been set before
            - allow reminders by default

       Notifications are started in both cases, provided that there isn't already a notification interval running
    */
    function updateTimeEntryMethodInStorage($scope) {
        var UserID, RequireStopwatch, RequireStartEndTime, method;
        var pollPeriod = chrome.extension.getBackgroundPage().NOTIFICATION_POLL_PERIOD;

        function timeEntryMethodSyncSetter() {
            chrome.storage.sync.set({
                'timeEntryMethod' : {
                    'method' : method,
                    'UserID' : UserID
                }
            }, function() {
                changeTimeEntryMethod(method, $scope);
                updateDurationDisplay($scope);
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
            timeEntryMethodSyncSetter();
        } else {
            // method could be either. if s&e has never been set before, then method = duration. 
            // but if has been set before, then method is whatever you have
            chrome.storage.sync.get('timeEntryMethod', function(items) {
                if ('timeEntryMethod' in items) {
                    method = items.timeEntryMethod.method;
                } else {
                    method = 'duration'
                }
                timeEntryMethodSyncSetter();
            })
        }
        // set allowReminder
       allowRemindersSyncSetter();
    }

	this.afterGetTimeEntries = function(timeEntries, $scope) {
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

	this.afterGetTasks = function(tasksList, $scope) {
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
            if ($scope.task) {
                $scope.timeEntry.task = $scope.task;
                $scope.timeEntry.TaskID = $scope.task.TaskID;
            }
            TimeEntryService.updateInProgressEntry("task", $scope.task);
            $scope.$apply();
        })
	}

	this.afterGetUser = function(user, $scope) {
        if (user.RequireStopwatch) {
            $scope.$parent.RequireStopwatch = true;
            $scope.logout();
        }

        $scope.$parent.user = user;
        updateTimeEntryMethodInStorage($scope);  

        // set placeholder values
        $scope.timeEntry.ISOStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
        $scope.timeEntry.ISOEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

        // Check for abandoned stopwatch    
        chrome.storage.sync.get(['stopwatch'], function (items) {
            if ('stopwatch' in items) {
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
                            var midnight = new Date(now.getFullYear(), 0, 1, 23, 59, 0);
                            $scope.timeEntry.ISOStartTime = start;
                            $scope.timeEntry.ISOEndTime = midnight;
                            TimeEntryService.updateInProgressEntry('startEndTimes', [start, midnight]);
                        })
                        $scope.abandonedStopwatch = true;
                        $scope.runningStopwatch = false;
                    }
                }
            }
        })
	}

	this.afterGetCompany = function(company, $scope) {
        if (company.DCAALoggingEnabled || company.HasModuleSubJob) {
            $scope.$parent.DCAASubJobError = true;
            $scope.logout();
        }
        $scope.company = company;
	}

	this.afterGetJobClients = function(jobClientsList, $scope) {
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
}])
