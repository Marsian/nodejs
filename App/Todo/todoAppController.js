var app = angular.module('todoApp', ['util']);

app.controller('todoAppController', [ '$scope', '$http', '$window', 'dateService', function($scope, $http, $window, dateService) {

    $scope.formData = {};
    $scope.userList = [];
    $scope.displayUser = 'All';
    $scope.priorities = [ { name: 'Low', value: 0 },
                          { name: 'Medium', value: 1 },
                          { name: 'High', value: 2 } ];

    $scope.getDate = function(date) {
        return dateService.getDate(date, "ddd mmm ddS hh:MM tt");
    };

    // when landing on the page, get all todos and show them
    $http.get('/api/todos')
        .success(function(data) {
            $scope.todos = data.todos;
            $scope.user = data.user;
            $scope.userList = data.userList;
            $scope.userList.push( { user: "All", name: "" } );
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });

    // when submitting the add form, send the text to the node API
    $scope.createTodo = function() {
        $http.post('/api/todos', $scope.formData)
            .success(function(data) {
                $scope.formData = {}; // clear the form so our user is ready to enter another
                $scope.displayUser = $scope.user;
                $scope.todos = data;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    // delete a todo after checking it
    $scope.deleteTodo = function(id) {
        $http.post('/api/deleteTodo/', { id: id } )
            .success(function(data) {
                $scope.displayUser = $scope.user;
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

    $scope.$watch('displayUser', function(user) {
        var name = "";
        for ( var i in $scope.userList ) {
            if ($scope.userList[i].user == user)
                name = $scope.userList[i].name;
        }
        $http.post('api/updateTodoList', { name: name } )
            .success(function(data) {
                $scope.formData = {}; // clear the form so our user is ready to enter another
                $scope.todos = data;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });

    });

}]);
