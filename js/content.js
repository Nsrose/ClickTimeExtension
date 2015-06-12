function httpGet(theUrl)
{

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.setRequestHeader('key', 'nrose');
    xmlHttp.setRequestHeader('password', 'berkeleycs17');
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

// var ClickTime = new ClickTime({
// 	key : 'nrose',
// 	password : 'berkeleycs17'
// });

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "clicked_browser_action" ) {
      
      	alert("hello");
    	var theUrl = "https://app.clicktime.com/api/1.3/session"
    	var resp = httpGet(theUrl);
    	console.log("Reponse about to come through");
    	console.log(resp);
    }
  }
);