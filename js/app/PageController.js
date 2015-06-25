// Main controller for the extension. By this point, user must be logged in. 
myApp.controller("PageController", ['$scope', 'APIService', 'EntityService', '$http', function ($scope, APIService, EntityService, $http) {

    var _StopWatch = new StopWatch();
    $scope.UserName = null;
    $scope.UserID = null;
    $scope.DisplayTime = _StopWatch.formatTime(0);
    $scope.Session = null;

    $scope.jobsList = null;
    $scope.HasEmptyEntities = false;

    // stopwatch
    $scope.startStopWatch = function() {
        _StopWatch.start();
    }
        
    $scope.stopStopWatch = function() {
        _StopWatch.stop();
        $scope.DisplayTime = _StopWatch.duration();
        setTimeout(function() {
            _StopWatch.reset();
            }, 1000
        );
    }

    setInterval(function() {
        $scope.DisplayTime = _StopWatch.formatTime(_StopWatch.time());
        $scope.$apply();
        }, 1000
    );


    ////// Time entry ////// 
    $scope.saveTimeEntry = function (user, client, job, task) {
       EntityService.saveTimeEntry(user, client, job, task);
    }

    // Returns true iff the stopwatch should be shown for this user.
    $scope.showStopwatch = function () {
        if ($scope.user != null) {
            return $scope.user.RequireStopwatch;    
        }
        alert("Need to get user before calling showStopwatch");
    }

    // Returns true iff start and end time fields should be shown for this user.
    // True iff start and end times are required AND the stopwatch shouldn't be shown.
    $scope.showStartEndTimes = function() {
        if ($scope.user != null) {
            return !$scope.showStopwatch() && $scope.user.RequireStartEndTime;
        }
        alert("Need to get user before calling showStartEndTimes");
    }

    // Returns true iff the regular time entry field should be shown for this user.
    $scope.showTimeEntryField = function() {
        if ($scope.user != null) {
            return !$scope.showStopwatch() && !$scope.showStartEndTimes();
        }
        alert("Need to get user before calling showTimeEntryField");
    }

    // Round hour inputs
    $scope.roundHour = function (time, timeToIncrement) {
        if (time) {
            $scope.user.timeEntry = EntityService.roundToNearest(time, timeToIncrement);
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
            $scope.$apply();
        }

        var afterGetTasks = function (tasksList) {
            $scope.tasks = tasksList;
            if (tasksList.length == 0) {
                $scope.HasEmptyEntities = true;
            }
            $scope.task = tasksList[0];
            $scope.$apply();
        }

        var afterGetUser = function (user) {
            $scope.user = user;
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
       
        $scope.IsManagerOrAdmin = EntityService.SecurityLevel == 'manager'
            || EntityService.SecurityLevel == 'admin';

        $scope.HasEmptyEntities = false;

        var afterGetClients = function (clientsList) {
            $scope.clients = clientsList;
            if (clientsList.length == 0) {
                $scope.HasEmptyEntities = true;
            }
            console.log($scope.clients);
            $scope.client = clientsList[0];
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
            console.log($scope.jobs);
            $scope.job = $scope.jobs[0];
            $scope.$apply();
        }

        var afterGetTasks = function (tasksList) {
            $scope.tasks = tasksList;
            if (tasksList.length == 0) {
                $scope.HasEmptyEntities = true;
            }
            console.log($scope.tasks);
            $scope.task = tasksList[0];
            $scope.$apply();
        }

        var afterGetUser = function (user) {
            $scope.user = user;
            $scope.$apply();
        }

        var afterGetCompany = function (company) {
            $scope.company = company;
            $scope.$apply();
        }


        EntityService.getClients(session, true, afterGetClients);
        EntityService.getJobs(session, true, afterGetJobs);
        EntityService.getTasks(session, true, afterGetTasks);
        EntityService.getUser(session, true, afterGetUser);
        EntityService.getCompany(session, true, afterGetCompany);

    }


    EntityService.getSession(afterGetSession);

}]);

