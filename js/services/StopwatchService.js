// Services for managing running stopwatches, etc
myApp.service("StopwatchService", function() {

	// Return the start time of a stopwatch.
	// First check local storage for a running stopwatch, otherwise
	// start a new one.
	this.getStartTime = function (callback) {
		chrome.storage.sync.get('stopwatchStartTime', function (items) {
			if ('stopwatchStartTime' in items) {
				callback(items.stopwatchStartTime);
			} else {
				var startTime = new Date();
				chrome.storage.sync.set({
					'stopwatchStartTime' : startTime 
				}, function() {
					callback(startTime);
				})
			}
		})
	}
})