(function (window) {

    "use strict";

    var localStorage = window.localStorage,
        supportsLocalStorage = !!localStorage,
        Classes = require('js-ext/js-ext.js').Classes, // we also have Promises now
        LocalStorage, getList, deleteRecord, getRecordByIndex;


    getItem = function(key, reviver) {
        var dbDef = localStorage.getItem(key),
            obj;
        if (dbDef) {
            try {
                obj = JSON.parse(dbDef, reviver);
            }
            catch(err) {
                // error in item: remove it from store
                removeItem(key);
            }
        }
        return obj;
    };

    setItem = function(key, value) {
        try {
            value = JSON.stringify(value);
            localSorage.setItem(key, value);
        }
        catch(err) {
            // error storing
            return false;
        }
        return true;
    };

    removeItem = function(key) {
        localStorage.removeItem(key);
    };

    //============================================================

    defineDatabase = function(db, version, tables) {
        var dbDefs = getItem('$$dbDef') || [];
        if (!dbDefs.contains(db)) {
            dbDefs.push(db);
            if (!setItem('$$dbDef', dbDefs)) {
                return false;
            }
        }
        // search localstorage for the database-definition:
        dbDef = getItem('$'+db);
        if (!dbDef || (dbDef.v!==version)) {
            // db is not present or in different version
            // if the db was present: we have to erase all references
            dbDef && removeDatabase(db);
            // now build new db-definition:
            tabledefs = [];
            tables.forEach(function(table) {
                tabledefs.push({n: table.name, i: table.indexes});
            });
            dbDef = {
                v: version,
                t: tabledefs
            }
            try {
                setItem('$'+db, JSON.stringify(dbDef));
            }
            catch(err) {
                return false;
            }
        }
        return dbDef;
    };


    /*
    * @param [localstorage] {boolean} to force using localstorage
    */

    /*
     * tables = [
     *     {
     *          name: {String},
     *          indexes: [String, String]
     *      }
     * ]
     */
    LocalStorage = Classes.createClass(function(database, version, tables) {
        var instance = this;
        instance.dbName = database;
        if (!supportsIndexedDB) {
            instance.db = window.Promise.reject('LocalStorage is not supported');
        }
        else {
            instance.db = new window.Promise(function(resolve, reject) {
        }
    }, {
        save: function(table, records) {
        },


        read: function(table, key, matches) {
        },


        readMany: function(table, prop, matches) {
        },

        readAll: function(table) {
        },

        each: function(table, fn, context) {
        },

        some: function(table, fn, context) {
        },

        clear: function(table) {
        },

        has: function(table, prop, matches) {
        },

        size: function(table) {
        },

        'delete': function(table, prop, matches) {
        },

        deleteDatabase: function() {
        }
    });

    module.exports = LocalStorage;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this));