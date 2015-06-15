var API_BASE = "https://app.clicktime.com/api/1.3/"






myApp.controller("PageController", ['$scope', 'SessionService', '$http', function ($scope, SessionService,  $http) {
    $scope.message = "Hello from AngularJS";

    SessionService.getSession('nrose@clicktime.com', 'berkeleycs17' ,function (session) {
        $scope.user_name = session.UserName;
    })
    

}]);



