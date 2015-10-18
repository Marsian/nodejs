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

    $scope.getPreviewDate = function(date) {
        return dateService.getDate(date, "yyyy mmm dd");
    };
    
    $scope.dateToggle = function(photo) {
        if (photo.showDate) {
            photo.showDate = false;
        } else {
            photo.showDate = true;
        }
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
    
    $scope.showDetailDialog = function(photo) {
        var params = { currentPhoto: photo, user: $scope.user };
        dialogService.openDialog('./App/Album/Dialog/detailDialog.html', params, 'detailDialogController')
            .then(function(result) {
                if (result) {
                    photo.comments = result;
                }
            });
    };   
    
    $scope.showDeleteDialog = function() {
        dialogService.openDialog('./App/Album/Dialog/deleteDialog.html', {}, 'deleteDialogController')
            .then(function(result) {
                if (result) {
                    $scope.deletePhotoByIds();
                }
            }); 
    };

    $scope.dialogOpened = function() {
        return dialogService.isOpen();
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

    $scope.downloadPhoto = function(photoId) {
        var params = { downloadIds: [photoId] };
        dialogService.openDialog('./App/Album/Dialog/downloadDialog.html', params, 'downloadDialogController');
    };

    $scope.downloadPhotos = function() {
        var downloadIds = [];
        angular.forEach($scope.photoData, function(photo) {
            if (photo.selected) {
                downloadIds.push(photo._id);
            }
        });
        $scope.toggleEditMode(); 
        
        var params = { downloadIds: downloadIds };
        dialogService.openDialog('./App/Album/Dialog/downloadDialog.html', params, 'downloadDialogController');
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
    
    $scope.test = function(id) {
        console.log(id);
    };

    _initialize();
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
            scope.params = params;

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

app.directive('ngContextMenu', function($compile) {
    return  {
        link: function(scope, element, attrs) {
            element.bind('contextmenu', function(event) {
                // Prevent default context menu
                event.preventDefault();
                
                // Get photo id
                scope.contextId = attrs.ngContextMenu;

                // Remove old context menu
                var oldContextMenu = element[0].getElementsByClassName('context-menu')
                if (oldContextMenu && oldContextMenu.length > 0) {
                    angular.forEach(oldContextMenu, function(elem) {
                        elem.remove();
                    });
                }

                // Create a new context menu
                var template = '<div class="context-menu dropdown open">' +
                                    '<ul class="dropdown-menu" role="menu" >' +
                                       '<li><a tabindex="-1" href="#">Edit</a></li>' +
                                       '<li><a tabindex="-1" href="#" ng-click="downloadPhoto(contextId)">Download</a></li>' +
                                    '</ul>' +
                                '</div>';
                var content = angular.element(template);
                content.bind('contextmenu', function(event) {
                    // Prevent openning context menu when right click in a context menu
                    event.preventDefault();
                    event.stopPropagation();
                });
                content.css("top", event.offsetY + 8 + 'px');                
                content.css("left", event.offsetX + 8 + 'px');                

                element.append(content);
                $compile(content)(scope);
            });

            element.bind('mouseleave', function(){
                // Remove existing context menu when leave
                var oldContextMenu = element[0].getElementsByClassName('context-menu')
                if (oldContextMenu && oldContextMenu.length > 0) {
                    angular.forEach(oldContextMenu, function(elem) {
                        elem.remove();
                    });
                }
            });
        }
    }
});
