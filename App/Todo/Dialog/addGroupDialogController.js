var app = angular.module('todoApp');

app.controller('addGroupDialogController', [ '$scope', '$http', 'dialog', 'params', function($scope, $http, dialog, params) {
    
    $scope.groupName = "";
    $scope.userList = [ { name: params.user } ];
    $scope.searchResults = [];

    $scope.ok = function() {
        if ($scope.userList.length > 0 && $scope.groupName) {
            var params = { users: $scope.userList, name: $scope.groupName };
            $http.post('/api/addGroup', params)
                .success(function(data) {
                    if (data.err) {
                        console.log(err);
                        return;
                    }
                    dialog.close(true);
                })
                .error(function(data) {
                    console.log('Error: ' + data);
                });
        } else
            dialog.close();
    };
    
    $scope.cancel = function() {
        dialog.close();
    };

    $scope.searchUser = function(searchString) {
        $scope.searchResults = [];

        if (searchString) {
            $http.post('/api/searchUser', { search: searchString })
                .success( function(data) {
                    if (data.err) {
                        console.log(data.err);
                        return;
                    }

                    if (data && data.results && data.results.length > 0) {
                        $scope.searchResults = data.results;
                    }
                })
                .error(function(data) {
                    console.log('Error: ' + data);
                });

        }
    };

    $scope.selectUser = function(user) {
        $scope.userList.push({ name: user.name });
    };

}]);


