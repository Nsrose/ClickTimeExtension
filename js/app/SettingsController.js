myApp.controller('SettingsController', ['$scope', function ($scope) {

  $(document).ready(function() {
    // $(".btn-group > .btn").click(function(){
    //   $(this).addClass("active").siblings().removeClass("active");
    // });

    // gets initial allowReminders value to display
    chrome.storage.sync.get('allowReminders', function(items) {
      if (('allowReminders' in items) && (items.allowReminders)) {
        $('#reminder-toggle').prop('checked', true);
      } else {
        $('#reminder-toggle').prop('checked', false);
      }
    })

    // when toggling, update Allow Reminders value in local storage
    $('#reminder-toggle').click(function() {
      chrome.storage.sync.get('allowReminders', function(items) {
        if ('allowReminders' in items) {   
          if ($('#reminder-toggle').is(':checked')) { 
            chrome.storage.sync.set({'allowReminders': true});
            var pollPeriod = chrome.extension.getBackgroundPage().NOTIFICATION_POLL_PERIOD
            chrome.extension.getBackgroundPage().createNotifications(pollPeriod);
          } else {
            chrome.storage.sync.set({'allowReminders': false});
            chrome.extension.getBackgroundPage().stopNotifications();
          }
        }
      })
    })

    // gets initial defaultTimeEntryMethod to display
    chrome.storage.local.get('user', function(items) {
      // if there's no choice based on settings, hide block
      if ('user' in items) {
        if (items.user.data.RequireStartEndTime || items.user.data.RequireStopwatch) {
          $scope.requireStartEndTime = true;
        } else {
          //query the local storage for last-set method
          chrome.storage.sync.get('timeEntryMethod', function(items) {
            if ('timeEntryMethod' in items) {
              if (items.timeEntryMethod == 'duration') {
                $('#duration').addClass('active').siblings().removeClass('active');
              } else if (items.timeEntryMethod == 'start-end') {
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
          if ($('#duration').hasClass('active')) {
            chrome.storage.sync.set({'timeEntryMethod': 'duration'});
          } else if ($('#start-end').hasClass('active')) {
            chrome.storage.sync.set({'timeEntryMethod': 'start-end'});
          }
        }
      })
    });
  })
}])