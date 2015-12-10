myApp.service('InternetConnectivity', function () {
	var me = this;

	// bootbox modal
    var offlineBox;

	this.displayOfflineModal = function() {
		offlineBox = bootbox.dialog({
            message: '<div id="clockman-text" class="center-block"><img id="clockman-image" src="../../img/clockman.png"/><br><br>' +
            		 '<b>Shucks!</b><br><br> We&#39re sorry, you don&#39t appear to have an internet connection. ' +
            		 'Please try again when you have connectivity.</div>',       
            show: true,
            backdrop: true,
            closeButton: false,
            animate: true,
            className: "no-internet-modal",
        });
	}

	this.hideOfflineModal = function() {
		offlineBox.modal('hide');
	}
})