myApp.controller('SettingsController', ['$scope', function ($scope) {
  $(document).ready(function() {
    $(".btn-group > .btn").click(function(){
      $(this).addClass("active").siblings().removeClass("active");
    });

    // initial toggle display
    chrome.storage.sync.get('allowReminders', function(items) {
      if (('allowReminders' in items) && (items.allowReminders)) {
        $('#reminder-toggle').prop('checked', true);
      } else {
        $('#reminder-toggle').prop('checked', false);
      }
    })

    // when toggling, switch value in local storage
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
  })
}])

	// Script for the options page for configurability
// Saves options to chrome.storage

        /*
function save_options() {
  var timeEntryMethod = document.getElementById('timeEntryMethod').value;
  chrome.storage.sync.set({
    defaultTimeEntryMethod: timeEntryMethod
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    defaultTimeEntryMethod : 'hours'
  }, function(items) {
    document.getElementById('timeEntryMethod').value = items.defaultTimeEntryMethod;
  });
}

var loggedIn = false;
var user = null;

$(document).ready(function() {
    restore_options();
    $("#timeEntryMethod").on("change", function() {
       setTimeout(function() {
           save_options(); 
       }, 100);
    });

    chrome.storage.sync.get('inProgressEntry', function (items) {
      if ('inProgressEntry' in items) {
        if (items.inProgressEntry.inProgress) {
          alert("Cannot change time entry method with an in progress time entry.");
          $("#timeEntryMethod").hide();
        }
      }
    })

    chrome.storage.local.get('user', function(items) {
      if ('user' in items) {
          loggedIn = true;
        user = items.user.data;
       console.log(user); 
        if (user.RequireStopwatch == true) {
            $('#start-end').remove();
        } else if (user.RequireStartEndTime == true) {
            $('#hours').remove();
        } else {
            // add back all options
            // this doesn't work on page load. you must relog back in.
            // you need to relog teh session
            $('#timeEntryMethod').append('#hours');
            $('#timeEntryMethod').append('#start-end');
        }
      }
    })
})
*/

