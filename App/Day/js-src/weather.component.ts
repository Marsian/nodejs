import {Component} from 'angular2/core';

@Component({
    selector: 'weather-component',
    templateUrl: 'App/Day/Template/weather.component.html',
})

export class WeatherComponent {
    geo = "Not started";

    execute () {
        this.geo = "Working...";
    }

    constructor () {

        if (!navigator.geolocation){
            this.geo = "Geolocation is not supported by your browser";
        } else {
            this.geo = "Loading...";

            navigator.geolocation.getCurrentPosition((position) => {
                console.log(position);
                var latitude  = position.coords.latitude;
                var longitude = position.coords.longitude;
                
                this.geo = "Got it!";
            }, () => {
                console.log("Unable to retrieve your location");
            });
        }
    }
}
