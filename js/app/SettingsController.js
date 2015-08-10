myApp.controller('SettingsController', ['$scope', '$location', function ($scope, $location) {

  //google analytics
  ga('send', 'pageview', '/settings.html')

  $scope.timeEntryPage = function () {
    $location.path("/time_entry");
  }

  $scope.$on("refresh", function() {
    $('#refresh-status').text('Lists refreshed!');
    setTimeout(function() {
       $('#refresh-status').text('');
    }, 750);
  })

  // need to add event handlers via angular

  // gets initial allowReminders value to display
  chrome.storage.sync.get('allowReminders', function(items) {
    if (('allowReminders' in items) && (items.allowReminders.permission)) {
      $('#reminder-toggle').prop('checked', true);
    } else {
      $('#reminder-toggle').prop('checked', false);
    }
  })

  // when toggling, update Allow Reminders value in local storage
  $('#reminder-toggle').click(function() {
    chrome.storage.sync.get('allowReminders', function(items) {
      if ('allowReminders' in items) {
        var userID = items.allowReminders.UserID;
        if ($('#reminder-toggle').is(':checked')) { 
          chrome.storage.sync.set({
            'allowReminders': {
              UserID: userID, 
              permission: true
            }
          });
          var pollPeriod = chrome.extension.getBackgroundPage().NOTIFICATION_POLL_PERIOD
          chrome.extension.getBackgroundPage().createNotifications(pollPeriod);
        } else {
          chrome.storage.sync.set({
            'allowReminders': {
              UserID: userID, 
              permission: false
            }
          }, function () {
            chrome.extension.getBackgroundPage().stopNotifications();
          });
        }
      }
    })
  })

  // gets initial defaultTimeEntryMethod to display
  chrome.storage.local.get('user', function(items) {
    // if there's no choice based on settings, hide element
    if ('user' in items) {
      if (items.user.data.RequireStartEndTime || items.user.data.RequireStopwatch) {
        $scope.requireStartEndTime = true;
      } else {
        //query the local storage for last-set method
        chrome.storage.sync.get('timeEntryMethod', function(items) {
          if ('timeEntryMethod' in items) {
            if (items.timeEntryMethod.method == 'duration') {
              $('#duration').addClass('active').siblings().removeClass('active');
            } else if (items.timeEntryMethod.method == 'start-end') {
              $('#start-end').addClass('active').siblings().removeClass('active');
            }
          }
        })
      }
    }
  })

  // when toggling, update defaultTimeEntryMethod in local storage
  $(".btn-group > .btn").click(function() {
     // visuals
    $(this).addClass("active").siblings().removeClass("active");
    //storage set
    chrome.storage.sync.get('timeEntryMethod', function (items) {
      if ('timeEntryMethod' in items) {
        var userID = items.timeEntryMethod.UserID;
        if ($('#duration').hasClass('active')) {
          chrome.storage.sync.set({
            'timeEntryMethod': {
              UserID: userID,
              method: 'duration'
            }
          })
        } else if ($('#start-end').hasClass('active')) {
          chrome.storage.sync.set({
            'timeEntryMethod': {
              UserID: userID,
              method: 'start-end'
            }
          });
        }
      }
    })     
  })

}])