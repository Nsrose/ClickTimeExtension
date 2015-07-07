myApp.controller("AppController", ['$scope', function ($scope) {
	$scope.Session = null;
	$scope.pageReady = false;

	$scope.$on('pageReady', function() {
        $scope.pageReady = true;
    })

    $scope.$on('pageLoading', function() {
        $scope.pageReady = false;
    })


}])