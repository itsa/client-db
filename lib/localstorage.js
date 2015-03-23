(function (window) {

    "use strict";

    var localStorage = window.localStorage,
        supportsLocalStorage = !!localStorage,
        Classes = require('js-ext/js-ext.js').Classes, // we also have Promises now
        DEFS_CACHE = {},
        DATEPATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/, // datepattern will return date-type
        REVIVER = function(key, value) {
            return DATEPATTERN.test(value) ? new Date(value) : value;
        },
        positions = [],
        LocalStorage, getItem, setItem, getTableDef, removeTableItem, defineDatabase, removeDatabase, initializePositions,
        getDatabaseDef, readTableItems, readTableItem, clearTable, positionsInitialized, getNextFreePos;

    getItem = function(key, reviver) {
        var value = localStorage.getItem(key),
            obj;
        if (value) {
            try {
                obj = JSON.parse(value, reviver);
            }
            catch(err) {
                // error in item: remove it from store
                obj = {};
            }
        }
        return obj;
    };

    setItem = function(key, value) {
        try {
            value = JSON.stringify(value);
            localStorage.setItem(key, value);
        }
        catch(err) {
            // error storing
            return false;
        }
        return true;
    };

    getTableDef = function(dbDef, table) {
        var found;
        dbDef.t.some(function(tableDef) {
            if (tableDef.n===table) {
                found = tableDef;
                return found;
            }
        });
        return found;
    };

    removeTableItem = function(dbDef, dbName, table, pos) {
        var record = getItem(pos, REVIVER),
            tableDefItemsRef, tableDefItems, tableDef;
        if (!record) {
            return false;
        }
        // remove item from the table-def's items:
        tableDefItemsRef = '#'+dbName+'#'+table;
        tableDefItems = getItem(tableDefItemsRef) || [];
        tableDefItems.remove(pos);
        if (!setItem(tableDefItemsRef, tableDefItems)) {
            return false;
        }
        // now remove the indexes:
        tableDef = getTableDef(dbDef, table);
        if (tableDef) {
            tableDef.i.forEach(function(index) {
                var key = tableDefItemsRef+'#'+index+'#'+record[index];
                localStorage.removeItem(key);
            });
            tableDef.u.forEach(function(index) {
                var key = tableDefItemsRef+'#'+index+'#'+record[index];
                localStorage.removeItem(key);
            });
        }
        // remove the item;
        localStorage.removeItem(pos);
        positions.remove(parseInt(pos, 10));
        return true;
    };

    //============================================================

    defineDatabase = function(dbName, version, tables) {
        var dbDefs = getItem('$$dbDefs') || [],
            dbDef, tabledefs;
        if (!dbDefs.contains(dbName)) {
            dbDefs.push(dbName);
            if (!setItem('$$dbDefs', dbDefs)) {
                return false;
            }
        }
        // search localstorage for the database-definition:
        dbDef = getItem('$'+dbName);
        if (!dbDef || (dbDef.v!==version)) {
            // dbName is not present or in different version
            // if the dbName was present: we have to erase all references
            dbDef && removeDatabase(dbDef, dbName);
            // now build new dbName-definition:
            tabledefs = [];
            tables.forEach(function(table) {
                var indexes = table.indexes || [],
                    uniqueIndexes = table.uniqueIndexes || [];
                tabledefs.push({n: table.name, i: indexes.merge(uniqueIndexes), u: uniqueIndexes});
            });
            dbDef = {
                v: version,
                t: tabledefs
            };
            try {
                setItem('$'+dbName, dbDef);
            }
            catch(err) {
                return false;
            }
        }
        return dbDef;
    };

    removeDatabase = function(dbDef, dbName) {
        var hash = [],
            succeeded = false,
            dbDefs;
        if (dbDef) {
            try {
                dbDef.t.forEach(function(table) {
                    hash.push(clearTable(dbDef, dbName, table.n));
                });
                hash.push(window.Promise.resolve(localStorage.removeItem('$'+dbName)));
                dbDefs = getItem('$$dbDefs') || [];
                dbDefs.remove(dbName);
                succeeded = setItem('$$dbDefs', dbDefs);
            }
            catch(err) {
                return window.Promise.reject(err);
            }
        }
        return window.Promise.finishAll(hash).then(function() {
            return succeeded;
        });
    };

    clearTable = function(dbDef, dbName, table) {
        var tableRef = '#'+dbName+'#'+table,
            items = getItem(tableRef),
            failed = false;
        // first delete all items and their indexes:
        if (items) {
            items.forEach(function(pos) {
                removeTableItem(dbDef, dbName, table, pos) || (failed=true);
            });
        }
        // now remove the tablerecords:
        localStorage.removeItem(tableRef);
        return window.Promise.resolve(!failed);
    };

    getDatabaseDef = function(db, version, tables) {
        DEFS_CACHE[db+'@'+version] || (DEFS_CACHE[db+'@'+version]=defineDatabase(db, version, tables));
        return DEFS_CACHE[db+'@'+version];
    };

    getNextFreePos = function() {
        var freePos;
        positionsInitialized || initializePositions();
        positions.sort();
        positions.some(function(pos, i) {
            if (pos!==i) {
                freePos = i;
            }
            return freePos;
        });
        return freePos || positions.length;
    };

    initializePositions = function() {
        var dbDefs = getItem('$$dbDefs') || [];
        if (dbDefs) {
            dbDefs.forEach(function(database) {
                var dbDef = getItem('$'+database);
                if (dbDef) {
                    dbDef.t.forEach(function(table) {
                        var tablePositions = getItem('#'+database+'#'+table.n) || [];
                        tablePositions.forEach(function(pos) {
                            positions.push(parseInt(pos, 10));
                        });
                    });
                }
            });
        }
        positionsInitialized = true;
    };

    readTableItems = function(dbDef, dbName, table, prop, matches, reviver, deleteMatch) {
        var returnValue, tableDefItemsRef, records;
        if (!dbDef) {
            return window.Promise.reject('No valid database');
        }
        tableDefItemsRef = '#'+dbName+'#'+table;
        if (matches) {
            Array.isArray(matches) || (matches=[matches]);
        }
        returnValue = deleteMatch ? true : [];
        records = getItem(tableDefItemsRef);
        if (records){
            records.forEach(function(pos) {
                var record = getItem(pos, REVIVER);
                if (!prop ||!matches || (record && matches.contains(record[prop]))) {
                    if (deleteMatch) {
                        removeTableItem(dbDef, dbName, table, pos) || (returnValue=false);
                    }
                    else {
                        returnValue.push(record);
                    }
                }
            });
        }
        return window.Promise.resolve(returnValue);
    };

    readTableItem = function(dbDef, dbName, table, key, matches, reviver) {
        var tableDefItemsRef, record;
        if (!dbDef) {
            return window.Promise.reject('No valid database');
        }
        tableDefItemsRef = '#'+dbName+'#'+table;
        Array.isArray(matches) || (matches=[matches]);
        matches.some(function(match) {
            var searchKey = tableDefItemsRef+'#'+key+'#'+match,
                pos = getItem(searchKey); // returns the position(key) of the item
            if (pos!==undefined) {
                record = getItem(pos, reviver);
            }
            return record;
        });
        return window.Promise.resolve(record);
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
        if (supportsLocalStorage) {
            instance.dbName = database;
            instance.dbDef = getDatabaseDef(database, version, tables);
        }
    }, {
        save: function(table, records, overwriteUnique) {
            var instance = this,
                dbDef = instance.dbDef,
                savePromise;
            if (!dbDef) {
                return window.Promise.reject('No valid database');
            }
            savePromise = new window.Promise(function(resolve, reject) {
                var funcs = [],
                    dbName = instance.dbName,
                    fn, tableDef, removeUnique;
                tableDef = getTableDef(dbDef, table);
                Array.isArray(records) || (records=[records]);
                records.forEach(function(record) {
                    fn = function() {
                        var posInt = getNextFreePos(),
                            pos = String(posInt),
                            tableDefItemsRef = '#'+dbName+'#'+table,
                            tableDefItems;
                        // if unique keys exists: then we remove items that match the unique keys:
                        if (tableDef && (tableDef.u.length>0)) {
                            removeUnique = false;
                            tableDef.u.some(function(index) {
                                var key = tableDefItemsRef+'#'+index+'#'+record[index];
                                localStorage.getItem(key) && (removeUnique=true);
                                return removeUnique;
                            });
                            if (removeUnique) {
                                tableDef.i.forEach(function(index) {
                                    var key = tableDefItemsRef+'#'+index+'#'+record[index];
console.warn('key: '+key);
console.warn('removing: '+getItem(key));
                                    removeTableItem(dbDef, dbName, table, getItem(key));
                                });
                                tableDef.u.forEach(function(index) {
                                    var key = tableDefItemsRef+'#'+index+'#'+record[index];
console.warn('key: '+key);
console.warn('removing: '+getItem(key));
                                    removeTableItem(dbDef, dbName, table, getItem(key));
                                });
                            }
                        }
                        // store the item:
                        if (!setItem(pos, record)) {
                            throw new Error('failed to store');
                        }
                        positions.push(posInt);
                        // now store the table-def's items:
                        tableDefItems = getItem(tableDefItemsRef) || [];
                        tableDefItems.push(pos);
                        if (!setItem(tableDefItemsRef, tableDefItems)) {
                            throw new Error('failed to store');
                        }
                        // now store the indexes, but only if they aren't defined yet --> when double we keep the first:
                        if (tableDef) {
                            tableDef.i.forEach(function(index) {
                                var key = tableDefItemsRef+'#'+index+'#'+record[index];
                                if (!getItem(key) && !setItem(key, pos)) {
                                    throw new Error('failed to store');
                                }
                            });
                            // now store the unique-indexes
                            tableDef.u.forEach(function(index) {
                                var key = tableDefItemsRef+'#'+index+'#'+record[index];
                                if (!setItem(key, pos)) {
                                    throw new Error('failed to store');
                                }
                            });
                        }
                    };
                    funcs.push(fn);
                });
                return window.Promise.chainFns(funcs, true).then(resolve, reject);
            });
            return savePromise.catch(function() {
                return window.Promise.reject('failed to save records to localstorage');
            });
        },

        read: function(table, key, matches) {
            return readTableItem(this.dbDef, this.dbName, table, key, matches, REVIVER);
        },

        readMany: function(table, prop, matches) {
            return readTableItems(this.dbDef, this.dbName, table, prop, matches, REVIVER);
        },

        readAll: function(table) {
            return readTableItems(this.dbDef, this.dbName, table);
        },

        each: function(table, fn, context) {
            var instance = this,
                dbDef = instance.dbDef,
                dbName = instance.dbName,
                tableDefItemsRef, records;
            if (!dbDef) {
                return window.Promise.reject('No valid database');
            }
            try {
                tableDefItemsRef = '#'+dbName+'#'+table;
                records = getItem(tableDefItemsRef);
                if (records){
                    records.forEach(function(pos) {
                        var record = getItem(pos, REVIVER);
                        fn.call(context, record, pos);
                    });
                }
                return window.Promise.resolve();
            }
            catch(err) {
                return window.Promise.reject(err);
            }
        },

        some: function(table, fn, context) {
            var instance = this,
                dbDef = instance.dbDef,
                dbName = instance.dbName,
                tableDefItemsRef, records, matchedRecord;
            if (!dbDef) {
                return window.Promise.reject('No valid database');
            }
            try {
                tableDefItemsRef = '#'+dbName+'#'+table;
                records = getItem(tableDefItemsRef);
                if (records){
                    records.some(function(pos) {
                        var record = getItem(pos, REVIVER);
                        matchedRecord = fn.call(context, record, pos);
                        return matchedRecord;
                    });
                }
                return window.Promise.resolve(matchedRecord);
            }
            catch(err) {
                return window.Promise.reject(err);
            }
        },

        clear: function(table) {
            return clearTable(this.dbDef, this.dbName, table);
        },

        has: function(table, prop, matches) {
            return readTableItem(this.dbDef, this.dbName, table, prop, matches).then(function(record) {
                return !!record;
            });
        },

        size: function(table) {
            var items = getItem('#'+this.dbName+'#'+table) || [];
            return window.Promise.resolve(items.length);
        },

        'delete': function(table, prop, matches) {
            return readTableItems(this.dbDef, this.dbName, table, prop, matches, REVIVER, true);
        },

        deleteDatabase: function() {
            return removeDatabase(this.dbDef, this.dbName);
        }
    });

    module.exports = LocalStorage;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this));