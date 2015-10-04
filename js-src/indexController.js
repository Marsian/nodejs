var app = angular.module('app');

app.controller('indexController', [ '$scope', function($scope) {

    $scope.currentTab = 'Home';
    $scope.selectedTabName = function() {
        return $scope.currentTab;
    }

    $scope.selectTab = function( tab ) {
        $scope.currentTab = tab;
    }

}]);
