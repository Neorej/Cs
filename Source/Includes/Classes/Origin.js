// http://www.edwilliams.org/gccalc.htm
// Copyright 1997 Ed Williams. All rights reserved

class Origin {
    constructor(startlatitude, startlongitude) {
        this.startlatitude  = startlatitude;
        this.startlongitude = startlongitude;

        this.startlatitudeSign  = 1;
        this.startlongitudeSign = -1;

        if (this.startlatitude.charAt(0) === '-') {
            this.startlatitude     = this.startlatitude.substr(1);
            this.startlatitudeSign = -1;
        }

        if (this.startlongitude.charAt(0) === '-') {
            this.startlongitude     = this.startlongitude.substr(1);
            this.startlongitudeSign = 1;
        }
    }

    calculateDestination(course, distance) {
        distance = distance / 1.852;  // Distance in Nautical Miles
        course   = course * Math.PI / 180.;  // radians

        let latitude  = (Math.PI / 180) * this.startlatitudeSign * Origin.parselatlon(this.startlatitude);
        let longitude = (Math.PI / 180) * this.startlongitudeSign * Origin.parselatlon(this.startlongitude);

        let ellipse = {
            a: 6378.137 / 1.852,
            invf: 298.257223563,
        };

        // elliptic code
        let cde  = Origin.direct_ell(latitude, -longitude, course, distance, ellipse);  // ellipse uses East negative
        let lat2 = cde.latitude * (180 / Math.PI);
        let lon2 = cde.longitude * (180 / Math.PI);

        // Convert to DMS, used in tests (bad practise)
        //let lon2 = -cde.longitude * (180 / Math.PI); // ellipse uses East negative
        //let latLetter = lat2 >= 0 ? 'N' : 'S';
        //let lonLetter = lon2 >= 0 ? 'W' : 'E';
        //
        //let lat2s = Origin.degtodm(Math.abs(lat2));
        //let lon2s = Origin.degtodm(Math.abs(lon2));

        return {
            'latitude': lat2,
            'longitude': lon2,
        };
    }

    static badLLFormat(str) {
        alert(str + ' is an invalid lat/lon format: Use DD.DD DD:MM.MM or DD:MM:SS.SS');
    }

    static parselatlon(latlon) {
        // Parse strings dd.dd dd:mm.mm dd:mm:ss.ss
        let deg, min, colonIndex, degstr, minstr, str;
        str        = latlon;
        colonIndex = str.indexOf(':');
        if (colonIndex === -1) { // dd.dd?
            if (!Origin.isPosNumber(str)) {
                Origin.badLLFormat(latlon);
                return 0.;
            } else {
                return parseFloat(str);
            }
        } // falls through if we have a colon

        degstr = str.substring(0, colonIndex);  //DD
        str    = str.substring(colonIndex + 1, str.length); //MM...
        if (!Origin.isPosInteger(degstr)) {
            Origin.badLLFormat(latlon);
            return 0.;
        } else {
            deg = parseFloat(degstr + '.0');
        }

        //now repeat to pick off minutes
        colonIndex = str.indexOf(':');
        if (colonIndex === -1) { // dd:mm.mm?
            if (!Origin.isPosNumber(str)) {
                Origin.badLLFormat(latlon);
                return 0.;
            } else {
                min = parseFloat(str);
                if (min < 60.) {
                    return deg + parseFloat(str) / 60.;
                } else {
                    Origin.badLLFormat(latlon);
                    return 0.;
                }

            }
        } // falls through if we have a second colon

        minstr = str.substring(0, colonIndex) + '.0';  //MM.0
        str    = str.substring(colonIndex + 1, str.length); //SS.SS
        if (!Origin.isPosNumber(minstr) || !Origin.isPosNumber(str)) {
            Origin.badLLFormat(latlon);
            return 0.;
        } else {
            if ((parseFloat(minstr) < 60) && (parseFloat(str) < 60.)) {
                return deg + parseFloat(minstr) / 60. + parseFloat(str) / 3600.;
            } else {
                Origin.badLLFormat(latlon);
                return 0.;
            }
        }
    }

    static isPosNumber(instr) { //integer or float
        let str        = '' + instr; // force to string type
        let oneDecimal = false;
        for (let i = 0; i < str.length; i++) {
            const oneChar = str.charAt(i);
            if (oneChar === '.' && !oneDecimal) {
                oneDecimal = true;
                continue;
            }
            if (oneChar < '0' || oneChar > '9') {
                return false;
            }
        }
        return true;
    }

    static isPosInteger(instr) { //integer only
        let str = '' + instr; // force to string type
        for (let i = 0; i < str.length; i++) {
            const oneChar = str.charAt(i);
            if (oneChar < '0' || oneChar > '9') {
                return false;
            }
        }
        return true;
    }

    static atan2(y, x) {
        let out;
        if (x < 0) {
            out = Math.atan(y / x) + Math.PI;
        }
        if ((x > 0) && (y >= 0)) {
            out = Math.atan(y / x);
        }
        if ((x > 0) && (y < 0)) {
            out = Math.atan(y / x) + 2 * Math.PI;
        }
        if ((x === 0) && (y > 0)) {
            out = Math.PI / 2;
        }
        if ((x === 0) && (y < 0)) {
            out = 3 * Math.PI / 2;
        }
        if ((x === 0) && (y === 0)) {
            out = 0.;
        }
        return out;
    }

    static mod(x, y) {
        return x - y * Math.floor(x / y);
    }

    static modlon(x) {
        return Origin.mod(x + Math.PI, 2 * Math.PI) - Math.PI;
    }

    static modcrs(x) {
        return Origin.mod(x, 2 * Math.PI);
    }

    static modlat(x) {
        return Origin.mod(x + Math.PI / 2, 2 * Math.PI) - Math.PI / 2;
    }

    static degtodm(deg) {
        const min = 60. * (deg - Math.floor(deg));
        // returns a rounded string DD:MM.MMMM
        let deg1  = Math.floor(deg);

        let mins = Origin.format(min, 4);
        // alert("deg1="+deg1+" mins="+mins)
        // rounding may have rounded mins to 60.00-- sigh
        if (mins.substring(0, 1) === '6' && mins > 59.0) {
            deg1 += 1;
            mins = Origin.format(0, 4);
        }
        return deg1 + ':' + mins;
    }

    static format(expr, decplaces) {
        let str = '' + Math.round(eval(expr) * Math.pow(10, decplaces));
        while (str.length <= decplaces) {
            str = '0' + str;
        }
        const decpoint = str.length - decplaces;
        return str.substring(0, decpoint) + '.' +
            str.substring(decpoint, str.length);
    }

    // glat1 initial geodetic latitude in radians N positive
    // glon1 initial geodetic longitude in radians E positive
    // faz forward azimuth in radians
    // s distance in units of a (=nm)
    static direct_ell(glat1, glon1, faz, s, ellipse) {
        const EPS = 0.00000000005;
        let r, tu, sf, cf, b, cu, su, sa, c2a, sq, c, d, x, sy, cy, cz, e;
        let glat2, glon2, course, f;

        if ((Math.abs(Math.cos(glat1)) < EPS) && !(Math.abs(Math.sin(faz)) < EPS)) {
            console.log('Only N-S courses are meaningful, starting at a pole!');
        }

        // what the fuck?

        f   = 1 / ellipse.invf;
        r   = 1 - f;
        tu  = r * Math.tan(glat1);
        sf  = Math.sin(faz);
        cf  = Math.cos(faz);
        b   = cf === 0 ? 0. : (2. * Origin.atan2(tu, cf));
        cu  = 1. / Math.sqrt(1 + tu * tu);
        su  = tu * cu;
        sa  = cu * sf;
        c2a = 1 - sa * sa;
        sq  = 1. + Math.sqrt(1. + c2a * (1. / (r * r) - 1.));
        sq  = (sq - 2.) / sq;
        c   = 1. - sq;
        c   = (sq * sq / 4. + 1.) / c;
        d   = (0.375 * sq * sq - 1.) * sq;
        tu  = s / (r * ellipse.a * c);
        x   = tu;
        c   = x + 1;
        while (Math.abs(x - c) > EPS) {
            sy = Math.sin(x);
            cy = Math.cos(x);
            cz = Math.cos(b + x);
            e  = 2. * cz * cz - 1.;
            c  = x;
            sq = e * cy;
            x  = e + e - 1.;
            x  = (((sy * sy * 4. - 3.) * x * cz * d / 6. + sq) * d / 4. - cz) * sy * d + tu;
        }
        b      = cu * cy * cf - su * sy;
        c      = r * Math.sqrt(sa * sa + b * b);
        d      = su * cy + cu * sy * cf;
        glat2  = Origin.modlat(Origin.atan2(d, c));
        c      = cu * cy - su * sy * cf;
        sq     = Origin.atan2(sy * sf, c);
        c      = ((-3. * c2a + 4.) * f + 4.) * c2a * f / 16.;
        d      = ((e * cy * c + cz) * sy * c + x) * sa;
        glon2  = Origin.modlon(glon1 + sq - (1. - c) * d * f);	// fix date line problems
        course = Origin.modcrs(Origin.atan2(sa, b) + Math.PI);

        return {
            latitude: glat2,
            longitude: glon2,
            course: course,
        };
    }
}

/*
// Define test data
const testDefinitions = {
    'Amsterdam': {
        'latitude': '52:22:40.64', // N
        'longitude': '4:53:49.45', // E
        'Tests': {
            'North': {
                'Course': 0,
                'Distance': 250,
                'Endlatitude': '54:37.4535 N',
                'Endlongitude': '4:53.8242 E',
            },
            'East': {
                'Course': 90,
                'Distance': 250,
                'Endlatitude': '52:19.2593 N',
                'Endlongitude': '8:33.9058 E',
            },
            'South': {
                'Course': 180,
                'Distance': 7800,
                'Endlatitude': '18:1.9619 S',
                'Endlongitude': '4:53.8242 E',
            },
            'West': {
                'Course': 270,
                'Distance': 3000,
                'Endlatitude': '44:55.1631 N',
                'Endlongitude': '34:49.4209 W',
            },
        },
    },
    'Newyork': {
        'latitude': '40:43:50.19', // N
        'longitude': '-73:56:6.87', // W
        'Tests': {
            'North': {
                'Course': 0,
                'Distance': 2000,
                'Endlatitude': '58:42.7572 N',
                'Endlongitude': '73:56.1145 W',
            },
            'East': {
                'Course': 90,
                'Distance': 1500,
                'Endlatitude': '39:23.0675 N',
                'Endlongitude': '56:24.7576 W',
            },
            'South': {
                'Course': 180,
                'Distance': 5000,
                'Endlatitude': '4:25.5228 S',
                'Endlongitude': '73:56.1145 W',
            },
            'West': {
                'Course': 270,
                'Distance': 3000,
                'Endlatitude': '35:33.5082 N',
                'Endlongitude': '107:45.0002 W',
            },
        },
    },
    'Santiago': {
        'latitude': '-33:27:33.22', // S
        'longitude': '-70:38:43.25', // W
        'Tests': {
            'North': {
                'Course': 0,
                'Distance': 2000,
                'Endlatitude': '15:24.2334 S',
                'Endlongitude': '70:38.7208 W',
            },
            'East': {
                'Course': 90,
                'Distance': 1500,
                'Endlatitude': '32:25.2136 S',
                'Endlongitude': '54:38.2113 W',
            },
            'South': {
                'Course': 180,
                'Distance': 500,
                'Endlatitude': '37:57.9363 S',
                'Endlongitude': '70:38.7208 W',
            },
            'West': {
                'Course': 270,
                'Distance': 3500,
                'Endlatitude': '28:2.5996 S',
                'Endlongitude': '106:50.7965 W',
            },
        },
    },
};

// Run tests

let Amsterdam = new Origin(testDefinitions.Amsterdam.latitude, testDefinitions.Amsterdam.longitude);
Object.keys(testDefinitions.Amsterdam.Tests).forEach(function(key) {
    let result = Amsterdam.calculateDestination(testDefinitions.Amsterdam.Tests[key].Course, testDefinitions.Amsterdam.Tests[key].Distance);

    if (result.latitude !== testDefinitions.Amsterdam.Tests[key].Endlatitude) {
        alert('Amsterdam ' + key + ' latitude test failed (' + result.latitude + ' does not equal expected ' + testDefinitions.Amsterdam.Tests[key].Endlatitude + ')');
    }
    else {
        console.log('Amsterdam ' + key + ' latitude test succeeded (' + result.latitude + ' equals expected ' + testDefinitions.Amsterdam.Tests[key].Endlatitude + ')');
    }

    if (result.longitude !== testDefinitions.Amsterdam.Tests[key].Endlongitude) {
        alert('Amsterdam ' + key + ' longitude test failed (' + result.longitude + ' does not equal expected ' + testDefinitions.Amsterdam.Tests[key].Endlongitude + ')');
    }
    else {
        console.log('Amsterdam ' + key + ' longitude test succeeded (' + result.longitude + ' equals expected ' + testDefinitions.Amsterdam.Tests[key].Endlongitude + ')');
    }
});

let Newyork = new Origin(testDefinitions.Newyork.latitude, testDefinitions.Newyork.longitude);
Object.keys(testDefinitions.Newyork.Tests).forEach(function(key) {
    let result = Newyork.calculateDestination(testDefinitions.Newyork.Tests[key].Course, testDefinitions.Newyork.Tests[key].Distance);

    if (result.latitude !== testDefinitions.Newyork.Tests[key].Endlatitude) {
        alert('New York ' + key + ' latitude test failed (' + result.latitude + ' does not equal expected ' + testDefinitions.Newyork.Tests[key].Endlatitude + ')');
    }
    else {
        console.log('New York ' + key + ' latitude test succeeded (' + result.latitude + ' equals expected ' + testDefinitions.Newyork.Tests[key].Endlatitude + ')');
    }

    if (result.longitude !== testDefinitions.Newyork.Tests[key].Endlongitude) {
        alert('New York ' + key + ' longitude test failed (' + result.longitude + ' does not equal expected ' + testDefinitions.Newyork.Tests[key].Endlongitude + ')');
    }
    else {
        console.log('New York ' + key + ' longitude test succeeded (' + result.longitude + ' equals expected ' + testDefinitions.Newyork.Tests[key].Endlongitude + ')');
    }
});

let Santiago = new Origin(testDefinitions.Santiago.latitude, testDefinitions.Santiago.longitude);
Object.keys(testDefinitions.Santiago.Tests).forEach(function(key) {
    let result = Santiago.calculateDestination(testDefinitions.Santiago.Tests[key].Course, testDefinitions.Santiago.Tests[key].Distance);

    if (result.latitude !== testDefinitions.Santiago.Tests[key].Endlatitude) {
        alert('Santiago ' + key + ' latitude test failed (' + result.latitude + ' does not equal expected ' + testDefinitions.Santiago.Tests[key].Endlatitude + ')');
    }
    else {
        console.log('Santiago ' + key + ' latitude test succeeded (' + result.latitude + ' equals expected ' + testDefinitions.Santiago.Tests[key].Endlatitude + ')');
    }

    if (result.longitude !== testDefinitions.Santiago.Tests[key].Endlongitude) {
        alert('Santiago ' + key + ' longitude test failed (' + result.longitude + ' does not equal expected ' + testDefinitions.Santiago.Tests[key].Endlongitude + ')');
    }
    else {
        console.log('Santiago ' + key + ' longitude test succeeded (' + result.longitude + ' equals expected ' + testDefinitions.Santiago.Tests[key].Endlongitude + ')');
    }
});
*/