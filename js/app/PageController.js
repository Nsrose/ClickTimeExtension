
// Main controller for the extension. By this point, user must be logged in. 
myApp.controller("PageController", ['$scope', 'APIService', '$http',
    function ($scope, APIService, $http) {
    $scope.UserName = null;
    $scope.UserID = null;
    
    // Get the session of the user from storage.
    chrome.storage.sync.get('session', function (items) {
        var session = items['session'];
        if (session == null) {
            // This should never happen, but just in case
            alert(REQUEST_ERROR_MESSAGE);
            return;
        }
        console.log(session);
    })

}]);



