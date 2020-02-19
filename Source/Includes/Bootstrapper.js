/* global $ */

function addInitialEntities() {
    let entities = [
        {
            name: 'Entity 1',
            type: 'movable',
            color: Cesium.Color.RED,
            position: new Cesium.Cartesian3(-1519037.052385547, -4843284.937023628, 3882013.5913742846)
        },
        {
            name: 'Entity 2',
            type: 'movable',
            color: Cesium.Color.YELLOW,//.withAlpha(0.99),
            position: new Cesium.Cartesian3(-362781.2420751273, -5249603.470917346, 3627369.861845183)
        },
        {
            name: 'Entity 3',
            type: 'movable',
            color: Cesium.Color.BLUE,
            position: new Cesium.Cartesian3(1337335.1879538123, -4656212.598537068, 4144066.5366728287)
        },
        {
            name: 'Entity 4',
            type: 'movable',
            color: Cesium.Color.GREEN,
            position: new Cesium.Cartesian3(1215311.8331818907, -4995431.494990685, 3795792.518838148)
        }
        ,
        {
            name: 'Entity 5',
            type: 'static',
            color: Cesium.Color.PURPLE,
            position: new Cesium.Cartesian3(2303713.6922442135, -4884311.898972188, 3391662.221364195)
        }
    ];
    for (let i = 0; i < entities.length; i++) {
        let entity               = entities[i];
        let cartographicPosition = Cesium.Cartographic.fromCartesian(entity.position);
        let longitude            = Cesium.Math.toDegrees(cartographicPosition.longitude);
        let latitude             = Cesium.Math.toDegrees(cartographicPosition.latitude);
        let description          = '<table class="cesium-infoBox-defaultTable cesium-infoBox-defaultTable-lighter"><tbody>' +
            '<tr><th>' + "Name" + '</th><td>' + entity.name + '</td></tr>' +
            '<tr><th>' + "Longitude" + '</th><td>' + longitude.toFixed(5) + '</td></tr>' +
            '<tr><th>' + "Latitude" + '</th><td>' + latitude.toFixed(5) + '</td></tr>' +
            '</tbody></table>';

        entity = viewer.entities.add({
            position: entity.position,
            point: {
                pixelSize: 20.0,
                color: entity.color,
                outlineWidth: 3,
                zIndex: 10,
                scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5)
            },
            description: description,
            billboard: {},
            label: entity.name,
            type: entity.type,
        });

        addedEntities[entity._id] = entity;

        log('Added entity ' + entity.label + ': ' + entity._id);
    }
}

function loadCountries() {
    //$.get('./Source/Data/world_borders.kml', function (kml) {
    //$.get('./Source/Data/countries_world.kml', function (kml) {

    // $.get('./Source/Data/sov.kml', function (kml) {
    // $.get('./Source/Data/countries_world_clean.kml', function (kml) {

    let DOMParserObject     = new DOMParser();
    let XMLSerializerObject = new XMLSerializer();

    $.get('./Source/Data/sov.kml', function (kml) {
        let xml = $(kml);

        xml.find('Placemark').each(function () {
            let name  = $(this).find('name').text();
            let color = intToRGB(hashCode(name));

            let splitXml  = XMLSerializerObject.serializeToString($(this).get(0)).split('</name>');
            let xmlString = splitXml[0] + '</name>' +
                '<Style><LineStyle><color>ff000000</color></LineStyle><PolyStyle><fill>1</fill><color>' + globalConfig.countryTransparency + color + '</color></PolyStyle></Style>' +
                splitXml[1];

            // $(this).find('PolyStyle').append('<color>' + globalConfig.countryTransparency + color + '</color>');
            // $(this).find('LineStyle color').text('ff000000');
            // let xmlString = XMLSerializerObject.serializeToString($(this).get(0));


            let xmlParser     = (xmlString) => {
                return DOMParserObject.parseFromString(xmlString, 'text/xml');
            };
            let kmlDataSource = xmlParser(xmlString);

            let CountryObject = new Country(name);

            // Calculate country center point

            let coordinates               = $(kmlDataSource).find('coordinates');
            let countryCoordinates        = [];
            let entityCoordinatesCount    = 0;
            let maxEntityCoordinatesCount = -1;

            for (let j = 0; j < coordinates.length; j++) {
                let coordinatesArray = coordinates[j].innerHTML.split(',');

                if (coordinatesArray.length > 1) {
                    // Merge last coordinate into the first coordinate
                    coordinatesArray[0] = coordinatesArray[coordinatesArray.length - 1] + ' ' + coordinatesArray[0];
                    // Remove last coordinate
                    coordinatesArray.pop();
                }

                entityCoordinatesCount = coordinatesArray.length;

                // Reset coordinates, only the entity with the most coordinates is used
                if (entityCoordinatesCount > maxEntityCoordinatesCount) {
                    countryCoordinates = [];
                    // Add all coordinates to the country
                    for (let k = 1; k < coordinatesArray.length; k++) {
                        let splitLatLon = coordinatesArray[k].split(' ');
                        countryCoordinates.push({latitude: splitLatLon[0], longitude: splitLatLon[1]});
                    }
                    maxEntityCoordinatesCount = entityCoordinatesCount;
                }
            }

            // Manually adjust? Countries with center point in a different country
            // Zambia
            // Vietnam
            // Croatia
            // Chile

            let polygonCenter      = averageGeolocation(countryCoordinates);
            let cartographicCenter = new Cesium.Cartographic(polygonCenter.longitude, polygonCenter.latitude, 10000);
            let cartesianCenter    = Cesium.Ellipsoid.WGS84.cartographicToCartesian(cartographicCenter);

            let entity                = viewer.entities.add({
                position: cartesianCenter,
                point: {
                    pixelSize: 20.0,
                    color: Cesium.Color.BLACK,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 3,
                    zIndex: 10,
                    scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5)
                },
                description: name + ' polygon center',
                billboard: {},
                label: name + ' polygon center',
                type: 'Country center',
                Country: CountryObject
            });
            addedEntities[entity._id] = entity;

            // Add countries to map //

            let countriesPromise = Cesium.KmlDataSource.load(
                kmlDataSource,
                {
                    camera: viewer.scene.camera,
                    canvas: viewer.scene.canvas
                }
            );
            countriesPromise.then(function (dataSource) {
                // Add to map (async)
                viewer.dataSources.add(dataSource);

                let description = '<table class="cesium-infoBox-defaultTable cesium-infoBox-defaultTable-lighter"><tbody>' +
                    '<tr><th>' + "Name" + '</th><td>' + CountryObject.name + '</td></tr>' +
                    '<tr><th>' + "JS name" + '</th><td>' + CountryObject.getJavascriptName() + '</td></tr>' +
                    '</tbody></table>';

                // Add a height, description, and parent to each entity
                let entities = dataSource.entities.values;
                for (let i = 0; i < entities.length; i++) {
                    let entity = entities[i];

                    entity.description = description;
                    entity.parent      = CountryObject.entity;
                    if (typeof entity.polygon !== "undefined") {
                        entity.polygon.extrudedHeight = globalConfig.countryHeight;
                        CountryObject.addEntity(entity);
                    }
                }

                Countries[CountryObject.getJavascriptName()] = CountryObject;
            }).otherwise(function (error) {
                //Display any errors encountered while loading.
                window.alert(error);
            });
        });
    });
}

function unloadCountries() {
    Object.keys(Countries).forEach(function (key, index) {
        Countries[key].removeFromMap();
    });
    Countries = {};
}

function logCountryEntities() {
    Object.keys(Countries).forEach(function (key, index) {
        let CountryEntities = Countries[key].entities;
        for (let i = 0; i < CountryEntities.length; i++) {
            log(CountryEntities[i]);
        }
    });
}