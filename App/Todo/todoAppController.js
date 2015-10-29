var app = angular.module('todoApp', ['util']);

app.controller('todoAppController', [ '$scope', '$http', '$window', 'dateService', 'dialogService', function($scope, $http, $window, dateService, dialogService) {

    $scope.formData = {};
    $scope.groupList = [];
    $scope.priorities = [ { name: 'Low', value: 0 },
                          { name: 'Medium', value: 1 },
                          { name: 'High', value: 2 } ];
    $scope.list = { groupId: "0", name: "User list"};

    $scope.getDate = function(date) {
        return dateService.getDate(date, "ddd mmm ddS hh:MM tt");
    };

    var _updateTodoList = function(list) {
        $http.post('api/updateTodoList', list )
            .success(function(data) {
                $scope.formData = {}; // clear the form so our user is ready to enter another
                $scope.todos = data;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    var _initialize = function() {
        $http.get('/api/todos')
            .success(function(data) {
                $scope.user = data.user;
                $scope.groupList = data.groupList;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    }

    // when submitting the add form, send the text to the node API
    $scope.createTodo = function() {
        $scope.formData.list = $scope.list;
        $http.post('/api/todos', $scope.formData)
            .success(function(data) {
                $scope.formData = {}; // clear the form so our user is ready to enter another
                // Update current todo list
                _updateTodoList($scope.list);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    // delete a todo after checking it
    $scope.deleteTodo = function(id) {
        $http.post('/api/deleteTodo/', { id: id } )
            .success(function(data) {
                $scope.todos = data;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    
    $scope.edit = function(id) {
        angular.forEach($scope.todos, function (todo) {
            if (todo._id == id) 
                todo.edit = true;
                todo.newText = todo.text;
                todo.newPriority = todo.priority;
                todo.newProgress = todo.progress;
        });
    };

    $scope.confirmEdit = function(id, newText, newPriority, newProgress) {
        var request = { id: id, text: newText, priority: newPriority, progress: newProgress };
        $http.post('api/updateTodo', request)
            .success( function(data) {
                if (data && data.text) {
                    angular.forEach($scope.todos, function (todo) {
                        if (todo._id == id) {
                            todo.text = data.text;
                            todo.priority = data.priority;
                            todo.progress = data.progress;
                            todo.edit = false;
                        }
                    });
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });

    };

    $scope.cancelEdit = function(id) {
        angular.forEach($scope.todos, function (todo) {
            if (todo._id == id) 
                todo.edit = false;
        });
    };

    $scope.toggleSelect = function(id) {
        angular.forEach($scope.todos, function (todo) {
            if (todo._id == id) {
                if (todo.selected) 
                    todo.selected = false;
                else
                    todo.selected = true;
            }
        });
    };

    $scope.postComment = function(id, newComment) {
        var request = { id: id, text: newComment };
        $http.post('api/postComment', request)
            .success( function(data) {
                if (data.length > 0) {
                    angular.forEach($scope.todos, function (todo) {
                        if (todo._id == id) {
                            todo.comments = data[0].comments;
                            todo.newComment = "";
                        }
                    });
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });

    };

    $scope.addGroup = function() {
        var params = { user: $scope.user };
        dialogService.openDialog('./App/Todo/Dialog/addGroupDialog.html', params, 'addGroupDialogController')
            .then(function(result) {
                if (result) {
                   _initialize(); 
                }
            });
    };

    $scope.manageGroup = function() {
        var params = { user: $scope.user, groupList: $scope.groupList };
        dialogService.openDialog('./App/Todo/Dialog/manageGroupDialog.html', params, 'manageGroupDialogController')
            .then(function(result) {
                if (result) {
                   _initialize(); 
                }
            });
    };

    $scope.getUserList = function() {
        $scope.list = { groupId: "0", name: "User list" };
        _updateTodoList($scope.list);
    };

    $scope.getGroupList = function(group) {
        $scope.list = group;
        _updateTodoList($scope.list);
    };

    $scope.$watch('user', function(user) {
        _updateTodoList($scope.list);
    });

    // when landing on the page, get the user and group list
    _initialize();
}]);
