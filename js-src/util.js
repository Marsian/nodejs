var app = angular.module('util', []);

app.provider('$dialog', function dialogProvider() {
   this.$get = [ function dialogFactory() {
   
        
   }];
});

app.provider('dialogService', function dialogServiceProvider() {

    this.$get = [ '$dialog', function dialogServiceFactory($dialog) {
        
        return {
            
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


