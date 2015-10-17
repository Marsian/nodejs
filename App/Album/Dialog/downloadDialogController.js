var app = angular.module('albumApp');

app.controller('downloadDialogController', [ '$scope', '$http', '$interval', '$timeout', 'dialog', 'params', function($scope, $http, $interval, $timeout, dialog, params) {
    
    $scope.close = function() {
        dialog.close();
    };

    $scope.getProgress = function() {
        if (100 >=  $scope.progress && $scope.progress >= 0)
            return $scope.progress;
        else
            return 0;
    };

    $scope.progress = 0;
    $scope.downloadIds = params.downloadIds;

    var _downloadById = function(downloadId) {
        var iframe = $('#downloadIFrame');      
        var src = "/api/downloadSinglePhoto/" + downloadId;
        iframe.attr('src', src);    

        $scope.close();
    }

    var _downloadByIds = function(downloadIds) {
        $http.post('/api/exportPhotoByIds', { ids: downloadIds })
            .success(function(token) {
                var checkStatus = $interval(function() {
                    $http.get('/api/getExportStatus/' + token)
                        .success(function(data) {
                            if (data.err) {
                                console.log(data.err);
                            } else if (data.status) {
                                $scope.progress = data.status.progress;
                                if (data.status.progress && data.status.progress == 100) {
                                    $interval.cancel(checkStatus);
    
                                    var iframe = $('#downloadIFrame');      
                                    var src = "/api/downloadPhotos/" + token;
                                    iframe.attr('src', src);    
                                    
                                    $scope.close();
                                }
                            }
                        })
                }, 500);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    }
    
    $timeout(function () {
        if ($scope.downloadIds.length == 1 ) {
            _downloadById($scope.downloadIds[0]);
        } else if ($scope.downloadIds.length > 1) {
            _downloadByIds($scope.downloadIds);
        } else {
            $scope.close();
        }
    }, 0);

}]);
