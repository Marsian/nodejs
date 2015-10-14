var app = angular.module('util', []);

app.provider('$dialog', function dialogProvider() {
    this.$get = ["$http", "$document", "$compile", "$rootScope", "$controller", "$templateCache", "$q", "$injector",
        function ($http, $document, $compile, $rootScope, $controller, $templateCache, $q, $injector) {

        var body = $document.find('body');

        function createElement(clazz) {
            var el = angular.element("<div>");
            el.addClass(clazz);
            return el;
        }

        // var d = new Dialog({templateUrl: 'foo.html', controller: 'BarController'});
        function Dialog(opts) {

            var self = this;
            var options = this.options = opts;
            this._open = false;

            this.modalEl = createElement(options.dialogClass);

            this.handledEscapeKey = function(e) {
                if (e.which === 27) {
                    self.close();
                    e.preventDefault();
                    self.$scope.$apply();
                }
            };
        }

        Dialog.prototype.isOpen = function(){
            return this._open;
        };

        Dialog.prototype.open = function(){
            var self = this, options = this.options;

            if(!options.templateUrl) {
                throw new Error('Dialog.open expected templateUrl. Use options to specify it.');
            }

            this._loadResolves().then(function(locals) {
                var $scope = locals.$scope = self.$scope = locals.$scope ? locals.$scope : $rootScope.$new();

                self.modalEl.html(locals.$template);

                if (self.options.controller) {
                    var ctrl = $controller(self.options.controller, locals);
                    self.modalEl.children().data('ngControllerController', ctrl);
                }

                $compile(self.modalEl)($scope);
                self._addElementsToDom();
                
                self._bindEvents();
            });

            this.deferred = $q.defer();
            return this.deferred.promise;
        };

        // closes the dialog and resolves the promise returned by the `open` method with the specified result.
        Dialog.prototype.close = function(result){
            var self = this;

            this._onCloseComplete(result);
        };

        Dialog.prototype._bindEvents = function() {
            if(this.options.keyboard){ body.bind('keydown', this.handledEscapeKey); }
        };

        Dialog.prototype._unbindEvents = function() {
            if(this.options.keyboard){ body.unbind('keydown', this.handledEscapeKey); }
        };

        Dialog.prototype._onCloseComplete = function(result) {
            this._removeElementsFromDom();
            this._unbindEvents();

            this.deferred.resolve(result);
        };

        Dialog.prototype._addElementsToDom = function(){
            body.append(this.modalEl);

            this._open = true;
        };

        Dialog.prototype._removeElementsFromDom = function(){
            this.modalEl.remove();
          
            this._open = false;
        };

        // Loads all `options.resolve` members to be used as locals for the controller associated with the dialog.
        Dialog.prototype._loadResolves = function(){
            var values = [], keys = [], templatePromise, self = this;

            if (this.options.templateUrl) {
                templatePromise = $http.get(this.options.templateUrl, {cache:$templateCache})
                    .then(function(response) { return response.data; });
            }

            angular.forEach(this.options.resolve || [], function(value, key) {
                keys.push(key);
                values.push(angular.isString(value) ? $injector.get(value) : $injector.invoke(value));
            });

            keys.push('$template');
            values.push(templatePromise);

            return $q.all(values).then(function(values) {
                var locals = {};
                angular.forEach(values, function(value, index) {
                    locals[keys[index]] = value;
                });
                locals.dialog = self;
                return locals;
            });
        };

        return {
            // Creates a new `Dialog` with the specified options.
            dialog: function(opts){
                return new Dialog(opts);
            }
        };
    }];
});

app.provider('dialogService', function dialogServiceProvider() {
    this.$get = ['$dialog', '$templateCache', '$q', '$rootScope', '$timeout', function ($dialog, $templateCache, $q, $rootScope, $timeout) {
        // singleton dialog
        var dialog = null;

        var _removeDialog = function (dialog) {
            dialog.$scope.$destroy();
        };

        // basePath: url of dialog
        // params: object to be injected to the controller
        // controllerName: name of controller class
        var _openDialog = function (basePath, params, controllerName) {
        
            // actually show the dialog.  call when all dependencies are ready
            var _showDialog = function () {
                var opts = {
                    templateUrl: basePath,
                    controller: controllerName,
                    resolve: { params: function () { return angular.copy(params); } }
                };

                opts.dialogClass = controllerName;

                dialog = $dialog.dialog(opts);

                var promise = dialog.open();
                promise.then(function () {
                    $templateCache.remove(opts.templateUrl);
                    _removeDialog(dialog);
                }, function (err) {
                    var msg = "";
                    if (typeof (err) == 'string')
                        msg = err;
                    else if (err.Message)
                        msg = err.Message;
                    alert("Error loading dialog: " + msg);
                });
                
                return promise;
            };
 
            return _showDialog();
        };

        var _isOpen = function() {
            if (dialog)
                return dialog.isOpen();
            else
                return false;
        };

        return {
            openDialog: function (basePath, params, controllerName) {
                return _openDialog(basePath, params, controllerName);
            },
            isOpen: function () {
                return _isOpen();
            }
        };
    }];
});


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
        getDate: function(date, mask) {
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

            if (!mask || mask == '') {
                mask = "yyyy mmmm ddS hh:MM tt";
            }
            var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;
            return mask.replace(token, function ($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });    
        }
    };

}]);


