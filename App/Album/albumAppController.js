var app = angular.module('albumApp', ['angularFileUpload']);

app.controller('albumAppController', [ '$scope', '$http', '$window', '$timeout', 'dateService', function($scope, $http, $window, $timeout, dateService) {
    // Variable initialize
    $scope.photos = [];
    $scope.loadCount = 0;

    $scope.deleteNum = 0;
    $scope.deleteIds = [];
    $scope.deleteSet = new Set();
    $scope.deleteMode = false;

    $scope.getDate = function(date) {
        return dateService.getDate(date);
    };
    
    // View
    $scope.editMode = false;
    $scope.toggleEditMode = function () {
        $scope.editMode = !$scope.editMode;
        if (!$scope.editMode) {
            $scope.deleteNum = 0;
            $scope.deleteIds = [];
            $scope.deleteMode = false;
            angular.forEach($scope.photoData, function(photo) {
                photo.toDelete = false;
            });
        }
    };

    $scope.showUploadDialog = false;
    $scope.toggleUploadDialog = function() {
        $scope.showUploadDialog = !$scope.showUploadDialog;
    };   
    $scope.$on('closeUploadDialog', function() {
        $scope.showUploadDialog = false;
    });
    
    $scope.showDetailDialog = false;
    $scope.currentPhoto = null;
    $scope.toggleDetailDialog = function(photo) {
        $scope.currentPhoto = photo;
        $scope.showDetailDialog = !$scope.showDetailDialog;
    };   
    $scope.$on('closeDetailDialog', function() {
        $scope.showDetailDialog = false;
    });

    $scope.dialogOpened = function() {
        return $scope.showDetailDialog ||
               $scope.showUploadDialog;
    };

    $scope.deleteCheck = function(photo) {
        if (photo.toDelete) {
            $scope.deleteNum += 1;
            if ($scope.deleteNum > 0)
                $scope.deleteMode = true;
        } else {
            $scope.deleteNum -= 1;
            if ($scope.deleteNum == 0)
                $scope.deleteMode = false;
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
            if (photo.toDelete) {
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
                $scope.deleteMode = false;
                $scope.deleteNum = 0;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
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

//######## Upload Dialog ############
app.directive('uploadDialog', function() {
    return {
        restrict: 'E',
        replace: true, // Replace with the template below
        transclude: true, // we want to insert custom content inside the directive
        templateUrl: './App/Album/uploadDialog.html'
    };
}).controller('uploadDialogController', [ '$scope', '$http', 'FileUploader', function($scope, $http, FileUploader) {
    
    var uploader = $scope.uploader = new FileUploader({
        url: '/api/photo'
    });

    $scope.hideModal = function() {
        $scope.$emit("closeUploadDialog");
    };
            
    $scope.ok = function() {
        $scope.uploader.clearQueue();
        $scope.$emit("uploadComplete");
        $scope.hideModal();
    };
    
    $scope.cancel = function() {
        angular.forEach($scope.uploader.queue, function(item) {
            if (item.uploadId)
                $scope.remove(item);
        }); 

        $scope.hideModal();
    };


    $scope.remove = function(item) {
        $http.post('/api/deletePhoto', { id: item.uploadId })
            .success( function(data) {
                if (data.err) {
                    $scope.err = data.err;
                    return;
                } else
                    $scope.uploader.removeFromQueue(item);
            })
            .error( function(data) {
                $scope.err = data.err;
            });
    };

    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
        console.info('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onAfterAddingFile = function(fileItem) {
        $scope.currentFile = fileItem.file.name;
        fileItem.formData.push( { lastModified: fileItem.file.lastModifiedDate } );
        console.info('onAfterAddingFile', fileItem);
        fileItem.upload();
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
        console.log(response);
        fileItem.uploadId = response.id;
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        fileItem.uploadId = response.id;
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);
    };
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

app.factory('dateService', [ '$window', function($window) {

    var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                       "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
                    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var _pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    return {
        // localize Date and format the date string
        getDate: function(date) {
            var jsDate = new Date(date);
            var _ = "get";
            var d = jsDate[_ + "Date"](),
                D = jsDate[_ + "Day"](),
                m = jsDate[_ + "Month"](),
                y = jsDate[_ + "FullYear"](),
                H = jsDate[_ + "Hours"](),
                M = jsDate[_ + "Minutes"](),
                flags = {
                    d:    d,
                    dd:   _pad(d),
                    ddd:  dayNames[D],
                    dddd: dayNames[D + 7],
                    m:    m + 1,
                    mm:   _pad(m + 1),
                    mmm:  monthNames[m],
                    mmmm: monthNames[m + 12],
                    yy:   String(y).slice(2),
                    yyyy: y,
                    h:    H % 12 || 12,
                    hh:   _pad(H % 12 || 12),
                    H:    H,
                    HH:   _pad(H),
                    M:    M,
                    MM:   _pad(M),
                    t:    H < 12 ? "a"  : "p",
                    tt:   H < 12 ? "am" : "pm",
                    T:    H < 12 ? "A"  : "P",
                    TT:   H < 12 ? "AM" : "PM",
                    S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
                };

            var mask = "yyyy mmmm ddS hh:MM tt";
            var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;
            return mask.replace(token, function ($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });    
        }
    };

}]);


