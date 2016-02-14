import {bootstrap} from 'angular2/platform/browser';
import {Component} from 'angular2/core';
import {WeatherComponent} from './weather.component'

@Component({
    selector: 'day-app',
    templateUrl: 'App/Day/Template/dayApp.html',
    directives: [WeatherComponent]
})

export class DayAppComponent {
    message = "My First Angular 2 App"
}

bootstrap(DayAppComponent);
