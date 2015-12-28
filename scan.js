var POLLING_INTERVAL = 3500, // Milliseconds
    VICINITY_STRENGTH = -8, // B/T RSSI
    BUTTON_HOLD_TIME = 2000, // Milliseconds
    DISCONNECTION_DURATION = 24500, // Milliseconds
    CONF_FILE = 'BLUETOOTH-HW.CONF';

var exec = require('child_process').exec,
    fs = require("fs"),
    GPIO = require('rpi').GPIO;

var mac = fs.readFileSync(CONF_FILE);

var unlockPin = new GPIO(0, 'out'),
    lockPin = new GPIO(7, 'out');

var changeButton = new GPIO(8, 'in');

var connectionStatus = false,
    lastConnectionTime = 0;

var disconnectionCount = 0;

changeButton.on('change', function(value) {
    if (value == 1) {
        exec("hcitool scan", function(error, stdout, stderr) {
            mac = stdout.split("\n")[1].split("\t")[1];
            //
            // check mac, err. check with values
            // take first dev.
            //
            fs.writeFileSync(CONF_FILE, mac);
        });
    }
});

function switchPower(pin) {
    pin.high();
    setTimeout(function() {
        pin.low();
    }, BUTTON_HOLD_TIME);
}

function cmd() {
    return "hcitool cc " + mac + " && hcitool rssi " + mac;
}

function parseConnectionStrength(resp) {
    var rawRSSI = resp.split(": ")[1];
    if (rawRSSI != "") {
        return Math.round(rawRSSI); // Math.round is applied to convert string to number, returns RSSI from command
    } else {
        return -2056;               // Device is not is range
    }
}

// Probe for Device Presence
setInterval(function() {
    if (mac.length == 17) {
        exec(cmd(), function(error, stdout, stderr) {
            var connectionStrength = parseConnectionStrength(stdout);

            // Check if phone is in valid range
            if ((connected == false) && (connectionStrength > VICINITY_STRENGTH)) {
                switchPower(unlockPin);
                connected = true;
                lastConnectionTime = Date.now();
                disconnectionCount = 0;
            }
            // If the signal is weaker than that, treat it as though the phone is not in valid range
            else if ((connected == true) && (connectionStrength < VICINITY_STRENGTH)) {
                disconnectionCount++;
                // Calculate approx. how many times hardware should be probed before disconnect is acknowledged
                if (disconnectionCount >= Math.ceil(DISCONNECTION_DURATION / POLLING_INTERVAL)) {
                    switchPower(lockPin);
                    connected = false;
                }
            }
        });
    }
}, POLLING_INTERVAL);