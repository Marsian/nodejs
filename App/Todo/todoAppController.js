var app = angular.module('todoApp', []);

app.controller('todoAppController', [ '$scope', '$http', '$window', 'dateService', function($scope, $http, $window, dateService) {

    $scope.formData = {};
    $scope.userList = [];
    $scope.displayUser = 'All';

    $scope.getDate = function(date) {
        return dateService.getDate(date);
    };

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
        $http.post('/api/deleteTodo/', { id: id } )
            .success(function(data) {
                $scope.displayUser = $scope.user;
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
