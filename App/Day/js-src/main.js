(function(app) {
    app.DayAppComponent =
    ng.core.Component({
        selector: 'day-app',
        templateUrl: 'App/Day/Template/dayApp.html',
        directives: [app.HelloComponent]
    })
    .Class({
        constructor: function() {}
    });
})(window.app || (window.app = {}));
