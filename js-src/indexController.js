var app = angular.module('app');

app.controller('indexController', [ '$scope', function($scope) {
    $scope.greeting = "Hello World";

    $scope.indexPageTabs = [
        { name: 'Home' },
        { name: 'About'}
    ];

    $scope.currentTab = { name: 'Home' };
    $scope.selectedTabName = function() {
        return $scope.currentTab.name;
    }

    $scope.selectTab = function( tab ) {
        $scope.currentTab = tab;
    }

}]);
