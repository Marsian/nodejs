var app = angular.module('todoApp');

app.controller('manageGroupDialogController', [ '$scope', '$http', 'dialog', 'params', function($scope, $http, dialog, params) {
    
    $scope.user = params.user;
    $scope.groupList = params.groupList;

    $scope.cancel = function() {
        dialog.close(true);
    };
    
    $scope.acceptInvitation = function(group) {
        var params = { user: $scope.user, group: group };
        $http.post('/api/acceptGroupInvitation', params)
            .success(function(data) {
                if (data.err) {
                    console.log(err);
                    return;
                }
                group.status = 1;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.quitGroup = function(group) {
        var params = { user: $scope.user, group: group };
        $http.post('/api/quitGroup', params)
            .success(function(data) {
                if (data.err) {
                    console.log(err);
                    return;
                }
                // Delete the group from the list
                for (var i in $scope.groupList) {
                    if ($scope.groupList[i].groupId == group.groupId) {
                        $scope.groupList.splice(i,1);
                        break;
                    }
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

}]);


