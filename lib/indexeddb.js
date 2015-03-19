(function (global) {

    "use strict";

    var supportsIndexedDB = !!global.indexedDB;

        if (!supportsIndexedDB) {
            indexedDB = {
                getTable = global.Promise.reject('IndexedDB is not supported');
            }
        }
        indexedDB = {
            /*
             * tables = [
             *     {
             *          name: {String},
             *          config: {Object},
             *          indexes: [
             *               {
             *                   property {String},
             *                   config {}
             *               }
             *          ]
             *      }
             * ]
             */
            getDatabase = function(database, version, tables, tableConfigs, tableIndexes) {
                return new global.Promise(function(resolve, reject) {
                    var request = window.indexedDB.open(database, version || 1);
                    request.onerror = function(event) {
                        reject('Error IndexedDB: '+event.target.errorCode);
                    };
                    request.onsuccess = function(event) {
                        var db = event.target.result;
                        resolve(db);
                    };

                    request.onupgradeneeded = function(event) {
                        var db = event.target.result;
                        Array.isArray(tables)) || (tables = [tables]);
                        Array.isArray(tableConfigs)) || (tableConfigs = [tableConfigs]);
                        tables.forEach(function(table) {
                            // Create an objectStore for this database
                            // which means: set a `table` for the database:
                            var objectStore = db.createObjectStore(table.name, table.config);
                            if (Array.isArray(table.indexes)) {
                                table.indexes.forEach(function(index) {
                                    objectStore.createIndex(index.property, index.property, index.config);
                                });
                            }

                        });
                    };

                });
            }
        };
        /*
        * @param [localstorage] {boolean} to force using localstorage
        */

        indexedDB = Classes.createClass(function(database, localstorage) {
            var instance = this;
            if ((typeof database!=='string') || (database.length===0)) {
                instance.db = global.Promise.reject('client-db should be initialized with a database-name');
            }
            else {
                instance.db = (supportsIndexedDB && !localstorage) ? indexedDB.getTable(database) : localStorage.getNS(database);
            }
        }, {
            save: function(table, key, obj) {
                return this.db.then(function(database) {
                    database.save(key, obj);
                });
            },
            getRecord: function() {

            },
            getRecords: function() {

            },
            getStreamed: function() {

            },
            each: function() {

            },
            some: function() {

            },
            clear: function() {

            },
            has: function() {

            },
            size: function() {

            },
            'delete': function() {

            },
            destroy: function() {
                this.db.destroy();
            }
        });

    module.exports = indexedDB;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this));