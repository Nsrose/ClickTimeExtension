myApp.controller("AppController", ['$scope', '$location', '$apiBases', '$apiBase', 'InternetConnectivity',
						function ($scope, $location, $apiBases, $apiBase, InternetConnectivity) {
	$scope.Session = null;

    // Error for DCAA/ Sub Job modules 
    $scope.DCAASubJobError = false;

    // Error for users requiring Stopwatch
    $scope.RequireStopwatch = false;

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

    // Secret environment change button
    // If count == 4, display the dropdown
    $scope.environmentButton = {
    	'count' : 0
    }

    // Increase environment button count
    $scope.updateButton = function() {
    	$scope.environmentButton.count += 1;
    	if ($scope.environmentButton.count >= 4) {
    		$scope.showEnvironmentChange = true;
    	}
    }

    // Listen for environment change
    $scope.$on('environmentChange', function (event, environment) {
    	$scope.changeEnvironment(environment);
    })

    // this has a listener for runtime internet failures
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (message.internetConnected === false) {
            InternetConnectivity.displayOfflineModal();
        } else if (message.internetConnected === true) {
            InternetConnectivity.hideOfflineModal()
        }
    });


    // Change the api base url based on environment change by sending the change to 
    // the background script
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

    $scope.clearSuccessfulMessage = function() {
        if ($scope.generalSuccess == true) {
            $scope.generalSuccess = false;
            $scope.$apply();
        }
    }
}])
