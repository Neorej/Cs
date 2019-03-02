/* global $ */

function addInitialEntities() {
    let entities = [
        {
            name: 'Entity 1',
            type: 'movable',
            color: Cesium.Color.RED.withAlpha(0.99),
            position: new Cesium.Cartesian3(-1519037.052385547, -4843284.937023628, 3882013.5913742846)
        },
        {
            name: 'Entity 2',
            type: 'movable',
            color: Cesium.Color.YELLOW.withAlpha(0.99),
            position: new Cesium.Cartesian3(-362781.2420751273, -5249603.470917346, 3627369.861845183)
        },
        {
            name: 'Entity 3',
            type: 'movable',
            color: Cesium.Color.BLUE.withAlpha(0.99),
            position: new Cesium.Cartesian3(1337335.1879538123, -4656212.598537068, 4144066.5366728287)
        },
        {
            name: 'Entity 4',
            type: 'movable',
            color: Cesium.Color.GREEN.withAlpha(0.99),
            position: new Cesium.Cartesian3(1215311.8331818907, -4995431.494990685, 3795792.518838148)
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
                zIndex: 10
            },
            description: description,
            billboard: {},
            label: entity.name,
            type: entity.type,
        });

        addedEntities[entity._id] = entity;

        console.log('Added entity ' + entity.label + ': ' + entity._id);
    }
}

function loadCountries() {
    //$.get('./Source/Data/world_borders.kml', function (kml) {
    //$.get('./Source/Data/countries_world.kml', function (kml) {
    $.get('./Source/Data/countries_world_clean.kml', function (kml) {
        let xml = $(kml);

        xml.find('Placemark').each(function () {
            let name      = $(this).find('name').text();
            let color     = intToRGB(hashCode(name));
            let splitXml  = new XMLSerializer().serializeToString($(this).get(0)).split('</name>');
            let xmlString = splitXml[0] + '</name>' +
                '<Style><LineStyle><color>ff000000</color></LineStyle><PolyStyle><fill>1</fill><color>' + globalConfig.countryTransparency + color + '</color></PolyStyle></Style>' +
                splitXml[1];

            // $(this).find('PolyStyle').append('<color>' + globalConfig.countryTransparency + color + '</color>');
            // $(this).find('LineStyle color').text('ff000000');
            // let xmlString = new XMLSerializer().serializeToString($(this).get(0));

            let newCountry       = new Country(name);
            let countriesPromise = Cesium.KmlDataSource.load(
                new DOMParser().parseFromString(xmlString, "text/xml"),
                {
                    camera: viewer.scene.camera,
                    canvas: viewer.scene.canvas
                }
            );

            countriesPromise.then(function (dataSource) {
                let entities = dataSource.entities.values;

                let description = '<table class="cesium-infoBox-defaultTable cesium-infoBox-defaultTable-lighter"><tbody>' +
                    '<tr><th>' + "Name" + '</th><td>' + newCountry.name + '</td></tr>' +
                    '<tr><th>' + "JS name" + '</th><td>' + newCountry.getJavascriptName() + '</td></tr>' +
                    '</tbody></table>';

                // Add a height, description, and parent to each entity
                for (let i = 0; i < entities.length; i++) {
                    let entity         = entities[i];
                    entity.description = description;
                    entity.parent      = newCountry.entity;
                    if (typeof entity.polygon !== "undefined") {
                        entity.polygon.extrudedHeight = globalConfig.countryHeight;
                        newCountry.addEntity(entity);
                    }
                }

                Countries[newCountry.getJavascriptName()] = newCountry;
                newCountry.addToMap();
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