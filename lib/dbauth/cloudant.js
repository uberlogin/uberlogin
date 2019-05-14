'use strict';
const fetch = require('node-fetch');
var BPromise = require('bluebird');
var request = require('superagent');
var util = require('./../util');
var url = require('url');
var pouchDbUtil = require('./../pouch-db-util');

// This is not needed with Cloudant
exports.storeKey = function() {
  return BPromise.resolve();
};

// This is not needed with Cloudant
exports.removeKeys = function() {
  return BPromise.resolve();
};

// This is not needed with Cloudant
exports.initSecurity = function() {
  return BPromise.resolve();
};

exports.authorizeKeys = function(user_id, db, keys, permissions, roles) {
  var keysObj = {};
  if(!permissions) {
    permissions = ['_reader', '_replicator'];
  }
  permissions = permissions.concat(roles || []);
  permissions.unshift('user:' + user_id);
  // If keys is a single value convert it to an Array
  keys = util.toArray(keys);
  // Check if keys is an array and convert it to an object
  if(keys instanceof Array) {
    keys.forEach(function(key) {
      keysObj[key] = permissions;
    });
  } else {
    keysObj = keys;
  }
  // Pull the current _security doc
  return getSecurityCloudant(db)
    .then(function(secDoc) {
      if(!secDoc._id) {
        secDoc._id = '_security';
      }
      if(!secDoc.cloudant) {
        secDoc.cloudant = {};
      }
      Object.keys(keysObj).forEach(function(key) {
        secDoc.cloudant[key] = keysObj[key];
      });
      return putSecurityCloudant(db, secDoc);
    });
};

exports.deauthorizeKeys = function(db, keys) {
  // cast keys to an Array
  keys = util.toArray(keys);
  return getSecurityCloudant(db)
    .then(function(secDoc) {
      var changes = false;
      if(!secDoc.cloudant) {
        return BPromise.resolve(false);
      }
      keys.forEach(function(key) {
        if(secDoc.cloudant[key]) {
          changes = true;
          delete secDoc.cloudant[key];
        }
      });
      if(changes) {
        return putSecurityCloudant(db, secDoc);
      } else {
        return BPromise.resolve(false);
      }
    });
};

exports.getAPIKey = function(db) {
  // Support for pouchdb 6+ getUrl removed
  // https://pouchdb.com/2016/09/05/pouchdb-6.0.0.html
  var rawUrl = pouchDbUtil.getUrl(db);
  var parsedUrl = url.parse(rawUrl);
  parsedUrl.pathname = '/_api/v2/api_keys';
  var finalUrl = url.format(parsedUrl);
  return BPromise.fromNode(function(callback) {
    request.post(finalUrl)
      // Support for pouchdb 6+ getHeaders() removed
      .set(pouchDbUtil.getHeaders(db))
      .end(callback);
  })
    .then(function(res) {
      var result = JSON.parse(res.text);
      if(result.key && result.password && result.ok === true) {
        return BPromise.resolve(result);
      } else {
        return BPromise.reject(result);
      }
    });
};

var getSecurityCloudant = function (db) {
  var finalUrl = getSecurityUrl(db);
  var headers = pouchDbUtil.getHeaders(db);
  return fetch(finalUrl, {
    method: 'GET',
    headers: headers
  })
    .then((res) => {
      if (res.status >= 400) {
        var err = new Error(`${res.status} : ${res.statusText}`);
        console.error(err);
        throw err;
      }
      return res.json();
    })
    .catch(function(err) {
      console.error(err);
      throw err;
    });
};
exports.getSecurityCloudant = getSecurityCloudant;

/**
 * @param {PouchDB} db
 * @param doc
 * @returns {OutgoingMessage|*}
 */
function putSecurityCloudant(db, doc) {
  var finalUrl = getSecurityUrl(db);
  var headers = pouchDbUtil.getHeaders(db);
  return fetch(finalUrl, {
    method: 'PUT',
    body: JSON.stringify(doc),
    headers: headers
  })
    .then((res) => {
      if (res.status >= 400) {
        var err = new Error(`${res.status} : ${res.statusText}`);
        console.error(err);
        throw err;
      }
      return res.json();
    })
    .catch(function(err) {
      console.error(err);
      throw err;
    });
}
exports.putSecurityCloudant = putSecurityCloudant;

function getSecurityUrl(db) {
  // Support for pouchdb 6+ getUrl removed
  // https://pouchdb.com/2016/09/05/pouchdb-6.0.0.html
  var rawUrl = pouchDbUtil.getUrl(db);
  var parsedUrl = url.parse(rawUrl);
  // v2 option '/_api/v2/db' +
  parsedUrl.pathname = parsedUrl.pathname + '/_security';
  return url.format(parsedUrl);
}