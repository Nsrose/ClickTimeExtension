
// Main controller for the extension. By this point, user must be logged in. 
myApp.controller("PageController", ['$scope', 'APIService', '$http',
    function ($scope, APIService, $http) {
    $scope.UserName = null;
    $scope.UserID = null;

    // Logout function
    $scope.logout = function() {
        chrome.storage.sync.remove('session', function () {
            alert("Logged out.");
            window.location.href = "../../templates/login.html";
        })
    }
    
    // Get the session of the user from storage.
    chrome.storage.sync.get('session', function (items) {
        if ('session' in items) {
            var session = items.session.data;
            if (session != null) {
                // Everything's good to go here



                // Session values
                $scope.UserName = session.UserName;
                $scope.UserID = session.UserID;
                $scope.CompanyID = session.CompanyID;
                $scope.UserEmail = session.UserEmail;
                $scope.Token = session.Token;



                ////// Async calls to the API to fill out fields //////
                var baseURL = API_BASE + "Companies/" + $scope.CompanyID + "/Users/" + $scope.UserID;

                // Fetch the clients
                var clientsURL = baseURL + "/Clients";
                APIService.apiCall(clientsURL, $scope.UserEmail, $scope.Token, 'GET')
                .then( function (response) {
                    if (response.data == null) {
                        alert("We're sorry, there was an error fetching the clients list.");
                    }
                    $scope.clients = response.data;
                    $scope.Client = response.data[0];
                })



                // Fetch the jobs
                var jobsURL = baseURL + "/Jobs";
                APIService.apiCall(jobsURL, $scope.UserEmail, $scope.Token, 'GET')
                .then( function (response) {
                    if (response.data == null) {
                        alert("We're sorry, there was an error fetching the jobs list.");
                    }
                    $scope.jobs = response.data;
                    $scope.Job = response.data[0];
                })


                // Fetch the tasks
                var tasksURL = baseURL + "/Tasks";
                APIService.apiCall(tasksURL, $scope.UserEmail, $scope.Token, 'GET')
                .then( function (response) {
                    if (response.data == null) {
                        alert("We're sorry, there was an error fetching the tasks list.");
                    }
                    $scope.tasks = response.data;
                    $scope.Task = response.data[0];
                })

                ////////////////////////////////////////////////////////////



                return;
            }
        }
        // Session couldn't be found
        alert(REQUEST_ERROR_MESSAGE);
        return;
    })

}]);



