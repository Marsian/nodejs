var app = angular.module('loginApp', []);

app.controller('loginController', [ '$scope', '$http', 'contextService', function($scope, $http, contextService) {
    $scope.changeMode = false;
    $scope.createMode = false;
    $scope.username = "";
    $scope.password = "";
    $scope.newPassword = "";
    $scope.redirect = '/' + contextService.context.app;
    $scope.err = "";

    $scope.login = function() {
        var logon = { username: $scope.username, 
                      password: $scope.password };
        $http.post('/api/login', logon)
            .success( function(data) {
                if (data.err) {
                    $scope.err = data.err;
                    return;
                }
                if (data.redirect)
                    window.location = $scope.redirect;
            })
            .error( function(data) {
                $scope.err = data.err;
            });
    };

    $scope.commit = function() {
        var logon = { username: $scope.username, 
                      password: $scope.password,
                      newPassword: $scope.newPassword };
        $http.post('/api/newPassword', logon)
            .success( function(data) {
                if (data.err) {
                    $scope.err = data.err;
                    return;
                }
                if (data.success) {
                    $scope.password = "";
                    $scope.newPassword = "";
                    $scope.changeMode = false;
                }
            })
            .error( function(data) {
                $scope.err = data.err;
            });
    };

    $scope.$watch('changeMode', function(val) {
        if (val) {
            $(document).keypress(function(e) {
                if(e.which === 13) {
                    $("#commit-button").first().click();
                }
            });
        } else {
            $(document).keypress(function(e) {
                if(e.which === 13) {
                    $("#login-button").first().click();
                }
            });
        }
    });

}]);


