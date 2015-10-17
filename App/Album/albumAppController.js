var app = angular.module('albumApp', ['util', 'angularFileUpload']);

app.controller('albumAppController', [ '$scope', '$http', '$window', '$timeout', '$interval', 'dateService', 'dialogService', function($scope, $http, $window, $timeout, $interval, dateService, dialogService) {
    // Variable initialize
    $scope.photos = [];
    $scope.loadCount = 0;

    $scope.selectCount = 0;
    $scope.selectMode = false;
    $scope.deleteIds = [];
    $scope.deleteSet = new Set();

    $scope.getDate = function(date) {
        return dateService.getDate(date);
    };
    
    // View
    $scope.editMode = false;
    $scope.toggleEditMode = function () {
        $scope.editMode = !$scope.editMode;
        if (!$scope.editMode) {
            $scope.selectCount = 0;
            $scope.selectMode = false;
            $scope.deleteIds = [];
            angular.forEach($scope.photoData, function(photo) {
                photo.selected = false;
            });
        }
    };

    $scope.showUploadDialog = function() {
        dialogService.openDialog('./App/Album/Dialog/uploadDialog.html', {}, 'uploadDialogController')
            .then(function(result) {
                if (result) {
                    _initialize();
                }
            }); 

    };
    
    $scope.showDetailDialog = false;
    $scope.currentPhoto = null;
    $scope.toggleDetailDialog = function(photo) {
        $scope.currentPhoto = photo;
        $scope.showDetailDialog = !$scope.showDetailDialog;
    };   
    $scope.$on('closeDetailDialog', function() {
        $scope.showDetailDialog = false;
    });
    
    $scope.showDeleteDialog = function() {
        dialogService.openDialog('./App/Album/Dialog/deleteDialog.html', {}, 'deleteDialogController')
            .then(function(result) {
                if (result) {
                    $scope.deletePhotoByIds();
                }
            }); 
    };

    $scope.dialogOpened = function() {
        return $scope.showDetailDialog ||
               dialogService.isOpen();
    };

    $scope.selectCheck = function(photo) {
        if (photo.selected) {
            $scope.selectCount += 1;
            if ($scope.selectCount > 0)
                $scope.selectMode = true;
        } else {
            $scope.selectCount -= 1;
            if ($scope.selectCount == 0)
                $scope.selectMode = false;
        } 
    }

    // Control  
    $scope.getPhoto = function(photo) {
        $http.post('/api/getPhotoImage', { id: photo._id })
            .success(function(data) {
                photo.image = data;
                //$scope.photos.push(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.deletePhotoByIds = function() {
        angular.forEach($scope.photoData, function(photo) {
            if (photo.selected) {
                $scope.deleteIds.push(photo._id);
                $scope.deleteSet.add(photo._id);
            }
        });
        $http.post('/api/deletePhotoByIds', { ids: $scope.deleteIds })
            .success(function(data) {
                var length = $scope.photoData.length;
                for (var i = 0; i < length; ) {
                    if ($scope.deleteSet.has($scope.photoData[i]._id)) {
                        $scope.photoData.splice(i,1);
                        length --;
                        continue;
                    }
                    i ++;
                }  
                $scope.deleteSet = new Set();
                $scope.deleteIds = []
                $scope.selectMode = false;
                $scope.selectCount = 0;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.downloadPhotos = function() {
        var downloadIds = [];
        angular.forEach($scope.photoData, function(photo) {
            if (photo.selected) {
                downloadIds.push(photo._id);
            }
        });

        if (downloadIds.length == 1) {
            var iframe = $('#downloadIFrame');      
            var src = "/api/downloadSinglePhoto/" + downloadIds[0];
            iframe.attr('src', src);    
        } else if (downloadIds.length > 1) {
            $http.post('/api/exportPhotoByIds', { ids: downloadIds })
                .success(function(token) {
                    var checkStatus = $interval(function() {
                        $http.get('/api/getExportStatus/' + token)
                            .success(function(data) {
                                if (data.err) {
                                    console.log(data.err);
                                } else if (data.status) {
                                    console.log(data.status);
                                    if (data.status.progress && data.status.progress == 100) {
                                        $interval.cancel(checkStatus);
    
                                        var iframe = $('#downloadIFrame');      
                                        var src = "/api/downloadPhotos/" + token;
                                        iframe.attr('src', src);    
                                    }
                                }
                            })
                    }, 500);
                })
                .error(function(data) {
                    console.log('Error: ' + data);
                });
        }
    };

    $scope.getMorePhotos = function() {
        var begin = $scope.photoData.length + 1;
        var end = begin + 9;

        $http.post('/api/getPhotoData', { begin: begin, end: end })
            .success(function(data) {
                if (data && data.photoData && data.photoData.length > 0) {
                    $scope.photoData = $scope.photoData.concat( data.photoData );
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    // Event
    // after loading all exsiting preview,
    // check if we want more to fill the window
    $scope.$on("previewLoaded", function() {
        $scope.loadCount ++;
        if ($scope.loadCount == $scope.photoData.length) {
            if ( window.innerHeight + window.scrollY > document.body.offsetHeight) {
                $scope.getMorePhotos();
            }
        }
    });

    $scope.$on("uploadComplete", function() {
        _initialize();
    });

    $scope.$on("confirmDelete", function() {
        $scope.deletePhotoByIds();
    });

    window.onscroll = function(ev) {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
            $scope.getMorePhotos();
        }
    };

    var _initialize = function() {
        // load context
        $http.get('/api/album')
            .success(function(data) {
                $scope.user = data.user;
                $scope.loggedIn = data.loggedIn;
                $scope.photoData = data.photoData;
                $scope.loadCount = 0;
            })
            .error(function(data) {
                console.log(data);
            });

    };

    _initialize();
}]);

//######## Detail Dialog ############
app.directive('detailDialog', function() {
    return {
        restrict: 'E',
        replace: true, // Replace with the template below
        transclude: true, // we want to insert custom content inside the directive
        templateUrl: './App/Album/detailDialog.html'
    };
}).controller('detailDialogController', [ '$scope', '$http', function($scope, $http) {
    
    $scope.hideModal = function() {
        $scope.$emit("closeDetailDialog");
    };
            
    $scope.close = function() {
        $scope.hideModal();
    };

    $scope.fakeClick = function(event) {
        event.stopPropagation();
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
}]);

//######## Utility #################
app.directive('ngThumb', ['$window', function($window) {
        var helper = {
        support: !!($window.FileReader && $window.CanvasRenderingContext2D),
        isFile: function(item) {
            return angular.isObject(item) && item instanceof $window.File;
        },
        isImage: function(file) {
            var type =  '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
        }
        };

        return {
        restrict: 'A',
        template: '<canvas/>',
        link: function(scope, element, attributes) {
            if (!helper.support) return;

            var params = scope.$eval(attributes.ngThumb);

            if (!helper.isFile(params.file)) return;
            if (!helper.isImage(params.file)) return;

            var canvas = element.find('canvas');
            var reader = new FileReader();

            reader.onload = onLoadFile;
            reader.readAsDataURL(params.file);

            function onLoadFile(event) {
                var img = new Image();
                img.onload = onLoadImage;
                img.src = event.target.result;
            }

            function onLoadImage() {
                var width = params.width || this.width / this.height * params.height;
                var height = params.height || this.height / this.width * params.width;
                canvas.attr({ width: width, height: height });
                canvas[0].getContext('2d').drawImage(this, 0, 0,  width, height);
            }
        }
    };
}]).directive('ngPreview', ['$window', function($window) {
    var helper = {
        support: !!($window.CanvasRenderingContext2D),
    }
    return {
        restrict: 'A',
        template: '<canvas/>',
        link: function(scope, element, attributes) {
            if (!helper.support) return;

            var params = scope.$eval(attributes.ngPreview);

            var canvas = element.find('canvas');

            var img = new Image();
            img.onload = onLoadImage;
            img.src = "/api/getPhotoPreview/" + params.id;

            function onLoadImage() {
                var width = params.width || this.width / this.height * params.height;
                var height = params.height || this.height / this.width * params.width;
                canvas.attr({ width: width, height: height });
                canvas[0].getContext('2d').drawImage(this, 0, 0,  width, height);
                scope.$emit("previewLoaded");
            }
        }
    };
}]).directive('ngImage', ['$window', function($window) {
    var helper = {
        support: !!($window.CanvasRenderingContext2D),
    }
    return {
        restrict: 'A',
        template: '<canvas/>',
        link: function(scope, element, attributes) {
            if (!helper.support) return;

            var params = scope.$eval(attributes.ngImage);

            var canvas = element.find('canvas');

            var img = new Image();
            img.onload = onLoadImage;
            img.src = "/api/getPhotoImage/" + params.id;
            scope.$broadcast("ImageLoading");

            function onLoadImage() {
                var width = params.width || this.width / this.height * params.height;
                var height = params.height || this.height / this.width * params.width;
                canvas.attr({ width: width, height: height });
                canvas[0].getContext('2d').drawImage(this, 0, 0,  width, height);
                scope.$broadcast("ImageLoaded");
            }
        }
    };
}]);
