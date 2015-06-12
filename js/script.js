function httpGet(theUrl)
{

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.setRequestHeader('key', 'nrose');
    xmlHttp.setRequestHeader('password', 'berkeleycs17');
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

console.log("About to make get request");
var theUrl = "https://app.clicktime.com/api/1.3/session"
var resp = httpGet(theUrl);

console.log(resp);