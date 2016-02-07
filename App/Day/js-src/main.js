(function(app) {
    app.DayAppComponent =
    ng.core.Component({
        selector: 'day-app',
        templateUrl: 'App/Day/Template/dayApp.html'
    })
    .Class({
        constructor: function() {
            this.message = "My First Angular 2 App";
        }
    });
})(window.app || (window.app = {}));
