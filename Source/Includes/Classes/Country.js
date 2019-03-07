class Country {
    //name;
    //entity
    //entities;

    constructor(name) {
        this.name     = name

        // The "main" entity, parent to all other entities of the country
        this.entity   = viewer.entities.add(new Cesium.Entity());
        // All individual parts of the country, such as islan
        this.entities = [];
    }

    addEntity(entity) {
        this.entities.push(entity);
    }

    addToMap() {
        for (let i = 0; i < this.entities.length; i++) {
            viewer.entities.add(this.entities[i]);
        }
    }

    removeFromMap() {
        for (let i = 0; i < this.entities.length; i++) {
            viewer.entities.remove(this.entities[i]);
        }
    }

    show() {
        this.entity.show = true;
    }

    hide() {
        this.entity.show = false;
    }

    getJavascriptName() {
        return this.name.cleanup();
    }

    changeColor(color)
    {
        for (let i = 0; i < this.entities.length; i++) {
            let entity = this.entities[i];
            if (typeof entity.polygon !== "undefined") {
                //entity.polygon.extrudedHeight = 25000;
                //entity.polygon.material.color = Cesium.Color.BLACK;
                entity.polygon.material.color = color;
            }
        }
    }
}