myApp.controller('SettingsController', ['$scope', '$location', function ($scope, $location) {

  //google analytics
  ga('send', 'pageview', '/settings.html')

  //routing
  $scope.timeEntryPage = function () {
    $location.path("/time_entry");
  }

  // Display lists refreshed messsage on the settings page
  $scope.$on("refresh", function() {
    $('#refresh-status').html('<img src="../img/success_check.png" id="refresh-check">Lists refreshed!');
    setTimeout(function() {
       $('#refresh-status').html('');
    }, 2000);
  })

  //cache userID upon login 
  var userID; 
  chrome.storage.sync.get('timeEntryMethod', function (items) {
    if ('timeEntryMethod' in items) {
      userID = items.timeEntryMethod.UserID;
    }
  })
  
  //cache poll period
  var pollPeriod = chrome.extension.getBackgroundPage().NOTIFICATION_POLL_PERIOD

  // if user can't choose time entry method because their manager restricts, hide element
  chrome.storage.local.get('user', function(items) {
    if ('user' in items) {
      if (items.user.data.RequireStartEndTime || items.user.data.RequireStopwatch) {
        $scope.requireStartEndTime = true;
      }
    }
  })

///////////////////Allow reminders settings ///////////////////////////

  // pull from backend
  chrome.storage.sync.get('allowReminders', function(items) {
    if ('allowReminders' in items) {
      $scope.reminderToggle = {
        checked: items.allowReminders.permission
      }
    }
  })

  // gets backend to change on scope change
  $scope.$watch("reminderToggle.checked | json", function(newValue, oldValue) {
    //branch check so that you only set it after get call above
    if (typeof oldValue != 'undefined') {
      chrome.storage.sync.set({
        'allowReminders': {
          UserID: userID, 
          permission: $scope.reminderToggle.checked
        }
      });
      
      // notifications
      if ($scope.reminderToggle.checked) {
        chrome.extension.getBackgroundPage().createNotifications(pollPeriod);
      } else {
        chrome.extension.getBackgroundPage().stopNotifications();
      }
    }
  });

////////////////////time entry settings //////////////////////////////
  
  // do pulls only if you have ability to change permissions
  if (!$scope.requireStartEndTime) {
    // pulls from backend. puts into model
    chrome.storage.sync.get('timeEntryMethod', function(items) {
      if ('timeEntryMethod' in items) {
        $scope.timeEntryMethod = {
          method: items.timeEntryMethod.method
        };
      }
    });

    // gets backend to change on scope change
    $scope.$watch("timeEntryMethod.method | json", function(newValue, oldValue) {
      //branch check so that you only set it after get call above
      if (typeof oldValue != 'undefined') {
        chrome.storage.sync.set({
          'timeEntryMethod': {
            UserID: userID,
            method: $scope.timeEntryMethod.method
          }
        })
      }
    });
  }
}])