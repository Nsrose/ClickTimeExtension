// Services for managing running stopwatches, etc
myApp.service("StopwatchService", function() {

	// Mark start time in local storage
	this.markStartTime = function (callback) {
		var startTime = new Date();
		var storedTime = {
			'startYear' : startTime.getFullYear(),
			'startMonth' : startTime.getMonth(),
			'startDay' : startTime.getDate(),
			'startHrs' : startTime.getHours(),
			'startMin' : startTime.getMinutes(),
			'startSec' : startTime.getSeconds(),
			'running' : true
		}
		chrome.storage.sync.set({
			'stopwatch' : storedTime
		}, function() {
			callback(startTime);
		})
	}

	// Return the start time as a Date object
	this.getStartTime = function (callback) {
		chrome.storage.sync.get('stopwatch', function (items) {
			if ('stopwatch' in items) {
				var stopwatch = items.stopwatch;
				var year = stopwatch.startYear;
				var month = stopwatch.startMonth;
				var day = stopwatch.startDay;
				var hrs = stopwatch.startHrs;
				var min = stopwatch.startMin;
				var sec = stopwatch.startSec;
				var startTime = new Date(year, month, day, hrs, min, sec);
				callback(startTime);
			}
		})
	}

	// Mark end time 
	this.markEndTime = function (callback) {
		chrome.storage.sync.get('stopwatch', function(items) {
			if ('stopwatch' in items) {
				var stopwatch = items.stopwatch;
				var endTime = new Date();
				stopwatch.endYear = endTime.getFullYear();
				stopwatch.endMonth = endTime.getMonth();
				stopwatch.endDay = endTime.getDate();
				stopwatch.endHrs = endTime.getHours();
				stopwatch.endMin = endTime.getMinutes();
				stopwatch.endSec = endTime.getSeconds();
				stopwatch.running = false;
				chrome.storage.sync.set({
					'stopwatch' : stopwatch
				}, function() {
					callback();					
				}) 
			}
		})
	}

	// Clear stopwatch to 0
	this.clear = function (callback) {
		chrome.storage.sync.remove('stopwatch', function() {
			callback();
		})
	}
})
