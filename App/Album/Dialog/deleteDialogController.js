var app = angular.module('albumApp');

app.controller('deleteDialogController', [ '$scope', '$http', 'dialog', 'params', function($scope, $http, dialog, params) {
    
    $scope.cancel = function() {
        dialog.close();
    };

    $scope.ok = function(event) {
        dialog.close(true);
    };
}]);


