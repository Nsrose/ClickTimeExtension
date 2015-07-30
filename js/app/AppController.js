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

    // API base change upon opening:
    chrome.storage.sync.get('apiBaseURL', function (items) {
    	if ('apiBaseURL' in items) {
    		$apiBase.url = items.apiBaseURL;
    		chrome.runtime.sendMessage({
    			changeUrl: true,
    			url: $apiBase.url
    		})
    		$scope.$apply();
    	}
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
    	$scope.changeEnvironment(environment);
    })

    $scope.changeEnvironment = function (environment) {
    	if (environment in $apiBases) {
    		$apiBase.url = $apiBases[environment];
    		chrome.runtime.sendMessage({
    			changeUrl: true,
    			url: $apiBase.url
    		})
    		chrome.storage.sync.set({
    			'apiBaseURL' : $apiBase.url
    		})
    	} else {
    		bootbox.alert("Invalid environment switch option: " + environment);
    	}
    }


}])
