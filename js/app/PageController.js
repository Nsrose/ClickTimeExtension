
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
                return;
            }
        }
        // Session couldn't be found
        alert(REQUEST_ERROR_MESSAGE);
        return;
    })

}]);



