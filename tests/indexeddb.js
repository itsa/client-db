/*global describe, it, before, after, afterEach, beforeEach */
/*jshint unused:false */
(function (window) {

"use strict";

require('js-ext/js-ext.js');

var chai = require('chai'),
    expect = chai.expect,
    should = chai.should(),
    IndexedDB = require('../lib/indexeddb.js'),
    databaseName = 'test',
    databaseName2 = 'test2',
    databaseName3 = 'test3',
    databaseVersion = 1,
    databaseVersion2 = 2,
    databaseVersion3 = 3,
    tables = [
        {
            name: 'presidents',
            indexes: ['name', 'birth']
        }
    ],
    tablesUnique = [
        {
            name: 'presidents',
            uniqueIndexes: ['name'],
            indexes: ['birth']
        }
    ];

chai.use(require('chai-as-promised'));


describe('indexedDB.save', function () {

    after(function(done) {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('Saving record', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.save('presidents', {name: 'Barack', lastName: 'Obama', 'birth': 1961}).should.be.fulfilled;
    });

});


describe('indexedDB.readOneByKey', function () {

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
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('Read record search single with hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readOneByKey('presidents', 'birth', 1961).should.become({name: 'Barack', lastName: 'Obama', 'birth': 1961});
    });

    it('Read record search single without hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readOneByKey('presidents', 'birth', 1900).should.become(undefined);
    });

    it('Read record search multiple with hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readOneByKey('presidents', 'birth', [1960,1961,1962]).should.become({name: 'Barack', lastName: 'Obama', 'birth': 1961});
    });

    it('Read record search multiple without hit', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readOneByKey('presidents', 'birth', [1900,1901,1902]).should.become(undefined);
    });

});

describe('indexedDB.readwith unique indexes', function () {

    before(function(done) {
        var db, hash = [], prevErrorHandler;
        // NOTE: db.save() double unique index will cause an error caught by Mocha, even if it was handled
        // by the promise. Therefore we temporarely suppress mocha's general errorhandling and reset it afterwards:
        prevErrorHandler = window.onerror;
        window.onerror = function(){return true;};
        db = new IndexedDB(databaseName2, databaseVersion2, tablesUnique);
        hash.push(db.save('presidents', {name: 'Barack', lastName: 'Obama', 'birth': 1961}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy another', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'Bill', lastName: 'Clinton', 'birth': 1946}));
        window.Promise.finishAll(hash).finally(function() {
            window.onerror = prevErrorHandler;
            done();
        });
    });

    after(function(done) {
        var db = new IndexedDB(databaseName2, databaseVersion2, tablesUnique);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('Read record with indexed key', function () {
        var db = new IndexedDB(databaseName2, databaseVersion2, tablesUnique);
        return db.readOneByKey('presidents', 'birth', 1917).should.become({name: 'John F.', lastName: 'Kennedy', 'birth': 1917});
    });

    it('Read record with unique-indexed key', function () {
        var db = new IndexedDB(databaseName2, databaseVersion2, tablesUnique);
        return db.readOneByKey('presidents', 'name', 'John F.').should.become({name: 'John F.', lastName: 'Kennedy', 'birth': 1917});
    });

    it('Read size', function () {
        var db = new IndexedDB(databaseName2, databaseVersion2, tablesUnique);
        return db.size('presidents').should.become(3);
    });

    it('Read many records search hits on unique items', function () {
        var db = new IndexedDB(databaseName2, databaseVersion2, tablesUnique);
        return db.readMany('presidents', 'birth', 1917).should.become([{name: 'John F.', lastName: 'Kennedy', 'birth': 1917}]);
    });

});

describe('indexedDB.readwith unique indexes force overwrite', function () {

    before(function(done) {
        var db, hash = [], prevErrorHandler;
        // NOTE: db.save() double unique index will cause an error caught by Mocha, even if it was handled
        // by the promise. Therefore we temporarely suppress mocha's general errorhandling and reset it afterwards:
        prevErrorHandler = window.onerror;
        window.onerror = function(){return true;};
        db = new IndexedDB(databaseName3, databaseVersion3, tablesUnique);
        hash.push(db.save('presidents', {name: 'Barack', lastName: 'Obama', 'birth': 1961}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy', 'birth': 1917}));
        hash.push(db.save('presidents', {name: 'John F.', lastName: 'Kennedy another', 'birth': 1917}, true));
        hash.push(db.save('presidents', {name: 'Bill', lastName: 'Clinton', 'birth': 1946}));
        window.Promise.finishAll(hash).finally(function() {
            window.onerror = prevErrorHandler;
            done();
        });
    });

    after(function(done) {
        var db = new IndexedDB(databaseName3, databaseVersion3, tablesUnique);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('Read record with indexed key', function () {
        var db = new IndexedDB(databaseName3, databaseVersion3, tablesUnique);
        return db.readOneByKey('presidents', 'birth', 1917).should.become({name: 'John F.', lastName: 'Kennedy another', 'birth': 1917});
    });

    it('Read record with unique-indexed key', function () {
        var db = new IndexedDB(databaseName3, databaseVersion3, tablesUnique);
        return db.readOneByKey('presidents', 'name', 'John F.').should.become({name: 'John F.', lastName: 'Kennedy another', 'birth': 1917});
    });

    it('Read size', function () {
        var db = new IndexedDB(databaseName3, databaseVersion3, tablesUnique);
        return db.size('presidents').should.become(3);
    });

    it('Read many records search hits on unique items', function () {
        var db = new IndexedDB(databaseName3, databaseVersion3, tablesUnique);
        return db.readMany('presidents', 'birth', 1917).should.become([{name: 'John F.', lastName: 'Kennedy another', 'birth': 1917}]);
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
        var db = new IndexedDB(databaseName, databaseVersion, tables);
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
        return db.readOneByKey('presidents', 'birth', 1900).should.become(undefined);
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
        return db.readOneByKey('presidents', 'birth', [1900,1901]).should.become(undefined);
    });

    it('Read non-indexed items', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.readMany('presidents', 'lastName', ['Kennedy','Clinton']).should.become([{name: 'John F.', lastName: 'Kennedy', 'birth': 1917},{name: 'Bill', lastName: 'Clinton', 'birth': 1946}]);
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
        var db = new IndexedDB(databaseName, databaseVersion, tables);
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
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        db.deleteDatabase().finally(function() {
            done();
        });
    });

    it('delete one valid item check size', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', 1946).then(function() {
            return db.size('presidents').should.become(3);
        });
    });

    it('delete one valid item check item', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.delete('presidents', 'birth', 1946).then(function() {
            return db.readOneByKey('presidents', 'birth', 1946).should.become(undefined);
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
            return db.size('presidents').should.become(4);
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
        var db = new IndexedDB(databaseName, databaseVersion, tables);
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

    it('each', function (done) {
        var db = new IndexedDB(databaseName, databaseVersion, tables),
            years = 0;
        db.each('presidents', function(record) {
            years += record.birth;
        }).finally(function() {
            expect(years).to.be.equal(7741);
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('some', function (done) {
        var db = new IndexedDB(databaseName, databaseVersion, tables),
            years = 0;
        db.some('presidents', function(record) {
            years += record.birth;
            return (record.birth===1917);
        }).finally(function(record) {
            expect(years).to.be.equal(3878);
            expect(record).to.be.eql({name: 'John F.', lastName: 'Kennedy', 'birth': 1917});
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('has when true', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.has('presidents', 'birth', 1917).should.become(true);
    });

    it('has when false', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.has('presidents', 'birth', 1900).should.become(false);
    });

    it('contains when true', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.contains('presidents', {name: 'Bill', lastName: 'Clinton', 'birth': 1946}).should.become(true);
    });

    it('contains when false', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.contains('presidents', {name: 'Bill', lastName: 'Clinton', 'birth': 1900}).should.become(false);
    });

    it('size', function () {
        var db = new IndexedDB(databaseName, databaseVersion, tables);
        return db.size('presidents').should.become(4);
    });

});


}(global.window || require('node-win')));