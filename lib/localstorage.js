/**
 * Creating floating Panel-nodes which can be shown and hidden.
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 *
 * @module client-db
 * @submodule localstorage
 * @class LocalStorage
 * @since 0.0.1
*/

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

    /**
     *
     *
     * @method getItem
     * @param key {String}
     * @param reviver {Function}
     * @protected
     * @since 0.0.1
     */
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

    /**
     *
     *
     * @method setItem
     * @param key {String}
     * @param value {Any}
     * @protected
     * @since 0.0.1
     */
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

    /**
     *
     *
     * @method getTableDef
     * @param dbDef {Object}
     * @param table {String}
     * @protected
     * @since 0.0.1
     */
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

    /**
     *
     *
     * @method removeTableItem
     * @param dbDef {Object}
     * @param dbName {String}
     * @param table {Object}
     * @param pos {String}
     * @protected
     * @since 0.0.1
     */
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

    /**
     *
     *
     * @method defineDatabase
     * @param dbName {String}
     * @param version {Number}
     * @param tables {Array}
     * @protected
     * @since 0.0.1
     */
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

    /**
     *
     *
     * @method removeDatabase
     * @param dbDef {Object}
     * @param dbName {String}
     * @protected
     * @since 0.0.1
     */
    removeDatabase = function(dbDef, dbName) {
        // `this` is database-instance
        var instance = this,
            hash = [];
        if (dbDef) {
            try {
                dbDef.t.forEach(function(table) {
                    hash.push(clearTable.call(instance, table.n));
                });
            }
            catch(err) {
                return window.Promise.reject(err);
            }
        }
        return window.Promise.finishAll(hash).then(function() {
            var dbDefs;
            localStorage.removeItem('$'+dbName);
            dbDefs = getItem('$$dbDefs') || [];
            dbDefs.remove(dbName);
            return setItem('$$dbDefs', dbDefs);
        });
    };

    /**
     *
     *
     * @method clearTable
     * @param table {String}
     * @protected
     * @since 0.0.1
     */
    clearTable = function(table) {
        // `this` is database-instance
        var instance = this,
            dbDef = instance.dbDef,
            dbName = instance.dbName,
            tableRef = '#'+dbName+'#'+table,
            failed = false,
            waitPromise = instance._lockedPromise || window.Promise.resolve();
        return waitPromise.then(function() {
            var items = getItem(tableRef);
            // first delete all items and their indexes:
            if (items) {
                items.forEach(function(pos) {
                    removeTableItem(dbDef, dbName, table, pos) || (failed=true);
                });
            }
            // now remove the tablerecords:
            localStorage.removeItem(tableRef);
            return !failed;
        });
    };

    /**
     *
     *
     * @method getDatabaseDef
     * @param db {Object}
     * @param version {Number}
     * @param tables {Array}
     * @protected
     * @since 0.0.1
     */
    getDatabaseDef = function(db, version, tables) {
        DEFS_CACHE[db+'@'+version] || (DEFS_CACHE[db+'@'+version]=defineDatabase(db, version, tables));
        return DEFS_CACHE[db+'@'+version];
    };

    /**
     *
     *
     * @method getNextFreePos
     * @protected
     * @since 0.0.1
     */
    getNextFreePos = function() {
        var freePos;
        positionsInitialized || initializePositions();
        positions.sort();
        positions.some(function(pos, i) {
            if (pos!==i) {
                freePos = i;
            }
            return (freePos!==undefined);
        });
        return (freePos!==undefined) ? freePos : positions.length;
    };

    /**
     *
     *
     * @method initializePositions
     * @protected
     * @since 0.0.1
     */
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

    /**
     *
     *
     * @method readTableItems
     * @param dbDef {Object}
     * @param dbName {String}
     * @param table {String}
     * @param prop {String}
     * @param matches {Array|Any}
     * @param reviver {Function}
     * @param deleteMatch {Boolean}
     * @protected
     * @since 0.0.1
     */
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

    /**
     *
     *
     * @method readTableItem
     * @param dbDef {Object}
     * @param dbName {String}
     * @param table {String}
     * @param key {String}
     * @param matches {Array|any}
     * @param reviver {Functiom}
     * @protected
     * @since 0.0.1
     */
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
            pos && (record=getItem(pos, reviver));
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
        var instance = this,
            dbDef, uniqueIndexes;
        if (supportsLocalStorage) {
            instance.dbName = database;
            dbDef = instance.dbDef = getDatabaseDef(database, version, tables);
            // set if there are any unique indexes being used:
            dbDef.t.some(function(table) {
                uniqueIndexes = (table.u && (table.u.length>0));
                return uniqueIndexes;
            });
            instance.uniqueIndexes = !!uniqueIndexes;
        }
    }, {
        /**
         * Saves a record. Returns an undefined promise when ready.
         *
         * @method save
         * @param table {String}
         * @param records {Array|Object}
         * @param overwriteUnique {Boolean}
         * @return {Promise} Returnvalue of the fulfilled promise is undefined
         * @since 0.0.1
         */
        save: function(table, records, overwriteUnique) {
            var instance = this,
                dbDef = instance.dbDef,
                lockFirst = instance.uniqueIndexes,
                deleteFirst = overwriteUnique && lockFirst,
                savePromise, isLocked, waitPromise;
            if (!dbDef) {
                return window.Promise.reject('No valid database');
            }

            if (lockFirst) {
                isLocked = instance._lockedPromise && instance._lockedPromise.pending();
                if (!isLocked) {
                    instance._lockedPromise = window.Promise.manage();
                    waitPromise = window.Promise.resolve();
                }
                else {
                    waitPromise = instance._lockedPromise;
                }
            }
            else {
                waitPromise = window.Promise.resolve();
            }

            savePromise = waitPromise.then(function() {
                return new window.Promise(function(resolve, reject) {
                    var funcs = [],
                        dbName = instance.dbName,
                        fn, tableDef;
                    tableDef = getTableDef(dbDef, table);
                    Array.isArray(records) || (records=[records]);
                    records.forEach(function(record) {
                        fn = function() {
                            var posInt = getNextFreePos(),
                                pos = String(posInt),
                                hash = [],
                                tableDefItemsRef = '#'+dbName+'#'+table,
                                tableDefItems, cannotSafe;
                            // if unique keys exists: when tey need to be overridden,
                            // then we remove items that match the unique keys:
                            if (deleteFirst) {
                                tableDef.u.forEach(function(index) {
                                    var key = tableDefItemsRef+'#'+index+'#'+record[index],
                                        removePos = localStorage.getItem(key);
                                    if (removePos) {
                                        removePos = removePos.substr(1, removePos.length-2);
                                        hash.push(removeTableItem(dbDef, dbName, table, removePos));
                                    }
                                });
                            }
                            else {
                                // check if any item with a unique index exists.
                                // If so: then don't save the record but retain the previous
                                cannotSafe = false;
                                tableDef.u.some(function(index) {
                                    var key = tableDefItemsRef+'#'+index+'#'+record[index];
                                    cannotSafe = !!localStorage.getItem(key);
                                    return cannotSafe;
                                });
                                if (cannotSafe) {
                                    return window.Promise.reject('Record not saved due to violation unique keys');
                                }
                            }

                            // store the item:
                            if (!setItem(pos, record)) {
                                return window.Promise.reject('failed to store');
                            }
                            positions.push(posInt);
                            // now store the table-def's items:
                            tableDefItems = getItem(tableDefItemsRef) || [];
                            tableDefItems.push(pos);
                            if (!setItem(tableDefItemsRef, tableDefItems)) {
                                return window.Promise.reject('failed to store');
                            }
                            // now store the indexes, but only if they aren't defined yet --> when double we keep the first:
                            if (tableDef) {
                                tableDef.i.forEach(function(index) {
                                    var key = tableDefItemsRef+'#'+index+'#'+record[index];
                                    if (!getItem(key) && !setItem(key, pos)) {
                                        return window.Promise.reject('failed to store');
                                    }
                                });
                                // now store the unique-indexes
                                tableDef.u.forEach(function(index) {
                                    var key = tableDefItemsRef+'#'+index+'#'+record[index];
                                    if (!setItem(key, pos)) {
                                        return window.Promise.reject('failed to store');
                                    }
                                });
                            }
                            return window.Promise.finishAll(hash);
                        };
                        funcs.push(fn);
                    });
                    return window.Promise.chainFns(funcs, true).then(resolve, reject);
                });
            });

            return savePromise.then(
                function() {
                    lockFirst && instance._lockedPromise.fulfill();
                    return undefined; // just all ok
                },
                function(err) {
                    lockFirst && instance._lockedPromise.fulfill();
                    throw err;
                }
            );
        },

        /**
         * Reads one record, specified by its `key`.
         *
         * @method readOneByKey
         * @param table {String}
         * @param key {String}
         * @param matches {Array|any}
         * @return {Promise} Returnvalue of the fulfilled promise is an Object (record)
         * @since 0.0.1
         */
        readOneByKey: function(table, key, matches) {
            return readTableItem(this.dbDef, this.dbName, table, key, matches, REVIVER);
        },

        /**
         * Reads multiple records, specified by `matches`.
         *
         * @method readMany
         * @param table {String}
         * @param prop {String}
         * @param matches {Array|any}
         * @return {Promise} Returnvalue of the fulfilled promise is an Array with Objects (records)
         * @since 0.0.1
         */
        readMany: function(table, prop, matches) {
            return readTableItems(this.dbDef, this.dbName, table, prop, matches, REVIVER);
        },

        /**
         * Retrieves all records of the table
         *
         * @method readAll
         * @param table {String}
         * @return {Promise} Returnvalue of the fulfilled promise is an Array with all Objects (records) within the table
         * @since 0.0.1
         */
        readAll: function(table) {
            return readTableItems(this.dbDef, this.dbName, table);
        },

        /**
         * Performs a function to all the records of the table
         *
         * @method each
         * @param table {String}
         * @param fn {Function}
         * @param context {Object}
         * @return {Promise} Returnvalue of the fulfilled promise is undefined
         * @since 0.0.1
         */
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

        /**
         * Performs a function to some the records of the table.
         * If the invoked function returns a trutthy value, the loop ends.
         *
         * @method some
         * @param table {String}
         * @param fn {Function}
         * @param context {Object}
         * @return {Promise} Returnvalue of the fulfilled promise is undefined
         * @since 0.0.1
         */
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
                        if (fn.call(context, record, pos)) {
                            matchedRecord = record;
                        }
                        return matchedRecord;
                    });
                }
                return window.Promise.resolve(matchedRecord);
            }
            catch(err) {
                return window.Promise.reject(err);
            }
        },

        /**
         * Empties the table.
         *
         * @method clear
         * @param table {String}
         * @return {Promise} Returnvalue of the fulfilled promise is undefined
         * @since 0.0.1
         */
        clear: function(table) {
            return clearTable.call(this, table);
        },

        /**
         * Checks whether a table has a matched record, defined by the `matches` the `prop`
         *
         * @method has
         * @param table {String}
         * @param prop {String}
         * @param matches {Array|any}
         * @return {Promise} Returnvalue of the fulfilled promise is a boolean specifying whether the table has a matched record
         * @since 0.0.1
         */
        has: function(table, prop, matches) {
            return readTableItem(this.dbDef, this.dbName, table, prop, matches).then(function(record) {
                return !!record;
            });
        },

        /**
         * Checks whether a table has a containes a specified record, not by reference, by by checking its property-values
         *
         * @method contains
         * @param table {String}
         * @param obj {Object}
         * @return {Promise} Returnvalue of the fulfilled promise is a boolean specifying whether the table has a matched record
         * @since 0.0.1
         */
        contains: function(table, obj) {
            return this.some(table, function(item) {
                return item.sameValue(obj);
            }).then(function(record) {
                return !!record;
            });
        },

        /**
         * Gets the number of records in the table
         *
         * @method size
         * @param table {String}
         * @return {Promise} Returnvalue of the fulfilled promise is a number
         * @since 0.0.1
         */
        size: function(table) {
            var items = getItem('#'+this.dbName+'#'+table) || [];
            return window.Promise.resolve(items.length);
        },

        /**
         * Deletes all records of the table that have a match, defined by the `matches` the `prop`
         *
         * @method delete
         * @param table {String}
         * @param prop {String}
         * @param matches {Array|any}
         * @return {Promise} Returnvalue of the fulfilled promise is an Array with all records that have been deleted
         * @since 0.0.1
         */
        'delete': function(table, prop, matches) {
            return readTableItems(this.dbDef, this.dbName, table, prop, matches, REVIVER, true);
        },

        /**
         * Deletes a database from the client
         *
         * @method deleteDatabase
         * @return {Promise} Returnvalue of the fulfilled promise is undefined
         * @since 0.0.1
         */
        deleteDatabase: function() {
            var instance = this;
            return removeDatabase.call(instance, instance.dbDef, instance.dbName);
        }
    });

    module.exports = LocalStorage;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this));