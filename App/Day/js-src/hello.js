(function(app) {
    app.HelloComponent =
        ng.core.Component({
            selector: 'my-app',
            template: '<h1>My First Angular 2 App</h1>'
        })
        .Class({
            constructor: function() {}
        });
})(window.app || (window.app = {}));
