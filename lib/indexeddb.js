(function (window) {

    "use strict";

    var supportsIndexedDB = !!window.indexedDB,
        Classes = require('js-ext/js-ext.js').Classes, // we also have Promises now
        IndexedDB, getList, deleteRecord, getRecordByIndex;

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
    IndexedDB = Classes.createClass(function(database, version, tables) {
        var instance = this;
        instance.dbName = database;
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
                    resolve(db);
                };

                request.onupgradeneeded = function(event) {
                    // var dbDeleteRequest = window.indexedDB.deleteDatabase(instance.dbName);
                    // dbDeleteRequest.onerror = function(evt) {
                    //     reject('Error deleting older version of database '+instance.dbName+': '+evt.target.errorCode);
                    // };
                    // dbDeleteRequest.onsuccess = function() {
                        var db = event.target.result;
                        Array.isArray(tables) || (tables = [tables]);
                        tables.forEach(function(table) {
                            // Create an objectStore for this database
                            // which means: set a `table` for the database:
                            var objectStore = db.createObjectStore(table.name, {autoIncrement: true});
                            if (Array.isArray(table.indexes)) {
                                table.indexes.forEach(function(index) {
                                    objectStore.createIndex(index, index, {unique: false});
                                });
                            }

                        });
                    };
                // };

            });
        }
    }, {
        save: function(table, records) {
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readwrite'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var requestUpdate;
                    transaction.oncomplete = function() {
                        resolve();
                    };
                    Array.isArray(records) || (records=[records]);
                    records.forEach(function(record) {
                        requestUpdate = objectStore.put(record);
                        requestUpdate.onerror = function(event) {
                            transaction.abort(); // the complete (all) records won't be saved: prevent partial saved record-batch
                            reject('Error save: '+event.target.errorCode);
                        };
                    });
                });
            });
        },


        read: function(table, key, matches) {
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


        readMany: function(table, prop, matches) {
            return getList(this.db, table, 'value', prop, matches);
        },

        readAll: function(table) {
            return getList(this.db, table, 'value');
        },

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
        has: function(table, prop, matches) {
            return this.read(table, prop, matches).then(
                function(record) {
                    return !!record;
                },
                function() {
                    return false;
                }
            );
        },
        size: function(table) {
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readonly'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var size = 0;
                    // openCursor can raise exceptions
                    try {
                        objectStore.openCursor().onsuccess = function(event) {
                            var cursor = event.target.result;
                            if (cursor) {
                                size++;
                                cursor.continue();
                            }
                            else {
                                resolve(size);
                            }
                        };
                    }
                    catch(err) {
                        reject(err);
                    }
                });
            });
        },
        'delete': function(table, prop, matches) {
            var db = this.db;
            return getList(db, table, 'key', prop, matches, true);
        },
        deleteDatabase: function() {
            var instance = this;
            return new window.Promise(function(resolve,reject) {
                var req = window.indexedDB.deleteDatabase(instance.dbName);
                req.onsuccess = resolve;
                req.onerror = reject;
                req.onblocked = reject;
            });
        }
    });

    module.exports = IndexedDB;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this));