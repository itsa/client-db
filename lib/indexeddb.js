/**
 * Creating floating Panel-nodes which can be shown and hidden.
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 *
 * @module client-db
 * @submodule indexeddb
 * @class IndexedDB
 * @since 0.0.1
*/

// More info:
// https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

(function (window) {

    "use strict";

    var supportsIndexedDB = !!window.indexedDB,
        Classes = require('js-ext/js-ext.js').Classes, // we also have Promises now
        IndexedDB, getList, getRecordByIndex, saveRecord;

        /**
         * Gets a list (Array) of records
         *
         * @method getList
         * @param db {Promise}
         * @param table {String}
         * @param cursorProp {String}
         * @param prop {String}
         * @param matches {Array|any}
         * @param deleteMatch {Boolean}
         * @protected
         * @return {Promise} Returnvalue of the fulfilled promise is an Array with Objects (records)
         * @since 0.0.1
         */
        getList = function(db, table, cursorProp, prop, matches, deleteMatch) {
            return db.then(function(database) {
                var transaction = database.transaction([table], deleteMatch ? 'readwrite' : 'readonly'),
                    objectStore = transaction.objectStore(table);
                if (matches && !Array.isArray(matches)) {
                    matches = [matches];
                }
                return new window.Promise(function(resolve, reject) {
                    var records = [];
                    // openCursor can raise exceptions
                    try {
                        objectStore.openCursor().onsuccess = function(event) {
                            var cursor = event.target.result;
                            if (cursor) {
                                if (!matches || !prop || matches.contains(cursor.value[prop])) {
                                    if (deleteMatch) {
                                        cursor.delete();
                                    }
                                    else {
                                        records.push(cursor[cursorProp]);
                                    }
                                }
                                cursor.continue();
                            }
                            else {
                                resolve(records);
                            }
                        };
                    }
                    catch(err) {
                        reject(err);
                    }
                });
            });
        };

        /**
         * Gets a record
         *
         * @method getRecordByIndex
         * @param db {Promise}
         * @param table {String}
         * @param key {String}
         * @param match {Any}
         * @protected
         * @return {Promise} Returnvalue of the fulfilled promise is an Object (record)
         * @since 0.0.1
         */
        getRecordByIndex = function(db, table, key, match) {
            return db.then(function(database) {
                var transaction = database.transaction([table], 'readonly'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var index, request;
                    // objectStore.index may throw an error
                    try {
                        index = objectStore.index(key);
                        request = index.get(match);
                        request.onerror = function(event) {
                            reject('Error read: '+event.target.errorCode);
                        };
                        request.onsuccess = function() {
                            // request.result is undefined when there is no match
                            resolve(request.result);
                        };
                    }
                    catch(err) {
                        reject(err);
                    }
                });
            });
        };

        /**
         * Saves a record. Returns an empty promise when finished.
         *
         * @method saveRecord
         * @param database {IndexedDB}
         * @param table {String}
         * @param record {Object}
         * @param overwriteUnique {Boolean}
         * @param uniqueIndexes {Array}
         * @protected
         * @return {Promise} Returnvalue is undefined
         * @since 0.0.1
         */
        saveRecord = function(database, table, record, overwriteUnique, uniqueIndexes) {
            var dbInstance = this,
                saveWaitHash = dbInstance.saveWaitHash,
                lockFirst = uniqueIndexes && (uniqueIndexes.length>0),
                deleteFirst = overwriteUnique && lockFirst,
                removePromise, hash, waitPromise;
            if (lockFirst) {
                if (saveWaitHash.length===0) {
                    waitPromise = window.Promise.resolve();
                }
                else {
                    waitPromise = window.Promise.manage();
                }
                saveWaitHash.push(waitPromise);
                removePromise = saveWaitHash[saveWaitHash.length-1].then(function() {
                    if (deleteFirst) {
                        // we need to remove indexed items first:
                        hash = [];
                        uniqueIndexes.forEach(function(index) {
                            hash.push(dbInstance.delete(table, index, record[index]));
                        });
                        return window.Promise.finishAll(hash);
                    }
                });
            }
            else {
                removePromise = (saveWaitHash.length>0) ? saveWaitHash[saveWaitHash.length-1] : window.Promise.resolve();
            }
            return removePromise.then(function() {
                return new window.Promise(function(resolve, reject) {
                    var transaction = database.transaction([table], 'readwrite'),
                        objectStore = transaction.objectStore(table);

                    transaction.oncomplete = function() {
                        if (saveWaitHash.length>0) {
                            saveWaitHash.splice(0, 1);
                            saveWaitHash[0] && saveWaitHash[0].fulfill && saveWaitHash[0].fulfill();
                        }
                        resolve();
                    };

                    transaction.onerror = function() {
                        if (saveWaitHash.length>0) {
                            saveWaitHash.splice(0, 1);
                            saveWaitHash[0] && saveWaitHash[0].fulfill && saveWaitHash[0].fulfill();
                        }
                        reject('Record not saved due to violation unique keys');
                    };

                    objectStore.add(record);
                });
            });
        };

    /*
    * @param [localstorage] {boolean} to force using localstorage
    */

    /*
     * tables = [
     *     {
     *          name: {String},
     *          indexes: [String, String],
     *          uniqueIndexes: [String, String]
     *      }
     * ]
     */
    IndexedDB = Classes.createClass(function(database, version, tables) {
        var instance = this;
        instance.dbName = database;
        instance.locked = {};
        instance.saveWaitHash = [];

        instance.uniqueIndexes = tables && tables.uniqueIndexes;

        if (!supportsIndexedDB) {
            instance.db = window.Promise.reject('IndexedDB is not supported');
        }
        else {
            instance.db = new window.Promise(function(resolve, reject) {
                var request = window.indexedDB.open(database, version || 1);

                request.onerror = function(event) {
                    reject('Error IndexedDB: '+event.target.errorCode);
                };

                request.onsuccess = function(event) {
                    var db = event.target.result;
                    db.onversionchange = function() {
                        db.close();
                        window.close && window.close();
                    };
                    instance.uniqueIndexes = {};
                    Array.isArray(tables) || (tables = [tables]);
                    tables.forEach(function(table) {
                        instance.uniqueIndexes[table.name] = table.uniqueIndexes;
                    });
                    resolve(db);
                };

                request.onupgradeneeded = function(event) {
                    var target = event.target,
                        db = target.result,
                        txn = target.transaction;

                    Array.isArray(tables) || (tables = [tables]);
// TODO:
                    // first remove any existing objectstores of previous version
                    // that don't exists anymore:
// currentObjectStores.forEach();

                    // next: for those objectstores that present in both versions: update the indexes:
                    // if there are unique indexes, some records might need to be removed first
// removeDoubleRecords();
// createUniqueIndexes();
// createIndexes();

                    // next: define new objectstores for tables that were not present in the previous version:
                    tables.forEach(function(table) {
                        // Create an objectStore for this database
                        // which means: set a `table` for the database:
                        var objectStore = db.createObjectStore(table.name, {autoIncrement: true}),
                            indexes = table.indexes || [],
                            uniqueIndexes = table.uniqueIndexes || [];
                        uniqueIndexes.forEach(function(index) {
                            objectStore.createIndex(index, index, {unique: true});
                            indexes.remove(index); // don't double ref.
                        });
                        indexes.forEach(function(index) {
                            objectStore.createIndex(index, index, {unique: false});
                        });
                    });
                };

            });
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
            var instance = this;
            return instance.db.then(function(database) {
                var hash = [],
                    uniqueIndexes = instance.uniqueIndexes[table];
                Array.isArray(records) || (records=[records]);
                records.forEach(function(record) {
                    hash.push(saveRecord.bind(instance, database, table, record, overwriteUnique, uniqueIndexes));
                });
                return window.Promise.chainFns(hash, true);
            });
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
            var instance = this,
                db = instance.db,
                getRecord;
            Array.isArray(matches) || (matches=[matches]);
            getRecord = function(i) {
                return new window.Promise(function(resolve, reject) {
                    getRecordByIndex(db, table, key, matches[i]).then(
                        function(record) {
                            resolve(record || (matches[i+1] && getRecord(i+1)));
                        }
                    ).catch(reject);
                });
            };
            return getRecord(0);
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
            return getList(this.db, table, 'value', prop, matches);
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
            return getList(this.db, table, 'value');
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
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readonly'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    // openCursor can raise exceptions
                    try {
                        objectStore.openCursor().onsuccess = function(event) {
                            var cursor = event.target.result,
                                record, key;
                            if (cursor) {
                                record = cursor.value;
                                key = cursor.key;
                                fn.call(context, record, key);
                                cursor.continue();
                            }
                            else {
                                resolve();
                            }
                        };
                    }
                    catch(err) {
                        reject(err);
                    }
                });
            });
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
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readonly'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var matchedRecord;
                    // openCursor can raise exceptions
                    try {
                        objectStore.openCursor().onsuccess = function(event) {
                            var cursor = event.target.result,
                                record, key;
                            if (cursor) {
                                record = cursor.value;
                                key = cursor.key;
                                fn.call(context, record, key) && (matchedRecord=record);
                                if (matchedRecord) {
                                    resolve(matchedRecord);
                                }
                                else {
                                    cursor.continue();
                                }
                            }
                            else {
                                resolve(); // without arguments: nu fn returned `true`
                            }
                        };
                    }
                    catch(err) {
                        reject(err);
                    }
                });
            });
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
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readwrite'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var request = objectStore.clear();
                    request.onerror = function(event) {
                        reject('Error delete: '+event.target.errorCode);
                    };
                    request.onsuccess = function() {
                        resolve();
                    };
                });
            });
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
            return this.readOneByKey(table, prop, matches).then(
                function(record) {
                    return !!record;
                },
                function() {
                    return false;
                }
            );
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
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readonly'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var count;
                    // count can raise exceptions
                    try {
                        count = objectStore.count();
                        count.onsuccess = function() {
                            resolve(count.result);
                        };
                    }
                    catch(err) {
                        reject(err);
                    }

                    // var size = 0;
                    // // openCursor can raise exceptions
                    // try {
                    //     objectStore.openCursor().onsuccess = function(event) {
                    //         var cursor = event.target.result;
                    //         if (cursor) {
                    //             size++;
                    //             cursor.continue();
                    //         }
                    //         else {
                    //             resolve(size);
                    //         }
                    //     };
                    // }
                    // catch(err) {
                    //     reject(err);
                    // }
                });
            });
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
            var db = this.db;
            return getList(db, table, 'key', prop, matches, true);
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
            return instance.db.then(
                function(database) {
                    database.close();
                    return new window.Promise(function(resolve,reject) {
                        var req = window.indexedDB.deleteDatabase(instance.dbName);
                        req.onsuccess = resolve;
                        req.onerror = reject;
                        req.onblocked = reject;
                    });
                }
            );
        }
    });

    module.exports = IndexedDB;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this));