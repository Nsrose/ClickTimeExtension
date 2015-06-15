
myApp.service('PageInfoService', function($http) {
    this.getInfo = function(callback) {
        var model = {};

        // Get the user's session:
        get_session($http, 'nrose', 'berkeleycs17', function(data) {
            if (data == null) {
                alert("There was an error processing your request.");
                return;
            }
            model.session = data;
            console.log(data);
            callback(model);
        })

       
        // var request = {
        //     method: 'GET',
        //     url: session_url,
        //     headers: {
        //         'Authorization' : 'Basic ' + btoa("nrose@clicktime.com:berkeleycs17")
        //     }
        // };

        // $http(request)
        //     .success(function(data, status, headers, config) {
        //     // this callback will be called asynchronously
        //     // when the response is available
        //     model.session = data;
        //     console.log(data);
        //     callback(model);
        // }).
        // error(function(data, status, headers, config) {
        //     // called asynchronously if an error occurs
        //     // or server returns response with an error status.
        //     model.session = null;
        // });

        // chrome.tabs.query({'active': true},
        // function (tabs) {
        //     if (tabs.length > 0)
        //     {
        //         model.title = tabs[0].title;
        //         model.url = tabs[0].url;

        //         chrome.tabs.sendMessage(tabs[0].id, { 'action': 'PageInfo' }, function (response) {
        //             model.pageInfos = response;
        //             callback(model);
        //         });
        //     }

        // });
    };
});