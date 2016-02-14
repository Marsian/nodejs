System.register(['angular2/core'], function(exports_1) {
    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = (this && this.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var core_1;
    var WeatherComponent;
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            }],
        execute: function() {
            WeatherComponent = (function () {
                function WeatherComponent() {
                    this.geo = "Not started";
                }
                WeatherComponent.prototype.newWeatherCompoment = function () {
                    if (!navigator.geolocation) {
                        this.geo = "Geolocation is not supported by your browser";
                    }
                    else {
                        this.geo = "Loading...";
                        function success(position) {
                            console.log(position);
                            var latitude = position.coords.latitude;
                            var longitude = position.coords.longitude;
                            this.geo = "Got it!";
                        }
                        ;
                        function error() {
                            console.log("Unable to retrieve your location");
                        }
                        ;
                        navigator.geolocation.getCurrentPosition(success, error);
                    }
                };
                WeatherComponent = __decorate([
                    core_1.Component({
                        selector: 'weather-component',
                        templateUrl: 'App/Day/Template/weather.component.html',
                    }), 
                    __metadata('design:paramtypes', [])
                ], WeatherComponent);
                return WeatherComponent;
            })();
            exports_1("WeatherComponent", WeatherComponent);
        }
    }
});
//# sourceMappingURL=weather.component.js.map