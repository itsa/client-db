/**
 * Creating floating Panel-nodes which can be shown and hidden.
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 *
 * @module client-db
 * @class DB
 * @since 0.0.1
*/

"use strict";

var supportsIndexedDB = !!global.indexedDB,
    DB = supportsIndexedDB ? require('./lib/indexeddb.js') : require('./lib/localstorage.js');

DB.mergePrototypes({
   /**
     * Reads one record, specified by its `key`.
     *
     * @method read
     * @param table {String}
     * @param key {String}
     * @param matches {Array|any}
     * @return {Promise} Returnvalue of the fulfilled promise is an Object (record)
     * @since 0.0.1
     */
    read: function(/* table, key, matches */) {
        return this.readOneByKey.apply(this, arguments);
    }

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

    /**
     * Retrieves all records of the table
     *
     * @method readAll
     * @param table {String}
     * @return {Promise} Returnvalue of the fulfilled promise is an Array with all Objects (records) within the table
     * @since 0.0.1
     */

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

    /**
     * Empties the table.
     *
     * @method clear
     * @param table {String}
     * @return {Promise} Returnvalue of the fulfilled promise is undefined
     * @since 0.0.1
     */

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

    /**
     * Checks whether a table has a containes a specified record, not by reference, by by checking its property-values
     *
     * @method contains
     * @param table {String}
     * @param obj {Object}
     * @return {Promise} Returnvalue of the fulfilled promise is a boolean specifying whether the table has a matched record
     * @since 0.0.1
     */

    /**
     * Gets the number of records in the table
     *
     * @method size
     * @param table {String}
     * @return {Promise} Returnvalue of the fulfilled promise is a number
     * @since 0.0.1
     */

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

    /**
     * Deletes a database from the client
     *
     * @method deleteDatabase
     * @return {Promise} Returnvalue of the fulfilled promise is undefined
     * @since 0.0.1
     */

});

module.exports = DB;