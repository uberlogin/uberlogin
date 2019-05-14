'use strict';
var PouchDB = require('pouchdb');
var requestLib = require('request');
var superagentLib = require('superagent');
var url = require('url');
var BPromise = require('bluebird');

/**
 * replacement for pouchdb version 6+ removed function
 * @param pouchDb
 * @returns {Object}
 */
function getHeaders (pouchDb) {
  if (pouchDb.getHeaders) {
    return pouchDb.getHeaders();
  }
  // Support for pouchdb 6+ getUrl removed
  // https://pouchdb.com/2016/09/05/pouchdb-6.0.0.html
  var rawUrl = getUrl(pouchDb);
  var parsedUrl = url.parse(rawUrl);
  if (!parsedUrl.auth) {
    console.error('Unabled to get auth from pouchdb name');
  }
  var token = new Buffer(parsedUrl.auth).toString('base64');
  return {
    'Authorization': 'Basic ' + token,
    'Content-Type': 'application/json'
  };
}
exports.getHeaders = getHeaders;

/**
 * replacement for pouchdb version 6+ removed function
 * @param pouchDb
 * @returns {String}
 */
function getUrl (pouchDb) {
  var rawUrl = pouchDb.getUrl ? pouchDb.getUrl() : pouchDb.name;
  return rawUrl;
}
exports.getUrl = getUrl;

/**
 * replacement for pouchdb version 6+ removed function
 * @param pouchDb
 * @param options
 * @returns {Object}
 */
function request (pouchDb, options) {
  var rawUrl = `${getUrl(pouchDb)}/${options.url}`;
  delete options.url;
  return requestLib(rawUrl, options);
}
exports.request = request;

/**
 * @param {String} serverNameWithAuth
 * @param {String} dbName
 * @returns {Promise}
 */
function createDB (serverNameWithAuth, dbName) {
  return BPromise.fromNode(function(callback) {
    superagentLib.put(`${serverNameWithAuth}/${dbName}`)
      .send({})
      .end(callback);
  })
    .then(function(res) {
      return BPromise.resolve(JSON.parse(res.text));
    }, function(err) {
      if(err.status === 412) {
        return BPromise.resolve(false);
      } else {
        return BPromise.reject(err.text);
      }
    });
}
exports.createDB = createDB;

/**
 * @param {String} serverNameWithAuth
 * @param {String} dbName
 * @returns {Promise}
 */
function removeDB (serverNameWithAuth, dbName) {
  var db = new PouchDB(`${serverNameWithAuth}/${dbName}`);
  return db.destroy();
}
exports.removeDB = removeDB;