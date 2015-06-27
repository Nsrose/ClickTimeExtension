// Main controller for the extension. By this point, user must be logged in. 
myApp.controller("PageController", ['$scope', 'APIService', 'CTService', 'EntityService', 'TimeEntryService', '$http', function ($scope, APIService, CTService, EntityService, TimeEntryService, $http) {

    $scope.variables = [];

    var _StopWatch = new StopWatch();
    $scope.UserName = null;
    $scope.UserID = null;
   
    $scope.Session = null;

    $scope.jobsList = null;
    $scope.HasEmptyEntities = false;

    $scope.pageReady = false;


    //// Interface logic ////
    // Returns true iff the extension is ready.
    // All fields need to be ready, including client, job, task, user, company
    $scope.pageReadyFunc = function () {
        if ($scope.jobs && $scope.clients && $scope.tasks && $scope.user && $scope.company) {
            return true;
        }
        return false;
    }

    $scope.$watch('variables', function(newVal, oldVal) {
        if ($scope.variables.length == NUM_SCOPE_VARS) {
            $scope.pageReady = true;
            console.log($scope.variables);
        }
    }, true)

    // stopwatch
    $scope.startStopWatch = function() {
        _StopWatch.start();
    }
        
    $scope.stopStopWatch = function() {
        _StopWatch.stop();
        $scope.timeEntry.hours = _StopWatch.duration();
        setTimeout(function() {
            _StopWatch.reset();
            }, 1000
        );
    }

    // Clears stop watch to 0:00:00
    $scope.clearStopwatch = function () {
        setInterval(function() {
            $scope.timeEntry.hours = _StopWatch.formatTime(_StopWatch.time());
            $scope.$apply();
        }, 1000);
    }

    // Updates screen every second
    if ($scope.showStopwatch) {
        // setInterval(function() {
        //     $scope.user.timeEntry = _StopWatch.formatTime(_StopWatch.time());
        //     $scope.$apply();
        //     }, 1000
        // );
        $scope.clearStopwatch();
    }
    
    ////////////////////////////////////////////////////////////////////////////////////////////

    ////// Time entry ////// 
    $scope.saveTimeEntry = function (session, timeEntry) {
        var clickTimeEntry = {
            "BreakTime" : timeEntry.BreakTime,
            "Comment" : timeEntry.Comment,
            "Date" : timeEntry.Date,
            "Hours" : timeEntry.Hours,
            "JobID" : timeEntry.JobID,
            "PhaseID" : timeEntry.PhaseID,
            "SubPhaseID" : timeEntry.SubPhaseID,
            "TaskID" : timeEntry.TaskID,
        }
        if ($scope.showStartEndTimes) {
            var ISOEndTime = CTService.convertISO(timeEntry.ISOEndTime);
            var ISOStartTime = CTService.convertISO(timeEntry.ISOStartTime);
            clickTimeEntry.ISOStartTime = ISOStartTime;
            clickTimeEntry.ISOEndTime = ISOEndTime;
        }

        TimeEntryService.saveTimeEntry(session, clickTimeEntry, function (response) {
            if (response.status == 200) {
                alert("Saved time entry of " + clickTimeEntry.Hours +" hours.");
            } else {
                alert("An error occured.");
            }
        });
        EntityService.updateRecentEntities(timeEntry);
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

    // Returns true iff the regular time entry field should be shown for this user.
    var showTimeEntryField = function() {
        if ($scope.user != null) {
            return !$scope.showStopwatch && !$scope.showStartEndTimes;
        }
        alert("Need to get user before calling showTimeEntryField");
    }

    // Round hour inputs
    $scope.roundHour = function (time, timeToIncrement) {
        if (time) {
            $scope.timeEntry.hours = CTService.roundToNearest(time, timeToIncrement);
        }
        
    }

    ////////////////////////////




    // Logout function
    $scope.logout = function() {
        chrome.storage.sync.remove(CHROME_STORAGE_VARS, function () {
            alert("Logged out.");
            window.location.href = "../../templates/login.html";
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
            $scope.showTimeEntryField = showTimeEntryField();
           
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
        $scope.timeEntry = {
            "BreakTime":0.00,
            "Comment":"",
            "Date":dateString,
            "Hours":0.00,
            "ISOEndTime":new Date(),
            "ISOStartTime":new Date(),
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
            $scope.showTimeEntryField = showTimeEntryField();
           

            $scope.isDev = user.UserID == '27fbqzVh1Tok';

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


    //// Dev tools ////

    // Show stopwatch
    $scope.devShowStopwatch = function () {
        $scope.showStartEndTimes = false;
        $scope.showTimeEntryField = false;
        $scope.showStopwatch = true;
        $scope.clearStopwatch();
    }

    // Show startendtimes
    $scope.devShowStartEndTimes = function () {
        $scope.showStopwatch = false;
        $scope.showTimeEntryField = false;
        $scope.showStartEndTimes = true;
    }

    // Show time entry field
    $scope.devShowTimeEntryField = function () {
        $scope.showStartEndTimes = false;
        $scope.showStopwatch = false;
        $scope.showTimeEntryField = true;
    }

}]);

