var app = angular.module('albumApp');

app.controller('uploadDialogController', [ '$scope', '$http', 'dialog', 'FileUploader', function($scope, $http, dialog, FileUploader) {
    
    $scope.err = "";
    $scope.currentFile = "";
    $scope.uploading = false;

    var uploader = $scope.uploader = new FileUploader({
        url: '/api/photo'
    });

    uploader.filters.push({
        name: 'imageFilter',
        fn: function(item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            console.log(item);
            return ('|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1) && // format restriction 
                   (item.size < 10 * 1024 * 1024); // file size smaller than 10MB
        }
    });

    $scope.ok = function() {
        $scope.uploader.clearQueue();
        dialog.close(true);
    };
    
    $scope.cancel = function() {
        angular.forEach($scope.uploader.queue, function(item) {
            if (item.uploadId)
                $scope.remove(item);
        }); 

        dialog.close();
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
        $scope.err = "Adding file failed. Please upload only image that is smaller than 10MB.";
        console.info('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onAfterAddingFile = function(fileItem) {
        $scope.currentFile = fileItem.file.name;
        $scope.uploading = true;
        fileItem.formData.push( { lastModified: fileItem.file.lastModifiedDate } );
        console.info('onAfterAddingFile', fileItem);
        fileItem.upload();
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
        console.log(response);
        if (uploader.getNotUploadedItems().length == 0)
            $scope.uploading = false;
        fileItem.uploadId = response._id;
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        fileItem.uploadId = response._id;
        if (uploader.getNotUploadedItems().length == 0)
            $scope.uploading = false;
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        if (uploader.getNotUploadedItems().length == 0)
            $scope.uploading = false;
        console.info('onCompleteItem', fileItem, response, status, headers);
    };
}]);


