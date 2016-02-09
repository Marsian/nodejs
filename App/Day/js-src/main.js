(function(app) {
    app.DayAppComponent =
        ng.core.Component({
            selector: 'day-app',
            templateUrl: 'App/Day/Template/dayApp.html',
            directives: [app.WeatherComponent]
        })
        .Class({
            constructor: function() {
                this.message = "My First Angular 2 App";
            }
        });

    document.addEventListener('DOMContentLoaded', function() {
        ng.platform.browser.bootstrap(app.DayAppComponent);
    });
})(window.app || (window.app = {}));
