var app = angular.module('app');

app.directive('homePage', function($window) {
    return {
        templateUrl: 'Template/homePage.html',
        link: function ($scope, $element) {
            // scrool to previous position
            $element.ready(function () {
                if (sessionStorage.scrollTop != "undefined") {
                    $(window).scrollTop(sessionStorage.scrollTop);
                }
            });

            // save scroll position
            angular.element($window).bind("scroll", function() {
                sessionStorage.scrollTop = $(this).scrollTop();
            });
        }
    };
});
