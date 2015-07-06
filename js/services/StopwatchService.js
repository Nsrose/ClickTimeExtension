// Services for managing running stopwatches, etc
myApp.service("StopwatchService", function() {

	// Return the start time of a stopwatch.
	// First check local storage for a running stopwatch, otherwise
	// start a new one.
	this.getStartTime = function (callback) {
		chrome.storage.sync.get('stopwatch', function (items) {
			if ('stopwatch' in items) {
				var storedTime = items.stopwatch;
				var startTime = new Date(storedTime.startYear, storedTime.startMonth, storedTime.startDay,
					storedTime.startHrs, storedTime.startMin, storedTime.startSec);
				callback(startTime);
			} else {
				var startTime = new Date();
				var storedTime = {
					'startYear' : startTime.getFullYear(),
					'startMonth' : startTime.getMonth(),
					'startDay' : startTime.getDate(),
					'startHrs' : startTime.getHours(),
					'startMin' : startTime.getMinutes(),
					'startSec' : startTime.getSeconds()
				}
				chrome.storage.sync.set({
					'stopwatch' : storedTime
				}, function() {
					callback(startTime);
				})
			}
		})
	}

	// Mark start time in local storage
	this.markStartTime = function (callback) {
		var startTime = new Date();
		var storedTime = {
			'startYear' : startTime.getFullYear(),
			'startMonth' : startTime.getMonth(),
			'startDay' : startTime.getDate(),
			'startHrs' : startTime.getHours(),
			'startMin' : startTime.getMinutes(),
			'startSec' : startTime.getSeconds()
		}
		chrome.storage.sync.set({
			'stopwatch' : storedTime
		}, function() {
			callback(startTime);
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
				var elapsedHrs = now.getHours() - storedWatch.startHrs;
				var elapsedMin = now.getMinutes() - storedWatch.startMin;
				var elapsedSec = now.getSeconds() - storedWatch.startSec;
				var elapsedObj = {
					'elapsedHrs' : elapsedHrs,
					'elapsedMin' : elapsedMin,
					'elapsedSec' : elapsedSec
				};
				callback(elapsedObj);
			} else {
				var elapsedObj = {
					'elapsedHrs' : 0,
					'elapsedMin' : 0,
					'elapsedSec' : 0
				};
				callback(elapsedObj);
			}
		})
	} 

	// Mark end time 
	this.markEndTime = function (callback) {
		chrome.storage.sync.get('stopwatch', function (items) {
			if ('stopwatch' in items) {
				var stopwatch = items.stopwatch;
				var endTime = new Date();
				stopwatch.endYear = endTime.getFullYear();
				stopwatch.endMonth = endTime.getMonth();
				stopwatch.endDay = endTime.getDate();
				stopwatch.endHrs = endTime.getHours();
				stopwatch.endMin = endTime.getMinutes();
				stopwatch.endSec = endTime.getSeconds();
				chrome.storage.sync.set({
					'stopwatch' : stopwatch
				}, function() {
					callback();
				}) 
			}
		})
	}

	// Reset stopwatch to 0
	this.reset = function (callback) {
		chrome.storage.sync.remove('stopwatch', function() {
			callback();
		})
	}
})