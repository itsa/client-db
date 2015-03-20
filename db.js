(function (global) {

    "use strict";

    var Classes = require('js-ext/js-ext.js').Classes, // we also have Promises now
        supportsIndexedDB = !!global.indexedDB,
        /*
        * @param [localstorage] {boolean} to force using localstorage
        */

        DB = Classes.createClass(function(database, localstorage) {
            var instance = this;
            if ((typeof database!=='string') || (database.length===0)) {
                instance.db = global.Promise.reject('client-db should be initialized with a database-name');
            }
            else {
                instance.db = (supportsIndexedDB && !localstorage) ? indexedDB.getTable(database) : localStorage.getNS(database);
            }
        }, {
            save: function(key, obj) {
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

    module.exports = DB;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this));
/*
        each: function(fn, context) {
            return this.db.each(fn, context);
        },
        some: function(fn, context) {
            return this.db.each(fn, context);
        },
        clear: function() {
            return this.db.clear();
        },
        has: function(key) {
            return this.db.has();
        },
        contains: function(obj) {

        },
        get: function(key) {
            return this.db.getRecord(key);
        },
        set: function(key, obj) {
            return this.db.save(key, obj);
        },
        size: function() {
            return this.db.size();
        },
        'delete': function(key) {
            return this.db['delete'](key);
        },
        destroy: function() {
            this.db.destroy();
        }
*/