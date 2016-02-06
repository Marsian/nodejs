var app = angular.module('albumApp');

app.factory('timelineService', [ 'dateService', function(dateService) {

    var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                       "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var timeline = [];

    var _generateTimeline = function() {
        var currentDate = new Date();
        var currentYear = currentDate.getFullYear();
        var currentMonth = currentDate.getMonth();

        // generate timeline for the current year
        for (var m = currentMonth; m >= 0; m--) {
            timeline.push({
                title: monthNames[m] + ' ' + currentYear,
                month: m,
                year: currentYear,
                photoIds: []
            });
        }

        // generate timeline for the last ten years
        for(var i = 1; i <= 10; i++) {
            for (var m = 11; m >= 0; m--) {
                timeline.push({
                    title: monthNames[m] + ' ' + (currentYear - i),
                    month: m,
                    year: currentYear - i,
                    photoIds: []
                });
            }
        }

        timeline.push({ title: "Missing Date", photoIds: []  });
    }
    _generateTimeline();

    return {
        getTimeline: function() {
            return timeline;
        },

        clearTimeline: function() {
            timeline = [];
            _generateTimeline();
        },

        addToTimeline: function(photo) {
            if (!photo.date) {
                timeline[timeline.length - 1].photoIds.push(photo._id);
            }

            var date = new Date(photo.date);
            var currentDate = new Date();

            if (date.getFullYear() < currentDate.getFullYear() - 10) {
                timeline[timeline.length - 1].photoIds.push(photo._id);
            } else  {
                var offset = ( currentDate.getFullYear() -  date.getFullYear() ) * 12;
                offset += ( currentDate.getMonth() - date.getMonth() );
                timeline[offset].photoIds.push(photo._id);
            }
        },

        deleteFromTimeline: function(photo) {
            var offset = 0;
            if (!photo.date) {
                offset = timeline.length - 1;
            } else {
                var date = new Date(photo.date);
                var currentDate = new Date();

                if (date.getFullYear() < currentDate.getFullYear() - 10) {
                    offset = timeline.length - 1;
                } else {
                    offset = ( currentDate.getFullYear() -  date.getFullYear() ) * 12;
                    offset += ( currentDate.getMonth() - date.getMonth() );
                }
            }

            for (var i in timeline[offset].photoIds) {
                if (timeline[offset].photoIds[i] == photo._id) {
                    timeline[offset].photoIds.splice(i, 1);
                    break;
                }    
            }
        }
    };

}]);


