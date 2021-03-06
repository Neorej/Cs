/* global Cesium */
/* global $ */
/* global addInitialEntities */
/* global CountryBordersKML */
//(function () {
//  "use strict";

var viewer = new Cesium.Viewer('cesiumContainer', {
    scene3DOnly       : false,
    selectionIndicator: false,
    baseLayerPicker   : false,
    shouldAnimate     : false,
    shadows           : false,
    geocoder          : false,
    imageryProvider   : Cesium.createOpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/',
    }),
    // Requires cesium ion api key
    //terrainProvider: Cesium.createWorldTerrain({
    //    requestWaterMask: false, // true required for water effects
    //    requestVertexNormals: false // true required for terrain lighting
    //})
});

var globalConfig = {
    countryTransparency: 'ff',
    countryHeight      : 5000,
    positionHeight     : 10000,
    wallHeight         : 10000,
    amountOfPositions  : 10,
    console_log        : true,
};
// Toggle console logs
var log          = globalConfig.console_log ? console.log.bind(window.console) : function() {
};

// FPS meter
viewer.scene.debugShowFramesPerSecond = true;

var Countries = {};
loadCountries();

var addedEntities = {};
addInitialEntities();

var ScreenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

var depthTestAgainstTerrain                = false;
viewer.scene.globe.depthTestAgainstTerrain = false;

// Watch clock multiplier changes
Cesium.knockout.getObservable(viewer.clockViewModel, 'multiplier').subscribe(function(clockMultiplier) {
    log('Clock multiplier changed to ' + clockMultiplier);
    // Locks multiplier to 1
    //viewer.clockViewModel.multiplier = 1;
});

// @todo put this in a class?
var selectedEntityHandler;
var travellingEntity;
var isTravelling = false;

var wallShape;
var activeShapePoints = [];
var activeShape;
var floatingPoint;
var audio             = new Audio('Source/Music/impact.mp3');

let billboard = {
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMjHxIGmVAAAA1klEQVQ4T43SoRIBURjF8Rs2CMIGQRDEDaLoATyCIIoeQNBEDyB4AMEDiKLgAQRBEERREK7/MfuZe9fd4cz8Zmfv9x2zFkd8YIOO9979oljpXl4fmKORKhjFim2sg/sLRqmSKO/F4KCPg51jj57Ng724GAzGuJbzJ1ZoBfN0UUgTC+h760DvYYoM9UVDutjaLk74q5h6cfVFokea4eunQrpIhjjbHNGfQ4mKpMDOznHEwObB3mchxxJ69bq/YYKsWqoWtairivqAPFUwihVFj1ikFmPevQATq1y9UjnbXQAAAABJRU5ErkJggg==',
    scale: 2.0, // default: 1.0
};

function addBasicMenuElement() {
    let element              = document.createElement('div');
    element.style.background = 'rgba(0, 0, 0, 1)';
    element.style.padding    = '0px 0px 0px 10px'; // 10 left
    document.getElementById('menu').appendChild(element);

    return element;
}

let travelDisplay            = addBasicMenuElement();
let counterDisplay           = addBasicMenuElement();
let locationDisplayX         = addBasicMenuElement();
let locationDisplayY         = addBasicMenuElement();
let locationDisplayZ         = addBasicMenuElement();
let locationDisplayLatitude  = addBasicMenuElement();
let locationDisplayLongitude = addBasicMenuElement();

let locationDisplayDMSLatitude  = addBasicMenuElement();
let locationDisplayDMSLongitude = addBasicMenuElement();

// @todo this is temporary
log(addedEntities);

// Watch for entity selects/deselects
viewer.selectedEntityChanged.addEventListener(function(entity) {

    if (Cesium.defined(entity) === false) {
        log('Deselected an entity, stopping line preview');
        stopTravelLinePreview();
        return;
    }

    log('Selected ' + entity._type + ' ' + (entity.id || entity.name));
    log({entity});

    if (isTravelling) {
        // An entity was selected while another was travelling, cancel the select
        log('Selected something while travelling, cancelling...');
        // Cancel the selection
        viewer.selectedEntity = null;
        return;
    }

    if (selectedEntityHandler) {
        // Selected a different entity, stop the old travel line preview
        log('selectedEntityHandler already defined, stopping line preview');
        stopTravelLinePreview();
    }

    if (entity._type !== 'movable') {
        log('Entity type not movable');
        return;
    }

    initTravelLinePreview(entity);
});

/**
 *
 * @param entity
 */
function initTravelLinePreview(entity) {
    log('initTravelLinePreview() called');

    // Copy entity data to set it as active
    travellingEntity = entity;

    // Terrain depth testing is required for the preview line
    viewer.scene.globe.depthTestAgainstTerrain = true;
    depthTestAgainstTerrain                    = true;

    selectedEntityHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    selectedEntityHandler.setInputAction(function(event) {
        if (Cesium.defined(floatingPoint) && Cesium.defined(floatingPoint.position)) {
            let newPosition = viewer.scene.pickPosition(event.endPosition);
            if (Cesium.defined(newPosition)) {
                floatingPoint.position.setValue(newPosition);
                activeShapePoints.pop();
                activeShapePoints.push(newPosition);
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // bugged, entity.position is sometimes undefined here, don't know why
    let earthPosition = entity.position._value;

    if (activeShapePoints.length === 0) {
        floatingPoint = createPoint(earthPosition);
        activeShapePoints.push(earthPosition);
        let dynamicPositions = new Cesium.CallbackProperty(function() {
            return activeShapePoints;
        }, false);

        activeShape = drawTemporaryShape(dynamicPositions);
    }

    activeShapePoints.push(earthPosition);
}

/**
 *
 */
function stopTravelLinePreview() {
    log('stopTravelLinePreview() called');
    viewer.entities.remove(floatingPoint);
    activeShapePoints.pop();

    viewer.scene.globe.depthTestAgainstTerrain = false;
    depthTestAgainstTerrain                    = false;

    // Cannot unset travellingEntity during travel; travellingEntity is required at the end of travel!
    if (!isTravelling) {
        travellingEntity = null;
    }

    if (selectedEntityHandler && !selectedEntityHandler.isDestroyed()) {
        log('Destroying selectedEntityHandler');
        selectedEntityHandler.destroy();
    }
}

/**
 *
 * @param start
 * @param stop
 * @param runForSeconds
 * @param billboard
 * @returns {*[]}
 */
function createCZML(start, stop, runForSeconds, billboard) {
    let positions           = getPositionsBetweenTwoPositions(start, stop, globalConfig.amountOfPositions, runForSeconds);
    let heightedPositions   = setHeightOfPositionsArray(positions, globalConfig.positionHeight);
    let cartographicRadians = convertPositionsToCartographicRadians(heightedPositions, runForSeconds);

    let startTime = new Date();
    let stopTime  = new Date();
    stopTime.setSeconds(stopTime.getSeconds() + runForSeconds);

    let CesiumClock  = new Cesium.Clock({
        startTime  : Cesium.JulianDate.fromDate(startTime),
        currentTime: Cesium.JulianDate.fromDate(startTime),
        stopTime   : Cesium.JulianDate.fromDate(stopTime),
        clockRange : Cesium.ClockRange.LOOP_STOP,
        clockStep  : Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER,
    });
    let epoch        = Cesium.JulianDate.toIso8601(CesiumClock.startTime);
    let timeInterval = new Cesium.TimeInterval({
        start: CesiumClock.startTime,
        stop : CesiumClock.stopTime,
    });

    return [
        {
            'id'     : 'document',
            'name'   : 'CZML Path',
            'version': '1.0',
            'clock'  : {
                'interval'   : timeInterval.toString(),
                'currentTime': epoch,
                'multiplier' : 1,
                'range'      : 'CLAMPED', // Do not loop
            },
        }, {
            'id'         : 'path',
            'name'       : 'path',
            'description': '<p>CZML description<br> Second line</p>',
            'properties' : {
                'travelled': {
                    'epoch' : epoch,
                    'number': [
                        0, 0, // 0% at epoch
                        runForSeconds, 100, // 100% when done
                    ],
                },
            },
            'path'       : {
                'material'  : {
                    'polylineOutline': {
                        'color'       : {
                            'rgba': [0, 250, 218, 94],
                        },
                        'outlineColor': {
                            'rgba': [0, 250, 218, 94],
                        },
                        'outlineWidth': 5,
                    },
                },
                'width'     : 8,
                'leadTime'  : 0,
                'trailTime' : 1000,
                'resolution': 5,
            },
            'billboard'  : billboard,
            'label'      : {
                'fillColor'       : {
                    'rgba': [255, 255, 255, 255],
                },
                'font'            : '12pt Arial',
                'horizontalOrigin': 'LEFT',
                'pixelOffset'     : {
                    'cartesian2': [10, 0],
                },
                'style'           : 'FILL',
                'text'            : 'Travelling',
                'showBackground'  : true,
                'backgroundColor' : {
                    'rgba': [1, 1, 1, 0],
                },
            },
            'position'   : {
                'epoch'              : epoch,
                'cartographicRadians': cartographicRadians,
            },
        }];
}

/**
 *
 * @param czml
 */
function createPath(czml, reinitTravelLinePreview) {
    let dataSourceReference;
    let pathEntity;
    let pathPromise = Cesium.CzmlDataSource.load(czml);

    // arbitrary distance limit for path travel
    //@todo should lock the clock multiplier to prevent going over this limit
    let maxTravelTicks = 6000;

    pathPromise.then(function(dataSource) {

        let absoluteTravelled   = 0;
        let percentageTravelled = 0;
        let stopTime            = dataSource.clock._stopTime.secondsOfDay;

        viewer.clock.onTick.addEventListener(function traveller(clock) {
            if (absoluteTravelled === 0) {
                // hmm
                viewer.dataSources.add(dataSource);
                dataSourceReference = dataSource;

                // Get the entity using the id defined in the CZML data
                pathEntity = dataSource.entities.getById('path');

                // Add computed orientation based on sampled positions
                pathEntity.orientation = new Cesium.VelocityOrientationProperty(pathEntity.position);
                // Smooth path interpolation
                pathEntity.position.setInterpolationOptions({
                    interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
                    interpolationDegree   : 2,
                });

                isTravelling = true;

                log(travellingEntity);
                log('Pre-travel: Removing travelling entity ' + travellingEntity._id);
                viewer.entities.remove(travellingEntity);

                viewer.clock.shouldAnimate = true;
            }

            // stop clock
            // viewer.clock.canAnimate = false;
            // viewer.clock.shouldAnimate = false;
            // do something

            // restart clock
            // viewer.clock.canAnimate = true;
            // viewer.clock.shouldAnimate = true;

            absoluteTravelled += clock._multiplier;

            if (absoluteTravelled > maxTravelTicks || clock.currentTime.secondsOfDay === stopTime) {
                if (clock.currentTime.secondsOfDay === stopTime) {
                    // end of path was reached
                    log('end of the line');
                }
                else {
                    // var i reached limit
                    log('reached i limit');
                }

                let finalPosition = pathEntity.position.getValue(clock.currentTime);
                log('Final position');
                log(finalPosition);

                log('After-travel: adding travelling entity ' + travellingEntity._id);
                log(travellingEntity);
                travellingEntity.position = finalPosition;
                viewer.entities.add(travellingEntity);

                // Reset travel preview line, to allow drawing another line
                if (reinitTravelLinePreview) {
                    log('Re-init travel line preview');
                    initTravelLinePreview(travellingEntity);
                }

                isTravelling = false;

                viewer.entities.remove(wallShape);

                // Stop time
                viewer.clock.shouldAnimate = false;
                // Remove this event listener
                viewer.clock.onTick.removeEventListener(traveller);
                // Remove the path
                viewer.dataSources.remove(dataSourceReference);

                Object.keys(addedEntities).forEach(function(key) {
                    if (typeof addedEntities[key].position === 'undefined' || key === travellingEntity.id) {
                        return; // forEach equivalent of 'continue';
                    }
                    let entity   = addedEntities[key];
                    let distance = Cesium.Cartesian3.distance(finalPosition, entity.position._value);

                    log('Distance to ' + key + ' | ' + entity.type + ' entity: ' + distance);

                    if (distance < 25000) {
                        log('I\'ll count that as an impact, playing Impact by grande1899');
                        // hmm
                        audio.play();

                        if (entity.type === 'Country center') {
                            entity.Country.changeColor(travellingEntity.point.color);
                        }
                    }
                });

            }

            if (pathEntity) {
                counterDisplay.textContent = 'Travelled: ' + Math.round(absoluteTravelled) + ' / ' + maxTravelTicks;

                let currentLocation          = pathEntity.position.getValue(clock.currentTime);
                locationDisplayX.textContent = 'X: ' + currentLocation.x;
                locationDisplayY.textContent = 'Y: ' + currentLocation.y;
                locationDisplayZ.textContent = 'Z: ' + currentLocation.z;

                //new Cesium.Cartesian3(currentLocation.x, currentLocation.y, currentLocation.z);

                let cartographicPosition = Cesium.Cartographic.fromCartesian(currentLocation);

                let latitude                         = Cesium.Math.toDegrees(cartographicPosition.latitude).toFixed(5);
                let longitude                        = Cesium.Math.toDegrees(cartographicPosition.longitude).toFixed(5);
                locationDisplayLatitude.textContent  = 'Latitude: ' + latitude;
                locationDisplayLongitude.textContent = 'Longitude: ' + longitude;

                locationDisplayDMSLatitude.textContent  = 'DMS latitude: ' + deg_to_dms(latitude);
                locationDisplayDMSLongitude.textContent = 'DMS longitude: ' + deg_to_dms(longitude);

                percentageTravelled = pathEntity.properties.travelled.getValue(clock.currentTime);
                if (Cesium.defined(percentageTravelled)) {
                    travelDisplay.textContent = 'Travelled: ' + percentageTravelled.toFixed(2) + '%';
                }
            }

        });

    });

}

/**
 * Calculates intermediate Cartesian3 positions and their time between startPosition and stopPosition
 *
 * @param startPosition         Cartesian3
 * @param stopPosition          Cartesian3
 * @param amountOfPositions     number of positions to create, this number includes both startPosition and stopPosition
 *                              e.g. a value of 10 creates 8 intermediate positions between startPosition and stopPosition
 * @param travelTime            travel time in seconds between startPosition and stopPosition
 * @returns {Array}
 */
function getPositionsBetweenTwoPositions(startPosition, stopPosition, amountOfPositions, travelTime) {
    let timePerPosition = travelTime / (amountOfPositions - 1);
    let startTime       = viewer.clock.startTime; // The actual startTime is irrelevant; it's only used to calculate a position based on elapsed time
    let stopTime        = Cesium.JulianDate.addSeconds(startTime, travelTime, new Cesium.JulianDate());

    let SampledPositionProperty = new Cesium.SampledPositionProperty();
    SampledPositionProperty.addSample(startTime, startPosition);
    SampledPositionProperty.addSample(stopTime, stopPosition);

    let intermediatePositions = [];
    for (let i = 0; i < amountOfPositions; i++) {
        let elapsedSeconds = i * timePerPosition;
        let elapsedTime    = Cesium.JulianDate.addSeconds(startTime, elapsedSeconds, new Cesium.JulianDate());
        // "Travel" to next position and get its coordinates
        intermediatePositions.push(SampledPositionProperty.getValue(elapsedTime));
    }

    return intermediatePositions;
}

/**
 * Set the height of a Cartesian3, starting from its cartographic coordinates on the surface
 *
 * @param position      Cartesian3
 * @param height        Height from surface in meters
 * @returns Cartesian3
 */
function setHeightOfPosition(position, height) {
    let cartographicPosition    = Cesium.Cartographic.fromCartesian(position);
    cartographicPosition.height = height;
    return Cesium.Ellipsoid.WGS84.cartographicToCartesian(cartographicPosition);
}

/**
 * Calls setHeightOfPosition for each element in the array
 * There must be a better way to do this
 *
 * @param positions     An array of Cartesian3's
 * @param height        Height from surface in meters
 * @returns {Array}
 */
function setHeightOfPositionsArray(positions, height) {
    let newPositions = [];
    for (let i = 0; i < positions.length; i++) {
        newPositions.push(setHeightOfPosition(positions[i], height));
    }
    return newPositions;
}

/**
 * Convert a set of Cartesian3's to a set of cartographic radians used in CZML-sources
 *
 * @param positions     An array of Cartesian3's
 * @param time          Time in seconds it takes to travel along the coordinates
 *                      should be equal to the difference in the CZML clock-interval
 * @returns {Array}
 */
function convertPositionsToCartographicRadians(positions, time) {
    let cartographicRadians = [];
    let positionsLength     = positions.length;
    let timePerPosition     = time / (positionsLength - 1);

    for (let i = 0; i < positionsLength; i++) {
        let cartographicRadian = Cesium.Cartographic.fromCartesian(positions[i]);
        cartographicRadians.push(i * timePerPosition);
        cartographicRadians.push(cartographicRadian.longitude);
        cartographicRadians.push(cartographicRadian.latitude);
        cartographicRadians.push(cartographicRadian.height);
    }

    return cartographicRadians;
}

/**
 *
 * @param worldPosition
 * @returns {Entity}
 */
function createPoint(worldPosition) {
    return viewer.entities.add({
        position: setHeightOfPosition(worldPosition, 10000),
        point   : {
            color          : Cesium.Color.WHITE,
            pixelSize      : 0,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        },
    });
}

/**
 *
 * @param positionData
 * @returns {Entity}
 */
function drawWallShape(positionData) {
    return viewer.entities.add({
        name: 'Red wall',
        wall: {
            positions     : positionData,
            minimumHeights: Array(positionData.length).fill(0),
            maximumHeights: Array(positionData.length).fill(globalConfig.wallHeight),
            material      : Cesium.Color.RED,
        },
    });
}

/**
 *
 * @param positionData
 * @returns {Entity}
 */
function drawTemporaryShape(positionData) {
    return viewer.entities.add({
        polyline: {
            positions    : positionData,
            clampToGround: false,
            width        : 3,
        },
    });
}

/**
 * Right-click initiates entity travel
 */
ScreenSpaceEventHandler.setInputAction(function() {
    // Must have at least 2 points to draw a path
    if (activeShapePoints.length < 2) {
        log(activeShapePoints);
        return;
    }

    // Depth test might have been enabled by selecting an entity, disable it again
    if (depthTestAgainstTerrain) {
        viewer.scene.globe.depthTestAgainstTerrain = false;
        depthTestAgainstTerrain                    = false;
    }

    let startPosition = activeShapePoints[0];
    let stopPosition  = activeShapePoints[activeShapePoints.length - 1];
    let distance      = Cesium.Cartesian3.distance(startPosition, stopPosition);
    // Travel time must be in whole seconds. Travelling for unrounded seconds causes problems such as ending at 96% of route
    let travelTime    = Math.round(distance / 40000);
    // Minimum travel time is 1 second, cannot travel for 0 seconds
    if (travelTime < 1) {
        travelTime = 1;
    }

    log('Start: ' + startPosition);
    log('Stop: ' + stopPosition);
    log('Distance: ' + distance);
    let czml = createCZML(startPosition, stopPosition, travelTime, billboard);
    createPath(czml, true);

    // Redraw the shape so it's not dynamic and remove the dynamic shape.
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
    floatingPoint     = undefined;
    wallShape         = drawWallShape(activeShapePoints);
    activeShapePoints = [];

}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
