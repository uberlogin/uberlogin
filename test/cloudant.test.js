'use strict';
var path = require('path');
var pouchdbUtil = require('../lib/pouch-db-util');
var PouchDB = require('pouchdb');
var BPromise = require('bluebird');
var expect = require('chai').expect;
var cloudant = require('../lib/dbauth/cloudant');
require('dotenv').config({
  silent: true,
  path: path.join(__dirname, '../.env')
});

var cloudantUrlWithAuth = 'https://' + process.env.CLOUDANT_USER + ':' + process.env.CLOUDANT_PASS + '@' + process.env.CLOUDANT_USER + '.cloudant.com';
var testDB;
var previous;

describe('Cloudant', function() {

  var apiKey;

  previous = BPromise.resolve();

  before(function(done) {
    pouchdbUtil.createDB(cloudantUrlWithAuth, 'temp_test').then(function () {
      testDB = new PouchDB(cloudantUrlWithAuth + '/temp_test');
      done();
    });
  });

  after(function(done) {
    this.timeout(5000);
    testDB.destroy().then(() => {
        done();
      });
  });

  it('should generate an API key', function(done) {
    this.timeout(5000);
    cloudant.getAPIKey(testDB)
      .then(function(result) {
        expect(result.ok).to.equal(true);
        expect(result.key).to.be.a('string');
        apiKey = result.key;
        done();
      });
  });

  it('should authorize keys', function(done) {
    this.timeout(10000);
    cloudant.authorizeKeys('test_user', testDB, ['abc123', 'def456'])
      .then(function() {
        return cloudant.getSecurityCloudant(testDB);
      })
      .then(function(secDoc) {
        expect(secDoc.cloudant.abc123).to.contains('user:test_user');
        expect(secDoc.cloudant.abc123).to.contains('_reader');
        done();
      });
  });

  it('should deauthorize a key', function(done) {
    this.timeout(10000);
    cloudant.deauthorizeKeys(testDB, 'abc123')
      .then(function() {
        return cloudant.getSecurityCloudant(testDB);
      })
      .then(function(secDoc) {
        expect(secDoc.cloudant.abc123).to.be.an('undefined');
        expect(secDoc.cloudant.def456[1]).to.equal('_reader');
        done();
      });
  });

});