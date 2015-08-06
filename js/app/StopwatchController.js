myApp.controller('StopwatchController', ['$scope', 'StopwatchService', '$interval', function ($scope, StopwatchService, $interval) {
	
    StopwatchService.getElapsedTime(function (elapsedObj) {
		var secDisp = elapsedObj.elapsedSec % 60 + '';
		var minDisp = elapsedObj.elapsedMin % 60 + '';
		var hrsDisp = elapsedObj.elapsedHrs + '';
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
		$scope.running = elapsedObj.running;
		if (elapsedObj.running) {
			timerPromise = $interval(function() {
				$scope.getElapsedTime();
			})
		}
		$scope.$apply();
	})
	$scope.elapsedSec = "00";
	$scope.elapsedMin = "00";
	$scope.elapsedHrs = "00";


    var totalElapsedMs = 0;
    var elapsedMs = 0;
   
    var startTime;
    var timerPromise;

    $scope.running = false;

    $scope.$on("timeEntryError", function() {
    	$scope.clear();
    })

    $scope.$on("timeEntrySuccess", function() {
    	$scope.clear();
    })

    $scope.$on("clearStopwatch", function() {
        $scope.clear();
    })

    $scope.$on("startStopwatch", function() {
        $scope.start();
    })

    $scope.$on("stopStopwatch", function() {
        $scope.stop();
    })

    $scope.clear = function() {
    	$scope.elapsedSec = "00";
    	$scope.elapsedMin = "00";
		$scope.elapsedHrs = "00";
    	$scope.running = false;
    	$scope.$parent.runningStopwatch = false;
        // $scope.$parent.showStartTimer = true;
    	$interval.cancel(timerPromise);
    	timerPromise = undefined;
    	StopwatchService.clear(function() {
            chrome.extension.getBackgroundPage().stopBadge();
        })
    }

    $scope.start = function () {
        if (!timerPromise) {
            StopwatchService.markStartTime(function (start) {
                //make sure to erase any existing success messaging
                $scope.generalSuccess = false;
                $scope.$apply();
                //
                startTime = start;
                $scope.running = true;
                $scope.$parent.runningStopwatch = true;
                chrome.extension.getBackgroundPage().updateBadge();
                timerPromise = $interval(function() {
                    $scope.getElapsedTime();
                }, 31);
            })
        }
    }

    $scope.stop = function() {        
    	if (timerPromise) {
            $scope.$parent.$broadcast("stoppedStopwatch");
            StopwatchService.markEndTime (function () {
                $scope.running = false;
                $scope.$parent.runningStopwatch  = false;
                $interval.cancel(timerPromise);
                timerPromise = undefined;
                $scope.$apply();
                chrome.extension.getBackgroundPage().stopBadge();
            })
        }
    }

    $scope.getElapsedTime = function () {
        StopwatchService.getElapsedTime(function (elapsedObj) {
            $scope.$parent.runningStopwatch = true;
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
            $scope.$parent.elapsedSec = secDisp;
            $scope.$parent.elapsedMin = minDisp;
            $scope.$parent.elapsedHrs = hrsDisp;
            $scope.$emit("updateStopwatch");
        })
    }
}])
