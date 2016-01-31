var app = angular.module('albumApp', ['util', 'angularFileUpload']);

app.controller('albumAppController', [ '$scope', '$http', '$window', '$timeout', '$interval', 'dateService', 'dialogService', 'FileUploader',  function($scope, $http, $window, $timeout, $interval, dateService, dialogService, FileUploader) {
    // Variable initialize
    $scope.photoData = [];
    $scope.photoIdSet = new Set();
    $scope.loadCount = 0;

    $scope.showFooter = false;
    var _hideFooterTimer = null;

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

    // View ###################################################
    $scope.hoverToggle = function(photo) {
        if (photo.showDate) {
            photo.showDate = false;
        } else {
            photo.showDate = true;
        }
        
        if (photo.showSelector) {
            photo.showSelector = false;
        } else {
            photo.showSelector = true;
        }
    };


    $scope.deselectAll = function () {
        $scope.selectCount = 0;
        $scope.selectMode = false;
        $scope.deleteIds = [];
        angular.forEach($scope.photoData, function(photo) {
            photo.selected = false;
        });
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

    // Control ###############################################
    $scope.getPhoto = function(photo) {
        $http.post('/api/getPhotoImage', { id: photo._id })
            .success(function(data) {
                photo.image = data;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.deletePhoto = function (photoId) {
        $http.post('/api/deletePhotoByIds', { ids: [ photoId ] })
            .success(function(data) {
                var length = $scope.photoData.length;
                for (var i = 0; i < length; ) {
                    if ($scope.photoData[i]._id == photoId) {
                        $scope.photoData.splice(i,1);
                        length --;
                        continue;
                    }
                    i ++;
                }  
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
        $scope.deselectAll(); 
        
        var params = { downloadIds: downloadIds };
        dialogService.openDialog('./App/Album/Dialog/downloadDialog.html', params, 'downloadDialogController');
    };
    
    $scope.editPhoto = function(photoId) {
        var params = { photoId: photoId };
        dialogService.openDialog('./App/Album/Dialog/editDialog.html', params, 'editDialogController');
    };

    $scope.getMorePhotos = function() {
        var begin = $scope.photoData.length + 1;
        var end = begin + 9;

        $http.post('/api/getPhotoData', { begin: begin, end: end })
            .success(function(data) {
                if (data && data.info && data.info == "End") {
                    $scope.showFooter = true;

                    if (_hideFooterTimer) {
                        $timeout.cancel(_hideFooterTimer);
                        _hideFooterTimer = null;
                    }
                    
                    _hideFooterTimer = $timeout(function() {
                        $scope.showFooter = false;
                    }, 4000);
                }

                if (data && data.photoData && data.photoData.length > 0) {
                    angular.forEach(data.photoData, function(photo) {
                        if (!$scope.photoIdSet.has(photo._id)) {
                            $scope.photoData.push( photo );
                            $scope.photoIdSet.add(photo._id);
                        }
                    });
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    // Event #########################################
    // after loading all exsiting preview,
    // check if we want more to fill the window
    $scope.$on("previewLoaded", function() {
        $scope.loadCount ++;
        if ($scope.loadCount == $scope.photoData.length) {
            element = document.getElementsByClassName("main-container")[0];
            if ( element.clientHeight >= element.scrollHeight) {
                $scope.getMorePhotos();
            }
        }
    });

    var lastScrollTop = 0;
    $('.main-container').bind('scroll', function() {
        
        // After scrolling show the shadow
        var previousMode = $scope.scrollMode;
        $scope.scrollMode = $(this).scrollTop() > 0;
        if (previousMode != $scope.scollMode)
            $scope.$apply();
        
        // Get more photos when reach the end of the window
        if($(this).scrollTop() + $(this).innerHeight()>=$(this)[0].scrollHeight) {
            $scope.getMorePhotos();
        }

        // Hide footer when scrolling up
        var st = $(this).scrollTop();
        if (st < lastScrollTop){
           $scope.showFooter = false; 
        }
        lastScrollTop = st;
    })

    $scope.$on("uploadComplete", function() {
        _initialize();
    });

    $scope.$on("confirmDelete", function() {
        $scope.deletePhotoByIds();
    });

    // Uploading ##########################################
    var mainUploader = $scope.mainUploader = new FileUploader({
        url: '/api/photo'
    });

    mainUploader.filters.push({
        name: 'imageFilter',
        fn: function(item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            console.log(item);
            return ('|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1) && // format restriction 
                   (item.size < 10 * 1024 * 1024); // file size smaller than 10MB
        }
    });
    mainUploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
        $scope.err = "Adding file failed. Please upload only image that is smaller than 10MB.";
        console.info('onWhenAddingFileFailed', item, filter, options);
    };
    mainUploader.onAfterAddingFile = function(fileItem) {
        $scope.currentFile = fileItem.file.name;
        $scope.uploading = true;
        fileItem.formData.push( { lastModified: fileItem.file.lastModifiedDate } );
        console.info('onAfterAddingFile', fileItem);
        fileItem.upload();
    };
    mainUploader.onSuccessItem = function(fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
        console.log(response);
        $scope.photoData.splice(0, 0, response);
    };
    mainUploader.onErrorItem = function(fileItem, response, status, headers) {
        fileItem.uploadId = response._id;
        console.info('onErrorItem', fileItem, response, status, headers);
    };

    // Initialization ########################################
    var _initialize = function() {
        // load context
        $http.get('/api/album')
            .success(function(data) {
                $scope.user = data.user;
                $scope.loggedIn = data.loggedIn;
                $scope.photoData = data.photoData;
                $scope.loadCount = 0;
                // Prevent uploading when not logged in
                if (!$scope.loggedIn) {
                    $scope.mainUploader.filters.push({ fn: function(item, options) { return false; } });
                }

                angular.forEach($scope.photoData, function(photo) {
                    $scope.photoIdSet.add(photo._id);
                });
            })
            .error(function(data) {
                console.log(data);
            });

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
}]).directive('ngUploadPreview', ['$window', function($window) {
    return {
        restrict: 'A',
        scope: {
            item: "="
        },
        template: '<div class="photo-upload-preview">' + 
                    '<div ng-thumb="{ file: item._file, height: 200 }"></div>' + 
                    '<div class="photo-upload-status">' +
                    '<div class="photo-upload-backlay"></div>' +
                        '<table class="table" style="z-index: 10">' +
                        '<tr>' +
                        '<td class="photo-upload-progress">' +
                        '<div class="progress" style="margin-bottom: 0;">' +
                            '<div class="progress-bar" role="progressbar" ng-style="{ width: item.progress + \'%\' }"></div>' +
                        '</div>' +
                        '</td>' +
                        '<td class="text-center">' +
                        '<div>' +
                            '<span ng-show="item.isSuccess"><i class="glyphicon glyphicon-ok"></i></span>' +
                            '<span ng-show="item.isUploading"><i class="glyphicon glyphicon-transfer"></i></span>' +
                            '<span ng-show="item.isError"><i class="glyphicon glyphicon-remove"></i></span>' +
                        '</div>' +
                        '</td>' +
                        '</tr>' +
                        '</table>' +
                    '</div>' +
                  '</div>',
        link: function(scope, element, attributes) {

        }
    };
}]).directive('ngImage', ['$window', '$rootScope', function($window, $rootScope) {
    var helper = {
        support: !!($window.CanvasRenderingContext2D),
    }
    return {
        restrict: 'A',
        scope: {
            photoId: "=",
            photoWidth: "@",
            photoHeight: "@",
            photoLoading: "="
        },
        template: '<canvas/>',
        link: function(scope, element, attributes) {
            if (!helper.support) return;

            var canvas = element.find('canvas');
            var context = canvas[0].getContext('2d');

            var image = new Image();
            image.onload = onLoadImage;
            image.src = "/api/getPhotoImage/" + scope.photoId;
            scope.photoLoading = true;

            function onLoadImage() {
                var width = scope.photoWidth || this.width / this.height * scope.photoHeight;
                var height = scope.photoHeight || this.height / this.width * scope.photoWidth;
                canvas.attr({ width: width, height: height });
                canvas[0].getContext('2d').drawImage(this, 0, 0,  width, height);
                scope.photoLoading = false;
                scope.$apply();
            }
        }
    };
}]);

app.directive('ngContextMenu', function($compile) {
    return  {
        link: function(scope, element, attrs) {

            var _closeContextMenu = function () {
                var oldContextMenu = element[0].getElementsByClassName('context-menu')
                if (oldContextMenu && oldContextMenu.length > 0) {
                    angular.forEach(oldContextMenu, function(elem) {
                        elem.remove();
                    });
                }
            };

            element.bind('contextmenu', function(event) {
                if (!scope.loggedIn)
                    return;
                // Prevent default context menu
                event.preventDefault();
                
                // Get photo id
                scope.contextId = attrs.ngContextMenu;

                // Remove old context menu
                _closeContextMenu();

                // Create a new context menu
                var template = '<div class="context-menu dropdown open">' +
                                    '<ul class="dropdown-menu" role="menu" >' +
                                       '<li><a tabindex="-1" href="#" ng-click="editPhoto(contextId)">Edit</a></li>' +
                                       '<li><a tabindex="-1" href="#" ng-click="downloadPhoto(contextId)">Download</a></li>' +
                                       '<li role="separator" class="divider"></li>' +
                                       
                                       '<li><a tabindex="-1" href="#" ng-click="deletePhoto(contextId)">Delete</a></li>' +
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
                _closeContextMenu();
            });

            element.bind('click', function() {
                _closeContextMenu();
            });
        }
    }
});
