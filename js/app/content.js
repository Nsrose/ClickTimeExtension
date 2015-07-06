
$(document).ready(function() {
    var height = '40';
    var div = document.createElement('div');
    div.style.height = height;
    div.style.width = '100';
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.right = '0';
    div.style.zIndex = '938089';
    var html = "<div id='stopwatchDisplay'>00:00:00</div>";
    div.innerHTML = html;
    document.body.appendChild(div); 
})





// chrome.extension.onMessage.addListener(
// function (request, sender, sendResponse) {
//     if (request.action == 'test') {
        
       
//     }
// });