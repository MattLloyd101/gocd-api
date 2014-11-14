var _ = require('lodash');
var gocdRequestor = require('./gocd/gocdRequestor');
var gocdSampleRequestor = require('./gocd/gocdSampleRequestor');

function optionsModule() {
  var options = {};

  var set = function(newOptions) {
    options = newOptions || {};
    options.url = addCredentialsToUrl(options.url);
  };

  var get = function() {
    return options || {};
  };

  var extend = function(additionalOptions) {
    options = _.extend(options || {}, additionalOptions);
  };

  var addCredentialsToUrl = function(url) {
    return addCredentialsToUrlInternal(url, options.user, options.password);
  };

  var sampleIt = function() {
    return options === {} || options.sample === true;
  };

  var getGocdRequestor = function() {
    if(sampleIt()) {
      return gocdSampleRequestor;
    } else {
      return gocdRequestor;
    }
  };

  function addCredentialsToUrlInternal(url, user, password) {
    if(sampleIt()) {
      return 'sample';
    } else if (user && password) {
      var urlNoHttp = url.indexOf('http') === 0 ? url.substr('http://'.length) : url;
      return 'http://' + user + ':' + password + '@' + urlNoHttp;
    } else {
      return url;
    }
  }

  return {
    set: set,
    get: get,
    extend: extend,
    sampleIt: sampleIt,
    addCredentialsToUrl: addCredentialsToUrl,
    getGocdRequestor: getGocdRequestor
  };
};

var options = optionsModule();
exports.get = options.get;
exports.set = options.set;
exports.extend = options.extend;
exports.sampleIt = options.sampleIt;
exports.addCredentialsToUrl = options.addCredentialsToUrl;
exports.getGocdRequestor = options.getGocdRequestor;