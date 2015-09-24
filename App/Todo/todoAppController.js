var app = angular.module('todoApp', []);

app.controller('todoAppController', [ '$scope', '$http', '$window', function($scope, $http, $window) {

    $scope.formData = {};
    $scope.userList = [];
    $scope.displayUser = 'All';

    // when landing on the page, get all todos and show them
    $http.get('/api/todos')
        .success(function(data) {
            $scope.todos = data.todos;
            $scope.user = data.user;
            $scope.userList = data.userList;
            $scope.userList.push( { user: "All", name: "" } );
            console.log(data);
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
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    // delete a todo after checking it
    $scope.deleteTodo = function(id) {
        $http.delete('/api/todos/' + id)
            .success(function(data) {
                $scope.todos = data;
                console.log(data);
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
        });
    };

    $scope.confirmEdit = function(id, newText) {
        var request = { id: id, text: newText };
        $http.post('api/updateTodo', request)
            .success( function(data) {
                if (data.length > 0) {
                    angular.forEach($scope.todos, function (todo) {
                        if (todo._id == id) {
                            todo.text = data[0].text;
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
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });

    });

}]);

app.controller('loginController', [ '$scope', '$http', function($scope, $http) {
    $scope.username = "";
    $scope.password = "";
    $scope.err = "";

    $scope.login = function() {
        var logon = { username: $scope.username, 
                      password: $scope.password };
        $http.post('/api/login', logon)
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
