/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link https://stackoverflow.com/a/21963136/3824570
 **/
var UUID = (function() {
    let self = {};
    let lut  = [];
    for (let i = 0; i < 256; i++) { lut[i] = (i < 16 ? '0' : '') + (i).toString(16); }
    self.generate = function() {
        let d0 = Math.random() * 0xffffffff | 0;
        let d1 = Math.random() * 0xffffffff | 0;
        let d2 = Math.random() * 0xffffffff | 0;
        let d3 = Math.random() * 0xffffffff | 0;
        return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
            lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
            lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
            lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
    };
    return self;
})();

/**
 * @link https://stackoverflow.com/a/16348977/3824570
 *
 * @param str
 * @returns {number}
 */
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

/**
 * @link https://stackoverflow.com/a/16348977/3824570
 *
 * @param i
 * @returns {string}
 */
function intToRGB(i) {
    let c = (i & 0x00FFFFFF).toString(16).toUpperCase();
    return '00000'.substring(0, 6 - c.length) + c;
}

/**
 * @link https://stackoverflow.com/a/1983774/3824570
 *
 * @returns {string}
 */
String.prototype.cleanup = function() {
    return this.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-');
};

/**
 * Calculate the center/average of multiple GeoLocation coordinates
 * Expects an array of objects with .latitude and .longitude properties
 *
 * @link  http://stackoverflow.com/a/14231286/538646
 * @link https://gist.github.com/tlhunter/0ea604b77775b3e7d7d25ea0f70a23eb
 *
 * @param coordinates
 * @returns {*}
 */
function averageGeolocation(coordinates) {
    if (coordinates.length === 1) {
        return coordinates[0];
    }

    let x = 0.0;
    let y = 0.0;
    let z = 0.0;

    for (let coordinate of coordinates) {
        let latitude  = parseFloat(coordinate.latitude) * Math.PI / 180;
        let longitude = parseFloat(coordinate.longitude) * Math.PI / 180;

        x += Math.cos(latitude) * Math.cos(longitude);
        y += Math.cos(latitude) * Math.sin(longitude);
        z += Math.sin(latitude);
    }

    let total = coordinates.length;

    x = x / total;
    y = y / total;
    z = z / total;

    let centralLongitude  = Math.atan2(y, x);
    let centralSquareRoot = Math.sqrt(x * x + y * y);
    let centralLatitude   = Math.atan2(z, centralSquareRoot);

    return {
        latitude : centralLatitude, // * 180 / Math.PI, // (or use Cesium.Math.toRadians) Converts to degrees. Cartesians require Radians
        longitude: centralLongitude, // * 180 / Math.PI // (or use Cesium.Math.toRadians) Converts to degrees. Cartesians require Radians
    };
}

function deg_to_dms(deg) {
    var d        = Math.floor(deg);
    var minfloat = (deg - d) * 60;
    var m        = Math.floor(minfloat);
    var secfloat = (minfloat - m) * 60;
    var s        = Math.round(secfloat);
    // After rounding, the seconds might become 60. These two
    // if-tests are not necessary if no rounding is done.
    if (s == 60) {
        m++;
        s = 0;
    }
    if (m == 60) {
        d++;
        m = 0;
    }

    if (d < 0) {

    }

    return ('' + d + ':' + m + ':' + s);
}