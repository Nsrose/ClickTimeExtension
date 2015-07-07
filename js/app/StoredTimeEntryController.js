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

	// Attempt to save a stored entry. If successful, removes from the stored list
	$scope.saveStoredEntry = function (timeEntry) {
		TimeEntryService.saveTimeEntry($scope.session, timeEntry)
		.then(function (response) {
            var d = new Date();
            alert("Entry successfully uploaded at " + d.toTimeString() + ".");
            $scope.$broadcast("pageReady");
        })
        .catch(function (response) {
            $scope.$broadcast("timeEntryError")
            alert("Could not save time entry. Entry is still saved locally.");
            $scope.$broadcast("pageReady");
        });
	}


}])