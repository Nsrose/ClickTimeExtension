(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-66098130-1', 'auto');
ga('set', 'checkProtocolTask', function(){});

/* tracking each button click */
// function trackButtonClick(buttonID) {
// 	var buttonTrackingInfo = {
// 		'hitType': 'event',
// 	  	'eventCategory': 'button',
// 	  	'eventAction': 'click',
// 	  	'eventlabel': ''
//  	}
// 	buttonTrackingInfo.eventLabel = buttonID;
//  	ga('send', buttonTrackingInfo);
// }

document.addEventListener('DOMContentLoaded', function () {
  var buttons = document.querySelectorAll('button');
  for (var i = 0; i < buttons.length; i++) {
  	var buttonID = buttons[i].id;
    // buttons[i].addEventListener('click', trackButtonClick(buttonID));
    $("#" + buttonID).click(function () {
    	var buttonTrackingInfo = {
			'hitType': 'event',
		  	'eventCategory': 'button',
		  	'eventAction': 'click',
		  	'eventlabel': ''
	 	};
		buttonTrackingInfo.eventLabel = buttonID;
	 	ga('send', buttonTrackingInfo);
    })
  }
});