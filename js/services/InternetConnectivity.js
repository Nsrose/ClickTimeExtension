myApp.service('InternetConnectivity', function () {
	var me = this;

	// bootbox modal
    var offlineBox;

	this.displayOfflineModal = function() {
		offlineBox = bootbox.dialog({
            message: "We're sorry, you don't appear to have an internet connection. Please try again when you have connectivity.",       
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