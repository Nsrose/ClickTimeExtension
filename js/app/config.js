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
      .otherwise({
        redirectTo: '/login'
      });

  }]);