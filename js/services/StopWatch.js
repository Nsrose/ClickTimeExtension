// The Stop Watch class

function StopWatch() {
    var startTime = endTime = 0;
    var running = false;
    var now = function() {
        return (new Date()).getTime();
    }

    // starts the stopwatch timer
    this.start = function() { 
        if (running == true) {	
            return;
        } else {
            startTime = now();
            running = true;
        }
    }

    // ends the stopwatch timer
    this.stop = function() { 
        if (running == false) {
            return;
        } else {
            endTime = now();
            running = false; 
        }
    }

    // resets the timer
    this.reset = function() {
        startTime = 0;
        endTime = 0; 
        running = false;
    }

    // display purposes
    this.pad = function(num, size) {
        var s = "0000" + num;
        return s.substr(s.length - size);
    }

    this.formatTime = function(time) {
        var h = m = s = 0;
        var newTime = "";

        h = Math.floor(time / (60 * 60 * 1000));
        time = time % (60 * 60 * 1000);
        m = Math.floor(time / (60 * 1000));
        time = time % (60 * 1000);
        s = Math.floor(time / 1000);

        newTime = this.pad(h, 2) + ':' + this.pad(m, 2) + ':' + this.pad(s, 2);
        return newTime;
    }
    
    // This method should determine we have both a start and stop timestamp, 
    // and return the duration between the two.
    this.duration = function() { 
       return this.formatTime(endTime - startTime);
    }

    this.time = function() {
        if (startTime != 0) {
            return now() - startTime;
        } else {
            return 0;
        }
    }
}

