"use strict";

var supportsIndexedDB = !!global.indexedDB,
    DB = supportsIndexedDB ? require('./lib/indexeddb.js') : require('./lib/localstorage.js');

DB.mergePrototypes({
    read: function(/* table, key, matches */) {
        return this.readOneByKey.apply(this, arguments);
    }
});

module.exports = DB;
