myApp.controller("AppController", ['$scope', '$location', '$apiBases', '$apiBase', 
						function ($scope, $location, $apiBases, $apiBase) {
	$scope.Session = null;
    $scope.pageReady = false;
    $scope.$on('pageReady', function() {
        $scope.pageReady = true;
    })
    $scope.$on('pageLoading', function() {
        $scope.pageReady = false;
    })

    $scope.environmentButton = {
    	'count' : 0
    }

    $scope.updateButton = function() {
    	$scope.environmentButton.count += 1;
    	if ($scope.environmentButton.count >= 4) {
    		$scope.showEnvironmentChange = true;
    	}
    }

    $scope.$on('environmentChange', function (event, environment) {
    	if (environment in $apiBases) {
    		$apiBase.url = $apiBases[environment];
    		chrome.runtime.sendMessage({
    			changeUrl: true,
    			url: $apiBase.url
    		})
    	} else {
    		bootbox.alert("Invalid environment switch option: " + environment);
    	}
    })


}])
