/*global describe, it, before, after */
/*jshint unused:false */

"use strict";

require('js-ext/js-ext.js');

var chai = require('chai'),
    expect = chai.expect,
    should = chai.should(),
    IndexedDB = require('../lib/indexeddb.js'),
    databaseName = 'test',
    databaseVersion = 1,
    tables = [
        {
            name: 'presidents',
            indexes: [
                {
                    property: 'name',
                    config: {
                        unique: false
                    }
                },
                {
                    property: 'birth',
                    config: {
                        unique: false
                    }
                }
            ]
        }
    ];

chai.use(require('chai-as-promised'));


describe('indexedDB.save', function () {

    after(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('Saving record', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.save('presidents', {name: 'Barack', lastName: 'Obama', 'birth': 1961}).should.be.fulfilled;
    });

});


describe('indexedDB.read', function () {

    before(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion, tables),
            hash = [];
        hash.push(db.save('presidents', {name: 'Barack', lastName: 'Obama', 'birth': 1961}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy another', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'Bill', lastName: 'Clinton', 'birth': 1946}));
        window.Promise.finishAll(hash).finally(function() {
            done();
        });
    });

    after(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('Read record search single with hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.read('presidents', 'birth', 1961).should.become({name: 'Barack', lastName: 'Obama', 'birth': 1961});
    });

    it('Read record search single without hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.read('presidents', 'birth', 1900).should.become(undefined);
    });

    it('Read record search multiple with hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.read('presidents', 'birth', [1960,1961,1962]).should.become({name: 'Barack', lastName: 'Obama', 'birth': 1961});
    });

    it('Read record search multiple without hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.read('presidents', 'birth', [1900,1901,1902]).should.become(undefined);
    });

});

describe('indexedDB.readMany', function () {

    before(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion, tables),
            hash = [];
        hash.push(db.save('presidents', {name: 'Barack', lastName: 'Obama', 'birth': 1961}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy another', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'Bill', lastName: 'Clinton', 'birth': 1946}));
        window.Promise.finishAll(hash).finally(function() {
            done();
        });
    });

    after(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('Read record search single with one hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readMany('presidents', 'birth', 1946).should.become([{name: 'Bill', lastName: 'Clinton', 'birth': 1946}]);
    });

    it('Read record search single with multiple hits', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readMany('presidents', 'birth', 1917).should.become([{name: 'John F.', lastName: 'Kennedy', 'birth': 1917},{name: 'John F.', lastName: 'Kennedy another', 'birth': 1917}]);
    });

    it('Read record search single without hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.read('presidents', 'birth', 1900).should.become(undefined);
    });

    it('Read record search multiple with one hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readMany('presidents', 'birth', [1900,1946]).should.become([{name: 'Bill', lastName: 'Clinton', 'birth': 1946}]);
    });

    it('Read record search multiple with multiple hits', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readMany('presidents', 'birth', [1900,1917,1946]).should.become([{name: 'John F.', lastName: 'Kennedy', 'birth': 1917},{name: 'John F.', lastName: 'Kennedy another', 'birth': 1917},{name: 'Bill', lastName: 'Clinton', 'birth': 1946}]);
    });

    it('Read record search multiple without hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.read('presidents', 'birth', [1900,1901]).should.become(undefined);
    });

});

describe('indexedDB.readAll', function () {

    before(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion, tables),
            hash = [];
        hash.push(db.save('presidents', {name: 'Barack', lastName: 'Obama', 'birth': 1961}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy another', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'Bill', lastName: 'Clinton', 'birth': 1946}));
        window.Promise.finishAll(hash).finally(function() {
            done();
        });
    });

    afterEach(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('readAll with items', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readAll('presidents').should.become([{name: 'Barack', lastName: 'Obama', 'birth': 1961},{name: 'John F.', lastName: 'Kennedy', 'birth': 1917},{name: 'John F.', lastName: 'Kennedy another', 'birth': 1917},{name: 'Bill', lastName: 'Clinton', 'birth': 1946}]);
    });

    it('readAll without items', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readAll('presidents').should.become([]);
    });

});

describe('indexedDB.delete', function () {

    before(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion, tables),
            hash = [];
        hash.push(db.save('presidents', {name: 'Barack', lastName: 'Obama', 'birth': 1961}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy another', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'Bill', lastName: 'Clinton', 'birth': 1946}));
        window.Promise.finishAll(hash).finally(function() {
            done();
        });
    });

    afterEach(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('delete one valid item', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', 1946).then(function() {
            return db.size('presidents').should.become(3);
        });
    });

    it('delete one valid item that is present multiple times', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', 1917).then(function() {
            return db.size('presidents').should.become(2);
        });
    });

    it('delete one valid item that is not present', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', 1900).then(function() {
            return db.size('presidents').should.become(0);
        });
    });

    it('delete multiple valid items', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', [1961, 1946]).then(function() {
            return db.size('presidents').should.become(2);
        });
    });

    it('delete multiple valid item which are present multiple times', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', [1961, 1917]).then(function() {
            return db.size('presidents').should.become(1);
        });
    });

    it('delete multiple valid item with one that is not present', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', [1900, 1961]).then(function() {
            return db.size('presidents').should.become(3);
        });
    });

    it('delete multiple valid item with one that is not present and one that is multiple present', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', [1900, 1961, 1917]).then(function() {
            return db.size('presidents').should.become(1);
        });
    });

    it('delete multiple invalid items', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', [1900, 1901, 1902]).then(function() {
            return db.size('presidents').should.become(4);
        });
    });

});

describe('Other methods', function () {

    beforeEach(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion, tables),
            hash = [];
        hash.push(db.save('presidents', {name: 'Barack', lastName: 'Obama', 'birth': 1961}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy another', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'Bill', lastName: 'Clinton', 'birth': 1946}));
        window.Promise.finishAll(hash).finally(function() {
            done();
        });
    });

    afterEach(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('clear', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.clear('presidents').finally(function() {
            return db.size('presidents').should.become(0);
        });
    });

    it('each', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.read('presidents', 'birth', 43).should.become({name: 'Marco', lastName: 'Asbreuk', 'birth': 43});
    });

    it('some', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.read('presidents', 'birth', 10).should.become(undefined);
    });

    it('has when true', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.has('presidents', 'birth', 1917).should.become(true);
    });

    it('has when false', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.has('presidents', 'birth', 1900).should.become(false);
    });

    it('size', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.size('presidents').should.become(4);
    });

});