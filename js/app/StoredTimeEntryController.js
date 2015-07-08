myApp.controller("StoredTimeEntryController", ['$scope', 'TimeEntryService', '$location', function ($scope, TimeEntryService, $location) {
	$scope.storedTimeEntries = [];
	$scope.showTimeEntry = function() {
		$location.path("/time_entry");
	}


	chrome.storage.sync.get('storedTimeEntries', function (items) {
		if ('storedTimeEntries' in items) {
			$scope.storedTimeEntries = items.storedTimeEntries;
			$scope.$apply();
		}
	})

	// Attempts to save the local list of stored time entries. For each successful
	// save, deletes that time entry from local storage.
	$scope.saveStoredEntries = function () {
		$scope.$parent.$broadcast("pageLoading");

		var unsuccessfulStoredEntries = [];
		var numSuccessfulUploads = 0;

		chrome.storage.sync.get('storedTimeEntries', function (items) {
			if ('storedTimeEntries' in items) {
				var storedTimeEntries = items.storedTimeEntries;
				for (i in storedTimeEntries) {
					storedEntry = storedTimeEntries[i];
					TimeEntryService.saveTimeEntry($scope.Session, storedEntry)
					.then(function (response) {
						numSuccessfulUploads += 1;
					})
					.catch(function (response) {
						console.log("Could not save time entry. Entry is still saved locally.");
						unsuccessfulStoredEntries.push(storedEntry);
					})
				}
				chrome.storage.sync.set({
					'storedTimeEntries' : unsuccessfulStoredEntries
				}, function() {
					console.log("Resaved " + unsuccessfulStoredEntries.length + " unsuccessful entries to local storage.");
					alert("Successfully uploaded " + numSuccessfulUploads + " locally stored entries.");
					$scope.$parent.$broadcast("pageReady");
				})
				
			}
		})
	}


}])