(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-66098130-1', 'auto');
ga('set', 'checkProtocolTask', function(){});

// add a listener to all the buttons
$(function () {
  $("body").on("click", "button", function() {
    var buttonTrackingInfo = {
      'hitType': 'event',
      'eventCategory': 'button',
      'eventAction': 'click',
      'eventLabel': ''
    }
    buttonTrackingInfo.eventLabel = this.id;
    ga('send', buttonTrackingInfo);
  });
});
