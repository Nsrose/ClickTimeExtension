/**
 * Adds initialization functionality to bootstrap tooltips
 * Also, allows you to specify a DOM element that will act as the content of the popover, rather than
 * specifying it in code or as an attribute value.
 *
 * Usage:
 * <element my-tooltip="{#selector}" />
 * <span id="#selector">...</span>
 */
myApp.directive('myTooltip', function() {
	return {
		scope: {
			placement: '@',
			showDelay: '@?',
			hideDelay: '@?'
		},

		link: function (scope, element, attrs) {
			var $element = $(element);

			// Initialize the popover
			$element.tooltip({
				placement: scope.placement,
				html: true,
				title: function () {
					return $(attrs.myTooltip).html() || attrs.myTooltip;
				},
			});
		}
	};
});