
// Main controller for the extension. By this point, user must be logged in. 
myApp.controller("PageController", ['$scope', 'APIService', '$http',
    function ($scope, APIService, $http) {
    $scope.UserName = null;
    $scope.UserID = null;
    
    // Get the session of the user from storage.
    chrome.storage.sync.get('session', function (items) {
        if ('session' in items) {
            var session = items['session'];
            if (session != null) {
                // Everything's good to go here

                $scope.UserName = session.UserName;
                $scope.UserID = session.UserID;
                $scope.CompanyID = session.CompanyID;
                $scope.UserEmail = session.UserEmail;
                $scope.Token = session.Token;

                $scope.ClientID = '1';

                // Fetch the clients
                var clientsURL = API_BASE + "Companies/" + $scope.CompanyID + "/Users/" + 
                    $scope.UserID + "/Clients";
                APIService.apiCall(clientsURL, $scope.UserEmail, $scope.Token, "GET", function (data) {
                    if (data == null) {
                        alert("We're sorry, there was an error fetching the clients list.");
                    }
                    $scope.clients = data;
                })
                
                
                return;
            }
        }
        // Session couldn't be found
        alert(REQUEST_ERROR_MESSAGE);
        return;
    })

}]);



