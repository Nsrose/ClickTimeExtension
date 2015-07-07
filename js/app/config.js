// Configs for extension

myApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider
      .when('/time_entry', {
        templateUrl: '../../templates/time_entry.html',
        controller: 'TimeEntryController'
      })
      .when('/login', {
        templateUrl: '../../templates/login.html',
        controller: 'LoginEntryController'
      })
      .when("/stored_time", {
        templateUrl: "../../templates/stored_time.html",
        controller: 'StoredTimeEntryController'
      })
      .otherwise({
        redirectTo: '/login'
      });

  }]);