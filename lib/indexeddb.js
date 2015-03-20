(function (window) {

    "use strict";

    var supportsIndexedDB = !!window.indexedDB,
        Classes = require('js-ext/js-ext.js').Classes, // we also have Promises now
        indexedDB;

    /*
    * @param [localstorage] {boolean} to force using localstorage
    */

    /*
     * tables = [
     *     {
     *          name: {String},
     *          indexes: [
     *               {
     *                   property {String},
     *                   config {}
     *               }
     *          ]
     *      }
     * ]
     */
    indexedDB = Classes.createClass(function(database, version, tables) {
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
                    db.onversionchange = function(event) {
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
                                    objectStore.createIndex(index.property, index.property, index.config);
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
                    transaction.oncomplete = function(event) {
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


        read: function(table, prop, matches) {
            var instance = this,
                getRecord;
            Array.isArray(matches) || (matches=[matches]);
            getRecord = function(i) {
                return new window.Promise(function(resolve, reject) {
                    instance._getRecord(table, prop, matches[i]).then(
                        function(record) {
                            resolve(record || (matches[i+1] && getRecord(i+1)));
                        }
                    ).catch(reject);
                });
                return instance._getRecord(table, prop, matches[j]);
            };
            return getRecord(0);
        },


        readMany: function(table, prop, matches) {
            var instance = this,
                hash = [];
            Array.isArray(matches) || (matches=[matches]);
            // we have to use a cursor and inspect all records
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readonly'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    // openCursor can raise exceptions
                    try {
                        objectStore.openCursor().onsuccess = function(event) {
                            var cursor = event.target.result;
                            if (cursor) {
                                matches.contains(cursor.value[prop]) && hash.push(cursor.value);
                                cursor.continue();
                            }
                            else {
                                resolve(hash);
                            }
                        };
                    }
                    catch(err) {
                        reject(err);
                    }
                });
            });
        },
        _getRecord: function(table, prop, match) {
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readonly'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var index, request;
                    // objectStore.index may throw an error
                    try {
                        index = objectStore.index(prop);
                        request = index.get(match);
                        request.onerror = function(event) {
                            reject('Error read: '+event.target.errorCode);
                        };
                        request.onsuccess = function(event) {
                            // request.result is undefined when there is no match
                            resolve(request.result);
                        };
                    }
                    catch(err) {
                        reject(err);
                    }
                });
            });
        },
        readAll: function(table) {
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readonly'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var records = [];
                    // openCursor can raise exceptions
                    try {
                        objectStore.openCursor().onsuccess = function(event) {
                            var cursor = event.target.result;
                            if (cursor) {
                                records.push(cursor.value);
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
        },

        each: function() {
            // var transaction = db.transaction([table], "readonly");

        },
        some: function() {
            // var transaction = db.transaction([table], "readonly");

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
                    request.onsuccess = function(event) {
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
        _deleteRecord: function(table, prop, matches) {
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readwrite'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var request = objectStore.delete(key);
                    request.onerror = function(event) {
                        reject('Error delete: '+event.target.errorCode);
                    };
                    request.onsuccess = function(event) {
                        resolve();
                    };
                });
            });
        },
        'delete': function(table, prop, matches) {
            return this.db.then(function(database) {
                var transaction = database.transaction([table], 'readwrite'),
                    objectStore = transaction.objectStore(table);
                return new window.Promise(function(resolve, reject) {
                    var request = objectStore.delete(key);
                    request.onerror = function(event) {
                        reject('Error delete: '+event.target.errorCode);
                    };
                    request.onsuccess = function(event) {
                        resolve();
                    };
                });
            });
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

    module.exports = indexedDB;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this));