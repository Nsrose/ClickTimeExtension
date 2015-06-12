chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "clicked_browser_action" ) {
    	/*var theUrl = "https://app.clicktime.com/api/1.3/session"
    	var resp = httpGet(theUrl);
    	console.log("Reponse about to come through");
    	console.log(resp);*/
    }
  }
);