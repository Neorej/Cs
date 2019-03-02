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

    show() {
        this.entity.show = true;
    }

    hide() {
        this.entity.show = false;
    }

    removeFromMap() {
        for (let i = 0; i < this.entities.length; i++) {
            viewer.entities.remove(this.entities[i]);
        }
    }

    getJavascriptName() {
        return this.name.cleanup();
    }
}