// Functions for common ClickTime specific operations
myApp.service('CTService', function() {
    var me = this;

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
            var decimal = this.roundToNearestDecimal(time, timeIncrement);
            return this.toHours(decimal);
        }
       
    }

    /** Round to nearest for H:MM format */
    this.roundToNearestTime = function (time, timeIncrement) {
        if (time.startsWith(":")) {
            time = "0" + time;
        }
        var rounded = this.roundToNearestDecimal(this.toDecimal(time), timeIncrement);
        return this.toHours(rounded);
    }

    /** Round to nearest for h.mm format */
    this.roundToNearestDecimal = function (time, timeIncrement) {
        var timeStr = time + '';
        if (timeStr.startsWith('.')) {
            timeStr = "0" + timeStr;
        }
        var time = parseFloat(timeStr);
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

    /** Return the h.mm representation of a hh:mm format. */
    this.toDecimal = function(time) {
        if (time.startsWith(":")) {
            time = "0" + time;
        }
        var splitTime = time.split(":");
        if (splitTime.length != 1 && splitTime.length != 2 && splitTime.length != 3) {
            console.log("Invalid time to convert to decimal: " + time);
            return;
        }
        var hrs = parseInt(splitTime[0]);
        var decMin = 0;
        var decSec = 0;
        if (splitTime.length == 2) {
            var min = parseInt(splitTime[1]);
            decMin = min / 60;
        }
        if (splitTime.length == 3) {
            var sec = parseInt(splitTime[2]);
            decSec = sec / 3600;
        }
        
        var decimal = hrs + decMin + decSec;
        return decimal;
    }

    /** Return the h:mm representation of a h.mm format. */
    this.toHours = function(time) {
        var splitTime = time.toString().split(".");
        var splitHrs = splitTime[0];
        if (splitTime.length == 1) {
            return splitHrs + ":00";
        } else if (splitTime.length == 2) {
            var mm = (("." + splitTime[1]) * 60).toString();
            if (mm.length == 1) {
                var mm = mm + '0';
            }
            return splitHrs + ":" + mm;
        } else {
            console.log("Invalid time to convert to hours: " + time);
            return;
        }
    }

    /** Return true if a string is numeric. */
    this.isNumeric = function (n) {
        return this.isTime(n) || (!isNaN(parseFloat(n)) && isFinite(n));
    }

    /** Returns true if the string is an acceptable duration entry format. */
    this.isTime = function (time) {
        if (time.match(/^([0-9]|0[0-9]|1[0-9]|2[0-4])?:[0-5][0-9]$/)) {
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

    /** Convert a hh:mm format to Clicktime's ISO time string */
    this.convertISO = function (date) {
    	// T splits date/time, . splits ms and the rest
    	return date.toISOString().split('T')[1].split('.')[0];
        //return time + ":00"; 
    }

    /** Compile hrs, min, and sec to a Clicktime Hour stamp */
    this.compileHours = function (hrs, min, sec, timeIncrement) {
        var time = (hrs + min/60 + sec/3600) + '';
        return this.roundToNearest(time, timeIncrement);
    }

    /** Get a string representation of now's time.*/
    this.getNowString = function() {
        var now = new Date();
        var min = null;
        if ((now.getMinutes() + '').length == 1) {
            min = "0" + now.getMinutes(); 
        } else {
            min = now.getMinutes();
        }
        var nowString = now.getHours() + ":" + min;
        return nowString;
    }

    /** Get the default start/end time */
    this.getDefaultStartEndTime = function() {
        var now = new Date();
        return now;
    }

    /** Get the numeric difference in hours, rounded, between two dates.*/
    this.difference = function (endTime, startTime, timeIncrement) {
        var endTimeFix = new Date(2015, 0, 1, endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());
        var startTimeFix = new Date(2015, 0, 1, startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
        var exactHrs = (endTimeFix - startTimeFix) / 36e5;
        if (exactHrs < 0) {
            return -1;
        }
        var roundedHrs = me.roundToNearestDecimal(exactHrs, timeIncrement);
        return parseFloat(roundedHrs);
    }

    //ALEX JONES

    // Get a string in plain english of a successfully saved entry's hours nad minutes
    this.getSuccessTotalFormatted = function (successMessageTotalRaw) {

        var returnString = "";
        var unsplitTotal = successMessageTotalRaw;
        var splitTotal = unsplitTotal.split(":");
        console.log(splitTotal);
        var hoursFormatted = splitTotal[0];
        var minutesFormatted = splitTotal[1];

        if (parseInt(hoursFormatted) < 1) {

            returnString = minutesFormatted + " mins";

            return returnString;
        }

        if (parseInt(hoursFormatted) >= 1) {

            returnString = returnString + hoursFormatted + " hr";
        }

        if (parseInt(hoursFormatted) >= 2) {

            returnString = returnString + "s";
        }

        if (parseInt(minutesFormatted.slice(0,1)) == 0 && parseInt(minutesFormatted.slice(1,2)) > 0) {

           returnString =  returnString + " and " + minutesFormatted.slice(1,2) + " mins";
        }

        else if (parseInt(minutesFormatted.slice(0,1)) > 0 && parseInt(minutesFormatted.slice(1,2)) >= 0) {

            returnString = returnString + " and " + minutesFormatted + " mins";
        }

        return returnString;
    }

    //ALEX JONES

    /** Return a string of the current number of logged hrs */
    this.getLogMessage = function (hrs, min) {

        if (!hrs || hrs == 0) {
            if (min && min != 0) {
                if (min > 1) {
                    return min + " mins recorded today";
                } else {
                    return min + " min recorded today";
                }
            } else {
                return "No time recorded yet today";
            }
        } else if (hrs > 1) {
           if (min && min != 0) {
                if (min > 1) {
                    return hrs + " hrs and " + min + " mins recorded today";
                } else {
                    return hrs + " hrs and " + min + " min recorded today";
                }
            } else {
                return hrs + " hrs recorded today";
            }
        } else {
            if (min && min != 0) {
                if (min > 1) {
                    return hrs + " hr and " + min + " mins recorded today";
                } else {
                    return hrs + " hr and " + min + " min recorded today";
                }
            } else {
                return hrs + " hr recorded today";
            }
        }
    }

    //ALEX JONES
    this.getZeroHoursMessage = function(hrs, min) {
        
        if ((!hrs || hrs == 0) && (!min || min == 0)) {

            return " - Let's track some time!";
        }
    }

    //ALEX JONES
   
})