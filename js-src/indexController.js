var app = angular.module('app');

app.controller('indexController', [ '$scope', '$window', function($scope, $window) {

    $scope.showNavMenu = false;
    $scope.toggleNavMenu = function (event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        $scope.showNavMenu = !$scope.showNavMenu;
    };
    $scope.closeNavMenu = function () {
        if ($scope.showNavMenu)
            $scope.showNavMenu = false;
    };

    $scope.scrollDownPage = function () {
        var scrollHeight = $window.innerHeight + "px";
        $("body").animate({ scrollTop: scrollHeight }, 500);
    };

    $scope.currentTab = 'Home';
    $scope.selectedTabName = function() {
        return $scope.currentTab;
    };

    $scope.selectTab = function( tab ) {
        $scope.currentTab = tab;
    };
}]);
