var exec = require('child_process').exec,
    GPIO = require('rpi').GPIO,
    pin = [];

 // Pin 0, used when device comes closer
 pin[0] = new GPIO(0, 'out');

 // Pin 7, used when device leaves vicinity
 pin[7] = new GPIO(7, 'out');

 // MAC Address of Device
 var mac = "78:47:1D:2C:89:69";

 // Detection Command
 var cmd = "hcitool cc " + mac + " && hcitool rssi " + mac;

 // Keep track of variables
 var count = 0,
     ncount = 0,
     connected = false;

 // Check status every 50ms
 setInterval(function () {
     exec(cmd, function (error, stdout, stderr) {
         //*
             console.log("---");
             console.log(stdout);
             console.log(Math.round(stdout.split(": ")[1]));
             console.log(count);
             console.log(ncount);
             console.log(connected);
         //*/

         // If signal is stronger than -8, treat it as the phone is in valid rannge
         if(Math.round(stdout.split(": ")[1]) > -8) {
             // Increment count so that continous detections may be logged
             count++;
             
             // If not already connected
             if(connected == false) {
                 // phone is in vicinity for at least 7 detections
                 if(count >= 7) {
                     // console.log("match");
                     // turn first pin on, unlock car
                     pin[0].high();
                     // turn pin off after two seconds
                     setTimeout(function () {
                         pin[0].low()
                     }, 2000);
                     // set status to connected
                     connected = true;
                 }
             }
             
             // Reset count for lack of connections
             ncount = 0;
         } 
         // If the signal is weaker than that, treat it as though the phone is not in valid range
         else if((!stdout || Math.round(stdout.split(
                 ": ")[1]) < -8)) {
             // Increment count for disconnections/lack of connections     
             ncount++;
             
             // If already connected
             if(connected == true) {
                 // Wait for 30 connection failures until car locks
                 if(ncount >= 30) {
                     // console.log("nmatch");
                     // turn second pin on, lock car
                     pin[7].high();
                     // turn pin off after two seconds
                     setTimeout(function () {
                         pin[7].low();
                     }, 2000);
                     // set status to disconnected
                     connected = false;
                 }
             }
             
             // Reset count for connections
             count = 0;
         }
     });
 }, 50);