var app = angular.module('app', []);

app.controller('indexController', [ '$scope', function($scope) {
    $scope.greeting = "Hello World";
}]);
