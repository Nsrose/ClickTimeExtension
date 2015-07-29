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

	// Return the start time in HH:MM format string
	this.getStartTime = function (callback) {
		chrome.storage.sync.get('stopwatch', function (items) {
			if ('stopwatch' in items) {
				var stopwatch = items.stopwatch;
				var hrs = stopwatch.startHrs + '';
				if (hrs.length == 1) {
					hrs = "0" + hrs;
				}
				var min = stopwatch.startMin + '';
				if (min.length == 1) {
					min = "0" + min;
				}
				var startTime = hrs + ":" + min;
				callback(startTime);
			}
		})
	}

	// Get the elapsed time of the stopwatch. 
	// If no running stopwatches, then this will be 0.
	// Return an object with elapsed hours, minutes, and seconds.
	this.getElapsedTime = function (callback) {
		chrome.storage.sync.get('stopwatch', function (items) {
			if ('stopwatch' in items) {
				var now = new Date();
				var storedWatch = items.stopwatch;
				var startTime = new Date(storedWatch.startYear, storedWatch.startMonth, storedWatch.startDay,
					storedWatch.startHrs, storedWatch.startMin, storedWatch.startSec);
				var elapsedTimeMS = now - startTime;
				var elapsedSec = Math.floor(elapsedTimeMS / 1000);
				var elapsedMin = Math.floor(elapsedSec / 60);
				var elapsedHrs = Math.floor(elapsedMin / 60);
				var elapsedObj = {
					'elapsedHrs' : elapsedHrs,
					'elapsedMin' : elapsedMin,
					'elapsedSec' : elapsedSec,
					'running' : storedWatch.running
				};
				callback(elapsedObj);
			} else {
				var elapsedObj = {
					'elapsedHrs' : 0,
					'elapsedMin' : 0,
					'elapsedSec' : 0,
					'running' : false
				};
				callback(elapsedObj);
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
