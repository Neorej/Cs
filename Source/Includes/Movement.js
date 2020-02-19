$(function() {
    $('#move_button').on('click', function() {
        manuallyMoveEntity();
    });

    function manuallyMoveEntity() {
        if (typeof viewer.selectedEntity === 'undefined') {
            alert('No entity selected');
            return;
        }

        if (viewer.selectedEntity._type !== 'movable') {
            alert('Selected entity is not movable');
            return;
        }

        let originCartesianPosition    = viewer.selectedEntity.position._value;
        let originCartographicPosition = Cesium.Cartographic.fromCartesian(originCartesianPosition);
        let latitude                   = Cesium.Math.toDegrees(originCartographicPosition.latitude).toFixed(5);
        let longitude                  = Cesium.Math.toDegrees(originCartographicPosition.longitude).toFixed(5);
        let movement_heading           = $('#movement_heading').val();
        let movement_distance          = $('#movement_distance').val();

        let entityOrigin        = new Origin(latitude, longitude);
        let destinationPosition = entityOrigin.calculateDestination(movement_heading, movement_distance);

        console.log(viewer.selectedEntity);
        console.log(originCartographicPosition);
        console.log(movement_heading + '° / ' + movement_distance + ' KM');
        console.log('Origin -> Lat ' + latitude + ' / Lon ' + longitude);
        console.log('Destination -> Lat ' + destinationPosition.latitude + ' / Lon ' + destinationPosition.longitude);

        // Convert back radians for use in cartographic
        destinationPosition.latitude  = Cesium.Math.toRadians(destinationPosition.latitude);
        destinationPosition.longitude = Cesium.Math.toRadians(destinationPosition.longitude);
        destinationPosition.height    = originCartographicPosition.height;

        let destinationCartesianPosition = Cesium.Ellipsoid.WGS84.cartographicToCartesian(destinationPosition);

        console.log('Origin cartesian');
        console.log(originCartesianPosition);

        console.log('Destination cartesian');
        console.log(destinationCartesianPosition);

        let distance = Cesium.Cartesian3.distance(originCartesianPosition, destinationCartesianPosition);
        console.log('Distance: ' + distance);

        let travelTime = Math.round(distance / 40000);

        // Draw red wall
        wallShape = drawWallShape([originCartesianPosition, destinationCartesianPosition]);
        // Create travel data
        let czml  = createCZML(originCartesianPosition, destinationCartesianPosition, travelTime, billboard);
        // Init travel
        createPath(czml, false);
    }
});