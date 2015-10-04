var app = angular.module('loginApp', []);

app.controller('loginController', [ '$scope', '$http', 'contextService', function($scope, $http, contextService) {
    $scope.username = "";
    $scope.password = "";
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

    $(document).keypress(function(e) {
        if(e.which === 13) {
            $("#login-button").first().click();
        }
    });
}]);


