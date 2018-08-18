'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

require('babel-polyfill');

var _puppeteer = require('puppeteer');

var _puppeteer2 = _interopRequireDefault(_puppeteer);

var _genericPool = require('generic-pool');

var _genericPool2 = _interopRequireDefault(_genericPool);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var debug = (0, _debug2.default)('puppeteer-pool');

var initPuppeteerPool = function initPuppeteerPool() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var _ref$initUrl = _ref.initUrl,
      initUrl = _ref$initUrl === undefined ? null : _ref$initUrl,
      _ref$max = _ref.max,
      max = _ref$max === undefined ? 10 : _ref$max,
      _ref$min = _ref.min,
      min = _ref$min === undefined ? 2 : _ref$min,
      _ref$idleTimeoutMilli = _ref.idleTimeoutMillis,
      idleTimeoutMillis = _ref$idleTimeoutMilli === undefined ? 30000 : _ref$idleTimeoutMilli,
      _ref$maxUses = _ref.maxUses,
      maxUses = _ref$maxUses === undefined ? 50 : _ref$maxUses,
      _ref$testOnBorrow = _ref.testOnBorrow,
      testOnBorrow = _ref$testOnBorrow === undefined ? true : _ref$testOnBorrow,
      _ref$puppeteerArgs = _ref.puppeteerArgs,
      puppeteerArgs = _ref$puppeteerArgs === undefined ? {} : _ref$puppeteerArgs,
      _ref$validator = _ref.validator,
      validator = _ref$validator === undefined ? function () {
    return Promise.resolve(true);
  } : _ref$validator,
      otherConfig = _objectWithoutProperties(_ref, ['initUrl', 'max', 'min', 'idleTimeoutMillis', 'maxUses', 'testOnBorrow', 'puppeteerArgs', 'validator']);

  // TODO: randomly destroy old instances to avoid resource leak?
  var factory = {
    create: function create() {
      return _puppeteer2.default.launch(puppeteerArgs).then(function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(instance) {
          var open_pages, page;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  if (!initUrl) {
                    _context.next = 20;
                    break;
                  }

                  _context.next = 3;
                  return instance.pages();

                case 3:
                  open_pages = _context.sent;
                  _context.prev = 4;

                  if (!(open_pages.length !== 0)) {
                    _context.next = 9;
                    break;
                  }

                  _context.t0 = open_pages[0];
                  _context.next = 12;
                  break;

                case 9:
                  _context.next = 11;
                  return instance.newPage();

                case 11:
                  _context.t0 = _context.sent;

                case 12:
                  page = _context.t0;
                  _context.next = 15;
                  return page.goto(initUrl, { waitUntil: 'networkidle2' });

                case 15:
                  _context.next = 20;
                  break;

                case 17:
                  _context.prev = 17;
                  _context.t1 = _context['catch'](4);
                  throw _context.t1;

                case 20:

                  instance.useCount = 0;
                  return _context.abrupt('return', instance);

                case 22:
                case 'end':
                  return _context.stop();
              }
            }
          }, _callee, undefined, [[4, 17]]);
        }));

        return function (_x2) {
          return _ref2.apply(this, arguments);
        };
      }());
    },
    destroy: function destroy(instance) {
      instance.close();
    },
    validate: function validate(instance) {
      return validator(instance).then(function (valid) {
        return Promise.resolve(valid && (maxUses <= 0 || instance.useCount < maxUses));
      });
    }
  };
  var config = _extends({
    max: max,
    min: min,
    idleTimeoutMillis: idleTimeoutMillis,
    testOnBorrow: testOnBorrow
  }, otherConfig);
  var pool = _genericPool2.default.createPool(factory, config);
  var genericAcquire = pool.acquire.bind(pool);
  pool.acquire = function () {
    return genericAcquire().then(function (instance) {
      instance.useCount += 1;
      return instance;
    });
  };
  pool.use = function (fn) {
    var resource = void 0;
    return pool.acquire().then(function (r) {
      resource = r;
      return resource;
    }).then(fn).then(function (result) {
      pool.release(resource);
      return result;
    }, function (err) {
      pool.release(resource);
      throw err;
    });
  };

  return pool;
};

// To avoid breaking backwards compatibility
// https://github.com/binded/phantom-pool/issues/12
initPuppeteerPool.default = initPuppeteerPool;

exports.default = initPuppeteerPool;
module.exports = exports['default'];