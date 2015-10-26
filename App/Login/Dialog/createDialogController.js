var app = angular.module('loginApp');

app.controller('createDialogController', [ '$scope', '$http', '$timeout', 'dialog', function($scope, $http, $timeout, dialog) {
    $scope.username = "";
    $scope.password = "";
    $scope.rePassword = "";
    $scope.adminPassword = "";
    $scope.err="";
    $scope.creating = false;

    $scope.close = function() {
        dialog.close();
    };

    $scope.fakeClick = function(event) {
        event.stopPropagation();
    };

    $scope.create = function() {
        if ($scope.username == "") {
            $scope.err = "User name can't be empty";
            return;
        }

        if ($scope.password == "") {
            $scope.err = "Password can't be empty";
            return;
        }

        if ($scope.password != $scope.rePassword) {
            $scope.err = "Password not match";
            $scope.password = "";
            $scope.rePassword = "";
            return;
        }

        if ($scope.adminPassword == "") {
            $scope.err = "Must enter admin password";
            return;
        }

        $scope.creating = true;
        var params = { username: $scope.username, 
                       password: $scope.password,
                       adminPassword: $scope.adminPassword };
        $http.post('/api/createUser', params)
            .success( function(data) {
                $scope.creating = false;
                if (data.err) {
                    $scope.err = data.err;
                    return;
                }
                if (data.success) {
                    $scope.close();
                }
            })
            .error( function(data) {
                $scope.creating = false;
                $scope.err = data.err;
            });

    };
}]);


