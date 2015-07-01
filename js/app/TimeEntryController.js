myApp.controller("TimeEntryController", ['$scope', '$q', '$interval', '$location', 'APIService', 'CTService', 'EntityService', 'TimeEntryService', '$http', function ($scope, $q, $interval, $location, APIService, CTService, EntityService, TimeEntryService, $http) {
    $scope.variables = [];

    // var _StopWatch = new StopWatch();
    $scope.UserName = null;
    $scope.UserID = null;
   
    $scope.Session = null;

    $scope.jobsList = null;
    $scope.HasEmptyEntities = false;

    $scope.pageReady = false;


    //// Interface logic ////
    $scope.clearError = function (error) {
        switch (error) {
            case "hours":
                $scope.timeEntryErrorHoursZero = false;
                $scope.timeEntryErrorHoursInvalid = false;
                break;
            case "startEndTimes":
                $scope.timeEntryErrorStartEndTimes = false;
                break;
            default:
                break;
        }
    }


    $scope.$watch('variables', function(newVal, oldVal) {
        if ($scope.variables.length == NUM_SCOPE_VARS) {
            $scope.pageReady = true;
        }
    }, true)

    
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
    			alert("Invalid time entry method");
    			break;
    	}
    }


    $scope.saveTimeEntry = function (session, timeEntry) {
        if (!validateTimeEntry(timeEntry)) {
            return;
        }

        var clickTimeEntry = {
            "BreakTime" : timeEntry.BreakTime,
            "Comment" : timeEntry.Comment,
            "Date" : timeEntry.Date,
            "JobID" : timeEntry.JobID,
            "PhaseID" : timeEntry.PhaseID,
            "SubPhaseID" : timeEntry.SubPhaseID,
            "TaskID" : timeEntry.TaskID,
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
        }
        

        $scope.pageReady = false;
        TimeEntryService.saveTimeEntry(session, clickTimeEntry)
        .then(function (response) {
            var d = new Date();
            alert("Entry successfully uploaded at " + d.toTimeString() + ".");
            $scope.pageReady = true;
        })
        .catch(function (response) {
            if (response.data == null) {
                var d = new Date();
                alert('Currently unable to upload entry. Entry saved locally at ' + d.toTimeString() + '. Your entry will be uploaded once a connection can be established');
            } else {
                alert("An error occured.");
            }
            $scope.pageReady = true;
        });
        EntityService.updateRecentEntities(timeEntry);
    }

    // True iff time entry is valid. Will also throw red error messages.
    var validateTimeEntry = function (timeEntry) {
        if (timeEntry.JobID == "" || timeEntry.TaskID == "") {
            alert("Job or task cannot be empty.");
            return false;
        }
        
        if ($scope.showStartEndTimes) {
            if (timeEntry.ISOStartTime == null || timeEntry.ISOEndTime == null) {
                $scope.timeEntryErrorStartEndTimes = true;
                return false;
            }
            var hourDiff = (timeEntry.ISOEndTime - timeEntry.ISOStartTime) / 36e5;
            if (hourDiff <=0 ) {
                $scope.timeEntryErrorStartEndTimes
            }
        }

        if ($scope.showHourEntryField) {
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
                break;
            case "job":
                $scope.timeEntry.job = entity;
                $scope.timeEntry.JobID = entity.JobID;
                break;
            case "task":
                $scope.timeEntry.task = entity;
                $scope.timeEntry.TaskID = entity.TaskID;
                break;
            default:
                alert("Improper entity of type: " + entityType);
                break;
        }
    }

    // Returns true iff the stopwatch should be shown for this user.
    var showStopwatch = function () {
        if ($scope.user != null) {
            return $scope.user.RequireStopwatch;    
        }
        alert("Need to get user before calling showStopwatch");
    }

    // Returns true iff start and end time fields should be shown for this user.
    // True iff start and end times are required AND the stopwatch shouldn't be shown.
    var showStartEndTimes = function() {
        if ($scope.user != null) {
            return !$scope.showStopwatch && $scope.user.RequireStartEndTime;
        }
        alert("Need to get user before calling showStartEndTimes");
    }

    // Returns true iff the regular hour entry field should be shown for this user.
    var showHourEntryField = function() {
        if ($scope.user != null) {
            return !$scope.showStopwatch && !$scope.showStartEndTimes;
        }
        alert("Need to get user before calling showHourEntryField");
    }

    // Round hour inputs
    $scope.roundHour = function (time, timeToIncrement) {
        if (time) {
            $scope.timeEntry.Hours = CTService.roundToNearest(time, timeToIncrement);
        }
        
    }

    ////////////////////////////




    // Logout function
    $scope.logout = function() {
        chrome.storage.sync.remove(CHROME_STORAGE_VARS, function () {
            alert("Logged out.");
            $location.path("/login");
            $scope.$apply();
        })
    }

    // Refresh function
    // This forces an API call for the jobs, clients, and tasks dropdown menus
    $scope.refresh = function() {
        console.log("Fetching the most recent data from Clicktime");

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

            $scope.showStopwatch = showStopwatch();
            $scope.showStartEndTimes = showStartEndTimes();
            $scope.showHourEntryField = showHourEntryField();
           
            $scope.isDev = user.UserID == '27fbqzVh1Tok';



            if ($scope.showStopwatch) {
                $scope.timeEntry.hours = _StopWatch.formatTime(0);
            }
            $scope.$apply();
        }

        var afterGetCompany = function (company) {
            $scope.company = company;
            $scope.$apply();
        }


        EntityService.getClients($scope.Session, false, afterGetClients);
        EntityService.getJobs($scope.Session, false, afterGetJobs);
        EntityService.getTasks($scope.Session, false, afterGetTasks);
        EntityService.getUser($scope.Session, false, afterGetUser);
        EntityService.getCompany($scope.Session, false, afterGetCompany);
    }


    

    // Watch for a clientID change in the dropdown to show available jobs
    $scope.$watch('client.ClientID', function (clientID) {
        if ($scope.jobsList) {
            $scope.jobs = $scope.jobsList.filter(function (job) {return job.ClientID == clientID});
            $scope.job = $scope.jobs[0];
        }
    })

    
    // Get the session of the user from storage.
    var afterGetSession = function (session) {
        $scope.Session = session;
        $scope.variables.push('session');
         // default empty time entry
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
       
        $scope.IsManagerOrAdmin = EntityService.SecurityLevel == 'manager'
            || EntityService.SecurityLevel == 'admin';

        $scope.HasEmptyEntities = false;

        var afterGetClients = function (clientsList) {
            $scope.clients = clientsList;
            if (clientsList.length == 0) {
                $scope.HasEmptyEntities = true;
            }
            $scope.client = clientsList[0];
            if ($scope.timeEntry.client == null) {
                $scope.timeEntry.client = $scope.client;
            }

            $scope.variables.push('clients');
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
            $scope.variables.push('jobs');
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
            $scope.variables.push('tasks');
            $scope.$apply();
        }

        var afterGetUser = function (user) {
            $scope.user = user;
            $scope.showStopwatch = showStopwatch();
            $scope.showStartEndTimes = showStartEndTimes();
            $scope.showHourEntryField = showHourEntryField();

            if ($scope.showStopwatch) {
                $scope.timeEntry.hours = _StopWatch.formatTime(0);
            }

            $scope.variables.push('user');
            $scope.$apply();
        }

        var afterGetCompany = function (company) {
            $scope.company = company;
            $scope.variables.push('company');
            $scope.$apply();
        }


        EntityService.getClients(session, true, afterGetClients);
        EntityService.getJobs(session, true, afterGetJobs);
        EntityService.getTasks(session, true, afterGetTasks);
        EntityService.getUser(session, true, afterGetUser);
        EntityService.getCompany(session, true, afterGetCompany);

    }


    EntityService.getSession(afterGetSession);



   
}])