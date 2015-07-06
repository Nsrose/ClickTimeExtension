myApp.controller('StopwatchController', ['$scope', 'StopwatchService', '$interval', function ($scope, StopwatchService, $interval) {
	$scope.elapsedSec = "00";
	$scope.elapsedMin = "00";
	$scope.elapsedHrs = "00";

	var totalElapsedMs = 0;
    var elapsedMs = 0;
   
    var startTime;
    var timerPromise;

    $scope.running = false;

	$scope.start = function () {
		if (!timerPromise) {
			StopwatchService.markStartTime(function (start) {
				startTime = start;
	      		$scope.running = true;
	      		timerPromise = $interval(function() {
	      			var now = new Date();
	      			$scope.getElapsedTime(now);
	      			// $scope.getElapsedMin(now);
	      			// $scope.getElapsedHrs(now);
	      			// elapsedMs = now.getTime() - startTime.getTime();
	      		}, 31)
			}) 		
     	}
	}


	$scope.getElapsedTime = function (now) {
		StopwatchService.getElapsedTime(function (elapsedObj) {
    		secDisp = elapsedObj.elapsedSec % 60 + '';
    		minDisp = elapsedObj.elapsedMin % 60 + '';
    		hrsDisp = elapsedObj.elapsedHrs + '';
    		if (secDisp.length == 1) {
    			secDisp = "0" + secDisp;
    		}
    		if (minDisp.length == 1) {
    			minDisp = "0" + minDisp;
    		}
    		if (hrsDisp.length == 1) {
    			hrsDisp = "0" + hrsDisp;
    		}
    		$scope.elapsedSec = secDisp;
    		$scope.elapsedMin = minDisp;
    		$scope.elapsedHrs = hrsDisp;
    	})
	}
}])