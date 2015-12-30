var POLLING_INTERVAL = 3500, // Milliseconds
    VICINITY_STRENGTH = -8, // B/T RSSI
    BUTTON_HOLD_TIME = 2000, // Milliseconds
    DISCONNECTION_DURATION = 24500, // Milliseconds
    CONF_FILE = 'BLUETOOTH-HW.CONF';

var execSync = require('child_process').execSync,
    fs = require("fs"),
    GPIO = require('rpi').GPIO;

var mac = fs.readFileSync(CONF_FILE);

var unlockPin = new GPIO(0, 'out'),
    lockPin = new GPIO(7, 'out');

var changeButton = new GPIO(8, 'in');

var inRange = false,
    lastConnectionTime = 0;

var disconnectionCount = 0;

/*changeButton.on('change', function(value) {
    if (value == 1) {
        console.log("Request to Change Bluetooth Device Received.");
        exec("hcitool scan", function(error, stdout, stderr) {
            console.log(" - Scanning...");
            var mac_addr_line = stdout.split("\n")
            
            if(mac_addr_line[1] != ""){
                var temp_mac = mac_addr_line[1].split("\t")[1];

                if(temp_mac.length = 17){
                    console.log("   - Device found: " + mac);
                    mac = temp_mac;
                    fs.writeFileSync(CONF_FILE, mac);
                } else {
                    console.log("   - No Device was Found.");
                }
            }
        });
    }
});*/

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
    console.log("    - raw RSSI: " + rawRSSI);
    
    if (rawRSSI != "") {
        return Math.round(rawRSSI); // Math.round is applied to convert string to number, returns RSSI from command
    } else {    
        return -2056;               // Device is not is range, return number that is guaranteed to far out of the RSSI range
    }
}

// Probe for Device Presence
setInterval(function() {
    console.log("Probing for Connection...");
    console.log(" - " + Date.now());
    if (mac.length == 17) {
        console.log(" - Valid MAC Address was found in Config, detecting signal strength.");
        try {
            var stdout = execSync(cmd(),{
                encoding: 'utf8'
            });
            var connectionStrength = parseConnectionStrength(stdout);
        } catch(e){
            var connectionStrength = -2056;
        }
        console.log("Stdout: "+stdout);
        console.log(connectionStrength);
        console.log(inRange);
        console.log(VICINITY_STRENGTH);
        // Check if phone is in valid range
        if ((inRange == false) && (connectionStrength > VICINITY_STRENGTH)) {
            console.log(" - Phone is in the disconnected state and device is within preconfigured vicinity.");
            console.log("    - Unlocking Car");
            switchPower(unlockPin);
            console.log("    - Reconfiguring Variables");
            inRange = true;
            lastConnectionTime = Date.now();
            disconnectionCount = 0;
            console.log("       - Connection Time: " + lastConnectionTime);   
        }
        // If the signal is weaker than that, treat it as though the phone is not in valid range
        else if ((inRange == true) && (connectionStrength < VICINITY_STRENGTH)) {
            console.log(" - Phone is in the connected state and device is not within preconfigured vicinity.");
            disconnectionCount++;
            console.log("    - Increment Disconnection Count: " + disconnectionCount);
            // Calculate approx. how many times hardware should be probed before disconnect is acknowledged
            if (disconnectionCount >= Math.ceil(DISCONNECTION_DURATION / POLLING_INTERVAL)) {
                console.log("    - Locking Car");
                switchPower(lockPin);
                inRange = false;
            }
        }
    }
    console.log("--------------");
}, POLLING_INTERVAL);