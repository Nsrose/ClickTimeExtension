// Configs for extension

myApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/popup', {
        templateUrl: '../../templates/popup.html',
        controller: 'PageController'
      }).
      when('/login', {
        templateUrl: '../../templates/login.html',
        controller: 'LoginController'
      }).
      otherwise({
        redirectTo: '/login'
      });
  }]);