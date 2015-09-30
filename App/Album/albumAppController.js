var app = angular.module('albumApp', ['angularFileUpload']);

app.controller('albumAppController', [ '$scope', '$http', '$window', 'dateService', function($scope, $http, $window, dateService) {

    $scope.getDate = function(date) {
        return dateService.getDate(date);
    };

    $scope.showUploadDialog = false;
    $scope.toggleUploadDialog = function() {
        $scope.showUploadDialog = !$scope.showUploadDialog;
    };   

    $scope.$on('closeUploadDialog', function() {
        $scope.showUploadDialog = false;
    });

    // load context
    $http.get('/api/album')
        .success(function(data) {
            $scope.user = data.user;
            $scope.loggedIn = data.loggedIn;
            console.log(data);
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });

    /*
    // when submitting the add form, send the text to the node API
    $scope.createTodo = function() {
        $http.post('/api/todos', $scope.formData)
            .success(function(data) {
                $scope.formData = {}; // clear the form so our user is ready to enter another
                $scope.displayUser = $scope.user;
                $scope.todos = data;
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    */
}]);

app.controller('loginController', [ '$scope', '$http', function($scope, $http) {
    $scope.username = "";
    $scope.password = "";
    $scope.err = "";

    $scope.login = function() {
        var logon = { username: $scope.username, 
                      password: $scope.password };
        $http.post('/api/Album-Login', logon)
            .success( function(data) {
                if (data.err) {
                    $scope.err = data.err;
                    return;
                }
                if (data.redirect)
                    window.location = data.redirect;
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

            var mask = "ddd mmm ddS hh:MM tt";
            var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;
            return mask.replace(token, function ($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });    
        }
    };

}]);

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
    uploader.onProgressItem = function(fileItem, progress) {
        console.info('onProgressItem', fileItem, progress);
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
        console.log(response);
        fileItem.uploadId = response.id;
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);
    };
    uploader.onCompleteAll = function() {
        console.info('onCompleteAll');
    };
}]);


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
    }]);

