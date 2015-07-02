//Stop watch methods for time entry

myApp.directive('stopwatch', ['StopwatchService', function (StopwatchService) {
	return {
		restrict: 'AE',
		templateUrl: 'stopwatch.html',
		scope: {
			currentTime: "=time"
		},
		link: function(scope, element, attrs, ctrl) {
		},
		  
		controllerAs: 'swctrl',
	  	controller: function($scope, $interval) {
		    var self = this;
		    var totalElapsedMs = 0;
		    var elapsedMs = 0;
		    //var time;
		    var startTime;
		    var timerPromise;
		    
		    self.start = function() {
		      if (!timerPromise) {
		      	startTime = new Date();
	        	timerPromise = $interval(function() {
		          var now = new Date();
		          //$scope.time = now;
		          elapsedMs = now.getTime() - startTime.getTime();
		        }, 31);
		     
		      }
		    };
		    
		    self.stop = function() {
		      if (timerPromise) {
		        $interval.cancel(timerPromise);
		        timerPromise = undefined;
		        totalElapsedMs += elapsedMs;
		        elapsedMs = 0;
		      }
		    };
		    
		    self.reset = function() {
		      startTime = new Date();
		      totalElapsedMs = elapsedMs = 0;
		    };
		    
		    self.getTime = function() {
		      return time;
		    };
		    
		    self.getElapsedMs = function() {
		      return totalElapsedMs + elapsedMs;
		    };


		    self.getElapsedSec = function() {
		    	return Math.floor(self.getElapsedMs() / 1000);
		    }

		    self.getElapsedSecDisp = function() {
		    	var secDisp = self.getElapsedSec() % 60 + '';
		    	if (secDisp.length == 1) {
		    		secDisp = "0" + secDisp;
		    	}
		    	return secDisp; 
		    }

		    self.getElapsedMin = function() {
		    	return Math.floor(self.getElapsedSec() / 60);
		    }

		    self.getElapsedMinDisp = function() {
		    	var minDisp = self.getElapsedMin() % 60 + '';
		    	if (minDisp.length == 1) {
		    		minDisp = "0" + minDisp;
		    	}
		    	return minDisp; 
		    }

		    self.getElapsedHrs = function() {
		    	return Math.floor(self.getElapsedMin() / 60);
		    }

		    self.getElapsedHrsDisp = function() {
		    	var hrsDisp = self.getElapsedHrs() + '';
		    	if (hrsDisp.length == 1) {
		    		hrsDisp = "0" + hrsDisp;
		    	}
		    	return hrsDisp;
		    }

		}
	}
}])
