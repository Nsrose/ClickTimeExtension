// Functions for common Clicktime specific operations
myApp.service('CTService', function() {
	  /**
     * Converts a true time value to a rounded time value according to the rounding scheme
     * @param  time             Precise time
     * @param  timeIncrement    Timestep (ONLY LESS THAN OR EQUAL TO 1) (e.x. 1, 0.5, 0.25, 0.1)
     * @return The rounded time according to the timeIncrement parameter
     * Shamelessly stolen from Clicktime's js library.
     */
    this.roundToNearest = function (time, timeIncrement) {
        if (time.indexOf(":") != -1) {
            return this.roundToNearestTime(time, timeIncrement);
        } else {
            return this.roundToNearestDecimal(time, timeIncrement);
        }
       
    }

    /** Round to nearest for H:MM format */
    this.roundToNearestTime = function (time, timeIncrement) {
        var splitTime = time.split(":");
        if (splitTime.length != 2) {
            return null;
        }
        var hrs = parseInt(splitTime[0]);
        var min = parseInt(splitTime[1]);
        var decMin = min / 60;
        var decimal = hrs + decMin;
        var rounded = this.roundToNearestDecimal(decimal, timeIncrement);
        var roundedSplit = rounded.toString().split(".");
        if (roundedSplit.length == 1) {
            var roundedHrs = roundedSplit[0];
            return roundedHrs + ":00";
        } else if (roundedSplit.length == 2) {
            var mm = (("." + roundedSplit[1]) * 60).toString(); 
            if (mm.length == 1) {
                var mm = mm + "0";
            }
            return roundedHrs + ":" + mm;
        } else {
            return null;
        }
    }

    /** Round to nearest for h.mm format */
    this.roundToNearestDecimal = function (time, timeIncrement) {
        var precision;
        switch (timeIncrement) {
            case "1":
            case 1:
                precision = 0;
                break;
            case "0.25":
            case 0.25:
                precision = 2;
                break;
            default:
                precision = 1;
                break;
        }

        var intpart = parseInt(time);
        var decpart = parseFloat(time - intpart);
        var howManyIncrements = Math.round(parseFloat(decpart / timeIncrement).toFixed(10));
        if (intpart == 0 && howManyIncrements == 0 && time > 0) howManyIncrements = 1;
        return (intpart + howManyIncrements * timeIncrement).toFixed(precision); 
    }

    /** Return true if a string is numeric. */
    this.isNumeric = function (n) {
        return this.isTime(n) || !isNaN(parseFloat(n)) && isFinite(n);
    }

    /** Returns true if the string is an acceptable duration entry format. */
    this.isTime = function (time) {
        if (time.match(/(^([0-9]|[0-1][0-9]|[2][0-3]):([0-5][0-9])$)|(^([0-9]|[1][0-9]|[2][0-3])$)/)) {
            return true;
        }
        return false;
    }

    /** Returns a typical date string format for submitting a new time entry.*/
    this.getDateString = function () {
    	var d = new Date();
    	var year = d.getFullYear().toString();
    	var day = d.getDate().toString();
    	var month = (d.getMonth() + 1).toString();

    	if (day.length == 1) {
    		day = "0" + day;
    	}

    	if (month.length == 1) {
    		month = "0" + month;
    	}

    	var result = year + month + day;
    	return result;
    }

    /** Convert a stupid Angular ISO date to Clicktime's ISO time string */
    this.convertISO = function (date) {
    	// T splits date/time, . splits ms and the rest
    	return date.toISOString().split('T')[1].split('.')[0];
    }

    /** Compile hrs, min, and sec to a Clicktime Hour stamp */
    this.compileHours = function (hrs, min, sec) {
        var time = (hrs + min/60 + sec/3600) + '';
        return this.roundToNearest(time, 0.25);
    }

   
})