var API_BASE = "https://app.clicktime.com/api/1.3/";
var USER_EMAIL = 'nrose@clicktime.com';
var USER_PASSWORD = 'berkeleycs17';

myApp.controller("PageController", ['$scope', 'SessionService', 'CompanyService', '$http',
    function ($scope, SessionService, CompanyService, $http) {
    $scope.message = "Hello from AngularJS";

    SessionService.getSession(USER_EMAIL, USER_PASSWORD, function (session) {
        if (session == null) {
            alert("We're sorry, there was an error processing your request.");
            return;
        }
        $scope.UserName = session.UserName;
        
        CompanyService.getCompany(USER_EMAIL, USER_PASSWORD, session.CompanyID, function (company) {
            console.log(company);
            if (company == null) {
                alert("We're sorry, there was an error processing your request.");
                return;
            }
            console.log(company.Name);
            $scope.CompanyName = company.Name;
        })

    });

   

}]);



