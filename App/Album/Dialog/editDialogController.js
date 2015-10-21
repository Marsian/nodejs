var app = angular.module('albumApp');

app.controller('editDialogController', [ '$scope', '$http', '$timeout', 'dialog', 'params', 'dateService', function($scope, $http, $timeout, dialog, params, dateService) {
   
    $scope.photoId = params.photoId;
    $scope.refreshCount = 0;
    $scope.edited = false;
    $scope.angle = 0;
    $scope.angleChanged = false;
    $scope.saving = false;

    $scope.close = function() {
        dialog.close();
    };

    $scope.fakeClick = function(event) {
        event.stopPropagation();
    };

    $scope.getDate = function(date) {
        return dateService.getDate(date);
    };

    $scope.rotateImage = function() {
        $scope.angle += 90;
        $scope.angleChanged = $scope.angle % 360 != 0;
        if ($scope.angleChanged)
            $scope.edited = true;
    };

    $scope.saveChanges = function() {
        var params = { photoId: $scope.photoId, angle: $scope.angle % 360 };
        $scope.saving = true;
        $http.post('/api/rotateImage', params)
            .success(function(data) {
                console.log(data); 
                $scope.saving = false;
                if (data.err)
                    console.log(data.err);
                if (data.data) {
                    $scope.angle = 0;
                    $scope.edited = false;
                    //$scope.refreshCount ++;
                }
            })
            .error(function(data) {
                console.log(data);
            });
    };

    // Watch events
    $scope.$on("ImageLoading", function(){
        $scope.loading = true;
    });

    $scope.$on("ImageLoaded", function(){
        $scope.loading = false;
        $scope.$apply();
    });

}]).directive('ngSketch', ['$window', '$rootScope', '$timeout', function($window, $rootScope, $timeout) {
    var helper = {
        support: !!($window.CanvasRenderingContext2D),
    }
    return {
        restrict: 'A',
        scope: {
            photoId: "=",
            photoSize: "@",
            angleInDegree: "=",
            refreshCount: "="
        },
        template: '<canvas id="canvas"/>',
        link: function(scope, element, attributes) {
            if (!helper.support) return;

            var canvas = element.find('canvas');
            var context = canvas[0].getContext('2d');
            
            var _loadImage = function() {
                var image = new Image();
                image.onload = _onLoadImage;
                image.src = "/api/getPhotoImage/" + scope.photoId;
                canvas[0].getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                canvas.css({ display: "none" });
                $rootScope.$broadcast("ImageLoading");
            }

            var _onLoadImage = function() {
                var wScale = scope.photoSize / this.width;
                var hScale = scope.photoSize / this.height;
                var scale = wScale < hScale ? wScale : hScale;

                var width = this.width * scale;
                var height = this.height * scale;
                canvas.attr({ width: width, height: height });
                // Place the image in the middle
                if (width > height) {
                    var offset = (width - height) / 2;
                    canvas.css({ top: offset + "px" });
                } else if (width < height) {
                    var offset = (height - width) / 2;
                    canvas.css({ left: offset + "px" });
                }
                canvas[0].getContext('2d').drawImage(this, 0, 0,  width, height);
                canvas.css({ display: "block" });
                $rootScope.$broadcast("ImageLoaded");
            }

            var _drawRotated = function(degrees){
                var rotate = 'rotate(' + degrees + 'deg)';
                canvas.css({
                    '-webkit-transform' : rotate,
                    'transform'         : rotate 
                });
            }

            scope.$watch('angleInDegree', function(val) {
                if (val && val > 0) {
                    _drawRotated(val);
                }
            });

            scope.$watch('refreshCount', function(val) {
                if (val && val > 0) {
                    _loadImage();
                }
            });

            $timeout(function(){
                _loadImage();
            }, 0);
        }
    };
}]);
