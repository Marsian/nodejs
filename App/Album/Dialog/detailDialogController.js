var app = angular.module('albumApp');

app.controller('detailDialogController', [ '$scope', '$http', '$timeout', 'dialog', 'params', 'dateService', function($scope, $http, $timeout, dialog, params, dateService) {
   
    $scope.currentPhoto = params.currentPhoto;
    $scope.user = params.user;
    $scope.hasLocation = false;
    $scope.showMap = false;
    $scope.mapLoaded = false;
    $scope.coordinate = null;

    $scope.close = function() {
        dialog.close($scope.currentPhoto.comments);
    };

    $scope.fakeClick = function(event) {
        event.stopPropagation();
    };

    $scope.getDate = function(date) {
        return dateService.getDate(date);
    };

    $scope.mapToggle = function() {
        $scope.showMap = !$scope.showMap;
        if ($scope.showMap && $scope.coordinate && !$scope.mapLoaded) {
            // Create a map object and specify the DOM element for display.
            var map = new google.maps.Map(document.getElementById('map-canvas'), {
                center: $scope.coordinate,
                scrollwheel: false,
                zoom: 10
            });

            // Create a marker and set its position.
            var marker = new google.maps.Marker({
                map: map,
                position: $scope.coordinate,
                title: 'Photo location'
            });            

            // Resize every time to make sure the map shows up 
            google.maps.event.addListenerOnce(map, 'idle', function () {
                google.maps.event.trigger(map, 'resize');
                map.setCenter($scope.coordinate);
            });
            
            $scope.mapLoaded = true;
        }
    };

    $scope.commentToggle = function(comment) {
        if (comment.show) {
            comment.show = false;
        } else {
            comment.show = true;
        }
    }; 

    $scope.postComment = function(id, comment) {
        $http.post('/api/postPhotoComment', { id: id, comment: comment })
            .success(function(data) {
                if (data && data.comments && data.comments.length > 0) {
                    $scope.newComment = "";
                    $scope.currentPhoto.comments = data.comments;
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.deleteComment = function(id, commentId) {
        $http.post('/api/deletePhotoComment', { id: id, commentId: commentId })
            .success(function(data) {
                if (data && data.comments) {
                    $scope.currentPhoto.comments = data.comments;
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });

    };

    $scope.$on("ImageLoading", function(){
        $scope.loading = true;
    });

    $scope.$on("ImageLoaded", function(){
        $scope.loading = false;
        $scope.$apply();
    });

    $timeout(function() {
        $http.post('/api/getLocation', { id: $scope.currentPhoto._id })
            .success(function(data) {
                if (data && data.err) {
                    console.log(data.err);
                } else if (data && data.results && data.results.length > 0) {
                    $scope.hasLocation = true;
                    $scope.formattedAddress = data.results[0].formatted_address;
                    $scope.coordinate = data.coordinate;
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });


    }, 0);
}]);


