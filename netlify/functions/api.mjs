import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "node_modules/postgres-array/index.js"(exports) {
    "use strict";
    exports.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "node_modules/pg-types/lib/arrayParser.js"(exports, module) {
    var array = require_postgres_array();
    module.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "node_modules/postgres-date/index.js"(exports, module) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "node_modules/xtend/mutable.js"(exports, module) {
    module.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "node_modules/postgres-interval/index.js"(exports, module) {
    "use strict";
    var extend = require_mutable();
    module.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "node_modules/postgres-bytea/index.js"(exports, module) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "node_modules/pg-types/lib/textParsers.js"(exports, module) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module.exports = {
      init
    };
  }
});

// node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "node_modules/pg-int8/index.js"(exports, module) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module.exports = readInt8;
  }
});

// node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "node_modules/pg-types/lib/binaryParsers.js"(exports, module) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module.exports = {
      init
    };
  }
});

// node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "node_modules/pg-types/lib/builtins.js"(exports, module) {
    module.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "node_modules/pg-types/index.js"(exports) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports.getTypeParser = getTypeParser;
    exports.setTypeParser = setTypeParser;
    exports.arrayParser = arrayParser;
    exports.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/pg/lib/defaults.js"(exports, module) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "node_modules/pg/lib/utils.js"(exports, module) {
    "use strict";
    var defaults = require_defaults();
    var nodeUtils = __require("util");
    var { isDate } = __require("util/types");
    var invalidDateDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Sending an invalid date to Postgres is deprecated and will throw an error in the next major version of pg. Ensure any Date object passed as a query parameter is valid.",
      "PG_INVALID_DATE"
    );
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (isNaN(val.getTime())) {
            invalidDateDeprecationNotice();
          }
          if (defaults.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config2, values, callback) {
      config2 = typeof config2 === "string" ? { text: config2 } : cloneQueryConfig(config2);
      if (values) {
        if (typeof values === "function") {
          config2.callback = values;
        } else {
          config2.values = values;
        }
      }
      if (callback) {
        config2.callback = callback;
      }
      return config2;
    }
    function cloneQueryConfig(config2) {
      if (config2 == null) {
        return config2;
      }
      return Object.defineProperties(Object.create(Object.getPrototypeOf(config2)), Object.getOwnPropertyDescriptors(config2));
    }
    var escapeIdentifier = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral = function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier,
      escapeLiteral
    };
  }
});

// node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "node_modules/pg/lib/crypto/utils.js"(exports, module) {
    var nodeCrypto = __require("crypto");
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "node_modules/pg/lib/crypto/cert-signatures.js"(exports, module) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https://github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "node_modules/pg/lib/crypto/sasl.js"(exports, module) {
    "use strict";
    var crypto2 = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto2.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto2.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto2.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto2.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto2.sha256(clientKey);
      const clientSignature = await crypto2.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto2.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto2.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "node_modules/pg/lib/type-overrides.js"(exports, module) {
    "use strict";
    var types = require_pg_types();
    function TypeOverrides(userTypes) {
      this._types = userTypes || types;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module.exports = TypeOverrides;
  }
});

// node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "node_modules/pg-connection-string/index.js"(exports, module) {
    "use strict";
    function parse(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config3 = str.split(" ");
        return { host: config3[0], database: config3[1] };
      }
      const config2 = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config2[entry[0]] = entry[1];
      }
      config2.user = config2.user || decodeURIComponent(result.username);
      config2.password = config2.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config2.host = decodeURI(result.pathname);
        config2.database = result.searchParams.get("db");
        config2.client_encoding = result.searchParams.get("encoding");
        return config2;
      }
      const hostname = (dummyHost ? "" : result.hostname).replace(/^\[(.+)\]$/, "$1");
      if (!config2.host) {
        config2.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config2.port) {
        config2.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config2.database = pathname ? decodeURI(pathname) : null;
      if (config2.ssl === "true" || config2.ssl === "1") {
        config2.ssl = true;
      }
      if (config2.ssl === "0") {
        config2.ssl = false;
      }
      if (config2.sslcert || config2.sslkey || config2.sslrootcert || config2.sslmode) {
        config2.ssl = {};
      }
      if (config2.sslnegotiation === "direct" && config2.ssl === void 0) {
        config2.ssl = true;
      }
      const fs = config2.sslcert || config2.sslkey || config2.sslrootcert ? __require("fs") : null;
      if (config2.sslcert) {
        config2.ssl.cert = fs.readFileSync(config2.sslcert).toString();
      }
      if (config2.sslkey) {
        config2.ssl.key = fs.readFileSync(config2.sslkey).toString();
      }
      if (config2.sslrootcert) {
        config2.ssl.ca = fs.readFileSync(config2.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config2.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config2.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config2.sslmode) {
          case "disable": {
            config2.ssl = false;
            break;
          }
          case "prefer": {
            config2.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config2.sslrootcert) {
              config2.ssl.checkServerIdentity = function() {
              };
            } else {
              config2.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config2.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config2.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config2.sslmode) {
          case "disable": {
            config2.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config2.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config2.sslmode);
            }
            break;
          }
          case "no-verify": {
            config2.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config2;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config2) {
      const poolConfig = Object.entries(config2).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str) {
      return toClientConfig(parse(str));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "node_modules/pg/lib/connection-parameters.js"(exports, module) {
    "use strict";
    var dns = __require("dns");
    var defaults = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config2, envVar) {
      if (config2[key]) {
        return config2[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config2, paramName) {
      const value = config2[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config2) {
        config2 = typeof config2 === "string" ? parse(config2) : config2 || {};
        if (config2.connectionString) {
          config2 = Object.assign({}, config2, parse(config2.connectionString));
        }
        this.user = val("user", config2);
        this.database = val("database", config2);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config2), 10);
        this.host = val("host", config2);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config2)
        });
        this.binary = val("binary", config2);
        this.options = val("options", config2);
        this.ssl = typeof config2.ssl === "undefined" ? readSSLConfigFromEnvironment() : config2.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config2, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config2);
        this.replication = val("replication", config2);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config2, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config2, false);
        this.statement_timeout = val("statement_timeout", config2, false);
        this.lock_timeout = val("lock_timeout", config2, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config2, false);
        this.query_timeout = val("query_timeout", config2, false);
        if (config2.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config2.connectionTimeoutMillis / 1e3);
        }
        if (config2.keepAlive === false) {
          this.keepalives = 0;
        } else if (config2.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config2.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config2.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module.exports = ConnectionParameters;
  }
});

// node_modules/pg/lib/result.js
var require_result = __commonJS({
  "node_modules/pg/lib/result.js"(exports, module) {
    "use strict";
    var types = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result = class {
      constructor(rowMode, types2) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types2;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module.exports = Result;
  }
});

// node_modules/pg/lib/query.js
var require_query = __commonJS({
  "node_modules/pg/lib/query.js"(exports, module) {
    "use strict";
    var { EventEmitter } = __require("events");
    var Result = require_result();
    var utils = require_utils();
    var Query = class extends EventEmitter {
      constructor(config2, values, callback) {
        super();
        config2 = utils.normalizeQueryConfig(config2, values, callback);
        this.text = config2.text;
        this.values = config2.values;
        this.rows = config2.rows;
        this.types = config2.types;
        this.name = config2.name;
        this.queryMode = config2.queryMode;
        this.binary = config2.binary;
        this.portal = config2.portal || "";
        this.callback = config2.callback;
        this._rowMode = config2.rowMode;
        if (process.domain && config2.callback) {
          this.callback = process.domain.bind(config2.callback);
        }
        this._result = new Result(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && (connection.parsedStatements[this.name] !== void 0 || connection.submittedNamedStatements[this.name] !== void 0);
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
          if (this.name) {
            connection.submittedNamedStatements[this.name] = this.text;
          }
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module.exports = Query;
  }
});

// node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "node_modules/pg-protocol/dist/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
    exports.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports.noData = {
      name: "noData",
      length: 5
    };
    exports.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports.DatabaseError = DatabaseError;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports.NoticeMessage = NoticeMessage;
  }
});

// node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "node_modules/pg-protocol/dist/buffer-writer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer, 0, 0, this.offset);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      /**
       * Appends an uninitialized block of {@link size} bytes to the buffer and returns its offset.
       */
      reserveUnsafe(size) {
        const offset = this.offset;
        this.ensure(size);
        this.offset += size;
        return offset;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports.Writer = Writer;
  }
});

// node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "node_modules/pg-protocol/dist/serializer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types = query2.types || emptyArray;
      const len = types.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var writeValues = function(values, valueMapper, formatsOffset) {
      const len = values.length;
      for (let i = 0; i < len; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        let formatByte = 0;
        if (mappedVal == null) {
          writer.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          formatByte = 1;
          writer.addInt32(mappedVal.length);
          writer.add(mappedVal);
        } else {
          writer.addInt32PrefixedString(mappedVal);
        }
        const buf = writer.buffer;
        buf[formatsOffset++] = 0;
        buf[formatsOffset++] = formatByte;
      }
    };
    var bind = (config2 = {}) => {
      const portal = config2.portal || "";
      const statement = config2.statement || "";
      const binary = config2.binary || false;
      const values = config2.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      const formatsOffset = writer.reserveUnsafe(len * 2);
      writer.addInt16(len);
      try {
        writeValues(values, config2.valueMapper, formatsOffset);
      } catch (err) {
        writer.clear();
        throw err;
      }
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config2) => {
      if (!config2 || !config2.portal && !config2.rows) {
        return emptyExecute;
      }
      const portal = config2.portal || "";
      const rows = config2.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports.serialize = serialize;
  }
});

// node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "node_modules/pg-protocol/dist/buffer-reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports.BufferReader = BufferReader;
  }
});

// node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "node_modules/pg-protocol/dist/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.uint32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "node_modules/pg-protocol/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.serialize = void 0;
    exports.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "node_modules/pg-cloudflare/dist/empty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {};
  }
});

// node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "node_modules/pg/lib/stream.js"(exports, module) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = __require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = __require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "node_modules/pg/lib/connection.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection = class extends EventEmitter {
      constructor(config2) {
        super();
        config2 = config2 || {};
        this.stream = config2.stream || getStream(config2.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config2);
        }
        this._keepAlive = config2.keepAlive;
        this._keepAliveInitialDelayMillis = config2.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.submittedNamedStatements = {};
        this.ssl = config2.ssl || false;
        this.sslNegotiation = config2.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream,
          // tls.connect checks the server identity against `servername`, falling
          // back to `host` and then to 'localhost'. `servername` must stay unset
          // for IP addresses (see below), so `host` is needed to keep certificate
          // validation working when connecting to an IP address.
          host
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = __require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config2) {
        this.stream.write(serialize.startup(config2));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config2) {
        this._send(serialize.bind(config2));
      }
      // send execute message
      execute(config2) {
        this._send(serialize.execute(config2));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module.exports = Connection;
  }
});

// node_modules/split2/index.js
var require_split2 = __commonJS({
  "node_modules/split2/index.js"(exports, module) {
    "use strict";
    var { Transform } = __require("stream");
    var { StringDecoder } = __require("string_decoder");
    var kLast = Symbol("last");
    var kDecoder = Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module.exports = split;
  }
});

// node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "node_modules/pgpass/lib/helper.js"(exports, module) {
    "use strict";
    var path = __require("path");
    var Stream = __require("stream").Stream;
    var split = require_split2();
    var util = __require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "node_modules/pgpass/lib/index.js"(exports, module) {
    "use strict";
    var path = __require("path");
    var fs = __require("fs");
    var helper = require_helper();
    module.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module.exports.warnTo = helper.warnTo;
  }
});

// node_modules/pg/lib/client.js
var require_client = __commonJS({
  "node_modules/pg/lib/client.js"(exports, module) {
    var EventEmitter = __require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = __require("util");
    var sasl = require_sasl();
    var TypeOverrides = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query = require_query();
    var defaults = require_defaults();
    var Connection = require_connection();
    var crypto2 = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client = class extends EventEmitter {
      constructor(config2) {
        super();
        this.connectionParameters = new ConnectionParameters(config2);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config2 || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this._sentQueryQueue = [];
        this.pipeline = Boolean(c.pipeline);
        this.binary = c.binary || defaults.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._sentQueryQueue.forEach(enqueueError);
        this._sentQueryQueue.length = 0;
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto2.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        if (activeQuery.name) {
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        } else if (client._sentQueryQueue.indexOf(query) !== -1) {
          query.callback = () => {
          };
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.pipeline) {
          this._pulsePipelinedQueryQueue();
          return;
        }
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      _pulsePipelinedQueryQueue() {
        if (!this._connected || !this._queryable) {
          return;
        }
        while (this._queryQueue.length > 0) {
          const query = this._queryQueue.shift();
          this.hasExecuted = true;
          const queryError = query.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              query.handleError(queryError, this.connection);
            });
            continue;
          }
          this._sentQueryQueue.push(query);
        }
        if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
          this._activeQuery = this._sentQueryQueue.shift();
          this.readyForQuery = false;
        }
        if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
          this.emit("drain");
        }
      }
      query(config2, values, callback) {
        let query;
        let result;
        if (config2 == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config2.submit === "function") {
          result = query = config2;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query(config2, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config2.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            } else if (this.pipeline) {
              this.connection.stream.destroy();
              return;
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (this.pipeline) {
          const portalQuery = typeof config2.submit === "function" && !(query instanceof Query) ? "Custom query classes such as pg-cursor and pg-query-stream are" : query.rows ? "The `rows` option is" : null;
          if (portalQuery) {
            process.nextTick(() => {
              query.handleError(new Error(`${portalQuery} not supported in pipeline mode`), this.connection);
            });
            return result;
          }
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0 && !this.pipeline) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (!this._queryable) {
          this.connection.stream.destroy();
        } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
          this.once("drain", () => this.connection.end());
        } else if (this._getActiveQuery()) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client.Query = Query;
    module.exports = Client;
  }
});

// node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "node_modules/pg-pool/index.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      };
    }
    var Pool = class extends EventEmitter {
      constructor(options, Client) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module.exports = Pool;
  }
});

// node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "node_modules/pg/lib/native/query.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var utils = require_utils();
    var NativeQuery = module.exports = function(config2, values, callback) {
      EventEmitter.call(this);
      config2 = utils.normalizeQueryConfig(config2, values, callback);
      this.text = config2.text;
      this.values = config2.values;
      this.name = config2.name;
      this.queryMode = config2.queryMode;
      this.callback = config2.callback;
      this.state = "new";
      this._arrayMode = config2.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      messageDetail: "detail",
      messageHint: "hint",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native && this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name] !== void 0) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "node_modules/pg/lib/native/client.js"(exports, module) {
    var nodeUtils = __require("util");
    var Native;
    try {
      Native = __require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides = require_type_overrides();
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client = module.exports = function(config2) {
      EventEmitter.call(this);
      config2 = config2 || {};
      this._Promise = config2.Promise || global.Promise;
      this._types = new TypeOverrides(config2.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      this.pipeline = Boolean(config2.pipeline);
      this._pipelineInFlight = false;
      const cp = this.connectionParameters = new ConnectionParameters(config2);
      if (config2.nativeConnectionString) cp.nativeConnectionString = config2.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client.Query = NativeQuery;
    util.inherits(Client, EventEmitter);
    Client.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client.prototype.query = function(config2, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config2 === null || config2 === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config2.submit === "function") {
        readTimeout = config2.query_timeout || this.connectionParameters.query_timeout;
        result = query = config2;
        if (typeof values === "function") {
          config2.callback = values;
        }
      } else {
        readTimeout = config2.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config2, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      const doEnd = function() {
        self.native.end(function() {
          self._connected = false;
          self._errorAllQueries(new Error("Connection terminated"));
          process.nextTick(() => {
            self.emit("end");
            if (cb) cb();
          });
        });
      };
      if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
        this.once("drain", doEnd);
      } else {
        doEnd();
      }
      return result;
    };
    Client.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this.pipeline && !initialConnection) {
        return this._pulsePipelinedQueryQueue();
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client.prototype._pulsePipelinedQueryQueue = function() {
      if (!this._connected || this._pipelineInFlight) {
        return;
      }
      if (this._queryQueue.length === 0) {
        if (this.hasExecuted) {
          this.emit("drain");
        }
        return;
      }
      this._pipelineInFlight = true;
      const self = this;
      const queries = [];
      const nativeQueries = [];
      const utils = require_utils();
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        nativeQueries.push(query);
        const values = query.values ? query.values.map(utils.prepareValue) : null;
        const pipelineEntry = { text: query.text, name: query.name, arrayMode: query._arrayMode };
        if (values) {
          pipelineEntry.values = values;
        }
        if (query.name && this.namedQueries[query.name]) {
          pipelineEntry._alreadyPrepared = true;
        }
        queries.push(pipelineEntry);
      }
      this.native.pipeline(queries, function(err, results) {
        self._pipelineInFlight = false;
        if (err) {
          self._connected = false;
          self._queryable = false;
          for (let i = 0; i < nativeQueries.length; i++) {
            const q = nativeQueries[i];
            q.native = self.native;
            q.handleError(err);
          }
          self._errorAllQueries(err);
          self.emit("error", err);
          self.emit("end");
          return;
        }
        for (let i = 0; i < nativeQueries.length; i++) {
          const q = nativeQueries[i];
          const r = results[i];
          q.native = self.native;
          if (r.err) {
            q.handleError(r.err);
          } else {
            if (q.name) {
              self.namedQueries[q.name] = q.text;
            }
            q.state = "end";
            q.emit("end", r.result);
            if (q.callback) {
              q.callback(null, r.result);
            }
          }
          setImmediate(function() {
            q.emit("_done");
          });
        }
        self._pulsePipelinedQueryQueue();
      });
    };
    Client.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client.prototype.ref = function() {
    };
    Client.prototype.unref = function() {
    };
    Client.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client.prototype.isConnected = function() {
      return this._connected;
    };
    Client.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "node_modules/pg/lib/native/index.js"(exports, module) {
    "use strict";
    module.exports = require_client2();
  }
});

// node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/pg/lib/index.js"(exports, module) {
    "use strict";
    var Client = require_client();
    var defaults = require_defaults();
    var Connection = require_connection();
    var Result = require_result();
    var utils = require_utils();
    var Pool = require_pg_pool();
    var TypeOverrides = require_type_overrides();
    var { DatabaseError } = require_dist();
    var { escapeIdentifier, escapeLiteral } = require_utils();
    var poolFactory = (Client2) => {
      return class BoundPool extends Pool {
        constructor(options) {
          super(options, Client2);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError;
      this.TypeOverrides = TypeOverrides;
      this.escapeIdentifier = escapeIdentifier;
      this.escapeLiteral = escapeLiteral;
      this.Result = Result;
      this.utils = utils;
    };
    var clientConstructor = Client;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module.exports = new PG(clientConstructor);
    Object.defineProperty(module.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// node_modules/@neondatabase/serverless/index.js
var require_serverless = __commonJS({
  "node_modules/@neondatabase/serverless/index.js"(exports, module) {
    "use strict";
    var Ro = Object.create;
    var Pe = Object.defineProperty;
    var Lo = Object.getOwnPropertyDescriptor;
    var Bo = Object.getOwnPropertyNames;
    var Fo = Object.getPrototypeOf;
    var Mo = Object.prototype.hasOwnProperty;
    var ko = (r, e, t) => e in r ? Pe(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t;
    var a = (r, e) => Pe(r, "name", { value: e, configurable: true });
    var V = (r, e, t) => () => {
      if (t) throw t[0];
      try {
        return r && (e = r(r = 0)), e;
      } catch (n) {
        throw t = [n], n;
      }
    };
    var T = (r, e) => () => {
      try {
        return e || r((e = { exports: {} }).exports, e), e.exports;
      } catch (t) {
        throw e = 0, t;
      }
    };
    var X = (r, e) => {
      for (var t in e) Pe(r, t, { get: e[t], enumerable: true });
    };
    var Nn = (r, e, t, n) => {
      if (e && typeof e == "object" || typeof e == "function") for (let i of Bo(e)) !Mo.call(r, i) && i !== t && Pe(r, i, { get: () => e[i], enumerable: !(n = Lo(e, i)) || n.enumerable });
      return r;
    };
    var xe = (r, e, t) => (t = r != null ? Ro(Fo(r)) : {}, Nn(e || !r || !r.__esModule ? Pe(t, "default", { value: r, enumerable: true }) : t, r));
    var O = (r) => Nn(Pe({}, "__esModule", { value: true }), r);
    var E = (r, e, t) => ko(r, typeof e != "symbol" ? e + "" : e, t);
    var Hn = T((ft) => {
      "use strict";
      h();
      ft.byteLength = Uo;
      ft.toByteArray = Do;
      ft.fromByteArray = Wo;
      var le = [], ee = [], Oo = typeof Uint8Array < "u" ? Uint8Array : Array, Nt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (Ce = 0, Wn = Nt.length; Ce < Wn; ++Ce) le[Ce] = Nt[Ce], ee[Nt.charCodeAt(Ce)] = Ce;
      var Ce, Wn;
      ee[45] = 62;
      ee[95] = 63;
      function jn(r) {
        var e = r.length;
        if (e % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
        var t = r.indexOf("=");
        t === -1 && (t = e);
        var n = t === e ? 0 : 4 - t % 4;
        return [t, n];
      }
      a(jn, "getLens");
      function Uo(r) {
        var e = jn(r), t = e[0], n = e[1];
        return (t + n) * 3 / 4 - n;
      }
      a(Uo, "byteLength");
      function Qo(r, e, t) {
        return (e + t) * 3 / 4 - t;
      }
      a(Qo, "_byteLength");
      function Do(r) {
        var e, t = jn(r), n = t[0], i = t[1], s = new Oo(Qo(r, n, i)), o = 0, u = i > 0 ? n - 4 : n, c;
        for (c = 0; c < u; c += 4) e = ee[r.charCodeAt(c)] << 18 | ee[r.charCodeAt(c + 1)] << 12 | ee[r.charCodeAt(c + 2)] << 6 | ee[r.charCodeAt(c + 3)], s[o++] = e >> 16 & 255, s[o++] = e >> 8 & 255, s[o++] = e & 255;
        return i === 2 && (e = ee[r.charCodeAt(
          c
        )] << 2 | ee[r.charCodeAt(c + 1)] >> 4, s[o++] = e & 255), i === 1 && (e = ee[r.charCodeAt(c)] << 10 | ee[r.charCodeAt(c + 1)] << 4 | ee[r.charCodeAt(c + 2)] >> 2, s[o++] = e >> 8 & 255, s[o++] = e & 255), s;
      }
      a(Do, "toByteArray");
      function qo(r) {
        return le[r >> 18 & 63] + le[r >> 12 & 63] + le[r >> 6 & 63] + le[r & 63];
      }
      a(qo, "tripletToBase64");
      function No(r, e, t) {
        for (var n, i = [], s = e; s < t; s += 3) n = (r[s] << 16 & 16711680) + (r[s + 1] << 8 & 65280) + (r[s + 2] & 255), i.push(qo(n));
        return i.join("");
      }
      a(No, "encodeChunk");
      function Wo(r) {
        for (var e, t = r.length, n = t % 3, i = [], s = 16383, o = 0, u = t - n; o < u; o += s) i.push(No(
          r,
          o,
          o + s > u ? u : o + s
        ));
        return n === 1 ? (e = r[t - 1], i.push(le[e >> 2] + le[e << 4 & 63] + "==")) : n === 2 && (e = (r[t - 2] << 8) + r[t - 1], i.push(le[e >> 10] + le[e >> 4 & 63] + le[e << 2 & 63] + "=")), i.join("");
      }
      a(Wo, "fromByteArray");
    });
    var $n = T((Wt) => {
      h();
      Wt.read = function(r, e, t, n, i) {
        var s, o, u = i * 8 - n - 1, c = (1 << u) - 1, l = c >> 1, f = -7, m = t ? i - 1 : 0, g = t ? -1 : 1, w = r[e + m];
        for (m += g, s = w & (1 << -f) - 1, w >>= -f, f += u; f > 0; s = s * 256 + r[e + m], m += g, f -= 8) ;
        for (o = s & (1 << -f) - 1, s >>= -f, f += n; f > 0; o = o * 256 + r[e + m], m += g, f -= 8) ;
        if (s === 0) s = 1 - l;
        else {
          if (s === c) return o ? NaN : (w ? -1 : 1) * (1 / 0);
          o = o + Math.pow(2, n), s = s - l;
        }
        return (w ? -1 : 1) * o * Math.pow(2, s - n);
      };
      Wt.write = function(r, e, t, n, i, s) {
        var o, u, c, l = s * 8 - i - 1, f = (1 << l) - 1, m = f >> 1, g = i === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, w = n ? 0 : s - 1, S = n ? 1 : -1, k = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
        for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (u = isNaN(e) ? 1 : 0, o = f) : (o = Math.floor(Math.log(e) / Math.LN2), e * (c = Math.pow(2, -o)) < 1 && (o--, c *= 2), o + m >= 1 ? e += g / c : e += g * Math.pow(2, 1 - m), e * c >= 2 && (o++, c /= 2), o + m >= f ? (u = 0, o = f) : o + m >= 1 ? (u = (e * c - 1) * Math.pow(2, i), o = o + m) : (u = e * Math.pow(2, m - 1) * Math.pow(2, i), o = 0)); i >= 8; r[t + w] = u & 255, w += S, u /= 256, i -= 8) ;
        for (o = o << i | u, l += i; l > 0; r[t + w] = o & 255, w += S, o /= 256, l -= 8) ;
        r[t + w - S] |= k * 128;
      };
    });
    var ui = T((Fe) => {
      "use strict";
      h();
      var jt = Hn(), Le = $n(), Gn = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
      Fe.Buffer = d;
      Fe.SlowBuffer = zo;
      Fe.INSPECT_MAX_BYTES = 50;
      var ht = 2147483647;
      Fe.kMaxLength = ht;
      d.TYPED_ARRAY_SUPPORT = jo();
      !d.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
      function jo() {
        try {
          let r = new Uint8Array(1), e = { foo: a(function() {
            return 42;
          }, "foo") };
          return Object.setPrototypeOf(e, Uint8Array.prototype), Object.setPrototypeOf(r, e), r.foo() === 42;
        } catch {
          return false;
        }
      }
      a(jo, "typedArraySupport");
      Object.defineProperty(d.prototype, "parent", { enumerable: true, get: a(function() {
        if (d.isBuffer(this)) return this.buffer;
      }, "get") });
      Object.defineProperty(d.prototype, "offset", { enumerable: true, get: a(function() {
        if (d.isBuffer(
          this
        )) return this.byteOffset;
      }, "get") });
      function ye(r) {
        if (r > ht) throw new RangeError('The value "' + r + '" is invalid for option "size"');
        let e = new Uint8Array(r);
        return Object.setPrototypeOf(e, d.prototype), e;
      }
      a(ye, "createBuffer");
      function d(r, e, t) {
        if (typeof r == "number") {
          if (typeof e == "string") throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          );
          return Vt(r);
        }
        return Yn(r, e, t);
      }
      a(d, "Buffer");
      d.poolSize = 8192;
      function Yn(r, e, t) {
        if (typeof r == "string") return $o(r, e);
        if (ArrayBuffer.isView(r)) return Go(r);
        if (r == null) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
        if (fe(r, ArrayBuffer) || r && fe(r.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (fe(r, SharedArrayBuffer) || r && fe(
          r.buffer,
          SharedArrayBuffer
        ))) return $t(r, e, t);
        if (typeof r == "number") throw new TypeError('The "value" argument must not be of type number. Received type number');
        let n = r.valueOf && r.valueOf();
        if (n != null && n !== r) return d.from(n, e, t);
        let i = Vo(r);
        if (i) return i;
        if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof r[Symbol.toPrimitive] == "function") return d.from(r[Symbol.toPrimitive]("string"), e, t);
        throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
      }
      a(Yn, "from");
      d.from = function(r, e, t) {
        return Yn(r, e, t);
      };
      Object.setPrototypeOf(
        d.prototype,
        Uint8Array.prototype
      );
      Object.setPrototypeOf(d, Uint8Array);
      function Zn(r) {
        if (typeof r != "number") throw new TypeError(
          '"size" argument must be of type number'
        );
        if (r < 0) throw new RangeError('The value "' + r + '" is invalid for option "size"');
      }
      a(Zn, "assertSize");
      function Ho(r, e, t) {
        return Zn(r), r <= 0 ? ye(r) : e !== void 0 ? typeof t == "string" ? ye(r).fill(e, t) : ye(r).fill(e) : ye(r);
      }
      a(Ho, "alloc");
      d.alloc = function(r, e, t) {
        return Ho(r, e, t);
      };
      function Vt(r) {
        return Zn(r), ye(r < 0 ? 0 : zt(r) | 0);
      }
      a(Vt, "allocUnsafe");
      d.allocUnsafe = function(r) {
        return Vt(
          r
        );
      };
      d.allocUnsafeSlow = function(r) {
        return Vt(r);
      };
      function $o(r, e) {
        if ((typeof e != "string" || e === "") && (e = "utf8"), !d.isEncoding(e)) throw new TypeError("Unknown encoding: " + e);
        let t = Jn(r, e) | 0, n = ye(t), i = n.write(
          r,
          e
        );
        return i !== t && (n = n.slice(0, i)), n;
      }
      a($o, "fromString");
      function Ht(r) {
        let e = r.length < 0 ? 0 : zt(r.length) | 0, t = ye(e);
        for (let n = 0; n < e; n += 1) t[n] = r[n] & 255;
        return t;
      }
      a(Ht, "fromArrayLike");
      function Go(r) {
        if (fe(r, Uint8Array)) {
          let e = new Uint8Array(r);
          return $t(e.buffer, e.byteOffset, e.byteLength);
        }
        return Ht(r);
      }
      a(Go, "fromArrayView");
      function $t(r, e, t) {
        if (e < 0 || r.byteLength < e) throw new RangeError('"offset" is outside of buffer bounds');
        if (r.byteLength < e + (t || 0)) throw new RangeError('"length" is outside of buffer bounds');
        let n;
        return e === void 0 && t === void 0 ? n = new Uint8Array(r) : t === void 0 ? n = new Uint8Array(r, e) : n = new Uint8Array(
          r,
          e,
          t
        ), Object.setPrototypeOf(n, d.prototype), n;
      }
      a($t, "fromArrayBuffer");
      function Vo(r) {
        if (d.isBuffer(r)) {
          let e = zt(r.length) | 0, t = ye(e);
          return t.length === 0 || r.copy(t, 0, 0, e), t;
        }
        if (r.length !== void 0) return typeof r.length != "number" || Yt(r.length) ? ye(0) : Ht(r);
        if (r.type === "Buffer" && Array.isArray(r.data)) return Ht(r.data);
      }
      a(Vo, "fromObject");
      function zt(r) {
        if (r >= ht) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + ht.toString(16) + " bytes");
        return r | 0;
      }
      a(zt, "checked");
      function zo(r) {
        return +r != r && (r = 0), d.alloc(+r);
      }
      a(zo, "SlowBuffer");
      d.isBuffer = a(function(e) {
        return e != null && e._isBuffer === true && e !== d.prototype;
      }, "isBuffer");
      d.compare = a(function(e, t) {
        if (fe(e, Uint8Array) && (e = d.from(e, e.offset, e.byteLength)), fe(t, Uint8Array) && (t = d.from(t, t.offset, t.byteLength)), !d.isBuffer(e) || !d.isBuffer(t)) throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
        if (e === t) return 0;
        let n = e.length, i = t.length;
        for (let s = 0, o = Math.min(n, i); s < o; ++s) if (e[s] !== t[s]) {
          n = e[s], i = t[s];
          break;
        }
        return n < i ? -1 : i < n ? 1 : 0;
      }, "compare");
      d.isEncoding = a(function(e) {
        switch (String(e).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      }, "isEncoding");
      d.concat = a(function(e, t) {
        if (!Array.isArray(e)) throw new TypeError(
          '"list" argument must be an Array of Buffers'
        );
        if (e.length === 0) return d.alloc(0);
        let n;
        if (t === void 0)
          for (t = 0, n = 0; n < e.length; ++n) t += e[n].length;
        let i = d.allocUnsafe(t), s = 0;
        for (n = 0; n < e.length; ++n) {
          let o = e[n];
          if (fe(o, Uint8Array)) s + o.length > i.length ? (d.isBuffer(o) || (o = d.from(o)), o.copy(i, s)) : Uint8Array.prototype.set.call(i, o, s);
          else if (d.isBuffer(o)) o.copy(i, s);
          else throw new TypeError('"list" argument must be an Array of Buffers');
          s += o.length;
        }
        return i;
      }, "concat");
      function Jn(r, e) {
        if (d.isBuffer(r)) return r.length;
        if (ArrayBuffer.isView(r) || fe(r, ArrayBuffer)) return r.byteLength;
        if (typeof r != "string") throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof r
        );
        let t = r.length, n = arguments.length > 2 && arguments[2] === true;
        if (!n && t === 0) return 0;
        let i = false;
        for (; ; ) switch (e) {
          case "ascii":
          case "latin1":
          case "binary":
            return t;
          case "utf8":
          case "utf-8":
            return Gt(r).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return t * 2;
          case "hex":
            return t >>> 1;
          case "base64":
            return ai(r).length;
          default:
            if (i) return n ? -1 : Gt(r).length;
            e = ("" + e).toLowerCase(), i = true;
        }
      }
      a(Jn, "byteLength");
      d.byteLength = Jn;
      function Ko(r, e, t) {
        let n = false;
        if ((e === void 0 || e < 0) && (e = 0), e > this.length || ((t === void 0 || t > this.length) && (t = this.length), t <= 0) || (t >>>= 0, e >>>= 0, t <= e)) return "";
        for (r || (r = "utf8"); ; ) switch (r) {
          case "hex":
            return sa(this, e, t);
          case "utf8":
          case "utf-8":
            return ei(this, e, t);
          case "ascii":
            return na(this, e, t);
          case "latin1":
          case "binary":
            return ia(
              this,
              e,
              t
            );
          case "base64":
            return ta(this, e, t);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return oa(
              this,
              e,
              t
            );
          default:
            if (n) throw new TypeError("Unknown encoding: " + r);
            r = (r + "").toLowerCase(), n = true;
        }
      }
      a(
        Ko,
        "slowToString"
      );
      d.prototype._isBuffer = true;
      function _e(r, e, t) {
        let n = r[e];
        r[e] = r[t], r[t] = n;
      }
      a(_e, "swap");
      d.prototype.swap16 = a(function() {
        let e = this.length;
        if (e % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
        for (let t = 0; t < e; t += 2) _e(this, t, t + 1);
        return this;
      }, "swap16");
      d.prototype.swap32 = a(function() {
        let e = this.length;
        if (e % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
        for (let t = 0; t < e; t += 4) _e(this, t, t + 3), _e(this, t + 1, t + 2);
        return this;
      }, "swap32");
      d.prototype.swap64 = a(
        function() {
          let e = this.length;
          if (e % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
          for (let t = 0; t < e; t += 8) _e(this, t, t + 7), _e(this, t + 1, t + 6), _e(this, t + 2, t + 5), _e(this, t + 3, t + 4);
          return this;
        },
        "swap64"
      );
      d.prototype.toString = a(function() {
        let e = this.length;
        return e === 0 ? "" : arguments.length === 0 ? ei(
          this,
          0,
          e
        ) : Ko.apply(this, arguments);
      }, "toString");
      d.prototype.toLocaleString = d.prototype.toString;
      d.prototype.equals = a(function(e) {
        if (!d.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
        return this === e ? true : d.compare(this, e) === 0;
      }, "equals");
      d.prototype.inspect = a(function() {
        let e = "", t = Fe.INSPECT_MAX_BYTES;
        return e = this.toString("hex", 0, t).replace(/(.{2})/g, "$1 ").trim(), this.length > t && (e += " ... "), "<Buffer " + e + ">";
      }, "inspect");
      Gn && (d.prototype[Gn] = d.prototype.inspect);
      d.prototype.compare = a(function(e, t, n, i, s) {
        if (fe(e, Uint8Array) && (e = d.from(e, e.offset, e.byteLength)), !d.isBuffer(e)) throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof e);
        if (t === void 0 && (t = 0), n === void 0 && (n = e ? e.length : 0), i === void 0 && (i = 0), s === void 0 && (s = this.length), t < 0 || n > e.length || i < 0 || s > this.length) throw new RangeError("out of range index");
        if (i >= s && t >= n) return 0;
        if (i >= s) return -1;
        if (t >= n) return 1;
        if (t >>>= 0, n >>>= 0, i >>>= 0, s >>>= 0, this === e) return 0;
        let o = s - i, u = n - t, c = Math.min(o, u), l = this.slice(
          i,
          s
        ), f = e.slice(t, n);
        for (let m = 0; m < c; ++m) if (l[m] !== f[m]) {
          o = l[m], u = f[m];
          break;
        }
        return o < u ? -1 : u < o ? 1 : 0;
      }, "compare");
      function Xn(r, e, t, n, i) {
        if (r.length === 0) return -1;
        if (typeof t == "string" ? (n = t, t = 0) : t > 2147483647 ? t = 2147483647 : t < -2147483648 && (t = -2147483648), t = +t, Yt(t) && (t = i ? 0 : r.length - 1), t < 0 && (t = r.length + t), t >= r.length) {
          if (i) return -1;
          t = r.length - 1;
        } else if (t < 0) if (i) t = 0;
        else return -1;
        if (typeof e == "string" && (e = d.from(
          e,
          n
        )), d.isBuffer(e)) return e.length === 0 ? -1 : Vn(r, e, t, n, i);
        if (typeof e == "number") return e = e & 255, typeof Uint8Array.prototype.indexOf == "function" ? i ? Uint8Array.prototype.indexOf.call(r, e, t) : Uint8Array.prototype.lastIndexOf.call(r, e, t) : Vn(r, [e], t, n, i);
        throw new TypeError("val must be string, number or Buffer");
      }
      a(Xn, "bidirectionalIndexOf");
      function Vn(r, e, t, n, i) {
        let s = 1, o = r.length, u = e.length;
        if (n !== void 0 && (n = String(n).toLowerCase(), n === "ucs2" || n === "ucs-2" || n === "utf16le" || n === "utf-16le")) {
          if (r.length < 2 || e.length < 2) return -1;
          s = 2, o /= 2, u /= 2, t /= 2;
        }
        function c(f, m) {
          return s === 1 ? f[m] : f.readUInt16BE(m * s);
        }
        a(c, "read");
        let l;
        if (i) {
          let f = -1;
          for (l = t; l < o; l++) if (c(r, l) === c(e, f === -1 ? 0 : l - f)) {
            if (f === -1 && (f = l), l - f + 1 === u) return f * s;
          } else f !== -1 && (l -= l - f), f = -1;
        } else for (t + u > o && (t = o - u), l = t; l >= 0; l--) {
          let f = true;
          for (let m = 0; m < u; m++) if (c(r, l + m) !== c(e, m)) {
            f = false;
            break;
          }
          if (f) return l;
        }
        return -1;
      }
      a(Vn, "arrayIndexOf");
      d.prototype.includes = a(function(e, t, n) {
        return this.indexOf(
          e,
          t,
          n
        ) !== -1;
      }, "includes");
      d.prototype.indexOf = a(function(e, t, n) {
        return Xn(this, e, t, n, true);
      }, "indexOf");
      d.prototype.lastIndexOf = a(function(e, t, n) {
        return Xn(this, e, t, n, false);
      }, "lastIndexOf");
      function Yo(r, e, t, n) {
        t = Number(t) || 0;
        let i = r.length - t;
        n ? (n = Number(n), n > i && (n = i)) : n = i;
        let s = e.length;
        n > s / 2 && (n = s / 2);
        let o;
        for (o = 0; o < n; ++o) {
          let u = parseInt(e.substr(o * 2, 2), 16);
          if (Yt(u)) return o;
          r[t + o] = u;
        }
        return o;
      }
      a(Yo, "hexWrite");
      function Zo(r, e, t, n) {
        return dt(Gt(e, r.length - t), r, t, n);
      }
      a(Zo, "utf8Write");
      function Jo(r, e, t, n) {
        return dt(la(e), r, t, n);
      }
      a(
        Jo,
        "asciiWrite"
      );
      function Xo(r, e, t, n) {
        return dt(ai(e), r, t, n);
      }
      a(Xo, "base64Write");
      function ea(r, e, t, n) {
        return dt(
          fa(e, r.length - t),
          r,
          t,
          n
        );
      }
      a(ea, "ucs2Write");
      d.prototype.write = a(function(e, t, n, i) {
        if (t === void 0) i = "utf8", n = this.length, t = 0;
        else if (n === void 0 && typeof t == "string") i = t, n = this.length, t = 0;
        else if (isFinite(t))
          t = t >>> 0, isFinite(n) ? (n = n >>> 0, i === void 0 && (i = "utf8")) : (i = n, n = void 0);
        else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
        let s = this.length - t;
        if ((n === void 0 || n > s) && (n = s), e.length > 0 && (n < 0 || t < 0) || t > this.length) throw new RangeError("Attempt to write outside buffer bounds");
        i || (i = "utf8");
        let o = false;
        for (; ; ) switch (i) {
          case "hex":
            return Yo(this, e, t, n);
          case "utf8":
          case "utf-8":
            return Zo(this, e, t, n);
          case "ascii":
          case "latin1":
          case "binary":
            return Jo(this, e, t, n);
          case "base64":
            return Xo(this, e, t, n);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return ea(this, e, t, n);
          default:
            if (o) throw new TypeError("Unknown encoding: " + i);
            i = ("" + i).toLowerCase(), o = true;
        }
      }, "write");
      d.prototype.toJSON = a(function() {
        return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
      }, "toJSON");
      function ta(r, e, t) {
        return e === 0 && t === r.length ? jt.fromByteArray(r) : jt.fromByteArray(r.slice(e, t));
      }
      a(ta, "base64Slice");
      function ei(r, e, t) {
        t = Math.min(r.length, t);
        let n = [], i = e;
        for (; i < t; ) {
          let s = r[i], o = null, u = s > 239 ? 4 : s > 223 ? 3 : s > 191 ? 2 : 1;
          if (i + u <= t) {
            let c, l, f, m;
            switch (u) {
              case 1:
                s < 128 && (o = s);
                break;
              case 2:
                c = r[i + 1], (c & 192) === 128 && (m = (s & 31) << 6 | c & 63, m > 127 && (o = m));
                break;
              case 3:
                c = r[i + 1], l = r[i + 2], (c & 192) === 128 && (l & 192) === 128 && (m = (s & 15) << 12 | (c & 63) << 6 | l & 63, m > 2047 && (m < 55296 || m > 57343) && (o = m));
                break;
              case 4:
                c = r[i + 1], l = r[i + 2], f = r[i + 3], (c & 192) === 128 && (l & 192) === 128 && (f & 192) === 128 && (m = (s & 15) << 18 | (c & 63) << 12 | (l & 63) << 6 | f & 63, m > 65535 && m < 1114112 && (o = m));
            }
          }
          o === null ? (o = 65533, u = 1) : o > 65535 && (o -= 65536, n.push(o >>> 10 & 1023 | 55296), o = 56320 | o & 1023), n.push(o), i += u;
        }
        return ra(n);
      }
      a(ei, "utf8Slice");
      var zn = 4096;
      function ra(r) {
        let e = r.length;
        if (e <= zn) return String.fromCharCode.apply(String, r);
        let t = "", n = 0;
        for (; n < e; ) t += String.fromCharCode.apply(String, r.slice(n, n += zn));
        return t;
      }
      a(ra, "decodeCodePointsArray");
      function na(r, e, t) {
        let n = "";
        t = Math.min(r.length, t);
        for (let i = e; i < t; ++i) n += String.fromCharCode(r[i] & 127);
        return n;
      }
      a(na, "asciiSlice");
      function ia(r, e, t) {
        let n = "";
        t = Math.min(r.length, t);
        for (let i = e; i < t; ++i) n += String.fromCharCode(r[i]);
        return n;
      }
      a(ia, "latin1Slice");
      function sa(r, e, t) {
        let n = r.length;
        (!e || e < 0) && (e = 0), (!t || t < 0 || t > n) && (t = n);
        let i = "";
        for (let s = e; s < t; ++s) i += ha[r[s]];
        return i;
      }
      a(sa, "hexSlice");
      function oa(r, e, t) {
        let n = r.slice(e, t), i = "";
        for (let s = 0; s < n.length - 1; s += 2) i += String.fromCharCode(n[s] + n[s + 1] * 256);
        return i;
      }
      a(oa, "utf16leSlice");
      d.prototype.slice = a(function(e, t) {
        let n = this.length;
        e = ~~e, t = t === void 0 ? n : ~~t, e < 0 ? (e += n, e < 0 && (e = 0)) : e > n && (e = n), t < 0 ? (t += n, t < 0 && (t = 0)) : t > n && (t = n), t < e && (t = e);
        let i = this.subarray(e, t);
        return Object.setPrototypeOf(i, d.prototype), i;
      }, "slice");
      function U(r, e, t) {
        if (r % 1 !== 0 || r < 0) throw new RangeError("offset is not uint");
        if (r + e > t) throw new RangeError("Trying to access beyond buffer length");
      }
      a(U, "checkOffset");
      d.prototype.readUintLE = d.prototype.readUIntLE = a(
        function(e, t, n) {
          e = e >>> 0, t = t >>> 0, n || U(e, t, this.length);
          let i = this[e], s = 1, o = 0;
          for (; ++o < t && (s *= 256); ) i += this[e + o] * s;
          return i;
        },
        "readUIntLE"
      );
      d.prototype.readUintBE = d.prototype.readUIntBE = a(function(e, t, n) {
        e = e >>> 0, t = t >>> 0, n || U(
          e,
          t,
          this.length
        );
        let i = this[e + --t], s = 1;
        for (; t > 0 && (s *= 256); ) i += this[e + --t] * s;
        return i;
      }, "readUIntBE");
      d.prototype.readUint8 = d.prototype.readUInt8 = a(
        function(e, t) {
          return e = e >>> 0, t || U(e, 1, this.length), this[e];
        },
        "readUInt8"
      );
      d.prototype.readUint16LE = d.prototype.readUInt16LE = a(function(e, t) {
        return e = e >>> 0, t || U(
          e,
          2,
          this.length
        ), this[e] | this[e + 1] << 8;
      }, "readUInt16LE");
      d.prototype.readUint16BE = d.prototype.readUInt16BE = a(function(e, t) {
        return e = e >>> 0, t || U(e, 2, this.length), this[e] << 8 | this[e + 1];
      }, "readUInt16BE");
      d.prototype.readUint32LE = d.prototype.readUInt32LE = a(function(e, t) {
        return e = e >>> 0, t || U(e, 4, this.length), (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + this[e + 3] * 16777216;
      }, "readUInt32LE");
      d.prototype.readUint32BE = d.prototype.readUInt32BE = a(function(e, t) {
        return e = e >>> 0, t || U(e, 4, this.length), this[e] * 16777216 + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]);
      }, "readUInt32BE");
      d.prototype.readBigUInt64LE = ve(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && Ge(e, this.length - 8);
        let i = t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24, s = this[++e] + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + n * 2 ** 24;
        return BigInt(i) + (BigInt(s) << BigInt(32));
      }, "readBigUInt64LE"));
      d.prototype.readBigUInt64BE = ve(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && Ge(e, this.length - 8);
        let i = t * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e], s = this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n;
        return (BigInt(i) << BigInt(
          32
        )) + BigInt(s);
      }, "readBigUInt64BE"));
      d.prototype.readIntLE = a(function(e, t, n) {
        e = e >>> 0, t = t >>> 0, n || U(
          e,
          t,
          this.length
        );
        let i = this[e], s = 1, o = 0;
        for (; ++o < t && (s *= 256); ) i += this[e + o] * s;
        return s *= 128, i >= s && (i -= Math.pow(2, 8 * t)), i;
      }, "readIntLE");
      d.prototype.readIntBE = a(function(e, t, n) {
        e = e >>> 0, t = t >>> 0, n || U(e, t, this.length);
        let i = t, s = 1, o = this[e + --i];
        for (; i > 0 && (s *= 256); ) o += this[e + --i] * s;
        return s *= 128, o >= s && (o -= Math.pow(2, 8 * t)), o;
      }, "readIntBE");
      d.prototype.readInt8 = a(function(e, t) {
        return e = e >>> 0, t || U(e, 1, this.length), this[e] & 128 ? (255 - this[e] + 1) * -1 : this[e];
      }, "readInt8");
      d.prototype.readInt16LE = a(function(e, t) {
        e = e >>> 0, t || U(
          e,
          2,
          this.length
        );
        let n = this[e] | this[e + 1] << 8;
        return n & 32768 ? n | 4294901760 : n;
      }, "readInt16LE");
      d.prototype.readInt16BE = a(function(e, t) {
        e = e >>> 0, t || U(e, 2, this.length);
        let n = this[e + 1] | this[e] << 8;
        return n & 32768 ? n | 4294901760 : n;
      }, "readInt16BE");
      d.prototype.readInt32LE = a(function(e, t) {
        return e = e >>> 0, t || U(e, 4, this.length), this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24;
      }, "readInt32LE");
      d.prototype.readInt32BE = a(function(e, t) {
        return e = e >>> 0, t || U(e, 4, this.length), this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3];
      }, "readInt32BE");
      d.prototype.readBigInt64LE = ve(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && Ge(e, this.length - 8);
        let i = this[e + 4] + this[e + 5] * 2 ** 8 + this[e + 6] * 2 ** 16 + (n << 24);
        return (BigInt(i) << BigInt(
          32
        )) + BigInt(t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24);
      }, "readBigInt64LE"));
      d.prototype.readBigInt64BE = ve(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && Ge(e, this.length - 8);
        let i = (t << 24) + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e];
        return (BigInt(i) << BigInt(32)) + BigInt(
          this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n
        );
      }, "readBigInt64BE"));
      d.prototype.readFloatLE = a(function(e, t) {
        return e = e >>> 0, t || U(e, 4, this.length), Le.read(this, e, true, 23, 4);
      }, "readFloatLE");
      d.prototype.readFloatBE = a(function(e, t) {
        return e = e >>> 0, t || U(e, 4, this.length), Le.read(this, e, false, 23, 4);
      }, "readFloatBE");
      d.prototype.readDoubleLE = a(function(e, t) {
        return e = e >>> 0, t || U(e, 8, this.length), Le.read(this, e, true, 52, 8);
      }, "readDoubleLE");
      d.prototype.readDoubleBE = a(function(e, t) {
        return e = e >>> 0, t || U(e, 8, this.length), Le.read(
          this,
          e,
          false,
          52,
          8
        );
      }, "readDoubleBE");
      function z(r, e, t, n, i, s) {
        if (!d.isBuffer(r)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (e > i || e < s) throw new RangeError('"value" argument is out of bounds');
        if (t + n > r.length) throw new RangeError("Index out of range");
      }
      a(z, "checkInt");
      d.prototype.writeUintLE = d.prototype.writeUIntLE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
          let u = Math.pow(2, 8 * n) - 1;
          z(
            this,
            e,
            t,
            n,
            u,
            0
          );
        }
        let s = 1, o = 0;
        for (this[t] = e & 255; ++o < n && (s *= 256); ) this[t + o] = e / s & 255;
        return t + n;
      }, "writeUIntLE");
      d.prototype.writeUintBE = d.prototype.writeUIntBE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
          let u = Math.pow(2, 8 * n) - 1;
          z(this, e, t, n, u, 0);
        }
        let s = n - 1, o = 1;
        for (this[t + s] = e & 255; --s >= 0 && (o *= 256); ) this[t + s] = e / o & 255;
        return t + n;
      }, "writeUIntBE");
      d.prototype.writeUint8 = d.prototype.writeUInt8 = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(this, e, t, 1, 255, 0), this[t] = e & 255, t + 1;
      }, "writeUInt8");
      d.prototype.writeUint16LE = d.prototype.writeUInt16LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(this, e, t, 2, 65535, 0), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
      }, "writeUInt16LE");
      d.prototype.writeUint16BE = d.prototype.writeUInt16BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(this, e, t, 2, 65535, 0), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
      }, "writeUInt16BE");
      d.prototype.writeUint32LE = d.prototype.writeUInt32LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(
          this,
          e,
          t,
          4,
          4294967295,
          0
        ), this[t + 3] = e >>> 24, this[t + 2] = e >>> 16, this[t + 1] = e >>> 8, this[t] = e & 255, t + 4;
      }, "writeUInt32LE");
      d.prototype.writeUint32BE = d.prototype.writeUInt32BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(
          this,
          e,
          t,
          4,
          4294967295,
          0
        ), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
      }, "writeUInt32BE");
      function ti(r, e, t, n, i) {
        oi(e, n, i, r, t, 7);
        let s = Number(e & BigInt(4294967295));
        r[t++] = s, s = s >> 8, r[t++] = s, s = s >> 8, r[t++] = s, s = s >> 8, r[t++] = s;
        let o = Number(e >> BigInt(32) & BigInt(4294967295));
        return r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, t;
      }
      a(ti, "wrtBigUInt64LE");
      function ri(r, e, t, n, i) {
        oi(e, n, i, r, t, 7);
        let s = Number(e & BigInt(4294967295));
        r[t + 7] = s, s = s >> 8, r[t + 6] = s, s = s >> 8, r[t + 5] = s, s = s >> 8, r[t + 4] = s;
        let o = Number(e >> BigInt(32) & BigInt(4294967295));
        return r[t + 3] = o, o = o >> 8, r[t + 2] = o, o = o >> 8, r[t + 1] = o, o = o >> 8, r[t] = o, t + 8;
      }
      a(ri, "wrtBigUInt64BE");
      d.prototype.writeBigUInt64LE = ve(a(function(e, t = 0) {
        return ti(this, e, t, BigInt(0), BigInt("0xffffffffffffffff"));
      }, "writeBigUInt64LE"));
      d.prototype.writeBigUInt64BE = ve(a(function(e, t = 0) {
        return ri(this, e, t, BigInt(0), BigInt(
          "0xffffffffffffffff"
        ));
      }, "writeBigUInt64BE"));
      d.prototype.writeIntLE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, !i) {
          let c = Math.pow(2, 8 * n - 1);
          z(this, e, t, n, c - 1, -c);
        }
        let s = 0, o = 1, u = 0;
        for (this[t] = e & 255; ++s < n && (o *= 256); )
          e < 0 && u === 0 && this[t + s - 1] !== 0 && (u = 1), this[t + s] = (e / o >> 0) - u & 255;
        return t + n;
      }, "writeIntLE");
      d.prototype.writeIntBE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, !i) {
          let c = Math.pow(2, 8 * n - 1);
          z(this, e, t, n, c - 1, -c);
        }
        let s = n - 1, o = 1, u = 0;
        for (this[t + s] = e & 255; --s >= 0 && (o *= 256); ) e < 0 && u === 0 && this[t + s + 1] !== 0 && (u = 1), this[t + s] = (e / o >> 0) - u & 255;
        return t + n;
      }, "writeIntBE");
      d.prototype.writeInt8 = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(this, e, t, 1, 127, -128), e < 0 && (e = 255 + e + 1), this[t] = e & 255, t + 1;
      }, "writeInt8");
      d.prototype.writeInt16LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(this, e, t, 2, 32767, -32768), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
      }, "writeInt16LE");
      d.prototype.writeInt16BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(this, e, t, 2, 32767, -32768), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
      }, "writeInt16BE");
      d.prototype.writeInt32LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(
          this,
          e,
          t,
          4,
          2147483647,
          -2147483648
        ), this[t] = e & 255, this[t + 1] = e >>> 8, this[t + 2] = e >>> 16, this[t + 3] = e >>> 24, t + 4;
      }, "writeInt32LE");
      d.prototype.writeInt32BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || z(
          this,
          e,
          t,
          4,
          2147483647,
          -2147483648
        ), e < 0 && (e = 4294967295 + e + 1), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
      }, "writeInt32BE");
      d.prototype.writeBigInt64LE = ve(a(function(e, t = 0) {
        return ti(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      }, "writeBigInt64LE"));
      d.prototype.writeBigInt64BE = ve(
        a(function(e, t = 0) {
          return ri(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
        }, "writeBigInt64BE")
      );
      function ni(r, e, t, n, i, s) {
        if (t + n > r.length) throw new RangeError("Index out of range");
        if (t < 0) throw new RangeError("Index out of range");
      }
      a(ni, "checkIEEE754");
      function ii(r, e, t, n, i) {
        return e = +e, t = t >>> 0, i || ni(r, e, t, 4, 34028234663852886e22, -34028234663852886e22), Le.write(r, e, t, n, 23, 4), t + 4;
      }
      a(
        ii,
        "writeFloat"
      );
      d.prototype.writeFloatLE = a(function(e, t, n) {
        return ii(this, e, t, true, n);
      }, "writeFloatLE");
      d.prototype.writeFloatBE = a(function(e, t, n) {
        return ii(this, e, t, false, n);
      }, "writeFloatBE");
      function si(r, e, t, n, i) {
        return e = +e, t = t >>> 0, i || ni(r, e, t, 8, 17976931348623157e292, -17976931348623157e292), Le.write(
          r,
          e,
          t,
          n,
          52,
          8
        ), t + 8;
      }
      a(si, "writeDouble");
      d.prototype.writeDoubleLE = a(function(e, t, n) {
        return si(this, e, t, true, n);
      }, "writeDoubleLE");
      d.prototype.writeDoubleBE = a(function(e, t, n) {
        return si(this, e, t, false, n);
      }, "writeDoubleBE");
      d.prototype.copy = a(function(e, t, n, i) {
        if (!d.isBuffer(e)) throw new TypeError("argument should be a Buffer");
        if (n || (n = 0), !i && i !== 0 && (i = this.length), t >= e.length && (t = e.length), t || (t = 0), i > 0 && i < n && (i = n), i === n || e.length === 0 || this.length === 0) return 0;
        if (t < 0) throw new RangeError("targetStart out of bounds");
        if (n < 0 || n >= this.length) throw new RangeError("Index out of range");
        if (i < 0) throw new RangeError("sourceEnd out of bounds");
        i > this.length && (i = this.length), e.length - t < i - n && (i = e.length - t + n);
        let s = i - n;
        return this === e && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(t, n, i) : Uint8Array.prototype.set.call(e, this.subarray(n, i), t), s;
      }, "copy");
      d.prototype.fill = a(function(e, t, n, i) {
        if (typeof e == "string") {
          if (typeof t == "string" ? (i = t, t = 0, n = this.length) : typeof n == "string" && (i = n, n = this.length), i !== void 0 && typeof i != "string") throw new TypeError("encoding must be a string");
          if (typeof i == "string" && !d.isEncoding(i)) throw new TypeError(
            "Unknown encoding: " + i
          );
          if (e.length === 1) {
            let o = e.charCodeAt(0);
            (i === "utf8" && o < 128 || i === "latin1") && (e = o);
          }
        } else typeof e == "number" ? e = e & 255 : typeof e == "boolean" && (e = Number(e));
        if (t < 0 || this.length < t || this.length < n) throw new RangeError("Out of range index");
        if (n <= t) return this;
        t = t >>> 0, n = n === void 0 ? this.length : n >>> 0, e || (e = 0);
        let s;
        if (typeof e == "number") for (s = t; s < n; ++s) this[s] = e;
        else {
          let o = d.isBuffer(e) ? e : d.from(
            e,
            i
          ), u = o.length;
          if (u === 0) throw new TypeError('The value "' + e + '" is invalid for argument "value"');
          for (s = 0; s < n - t; ++s) this[s + t] = o[s % u];
        }
        return this;
      }, "fill");
      var Re = {};
      function Kt(r, e, t) {
        var n;
        Re[r] = (n = class extends t {
          constructor() {
            super(), Object.defineProperty(this, "message", { value: e.apply(this, arguments), writable: true, configurable: true }), this.name = `${this.name} [${r}]`, this.stack, delete this.name;
          }
          get code() {
            return r;
          }
          set code(s) {
            Object.defineProperty(
              this,
              "code",
              { configurable: true, enumerable: true, value: s, writable: true }
            );
          }
          toString() {
            return `${this.name} [${r}]: ${this.message}`;
          }
        }, a(n, "NodeError"), n);
      }
      a(Kt, "E");
      Kt("ERR_BUFFER_OUT_OF_BOUNDS", function(r) {
        return r ? `${r} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
      }, RangeError);
      Kt(
        "ERR_INVALID_ARG_TYPE",
        function(r, e) {
          return `The "${r}" argument must be of type number. Received type ${typeof e}`;
        },
        TypeError
      );
      Kt("ERR_OUT_OF_RANGE", function(r, e, t) {
        let n = `The value of "${r}" is out of range.`, i = t;
        return Number.isInteger(t) && Math.abs(t) > 2 ** 32 ? i = Kn(String(t)) : typeof t == "bigint" && (i = String(
          t
        ), (t > BigInt(2) ** BigInt(32) || t < -(BigInt(2) ** BigInt(32))) && (i = Kn(i)), i += "n"), n += ` It must be ${e}. Received ${i}`, n;
      }, RangeError);
      function Kn(r) {
        let e = "", t = r.length, n = r[0] === "-" ? 1 : 0;
        for (; t >= n + 4; t -= 3) e = `_${r.slice(t - 3, t)}${e}`;
        return `${r.slice(0, t)}${e}`;
      }
      a(Kn, "addNumericalSeparator");
      function aa(r, e, t) {
        Be(e, "offset"), (r[e] === void 0 || r[e + t] === void 0) && Ge(e, r.length - (t + 1));
      }
      a(aa, "checkBounds");
      function oi(r, e, t, n, i, s) {
        if (r > t || r < e) {
          let o = typeof e == "bigint" ? "n" : "", u;
          throw s > 3 ? e === 0 || e === BigInt(0) ? u = `>= 0${o} and < 2${o} ** ${(s + 1) * 8}${o}` : u = `>= -(2${o} ** ${(s + 1) * 8 - 1}${o}) and < 2 ** ${(s + 1) * 8 - 1}${o}` : u = `>= ${e}${o} and <= ${t}${o}`, new Re.ERR_OUT_OF_RANGE("value", u, r);
        }
        aa(n, i, s);
      }
      a(oi, "checkIntBI");
      function Be(r, e) {
        if (typeof r != "number") throw new Re.ERR_INVALID_ARG_TYPE(e, "number", r);
      }
      a(Be, "validateNumber");
      function Ge(r, e, t) {
        throw Math.floor(r) !== r ? (Be(r, t), new Re.ERR_OUT_OF_RANGE(t || "offset", "an integer", r)) : e < 0 ? new Re.ERR_BUFFER_OUT_OF_BOUNDS() : new Re.ERR_OUT_OF_RANGE(t || "offset", `>= ${t ? 1 : 0} and <= ${e}`, r);
      }
      a(Ge, "boundsError");
      var ua = /[^+/0-9A-Za-z-_]/g;
      function ca(r) {
        if (r = r.split("=")[0], r = r.trim().replace(ua, ""), r.length < 2) return "";
        for (; r.length % 4 !== 0; ) r = r + "=";
        return r;
      }
      a(ca, "base64clean");
      function Gt(r, e) {
        e = e || 1 / 0;
        let t, n = r.length, i = null, s = [];
        for (let o = 0; o < n; ++o) {
          if (t = r.charCodeAt(o), t > 55295 && t < 57344) {
            if (!i) {
              if (t > 56319) {
                (e -= 3) > -1 && s.push(239, 191, 189);
                continue;
              } else if (o + 1 === n) {
                (e -= 3) > -1 && s.push(239, 191, 189);
                continue;
              }
              i = t;
              continue;
            }
            if (t < 56320) {
              (e -= 3) > -1 && s.push(239, 191, 189), i = t;
              continue;
            }
            t = (i - 55296 << 10 | t - 56320) + 65536;
          } else i && (e -= 3) > -1 && s.push(239, 191, 189);
          if (i = null, t < 128) {
            if ((e -= 1) < 0) break;
            s.push(t);
          } else if (t < 2048) {
            if ((e -= 2) < 0) break;
            s.push(t >> 6 | 192, t & 63 | 128);
          } else if (t < 65536) {
            if ((e -= 3) < 0) break;
            s.push(t >> 12 | 224, t >> 6 & 63 | 128, t & 63 | 128);
          } else if (t < 1114112) {
            if ((e -= 4) < 0) break;
            s.push(t >> 18 | 240, t >> 12 & 63 | 128, t >> 6 & 63 | 128, t & 63 | 128);
          } else throw new Error("Invalid code point");
        }
        return s;
      }
      a(Gt, "utf8ToBytes");
      function la(r) {
        let e = [];
        for (let t = 0; t < r.length; ++t) e.push(r.charCodeAt(t) & 255);
        return e;
      }
      a(
        la,
        "asciiToBytes"
      );
      function fa(r, e) {
        let t, n, i, s = [];
        for (let o = 0; o < r.length && !((e -= 2) < 0); ++o) t = r.charCodeAt(
          o
        ), n = t >> 8, i = t % 256, s.push(i), s.push(n);
        return s;
      }
      a(fa, "utf16leToBytes");
      function ai(r) {
        return jt.toByteArray(
          ca(r)
        );
      }
      a(ai, "base64ToBytes");
      function dt(r, e, t, n) {
        let i;
        for (i = 0; i < n && !(i + t >= e.length || i >= r.length); ++i)
          e[i + t] = r[i];
        return i;
      }
      a(dt, "blitBuffer");
      function fe(r, e) {
        return r instanceof e || r != null && r.constructor != null && r.constructor.name != null && r.constructor.name === e.name;
      }
      a(fe, "isInstance");
      function Yt(r) {
        return r !== r;
      }
      a(Yt, "numberIsNaN");
      var ha = function() {
        let r = "0123456789abcdef", e = new Array(256);
        for (let t = 0; t < 16; ++t) {
          let n = t * 16;
          for (let i = 0; i < 16; ++i) e[n + i] = r[t] + r[i];
        }
        return e;
      }();
      function ve(r) {
        return typeof BigInt > "u" ? da : r;
      }
      a(ve, "defineBigIntMethod");
      function da() {
        throw new Error("BigInt not supported");
      }
      a(da, "BufferBigIntNotDefined");
    });
    var b;
    var x;
    var v;
    var p;
    var y;
    var h = V(() => {
      "use strict";
      b = globalThis, x = globalThis.setImmediate ?? ((r) => setTimeout(r, 0)), v = globalThis.clearImmediate ?? ((r) => clearTimeout(r)), p = typeof globalThis.Buffer == "function" && typeof globalThis.Buffer.allocUnsafe == "function" ? globalThis.Buffer : ui().Buffer, y = globalThis.process ?? {};
      y.env ?? (y.env = {});
      try {
        y.nextTick(() => {
        });
      } catch {
        let e = Promise.resolve();
        y.nextTick = e.then.bind(e);
      }
    });
    var Se = T((Cf, tr) => {
      "use strict";
      h();
      var Oe = typeof Reflect == "object" ? Reflect : null, gi = Oe && typeof Oe.apply == "function" ? Oe.apply : a(function(e, t, n) {
        return Function.prototype.apply.call(e, t, n);
      }, "ReflectApply"), bt;
      Oe && typeof Oe.ownKeys == "function" ? bt = Oe.ownKeys : Object.getOwnPropertySymbols ? bt = a(function(e) {
        return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e));
      }, "ReflectOwnKeys") : bt = a(function(e) {
        return Object.getOwnPropertyNames(e);
      }, "ReflectOwnKeys");
      function Pa(r) {
        console && console.warn && console.warn(r);
      }
      a(
        Pa,
        "ProcessEmitWarning"
      );
      var bi = Number.isNaN || a(function(e) {
        return e !== e;
      }, "NumberIsNaN");
      function P() {
        P.init.call(this);
      }
      a(P, "EventEmitter");
      tr.exports = P;
      tr.exports.once = Fa;
      P.EventEmitter = P;
      P.prototype._events = void 0;
      P.prototype._eventsCount = 0;
      P.prototype._maxListeners = void 0;
      var wi = 10;
      function xt(r) {
        if (typeof r != "function") throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof r);
      }
      a(xt, "checkListener");
      Object.defineProperty(P, "defaultMaxListeners", { enumerable: true, get: a(function() {
        return wi;
      }, "get"), set: a(
        function(r) {
          if (typeof r != "number" || r < 0 || bi(r)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + r + ".");
          wi = r;
        },
        "set"
      ) });
      P.init = function() {
        (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
      };
      P.prototype.setMaxListeners = a(function(e) {
        if (typeof e != "number" || e < 0 || bi(e)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + e + ".");
        return this._maxListeners = e, this;
      }, "setMaxListeners");
      function xi(r) {
        return r._maxListeners === void 0 ? P.defaultMaxListeners : r._maxListeners;
      }
      a(xi, "_getMaxListeners");
      P.prototype.getMaxListeners = a(function() {
        return xi(this);
      }, "getMaxListeners");
      P.prototype.emit = a(function(e) {
        for (var t = [], n = 1; n < arguments.length; n++) t.push(arguments[n]);
        var i = e === "error", s = this._events;
        if (s !== void 0) i = i && s.error === void 0;
        else if (!i) return false;
        if (i) {
          var o;
          if (t.length > 0 && (o = t[0]), o instanceof Error) throw o;
          var u = new Error("Unhandled error." + (o ? " (" + o.message + ")" : ""));
          throw u.context = o, u;
        }
        var c = s[e];
        if (c === void 0) return false;
        if (typeof c == "function") gi(c, this, t);
        else for (var l = c.length, f = Ci(c, l), n = 0; n < l; ++n) gi(f[n], this, t);
        return true;
      }, "emit");
      function vi(r, e, t, n) {
        var i, s, o;
        if (xt(
          t
        ), s = r._events, s === void 0 ? (s = r._events = /* @__PURE__ */ Object.create(null), r._eventsCount = 0) : (s.newListener !== void 0 && (r.emit("newListener", e, t.listener ? t.listener : t), s = r._events), o = s[e]), o === void 0) o = s[e] = t, ++r._eventsCount;
        else if (typeof o == "function" ? o = s[e] = n ? [t, o] : [o, t] : n ? o.unshift(t) : o.push(t), i = xi(r), i > 0 && o.length > i && !o.warned) {
          o.warned = true;
          var u = new Error("Possible EventEmitter memory leak detected. " + o.length + " " + String(e) + " listeners added. Use emitter.setMaxListeners() to increase limit");
          u.name = "MaxListenersExceededWarning", u.emitter = r, u.type = e, u.count = o.length, Pa(u);
        }
        return r;
      }
      a(vi, "_addListener");
      P.prototype.addListener = a(function(e, t) {
        return vi(this, e, t, false);
      }, "addListener");
      P.prototype.on = P.prototype.addListener;
      P.prototype.prependListener = a(function(e, t) {
        return vi(this, e, t, true);
      }, "prependListener");
      function Ra() {
        if (!this.fired) return this.target.removeListener(this.type, this.wrapFn), this.fired = true, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
      }
      a(Ra, "onceWrapper");
      function Si(r, e, t) {
        var n = {
          fired: false,
          wrapFn: void 0,
          target: r,
          type: e,
          listener: t
        }, i = Ra.bind(n);
        return i.listener = t, n.wrapFn = i, i;
      }
      a(Si, "_onceWrap");
      P.prototype.once = a(function(e, t) {
        return xt(t), this.on(e, Si(this, e, t)), this;
      }, "once");
      P.prototype.prependOnceListener = a(function(e, t) {
        return xt(t), this.prependListener(e, Si(this, e, t)), this;
      }, "prependOnceListener");
      P.prototype.removeListener = a(function(e, t) {
        var n, i, s, o, u;
        if (xt(t), i = this._events, i === void 0) return this;
        if (n = i[e], n === void 0) return this;
        if (n === t || n.listener === t) --this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : (delete i[e], i.removeListener && this.emit("removeListener", e, n.listener || t));
        else if (typeof n != "function") {
          for (s = -1, o = n.length - 1; o >= 0; o--) if (n[o] === t || n[o].listener === t) {
            u = n[o].listener, s = o;
            break;
          }
          if (s < 0) return this;
          s === 0 ? n.shift() : La(n, s), n.length === 1 && (i[e] = n[0]), i.removeListener !== void 0 && this.emit("removeListener", e, u || t);
        }
        return this;
      }, "removeListener");
      P.prototype.off = P.prototype.removeListener;
      P.prototype.removeAllListeners = a(function(e) {
        var t, n, i;
        if (n = this._events, n === void 0) return this;
        if (n.removeListener === void 0) return arguments.length === 0 ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : n[e] !== void 0 && (--this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : delete n[e]), this;
        if (arguments.length === 0) {
          var s = Object.keys(n), o;
          for (i = 0; i < s.length; ++i) o = s[i], o !== "removeListener" && this.removeAllListeners(
            o
          );
          return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
        }
        if (t = n[e], typeof t == "function") this.removeListener(e, t);
        else if (t !== void 0) for (i = t.length - 1; i >= 0; i--) this.removeListener(e, t[i]);
        return this;
      }, "removeAllListeners");
      function Ei(r, e, t) {
        var n = r._events;
        if (n === void 0) return [];
        var i = n[e];
        return i === void 0 ? [] : typeof i == "function" ? t ? [i.listener || i] : [i] : t ? Ba(i) : Ci(i, i.length);
      }
      a(Ei, "_listeners");
      P.prototype.listeners = a(function(e) {
        return Ei(this, e, true);
      }, "listeners");
      P.prototype.rawListeners = a(function(e) {
        return Ei(this, e, false);
      }, "rawListeners");
      P.listenerCount = function(r, e) {
        return typeof r.listenerCount == "function" ? r.listenerCount(e) : Ai.call(r, e);
      };
      P.prototype.listenerCount = Ai;
      function Ai(r) {
        var e = this._events;
        if (e !== void 0) {
          var t = e[r];
          if (typeof t == "function")
            return 1;
          if (t !== void 0) return t.length;
        }
        return 0;
      }
      a(Ai, "listenerCount");
      P.prototype.eventNames = a(function() {
        return this._eventsCount > 0 ? bt(this._events) : [];
      }, "eventNames");
      function Ci(r, e) {
        for (var t = new Array(e), n = 0; n < e; ++n) t[n] = r[n];
        return t;
      }
      a(Ci, "arrayClone");
      function La(r, e) {
        for (; e + 1 < r.length; e++) r[e] = r[e + 1];
        r.pop();
      }
      a(La, "spliceOne");
      function Ba(r) {
        for (var e = new Array(r.length), t = 0; t < e.length; ++t) e[t] = r[t].listener || r[t];
        return e;
      }
      a(Ba, "unwrapListeners");
      function Fa(r, e) {
        return new Promise(function(t, n) {
          function i(o) {
            r.removeListener(e, s), n(o);
          }
          a(i, "errorListener");
          function s() {
            typeof r.removeListener == "function" && r.removeListener("error", i), t([].slice.call(arguments));
          }
          a(s, "resolver"), _i(r, e, s, { once: true }), e !== "error" && Ma(r, i, { once: true });
        });
      }
      a(Fa, "once");
      function Ma(r, e, t) {
        typeof r.on == "function" && _i(r, "error", e, t);
      }
      a(
        Ma,
        "addErrorHandlerIfEventEmitter"
      );
      function _i(r, e, t, n) {
        if (typeof r.on == "function") n.once ? r.once(e, t) : r.on(e, t);
        else if (typeof r.addEventListener == "function") r.addEventListener(e, a(function i(s) {
          n.once && r.removeEventListener(e, i), t(s);
        }, "wrapListener"));
        else throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof r);
      }
      a(_i, "eventTargetAgnosticAddListener");
    });
    var Pi = {};
    X(Pi, { Socket: () => he, isIP: () => ka });
    function ka(r) {
      return 0;
    }
    var Ii;
    var Ti;
    var A;
    var he;
    var Ke = V(() => {
      "use strict";
      h();
      Ii = xe(Se(), 1);
      a(ka, "isIP");
      Ti = /^[^.]+\./, A = class A2 extends Ii.EventEmitter {
        constructor() {
          super(
            ...arguments
          );
          E(this, "opts", {});
          E(this, "connecting", false);
          E(this, "pending", true);
          E(this, "writable", true);
          E(
            this,
            "encrypted",
            false
          );
          E(this, "authorized", false);
          E(this, "destroyed", false);
          E(this, "ws", null);
          E(this, "writeBuffer");
          E(this, "tlsState", 0);
          E(this, "tlsRead");
          E(this, "tlsWrite");
        }
        static get poolQueryViaFetch() {
          return A2.opts.poolQueryViaFetch ?? A2.defaults.poolQueryViaFetch;
        }
        static set poolQueryViaFetch(t) {
          A2.opts.poolQueryViaFetch = t;
        }
        static get fetchEndpoint() {
          return A2.opts.fetchEndpoint ?? A2.defaults.fetchEndpoint;
        }
        static set fetchEndpoint(t) {
          A2.opts.fetchEndpoint = t;
        }
        static get fetchConnectionCache() {
          return true;
        }
        static set fetchConnectionCache(t) {
          console.warn("The `fetchConnectionCache` option is deprecated (now always `true`)");
        }
        static get fetchFunction() {
          return A2.opts.fetchFunction ?? A2.defaults.fetchFunction;
        }
        static set fetchFunction(t) {
          A2.opts.fetchFunction = t;
        }
        static get webSocketConstructor() {
          return A2.opts.webSocketConstructor ?? A2.defaults.webSocketConstructor;
        }
        static set webSocketConstructor(t) {
          A2.opts.webSocketConstructor = t;
        }
        get webSocketConstructor() {
          return this.opts.webSocketConstructor ?? A2.webSocketConstructor;
        }
        set webSocketConstructor(t) {
          this.opts.webSocketConstructor = t;
        }
        static get wsProxy() {
          return A2.opts.wsProxy ?? A2.defaults.wsProxy;
        }
        static set wsProxy(t) {
          A2.opts.wsProxy = t;
        }
        get wsProxy() {
          return this.opts.wsProxy ?? A2.wsProxy;
        }
        set wsProxy(t) {
          this.opts.wsProxy = t;
        }
        static get coalesceWrites() {
          return A2.opts.coalesceWrites ?? A2.defaults.coalesceWrites;
        }
        static set coalesceWrites(t) {
          A2.opts.coalesceWrites = t;
        }
        get coalesceWrites() {
          return this.opts.coalesceWrites ?? A2.coalesceWrites;
        }
        set coalesceWrites(t) {
          this.opts.coalesceWrites = t;
        }
        static get useSecureWebSocket() {
          return A2.opts.useSecureWebSocket ?? A2.defaults.useSecureWebSocket;
        }
        static set useSecureWebSocket(t) {
          A2.opts.useSecureWebSocket = t;
        }
        get useSecureWebSocket() {
          return this.opts.useSecureWebSocket ?? A2.useSecureWebSocket;
        }
        set useSecureWebSocket(t) {
          this.opts.useSecureWebSocket = t;
        }
        static get forceDisablePgSSL() {
          return A2.opts.forceDisablePgSSL ?? A2.defaults.forceDisablePgSSL;
        }
        static set forceDisablePgSSL(t) {
          A2.opts.forceDisablePgSSL = t;
        }
        get forceDisablePgSSL() {
          return this.opts.forceDisablePgSSL ?? A2.forceDisablePgSSL;
        }
        set forceDisablePgSSL(t) {
          this.opts.forceDisablePgSSL = t;
        }
        static get disableSNI() {
          return A2.opts.disableSNI ?? A2.defaults.disableSNI;
        }
        static set disableSNI(t) {
          A2.opts.disableSNI = t;
        }
        get disableSNI() {
          return this.opts.disableSNI ?? A2.disableSNI;
        }
        set disableSNI(t) {
          this.opts.disableSNI = t;
        }
        static get disableWarningInBrowsers() {
          return A2.opts.disableWarningInBrowsers ?? A2.defaults.disableWarningInBrowsers;
        }
        static set disableWarningInBrowsers(t) {
          A2.opts.disableWarningInBrowsers = t;
        }
        get disableWarningInBrowsers() {
          return this.opts.disableWarningInBrowsers ?? A2.disableWarningInBrowsers;
        }
        set disableWarningInBrowsers(t) {
          this.opts.disableWarningInBrowsers = t;
        }
        static get pipelineConnect() {
          return A2.opts.pipelineConnect ?? A2.defaults.pipelineConnect;
        }
        static set pipelineConnect(t) {
          A2.opts.pipelineConnect = t;
        }
        get pipelineConnect() {
          return this.opts.pipelineConnect ?? A2.pipelineConnect;
        }
        set pipelineConnect(t) {
          this.opts.pipelineConnect = t;
        }
        static get subtls() {
          return A2.opts.subtls ?? A2.defaults.subtls;
        }
        static set subtls(t) {
          A2.opts.subtls = t;
        }
        get subtls() {
          return this.opts.subtls ?? A2.subtls;
        }
        set subtls(t) {
          this.opts.subtls = t;
        }
        static get pipelineTLS() {
          return A2.opts.pipelineTLS ?? A2.defaults.pipelineTLS;
        }
        static set pipelineTLS(t) {
          A2.opts.pipelineTLS = t;
        }
        get pipelineTLS() {
          return this.opts.pipelineTLS ?? A2.pipelineTLS;
        }
        set pipelineTLS(t) {
          this.opts.pipelineTLS = t;
        }
        static get rootCerts() {
          return A2.opts.rootCerts ?? A2.defaults.rootCerts;
        }
        static set rootCerts(t) {
          A2.opts.rootCerts = t;
        }
        get rootCerts() {
          return this.opts.rootCerts ?? A2.rootCerts;
        }
        set rootCerts(t) {
          this.opts.rootCerts = t;
        }
        wsProxyAddrForHost(t, n) {
          let i = this.wsProxy;
          if (i === void 0) throw new Error("No WebSocket proxy is configured. Please see https://github.com/neondatabase/serverless/blob/main/CONFIG.md#wsproxy-string--host-string-port-number--string--string");
          return typeof i == "function" ? i(t, n) : `${i}?address=${t}:${n}`;
        }
        setNoDelay() {
          return this;
        }
        setKeepAlive() {
          return this;
        }
        ref() {
          return this;
        }
        unref() {
          return this;
        }
        connect(t, n, i) {
          this.connecting = true, i && this.once("connect", i);
          let s = a(() => {
            this.connecting = false, this.pending = false, this.emit("connect"), this.emit("ready");
          }, "handleWebSocketOpen"), o = a((c, l = false) => {
            c.binaryType = "arraybuffer", c.addEventListener("error", (f) => {
              this.emit("error", f), this.emit("close");
            }), c.addEventListener("message", (f) => {
              if (this.tlsState === 0) {
                let m = p.from(f.data);
                this.emit("data", m);
              }
            }), c.addEventListener("close", () => {
              this.destroyed = true, this.emit("close");
            }), l ? s() : c.addEventListener("open", s);
          }, "configureWebSocket"), u;
          try {
            u = this.wsProxyAddrForHost(n, typeof t == "string" ? parseInt(t, 10) : t);
          } catch (c) {
            this.emit("error", c), this.emit("close");
            return;
          }
          try {
            let l = (this.useSecureWebSocket ? "wss:" : "ws:") + "//" + u;
            if (this.webSocketConstructor !== void 0) this.ws = new this.webSocketConstructor(l), o(this.ws);
            else try {
              this.ws = new WebSocket(l), o(this.ws);
            } catch {
              this.ws = new __unstable_WebSocket(l), o(
                this.ws
              );
            }
          } catch (c) {
            let f = (this.useSecureWebSocket ? "https:" : "http:") + "//" + u;
            fetch(f, { headers: { Upgrade: "websocket" } }).then((m) => {
              if (this.ws = m.webSocket, this.ws == null) throw c;
              this.ws.accept(), o(this.ws, true);
            }).catch((m) => {
              this.emit("error", new Error(`All attempts to open a WebSocket to connect to the database failed. Please refer to https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined. Details: ${m}`)), this.emit("close");
            });
          }
        }
        async startTls(t) {
          if (this.subtls === void 0) throw new Error("For Postgres SSL connections, you must set `neonConfig.subtls` to the subtls library. See https://github.com/neondatabase/serverless/blob/main/CONFIG.md for more information.");
          this.tlsState = 1;
          let n = await this.subtls.TrustedCert.databaseFromPEM(this.rootCerts), i = new this.subtls.WebSocketReadQueue(this.ws), s = i.read.bind(i), o = this.rawWrite.bind(this), { read: u, write: c } = await this.subtls.startTls(t, n, s, o, { useSNI: !this.disableSNI, expectPreData: this.pipelineTLS ? new Uint8Array([83]) : void 0 });
          this.tlsRead = u, this.tlsWrite = c, this.tlsState = 2, this.encrypted = true, this.authorized = true, this.emit(
            "secureConnection",
            this
          ), this.tlsReadLoop().catch((l) => {
            this.destroyed || (this.destroyed = true, this.emit("error", l), this.ws?.close());
          });
        }
        async tlsReadLoop() {
          for (; ; ) {
            let t = await this.tlsRead();
            if (t === void 0) break;
            {
              let n = p.from(t);
              this.emit("data", n);
            }
          }
        }
        rawWrite(t) {
          if (!this.coalesceWrites) {
            this.ws && this.ws.send(t);
            return;
          }
          if (this.writeBuffer === void 0) this.writeBuffer = t, setTimeout(() => {
            this.ws && this.ws.send(this.writeBuffer), this.writeBuffer = void 0;
          }, 0);
          else {
            let n = new Uint8Array(this.writeBuffer.length + t.length);
            n.set(this.writeBuffer), n.set(t, this.writeBuffer.length), this.writeBuffer = n;
          }
        }
        write(t, n = "utf8", i = (s) => {
        }) {
          return t.length === 0 ? (i(), true) : (typeof t == "string" && (t = p.from(t, n)), this.tlsState === 0 ? (this.rawWrite(t), i()) : this.tlsState === 1 ? this.once("secureConnection", () => {
            this.write(t, n, i);
          }) : (this.tlsWrite(t), i()), true);
        }
        end(t = p.alloc(0), n = "utf8", i = () => {
        }) {
          return this.write(t, n, () => {
            this.ws?.close(), i();
          }), this;
        }
        destroy() {
          return this.destroyed = true, this.end();
        }
      };
      a(A, "Socket"), E(A, "defaults", {
        poolQueryViaFetch: false,
        fetchEndpoint: a((t, n, i) => {
          let s;
          return i?.jwtAuth ? s = t.replace(Ti, "apiauth.") : s = t.replace(Ti, "api."), "https://" + s + "/sql";
        }, "fetchEndpoint"),
        fetchConnectionCache: true,
        fetchFunction: void 0,
        webSocketConstructor: void 0,
        wsProxy: a((t) => t + "/v2", "wsProxy"),
        useSecureWebSocket: true,
        forceDisablePgSSL: true,
        coalesceWrites: true,
        pipelineConnect: "password",
        subtls: void 0,
        rootCerts: "",
        pipelineTLS: false,
        disableSNI: false,
        disableWarningInBrowsers: false
      }), E(A, "opts", {});
      he = A;
    });
    var nr = T((Ri) => {
      "use strict";
      h();
      Ri.parse = function(r, e) {
        return new rr(r, e).parse();
      };
      var St = class St2 {
        constructor(e, t) {
          this.source = e, this.transform = t || Oa, this.position = 0, this.entries = [], this.recorded = [], this.dimension = 0;
        }
        isEof() {
          return this.position >= this.source.length;
        }
        nextCharacter() {
          var e = this.source[this.position++];
          return e === "\\" ? { value: this.source[this.position++], escaped: true } : { value: e, escaped: false };
        }
        record(e) {
          this.recorded.push(
            e
          );
        }
        newEntry(e) {
          var t;
          (this.recorded.length > 0 || e) && (t = this.recorded.join(""), t === "NULL" && !e && (t = null), t !== null && (t = this.transform(t)), this.entries.push(t), this.recorded = []);
        }
        consumeDimensions() {
          if (this.source[0] === "[") for (; !this.isEof(); ) {
            var e = this.nextCharacter();
            if (e.value === "=") break;
          }
        }
        parse(e) {
          var t, n, i;
          for (this.consumeDimensions(); !this.isEof(); ) if (t = this.nextCharacter(), t.value === "{" && !i) this.dimension++, this.dimension > 1 && (n = new St2(this.source.substr(this.position - 1), this.transform), this.entries.push(n.parse(
            true
          )), this.position += n.position - 2);
          else if (t.value === "}" && !i) {
            if (this.dimension--, !this.dimension && (this.newEntry(), e)) return this.entries;
          } else t.value === '"' && !t.escaped ? (i && this.newEntry(true), i = !i) : t.value === "," && !i ? this.newEntry() : this.record(t.value);
          if (this.dimension !== 0) throw new Error("array dimension not balanced");
          return this.entries;
        }
      };
      a(St, "ArrayParser");
      var rr = St;
      function Oa(r) {
        return r;
      }
      a(Oa, "identity");
    });
    var ir = T((kf, Li) => {
      h();
      var Ua = nr();
      Li.exports = { create: a(function(r, e) {
        return { parse: a(function() {
          return Ua.parse(r, e);
        }, "parse") };
      }, "create") };
    });
    var Mi = T((Qf, Fi) => {
      "use strict";
      h();
      var Qa = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/, Da = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/, qa = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/, Na = /^-?infinity$/;
      Fi.exports = a(function(e) {
        if (Na.test(e)) return Number(e.replace("i", "I"));
        var t = Qa.exec(e);
        if (!t) return Wa(
          e
        ) || null;
        var n = !!t[8], i = parseInt(t[1], 10);
        n && (i = Bi(i));
        var s = parseInt(t[2], 10) - 1, o = t[3], u = parseInt(
          t[4],
          10
        ), c = parseInt(t[5], 10), l = parseInt(t[6], 10), f = t[7];
        f = f ? 1e3 * parseFloat(f) : 0;
        var m, g = ja(e);
        return g != null ? (m = new Date(Date.UTC(i, s, o, u, c, l, f)), sr(i) && m.setUTCFullYear(i), g !== 0 && m.setTime(m.getTime() - g)) : (m = new Date(i, s, o, u, c, l, f), sr(i) && m.setFullYear(i)), m;
      }, "parseDate");
      function Wa(r) {
        var e = Da.exec(r);
        if (e) {
          var t = parseInt(e[1], 10), n = !!e[4];
          n && (t = Bi(t));
          var i = parseInt(e[2], 10) - 1, s = e[3], o = new Date(t, i, s);
          return sr(
            t
          ) && o.setFullYear(t), o;
        }
      }
      a(Wa, "getDate");
      function ja(r) {
        if (r.endsWith("+00")) return 0;
        var e = qa.exec(r.split(" ")[1]);
        if (e) {
          var t = e[1];
          if (t === "Z") return 0;
          var n = t === "-" ? -1 : 1, i = parseInt(e[2], 10) * 3600 + parseInt(
            e[3] || 0,
            10
          ) * 60 + parseInt(e[4] || 0, 10);
          return i * n * 1e3;
        }
      }
      a(ja, "timeZoneOffset");
      function Bi(r) {
        return -(r - 1);
      }
      a(Bi, "bcYearToNegativeYear");
      function sr(r) {
        return r >= 0 && r < 100;
      }
      a(sr, "is0To99");
    });
    var Oi = T((Nf, ki) => {
      h();
      ki.exports = $a;
      var Ha = Object.prototype.hasOwnProperty;
      function $a(r) {
        for (var e = 1; e < arguments.length; e++) {
          var t = arguments[e];
          for (var n in t) Ha.call(t, n) && (r[n] = t[n]);
        }
        return r;
      }
      a($a, "extend");
    });
    var Di = T((Hf, Qi) => {
      "use strict";
      h();
      var Ga = Oi();
      Qi.exports = Ue;
      function Ue(r) {
        if (!(this instanceof Ue))
          return new Ue(r);
        Ga(this, iu(r));
      }
      a(Ue, "PostgresInterval");
      var Va = [
        "seconds",
        "minutes",
        "hours",
        "days",
        "months",
        "years"
      ];
      Ue.prototype.toPostgres = function() {
        var r = Va.filter(this.hasOwnProperty, this);
        return this.milliseconds && r.indexOf("seconds") < 0 && r.push("seconds"), r.length === 0 ? "0" : r.map(function(e) {
          var t = this[e] || 0;
          return e === "seconds" && this.milliseconds && (t = (t + this.milliseconds / 1e3).toFixed(6).replace(
            /\.?0+$/,
            ""
          )), t + " " + e;
        }, this).join(" ");
      };
      var za = { years: "Y", months: "M", days: "D", hours: "H", minutes: "M", seconds: "S" }, Ka = ["years", "months", "days"], Ya = ["hours", "minutes", "seconds"];
      Ue.prototype.toISOString = Ue.prototype.toISO = function() {
        var r = Ka.map(t, this).join(""), e = Ya.map(t, this).join("");
        return "P" + r + "T" + e;
        function t(n) {
          var i = this[n] || 0;
          return n === "seconds" && this.milliseconds && (i = (i + this.milliseconds / 1e3).toFixed(6).replace(
            /0+$/,
            ""
          )), i + za[n];
        }
      };
      var or = "([+-]?\\d+)", Za = or + "\\s+years?", Ja = or + "\\s+mons?", Xa = or + "\\s+days?", eu = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?", tu = new RegExp([Za, Ja, Xa, eu].map(function(r) {
        return "(" + r + ")?";
      }).join("\\s*")), Ui = { years: 2, months: 4, days: 6, hours: 9, minutes: 10, seconds: 11, milliseconds: 12 }, ru = ["hours", "minutes", "seconds", "milliseconds"];
      function nu(r) {
        var e = r + "000000".slice(r.length);
        return parseInt(
          e,
          10
        ) / 1e3;
      }
      a(nu, "parseMilliseconds");
      function iu(r) {
        if (!r) return {};
        var e = tu.exec(r), t = e[8] === "-";
        return Object.keys(Ui).reduce(function(n, i) {
          var s = Ui[i], o = e[s];
          return !o || (o = i === "milliseconds" ? nu(o) : parseInt(o, 10), !o) || (t && ~ru.indexOf(i) && (o *= -1), n[i] = o), n;
        }, {});
      }
      a(iu, "parse");
    });
    var Wi = T((Vf, Ni) => {
      "use strict";
      h();
      var qi = p.from || p;
      Ni.exports = a(function(e) {
        if (/^\\x/.test(e)) return qi(
          e.substr(2),
          "hex"
        );
        for (var t = "", n = 0; n < e.length; ) if (e[n] !== "\\") t += e[n], ++n;
        else if (/[0-7]{3}/.test(e.substr(n + 1, 3))) t += String.fromCharCode(parseInt(e.substr(n + 1, 3), 8)), n += 4;
        else {
          for (var i = 1; n + i < e.length && e[n + i] === "\\"; ) i++;
          for (var s = 0; s < Math.floor(i / 2); ++s) t += "\\";
          n += Math.floor(i / 2) * 2;
        }
        return qi(t, "binary");
      }, "parseBytea");
    });
    var Ki = T((Yf, zi) => {
      h();
      var Ye = nr(), Ze = ir(), Et = Mi(), Hi = Di(), $i = Wi();
      function At(r) {
        return a(function(t) {
          return t === null ? t : r(t);
        }, "nullAllowed");
      }
      a(At, "allowNull");
      function Gi(r) {
        return r === null ? r : r === "TRUE" || r === "t" || r === "true" || r === "y" || r === "yes" || r === "on" || r === "1";
      }
      a(Gi, "parseBool");
      function su(r) {
        return r ? Ye.parse(r, Gi) : null;
      }
      a(su, "parseBoolArray");
      function ou(r) {
        return parseInt(r, 10);
      }
      a(ou, "parseBaseTenInt");
      function ar(r) {
        return r ? Ye.parse(r, At(ou)) : null;
      }
      a(ar, "parseIntegerArray");
      function au(r) {
        return r ? Ye.parse(r, At(function(e) {
          return Vi(e).trim();
        })) : null;
      }
      a(au, "parseBigIntegerArray");
      var uu = a(function(r) {
        if (!r) return null;
        var e = Ze.create(r, function(t) {
          return t !== null && (t = fr(t)), t;
        });
        return e.parse();
      }, "parsePointArray"), ur = a(function(r) {
        if (!r) return null;
        var e = Ze.create(r, function(t) {
          return t !== null && (t = parseFloat(t)), t;
        });
        return e.parse();
      }, "parseFloatArray"), te = a(function(r) {
        if (!r) return null;
        var e = Ze.create(r);
        return e.parse();
      }, "parseStringArray"), cr = a(function(r) {
        if (!r) return null;
        var e = Ze.create(
          r,
          function(t) {
            return t !== null && (t = Et(t)), t;
          }
        );
        return e.parse();
      }, "parseDateArray"), cu = a(function(r) {
        if (!r)
          return null;
        var e = Ze.create(r, function(t) {
          return t !== null && (t = Hi(t)), t;
        });
        return e.parse();
      }, "parseIntervalArray"), lu = a(function(r) {
        return r ? Ye.parse(r, At($i)) : null;
      }, "parseByteAArray"), lr = a(function(r) {
        return parseInt(r, 10);
      }, "parseInteger"), Vi = a(function(r) {
        var e = String(r);
        return /^\d+$/.test(e) ? e : r;
      }, "parseBigInteger"), ji = a(function(r) {
        return r ? Ye.parse(r, At(JSON.parse)) : null;
      }, "parseJsonArray"), fr = a(
        function(r) {
          return r[0] !== "(" ? null : (r = r.substring(1, r.length - 1).split(","), { x: parseFloat(r[0]), y: parseFloat(
            r[1]
          ) });
        },
        "parsePoint"
      ), fu = a(function(r) {
        if (r[0] !== "<" && r[1] !== "(") return null;
        for (var e = "(", t = "", n = false, i = 2; i < r.length - 1; i++) {
          if (n || (e += r[i]), r[i] === ")") {
            n = true;
            continue;
          } else if (!n) continue;
          r[i] !== "," && (t += r[i]);
        }
        var s = fr(e);
        return s.radius = parseFloat(t), s;
      }, "parseCircle"), hu = a(function(r) {
        r(20, Vi), r(21, lr), r(23, lr), r(26, lr), r(700, parseFloat), r(701, parseFloat), r(16, Gi), r(1082, Et), r(1114, Et), r(1184, Et), r(
          600,
          fr
        ), r(651, te), r(718, fu), r(1e3, su), r(1001, lu), r(1005, ar), r(1007, ar), r(1028, ar), r(1016, au), r(1017, uu), r(1021, ur), r(1022, ur), r(1231, ur), r(1014, te), r(1015, te), r(1008, te), r(1009, te), r(1040, te), r(1041, te), r(
          1115,
          cr
        ), r(1182, cr), r(1185, cr), r(1186, Hi), r(1187, cu), r(17, $i), r(114, JSON.parse.bind(JSON)), r(3802, JSON.parse.bind(JSON)), r(199, ji), r(3807, ji), r(3907, te), r(2951, te), r(791, te), r(1183, te), r(1270, te);
      }, "init");
      zi.exports = { init: hu };
    });
    var Zi = T((Xf, Yi) => {
      "use strict";
      h();
      var K = 1e6;
      function du(r) {
        var e = r.readInt32BE(0), t = r.readUInt32BE(
          4
        ), n = "";
        e < 0 && (e = ~e + (t === 0), t = ~t + 1 >>> 0, n = "-");
        var i = "", s, o, u, c, l, f;
        {
          if (s = e % K, e = e / K >>> 0, o = 4294967296 * s + t, t = o / K >>> 0, u = "" + (o - K * t), t === 0 && e === 0) return n + u + i;
          for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
          i = c + u + i;
        }
        {
          if (s = e % K, e = e / K >>> 0, o = 4294967296 * s + t, t = o / K >>> 0, u = "" + (o - K * t), t === 0 && e === 0) return n + u + i;
          for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
          i = c + u + i;
        }
        {
          if (s = e % K, e = e / K >>> 0, o = 4294967296 * s + t, t = o / K >>> 0, u = "" + (o - K * t), t === 0 && e === 0) return n + u + i;
          for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
          i = c + u + i;
        }
        return s = e % K, o = 4294967296 * s + t, u = "" + o % K, n + u + i;
      }
      a(du, "readInt8");
      Yi.exports = du;
    });
    var rs = T((rh, ts) => {
      h();
      var pu = Zi(), B = a(function(r, e, t, n, i) {
        t = t || 0, n = n || false, i = i || function(w, S, k) {
          return w * Math.pow(2, k) + S;
        };
        var s = t >> 3, o = a(function(w) {
          return n ? ~w & 255 : w;
        }, "inv"), u = 255, c = 8 - t % 8;
        e < c && (u = 255 << 8 - e & 255, c = e), t && (u = u >> t % 8);
        var l = 0;
        t % 8 + e >= 8 && (l = i(0, o(r[s]) & u, c));
        for (var f = e + t >> 3, m = s + 1; m < f; m++) l = i(l, o(
          r[m]
        ), 8);
        var g = (e + t) % 8;
        return g > 0 && (l = i(l, o(r[f]) >> 8 - g, g)), l;
      }, "parseBits"), es = a(function(r, e, t) {
        var n = Math.pow(2, t - 1) - 1, i = B(r, 1), s = B(r, t, 1);
        if (s === 0) return 0;
        var o = 1, u = a(function(l, f, m) {
          l === 0 && (l = 1);
          for (var g = 1; g <= m; g++) o /= 2, (f & 1 << m - g) > 0 && (l += o);
          return l;
        }, "parsePrecisionBits"), c = B(r, e, t + 1, false, u);
        return s == Math.pow(
          2,
          t + 1
        ) - 1 ? c === 0 ? i === 0 ? 1 / 0 : -1 / 0 : NaN : (i === 0 ? 1 : -1) * Math.pow(2, s - n) * c;
      }, "parseFloatFromBits"), yu = a(function(r) {
        return B(r, 1) == 1 ? -1 * (B(r, 15, 1, true) + 1) : B(r, 15, 1);
      }, "parseInt16"), Ji = a(function(r) {
        return B(r, 1) == 1 ? -1 * (B(
          r,
          31,
          1,
          true
        ) + 1) : B(r, 31, 1);
      }, "parseInt32"), mu = a(function(r) {
        return es(r, 23, 8);
      }, "parseFloat32"), gu = a(function(r) {
        return es(r, 52, 11);
      }, "parseFloat64"), wu = a(function(r) {
        var e = B(r, 16, 32);
        if (e == 49152) return NaN;
        for (var t = Math.pow(1e4, B(r, 16, 16)), n = 0, i = [], s = B(r, 16), o = 0; o < s; o++) n += B(r, 16, 64 + 16 * o) * t, t /= 1e4;
        var u = Math.pow(10, B(
          r,
          16,
          48
        ));
        return (e === 0 ? 1 : -1) * Math.round(n * u) / u;
      }, "parseNumeric"), Xi = a(function(r, e) {
        var t = B(e, 1), n = B(
          e,
          63,
          1
        ), i = new Date((t === 0 ? 1 : -1) * n / 1e3 + 9466848e5);
        return r || i.setTime(i.getTime() + i.getTimezoneOffset() * 6e4), i.usec = n % 1e3, i.getMicroSeconds = function() {
          return this.usec;
        }, i.setMicroSeconds = function(s) {
          this.usec = s;
        }, i.getUTCMicroSeconds = function() {
          return this.usec;
        }, i;
      }, "parseDate"), Je = a(
        function(r) {
          for (var e = B(
            r,
            32
          ), t = B(r, 32, 32), n = B(r, 32, 64), i = 96, s = [], o = 0; o < e; o++) s[o] = B(r, 32, i), i += 32, i += 32;
          var u = a(function(l) {
            var f = B(r, 32, i);
            if (i += 32, f == 4294967295) return null;
            var m;
            if (l == 23 || l == 20) return m = B(r, f * 8, i), i += f * 8, m;
            if (l == 25) return m = r.toString(this.encoding, i >> 3, (i += f << 3) >> 3), m;
            console.log("ERROR: ElementType not implemented: " + l);
          }, "parseElement"), c = a(function(l, f) {
            var m = [], g;
            if (l.length > 1) {
              var w = l.shift();
              for (g = 0; g < w; g++) m[g] = c(l, f);
              l.unshift(w);
            } else for (g = 0; g < l[0]; g++) m[g] = u(f);
            return m;
          }, "parse");
          return c(s, n);
        },
        "parseArray"
      ), bu = a(function(r) {
        return r.toString("utf8");
      }, "parseText"), xu = a(function(r) {
        return r === null ? null : B(r, 8) > 0;
      }, "parseBool"), vu = a(function(r) {
        r(20, pu), r(21, yu), r(23, Ji), r(26, Ji), r(1700, wu), r(700, mu), r(701, gu), r(16, xu), r(1114, Xi.bind(null, false)), r(1184, Xi.bind(null, true)), r(1e3, Je), r(1007, Je), r(1016, Je), r(1008, Je), r(1009, Je), r(25, bu);
      }, "init");
      ts.exports = { init: vu };
    });
    var is = T((sh, ns) => {
      h();
      ns.exports = {
        BOOL: 16,
        BYTEA: 17,
        CHAR: 18,
        INT8: 20,
        INT2: 21,
        INT4: 23,
        REGPROC: 24,
        TEXT: 25,
        OID: 26,
        TID: 27,
        XID: 28,
        CID: 29,
        JSON: 114,
        XML: 142,
        PG_NODE_TREE: 194,
        SMGR: 210,
        PATH: 602,
        POLYGON: 604,
        CIDR: 650,
        FLOAT4: 700,
        FLOAT8: 701,
        ABSTIME: 702,
        RELTIME: 703,
        TINTERVAL: 704,
        CIRCLE: 718,
        MACADDR8: 774,
        MONEY: 790,
        MACADDR: 829,
        INET: 869,
        ACLITEM: 1033,
        BPCHAR: 1042,
        VARCHAR: 1043,
        DATE: 1082,
        TIME: 1083,
        TIMESTAMP: 1114,
        TIMESTAMPTZ: 1184,
        INTERVAL: 1186,
        TIMETZ: 1266,
        BIT: 1560,
        VARBIT: 1562,
        NUMERIC: 1700,
        REFCURSOR: 1790,
        REGPROCEDURE: 2202,
        REGOPER: 2203,
        REGOPERATOR: 2204,
        REGCLASS: 2205,
        REGTYPE: 2206,
        UUID: 2950,
        TXID_SNAPSHOT: 2970,
        PG_LSN: 3220,
        PG_NDISTINCT: 3361,
        PG_DEPENDENCIES: 3402,
        TSVECTOR: 3614,
        TSQUERY: 3615,
        GTSVECTOR: 3642,
        REGCONFIG: 3734,
        REGDICTIONARY: 3769,
        JSONB: 3802,
        REGNAMESPACE: 4089,
        REGROLE: 4096
      };
    });
    var tt = T((et) => {
      h();
      var Su = Ki(), Eu = rs(), Au = ir(), Cu = is();
      et.getTypeParser = _u;
      et.setTypeParser = Tu;
      et.arrayParser = Au;
      et.builtins = Cu;
      var Xe = { text: {}, binary: {} };
      function ss(r) {
        return String(r);
      }
      a(ss, "noParse");
      function _u(r, e) {
        return e = e || "text", Xe[e] && Xe[e][r] || ss;
      }
      a(_u, "getTypeParser");
      function Tu(r, e, t) {
        typeof e == "function" && (t = e, e = "text"), Xe[e][r] = t;
      }
      a(Tu, "setTypeParser");
      Su.init(function(r, e) {
        Xe.text[r] = e;
      });
      Eu.init(function(r, e) {
        Xe.binary[r] = e;
      });
    });
    var _t = T((lh, os) => {
      "use strict";
      h();
      var Iu = tt();
      function Ct(r) {
        this._types = r || Iu, this.text = {}, this.binary = {};
      }
      a(Ct, "TypeOverrides");
      Ct.prototype.getOverrides = function(r) {
        switch (r) {
          case "text":
            return this.text;
          case "binary":
            return this.binary;
          default:
            return {};
        }
      };
      Ct.prototype.setTypeParser = function(r, e, t) {
        typeof e == "function" && (t = e, e = "text"), this.getOverrides(e)[r] = t;
      };
      Ct.prototype.getTypeParser = function(r, e) {
        return e = e || "text", this.getOverrides(e)[r] || this._types.getTypeParser(r, e);
      };
      os.exports = Ct;
    });
    function rt(r) {
      let e = 1779033703, t = 3144134277, n = 1013904242, i = 2773480762, s = 1359893119, o = 2600822924, u = 528734635, c = 1541459225, l = 0, f = 0, m = [
        1116352408,
        1899447441,
        3049323471,
        3921009573,
        961987163,
        1508970993,
        2453635748,
        2870763221,
        3624381080,
        310598401,
        607225278,
        1426881987,
        1925078388,
        2162078206,
        2614888103,
        3248222580,
        3835390401,
        4022224774,
        264347078,
        604807628,
        770255983,
        1249150122,
        1555081692,
        1996064986,
        2554220882,
        2821834349,
        2952996808,
        3210313671,
        3336571891,
        3584528711,
        113926993,
        338241895,
        666307205,
        773529912,
        1294757372,
        1396182291,
        1695183700,
        1986661051,
        2177026350,
        2456956037,
        2730485921,
        2820302411,
        3259730800,
        3345764771,
        3516065817,
        3600352804,
        4094571909,
        275423344,
        430227734,
        506948616,
        659060556,
        883997877,
        958139571,
        1322822218,
        1537002063,
        1747873779,
        1955562222,
        2024104815,
        2227730452,
        2361852424,
        2428436474,
        2756734187,
        3204031479,
        3329325298
      ], g = a((I, C) => I >>> C | I << 32 - C, "rrot"), w = new Uint32Array(64), S = new Uint8Array(64), k = a(() => {
        for (let R = 0, $ = 0; R < 16; R++, $ += 4) w[R] = S[$] << 24 | S[$ + 1] << 16 | S[$ + 2] << 8 | S[$ + 3];
        for (let R = 16; R < 64; R++) {
          let $ = g(w[R - 15], 7) ^ g(w[R - 15], 18) ^ w[R - 15] >>> 3, Ae = g(
            w[R - 2],
            17
          ) ^ g(w[R - 2], 19) ^ w[R - 2] >>> 10;
          w[R] = w[R - 16] + $ + w[R - 7] + Ae | 0;
        }
        let I = e, C = t, ne = n, ie = i, H = s, oe = o, ae = u, we = c;
        for (let R = 0; R < 64; R++) {
          let $ = g(H, 6) ^ g(H, 11) ^ g(H, 25), Ae = H & oe ^ ~H & ae, ue = we + $ + Ae + m[R] + w[R] | 0, Ie = g(I, 2) ^ g(
            I,
            13
          ) ^ g(I, 22), ce = I & C ^ I & ne ^ C & ne, G = Ie + ce | 0;
          we = ae, ae = oe, oe = H, H = ie + ue | 0, ie = ne, ne = C, C = I, I = ue + G | 0;
        }
        e = e + I | 0, t = t + C | 0, n = n + ne | 0, i = i + ie | 0, s = s + H | 0, o = o + oe | 0, u = u + ae | 0, c = c + we | 0, f = 0;
      }, "process"), D = a(
        (I) => {
          typeof I == "string" && (I = new TextEncoder().encode(I));
          for (let C = 0; C < I.length; C++) S[f++] = I[C], f === 64 && k();
          l += I.length;
        },
        "add"
      ), pe = a(() => {
        if (S[f++] = 128, f == 64 && k(), f + 8 > 64) {
          for (; f < 64; ) S[f++] = 0;
          k();
        }
        for (; f < 58; ) S[f++] = 0;
        let I = l * 8;
        S[f++] = I / 1099511627776 & 255, S[f++] = I / 4294967296 & 255, S[f++] = I >>> 24, S[f++] = I >>> 16 & 255, S[f++] = I >>> 8 & 255, S[f++] = I & 255, k();
        let C = new Uint8Array(32);
        return C[0] = e >>> 24, C[1] = e >>> 16 & 255, C[2] = e >>> 8 & 255, C[3] = e & 255, C[4] = t >>> 24, C[5] = t >>> 16 & 255, C[6] = t >>> 8 & 255, C[7] = t & 255, C[8] = n >>> 24, C[9] = n >>> 16 & 255, C[10] = n >>> 8 & 255, C[11] = n & 255, C[12] = i >>> 24, C[13] = i >>> 16 & 255, C[14] = i >>> 8 & 255, C[15] = i & 255, C[16] = s >>> 24, C[17] = s >>> 16 & 255, C[18] = s >>> 8 & 255, C[19] = s & 255, C[20] = o >>> 24, C[21] = o >>> 16 & 255, C[22] = o >>> 8 & 255, C[23] = o & 255, C[24] = u >>> 24, C[25] = u >>> 16 & 255, C[26] = u >>> 8 & 255, C[27] = u & 255, C[28] = c >>> 24, C[29] = c >>> 16 & 255, C[30] = c >>> 8 & 255, C[31] = c & 255, C;
      }, "digest");
      return r === void 0 ? { add: D, digest: pe } : (D(r), pe());
    }
    var as = V(() => {
      "use strict";
      h();
      a(rt, "sha256");
    });
    var M;
    var nt;
    var us = V(() => {
      "use strict";
      h();
      M = class M2 {
        constructor() {
          E(this, "_dataLength", 0);
          E(this, "_bufferLength", 0);
          E(this, "_state", new Int32Array(4));
          E(this, "_buffer", new ArrayBuffer(68));
          E(this, "_buffer8");
          E(this, "_buffer32");
          this._buffer8 = new Uint8Array(this._buffer, 0, 68), this._buffer32 = new Uint32Array(this._buffer, 0, 17), this.start();
        }
        static hashByteArray(e, t = false) {
          return this.onePassHasher.start().appendByteArray(
            e
          ).end(t);
        }
        static hashStr(e, t = false) {
          return this.onePassHasher.start().appendStr(e).end(t);
        }
        static hashAsciiStr(e, t = false) {
          return this.onePassHasher.start().appendAsciiStr(e).end(t);
        }
        static _hex(e) {
          let t = M2.hexChars, n = M2.hexOut, i, s, o, u;
          for (u = 0; u < 4; u += 1) for (s = u * 8, i = e[u], o = 0; o < 8; o += 2) n[s + 1 + o] = t.charAt(i & 15), i >>>= 4, n[s + 0 + o] = t.charAt(
            i & 15
          ), i >>>= 4;
          return n.join("");
        }
        static _md5cycle(e, t) {
          let n = e[0], i = e[1], s = e[2], o = e[3];
          n += (i & s | ~i & o) + t[0] - 680876936 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[1] - 389564586 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[2] + 606105819 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[3] - 1044525330 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[4] - 176418897 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[5] + 1200080426 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[6] - 1473231341 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[7] - 45705983 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[8] + 1770035416 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[9] - 1958414417 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[10] - 42063 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[11] - 1990404162 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[12] + 1804603682 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[13] - 40341101 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[14] - 1502002290 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[15] + 1236535329 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & o | s & ~o) + t[1] - 165796510 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[6] - 1069501632 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[11] + 643717713 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[0] - 373897302 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[5] - 701558691 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[10] + 38016083 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[15] - 660478335 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[4] - 405537848 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[9] + 568446438 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[14] - 1019803690 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[3] - 187363961 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[8] + 1163531501 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[13] - 1444681467 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[2] - 51403784 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[7] + 1735328473 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[12] - 1926607734 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i ^ s ^ o) + t[5] - 378558 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[8] - 2022574463 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[11] + 1839030562 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[14] - 35309556 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[1] - 1530992060 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[4] + 1272893353 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[7] - 155497632 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[10] - 1094730640 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[13] + 681279174 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[0] - 358537222 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[3] - 722521979 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[6] + 76029189 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[9] - 640364487 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[12] - 421815835 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[15] + 530742520 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[2] - 995338651 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (s ^ (i | ~o)) + t[0] - 198630844 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[7] + 1126891415 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[14] - 1416354905 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[5] - 57434055 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[12] + 1700485571 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[3] - 1894986606 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[10] - 1051523 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[1] - 2054922799 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[8] + 1873313359 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[15] - 30611744 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[6] - 1560198380 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[13] + 1309151649 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[4] - 145523070 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[11] - 1120210379 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[2] + 718787259 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[9] - 343485551 | 0, i = (i << 21 | i >>> 11) + s | 0, e[0] = n + e[0] | 0, e[1] = i + e[1] | 0, e[2] = s + e[2] | 0, e[3] = o + e[3] | 0;
        }
        start() {
          return this._dataLength = 0, this._bufferLength = 0, this._state.set(M2.stateIdentity), this;
        }
        appendStr(e) {
          let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o;
          for (o = 0; o < e.length; o += 1) {
            if (s = e.charCodeAt(o), s < 128) t[i++] = s;
            else if (s < 2048) t[i++] = (s >>> 6) + 192, t[i++] = s & 63 | 128;
            else if (s < 55296 || s > 56319) t[i++] = (s >>> 12) + 224, t[i++] = s >>> 6 & 63 | 128, t[i++] = s & 63 | 128;
            else {
              if (s = (s - 55296) * 1024 + (e.charCodeAt(++o) - 56320) + 65536, s > 1114111) throw new Error(
                "Unicode standard supports code points up to U+10FFFF"
              );
              t[i++] = (s >>> 18) + 240, t[i++] = s >>> 12 & 63 | 128, t[i++] = s >>> 6 & 63 | 128, t[i++] = s & 63 | 128;
            }
            i >= 64 && (this._dataLength += 64, M2._md5cycle(this._state, n), i -= 64, n[0] = n[16]);
          }
          return this._bufferLength = i, this;
        }
        appendAsciiStr(e) {
          let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o = 0;
          for (; ; ) {
            for (s = Math.min(e.length - o, 64 - i); s--; ) t[i++] = e.charCodeAt(o++);
            if (i < 64) break;
            this._dataLength += 64, M2._md5cycle(this._state, n), i = 0;
          }
          return this._bufferLength = i, this;
        }
        appendByteArray(e) {
          let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o = 0;
          for (; ; ) {
            for (s = Math.min(e.length - o, 64 - i); s--; ) t[i++] = e[o++];
            if (i < 64) break;
            this._dataLength += 64, M2._md5cycle(this._state, n), i = 0;
          }
          return this._bufferLength = i, this;
        }
        getState() {
          let e = this._state;
          return { buffer: String.fromCharCode.apply(null, Array.from(this._buffer8)), buflen: this._bufferLength, length: this._dataLength, state: [e[0], e[1], e[2], e[3]] };
        }
        setState(e) {
          let t = e.buffer, n = e.state, i = this._state, s;
          for (this._dataLength = e.length, this._bufferLength = e.buflen, i[0] = n[0], i[1] = n[1], i[2] = n[2], i[3] = n[3], s = 0; s < t.length; s += 1) this._buffer8[s] = t.charCodeAt(s);
        }
        end(e = false) {
          let t = this._bufferLength, n = this._buffer8, i = this._buffer32, s = (t >> 2) + 1;
          this._dataLength += t;
          let o = this._dataLength * 8;
          if (n[t] = 128, n[t + 1] = n[t + 2] = n[t + 3] = 0, i.set(M2.buffer32Identity.subarray(s), s), t > 55 && (M2._md5cycle(this._state, i), i.set(M2.buffer32Identity)), o <= 4294967295) i[14] = o;
          else {
            let u = o.toString(16).match(/(.*?)(.{0,8})$/);
            if (u === null) return;
            let c = parseInt(
              u[2],
              16
            ), l = parseInt(u[1], 16) || 0;
            i[14] = c, i[15] = l;
          }
          return M2._md5cycle(this._state, i), e ? this._state : M2._hex(
            this._state
          );
        }
      };
      a(M, "Md5"), E(M, "stateIdentity", new Int32Array([1732584193, -271733879, -1732584194, 271733878])), E(M, "buffer32Identity", new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), E(M, "hexChars", "0123456789abcdef"), E(M, "hexOut", []), E(M, "onePassHasher", new M());
      nt = M;
    });
    var hr = {};
    X(hr, { createHash: () => Ru, createHmac: () => Lu, randomBytes: () => Pu });
    function Pu(r) {
      return crypto.getRandomValues(p.alloc(r));
    }
    function Ru(r) {
      if (r === "sha256") return { update: a(function(e) {
        return { digest: a(
          function() {
            return p.from(rt(e));
          },
          "digest"
        ) };
      }, "update") };
      if (r === "md5") return { update: a(function(e) {
        return {
          digest: a(function() {
            return typeof e == "string" ? nt.hashStr(e) : nt.hashByteArray(e);
          }, "digest")
        };
      }, "update") };
      throw new Error(`Hash type '${r}' not supported`);
    }
    function Lu(r, e) {
      if (r !== "sha256") throw new Error(`Only sha256 is supported (requested: '${r}')`);
      return { update: a(function(t) {
        return { digest: a(
          function() {
            typeof e == "string" && (e = new TextEncoder().encode(e)), typeof t == "string" && (t = new TextEncoder().encode(
              t
            ));
            let n = e.length;
            if (n > 64) e = rt(e);
            else if (n < 64) {
              let c = new Uint8Array(64);
              c.set(e), e = c;
            }
            let i = new Uint8Array(
              64
            ), s = new Uint8Array(64);
            for (let c = 0; c < 64; c++) i[c] = 54 ^ e[c], s[c] = 92 ^ e[c];
            let o = new Uint8Array(t.length + 64);
            o.set(i, 0), o.set(t, 64);
            let u = new Uint8Array(96);
            return u.set(s, 0), u.set(rt(o), 64), p.from(rt(u));
          },
          "digest"
        ) };
      }, "update") };
    }
    var dr = V(() => {
      "use strict";
      h();
      as();
      us();
      a(Pu, "randomBytes");
      a(Ru, "createHash");
      a(Lu, "createHmac");
    });
    var it = T((Eh, pr) => {
      "use strict";
      h();
      pr.exports = {
        host: "localhost",
        user: y.platform === "win32" ? y.env.USERNAME : y.env.USER,
        database: void 0,
        password: null,
        connectionString: void 0,
        port: 5432,
        rows: 0,
        binary: false,
        max: 10,
        idleTimeoutMillis: 3e4,
        client_encoding: "",
        ssl: false,
        application_name: void 0,
        fallback_application_name: void 0,
        options: void 0,
        parseInputDatesAsUTC: false,
        statement_timeout: false,
        lock_timeout: false,
        idle_in_transaction_session_timeout: false,
        query_timeout: false,
        connect_timeout: 0,
        keepalives: 1,
        keepalives_idle: 0
      };
      var Qe = tt(), Bu = Qe.getTypeParser(20, "text"), Fu = Qe.getTypeParser(
        1016,
        "text"
      );
      pr.exports.__defineSetter__("parseInt8", function(r) {
        Qe.setTypeParser(20, "text", r ? Qe.getTypeParser(
          23,
          "text"
        ) : Bu), Qe.setTypeParser(1016, "text", r ? Qe.getTypeParser(1007, "text") : Fu);
      });
    });
    var st = T((Ch, ls) => {
      "use strict";
      h();
      var Mu = (dr(), O(hr)), ku = it();
      function Ou(r) {
        var e = r.replace(
          /\\/g,
          "\\\\"
        ).replace(/"/g, '\\"');
        return '"' + e + '"';
      }
      a(Ou, "escapeElement");
      function cs(r) {
        for (var e = "{", t = 0; t < r.length; t++) t > 0 && (e = e + ","), r[t] === null || typeof r[t] > "u" ? e = e + "NULL" : Array.isArray(r[t]) ? e = e + cs(r[t]) : r[t] instanceof p ? e += "\\\\x" + r[t].toString("hex") : e += Ou(Tt(r[t]));
        return e = e + "}", e;
      }
      a(cs, "arrayString");
      var Tt = a(function(r, e) {
        if (r == null) return null;
        if (r instanceof p) return r;
        if (ArrayBuffer.isView(r)) {
          var t = p.from(r.buffer, r.byteOffset, r.byteLength);
          return t.length === r.byteLength ? t : t.slice(r.byteOffset, r.byteOffset + r.byteLength);
        }
        return r instanceof Date ? ku.parseInputDatesAsUTC ? Du(r) : Qu(r) : Array.isArray(r) ? cs(r) : typeof r == "object" ? Uu(r, e) : r.toString();
      }, "prepareValue");
      function Uu(r, e) {
        if (r && typeof r.toPostgres == "function") {
          if (e = e || [], e.indexOf(r) !== -1) throw new Error('circular reference detected while preparing "' + r + '" for query');
          return e.push(r), Tt(r.toPostgres(Tt), e);
        }
        return JSON.stringify(r);
      }
      a(Uu, "prepareObject");
      function W(r, e) {
        for (r = "" + r; r.length < e; ) r = "0" + r;
        return r;
      }
      a(W, "pad");
      function Qu(r) {
        var e = -r.getTimezoneOffset(), t = r.getFullYear(), n = t < 1;
        n && (t = Math.abs(t) + 1);
        var i = W(t, 4) + "-" + W(r.getMonth() + 1, 2) + "-" + W(r.getDate(), 2) + "T" + W(
          r.getHours(),
          2
        ) + ":" + W(r.getMinutes(), 2) + ":" + W(r.getSeconds(), 2) + "." + W(r.getMilliseconds(), 3);
        return e < 0 ? (i += "-", e *= -1) : i += "+", i += W(Math.floor(e / 60), 2) + ":" + W(e % 60, 2), n && (i += " BC"), i;
      }
      a(Qu, "dateToString");
      function Du(r) {
        var e = r.getUTCFullYear(), t = e < 1;
        t && (e = Math.abs(e) + 1);
        var n = W(e, 4) + "-" + W(r.getUTCMonth() + 1, 2) + "-" + W(r.getUTCDate(), 2) + "T" + W(r.getUTCHours(), 2) + ":" + W(r.getUTCMinutes(), 2) + ":" + W(r.getUTCSeconds(), 2) + "." + W(
          r.getUTCMilliseconds(),
          3
        );
        return n += "+00:00", t && (n += " BC"), n;
      }
      a(Du, "dateToStringUTC");
      function qu(r, e, t) {
        return r = typeof r == "string" ? { text: r } : r, e && (typeof e == "function" ? r.callback = e : r.values = e), t && (r.callback = t), r;
      }
      a(qu, "normalizeQueryConfig");
      var yr = a(function(r) {
        return Mu.createHash("md5").update(r, "utf-8").digest("hex");
      }, "md5"), Nu = a(
        function(r, e, t) {
          var n = yr(e + r), i = yr(p.concat([p.from(n), t]));
          return "md5" + i;
        },
        "postgresMd5PasswordHash"
      );
      ls.exports = {
        prepareValue: a(function(e) {
          return Tt(e);
        }, "prepareValueWrapper"),
        normalizeQueryConfig: qu,
        postgresMd5PasswordHash: Nu,
        md5: yr
      };
    });
    var ot = {};
    X(ot, { default: () => Hu });
    var Hu;
    var at = V(() => {
      "use strict";
      h();
      Hu = {};
    });
    var xs = T((Nh, bs) => {
      "use strict";
      h();
      var gr = (dr(), O(hr));
      function $u(r) {
        if (r.indexOf("SCRAM-SHA-256") === -1) throw new Error("SASL: Only mechanism SCRAM-SHA-256 is currently supported");
        let e = gr.randomBytes(
          18
        ).toString("base64");
        return { mechanism: "SCRAM-SHA-256", clientNonce: e, response: "n,,n=*,r=" + e, message: "SASLInitialResponse" };
      }
      a($u, "startSession");
      function Gu(r, e, t) {
        if (r.message !== "SASLInitialResponse") throw new Error(
          "SASL: Last message was not SASLInitialResponse"
        );
        if (typeof e != "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
        if (typeof t != "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
        let n = Ku(t);
        if (n.nonce.startsWith(r.clientNonce)) {
          if (n.nonce.length === r.clientNonce.length) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
        var i = p.from(n.salt, "base64"), s = Ju(e, i, n.iteration), o = De(s, "Client Key"), u = Zu(
          o
        ), c = "n=*,r=" + r.clientNonce, l = "r=" + n.nonce + ",s=" + n.salt + ",i=" + n.iteration, f = "c=biws,r=" + n.nonce, m = c + "," + l + "," + f, g = De(u, m), w = ws(o, g), S = w.toString("base64"), k = De(s, "Server Key"), D = De(k, m);
        r.message = "SASLResponse", r.serverSignature = D.toString("base64"), r.response = f + ",p=" + S;
      }
      a(Gu, "continueSession");
      function Vu(r, e) {
        if (r.message !== "SASLResponse") throw new Error("SASL: Last message was not SASLResponse");
        if (typeof e != "string") throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
        let { serverSignature: t } = Yu(
          e
        );
        if (t !== r.serverSignature) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
      a(Vu, "finalizeSession");
      function zu(r) {
        if (typeof r != "string") throw new TypeError("SASL: text must be a string");
        return r.split("").map((e, t) => r.charCodeAt(t)).every((e) => e >= 33 && e <= 43 || e >= 45 && e <= 126);
      }
      a(zu, "isPrintableChars");
      function ms(r) {
        return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(r);
      }
      a(ms, "isBase64");
      function gs(r) {
        if (typeof r != "string") throw new TypeError("SASL: attribute pairs text must be a string");
        return new Map(r.split(",").map((e) => {
          if (!/^.=/.test(e)) throw new Error("SASL: Invalid attribute pair entry");
          let t = e[0], n = e.substring(2);
          return [t, n];
        }));
      }
      a(gs, "parseAttributePairs");
      function Ku(r) {
        let e = gs(r), t = e.get("r");
        if (t) {
          if (!zu(t)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
        let n = e.get("s");
        if (n) {
          if (!ms(n)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
        let i = e.get("i");
        if (i) {
          if (!/^[1-9][0-9]*$/.test(i)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
        let s = parseInt(i, 10);
        return { nonce: t, salt: n, iteration: s };
      }
      a(Ku, "parseServerFirstMessage");
      function Yu(r) {
        let t = gs(r).get("v");
        if (t) {
          if (!ms(t)) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
        } else throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
        return { serverSignature: t };
      }
      a(Yu, "parseServerFinalMessage");
      function ws(r, e) {
        if (!p.isBuffer(r)) throw new TypeError("first argument must be a Buffer");
        if (!p.isBuffer(e)) throw new TypeError(
          "second argument must be a Buffer"
        );
        if (r.length !== e.length) throw new Error("Buffer lengths must match");
        if (r.length === 0) throw new Error("Buffers cannot be empty");
        return p.from(r.map((t, n) => r[n] ^ e[n]));
      }
      a(ws, "xorBuffers");
      function Zu(r) {
        return gr.createHash("sha256").update(r).digest();
      }
      a(Zu, "sha256");
      function De(r, e) {
        return gr.createHmac("sha256", r).update(e).digest();
      }
      a(De, "hmacSha256");
      function Ju(r, e, t) {
        for (var n = De(
          r,
          p.concat([e, p.from([0, 0, 0, 1])])
        ), i = n, s = 0; s < t - 1; s++) n = De(r, n), i = ws(i, n);
        return i;
      }
      a(Ju, "Hi");
      bs.exports = { startSession: $u, continueSession: Gu, finalizeSession: Vu };
    });
    var wr = {};
    X(wr, { join: () => Xu });
    function Xu(...r) {
      return r.join("/");
    }
    var br = V(() => {
      "use strict";
      h();
      a(
        Xu,
        "join"
      );
    });
    var xr = {};
    X(xr, { stat: () => ec });
    function ec(r, e) {
      e(new Error("No filesystem"));
    }
    var vr = V(() => {
      "use strict";
      h();
      a(ec, "stat");
    });
    var Sr = {};
    X(Sr, { default: () => tc });
    var tc;
    var Er = V(() => {
      "use strict";
      h();
      tc = {};
    });
    var vs = {};
    X(vs, { StringDecoder: () => Ar });
    var Cr;
    var Ar;
    var Ss = V(() => {
      "use strict";
      h();
      Cr = class Cr {
        constructor(e) {
          E(this, "td");
          this.td = new TextDecoder(e);
        }
        write(e) {
          return this.td.decode(e, { stream: true });
        }
        end(e) {
          return this.td.decode(e);
        }
      };
      a(Cr, "StringDecoder");
      Ar = Cr;
    });
    var _s = T((Zh, Cs) => {
      "use strict";
      h();
      var { Transform: rc } = (Er(), O(Sr)), { StringDecoder: nc } = (Ss(), O(vs)), Ee = Symbol(
        "last"
      ), It = Symbol("decoder");
      function ic(r, e, t) {
        let n;
        if (this.overflow) {
          if (n = this[It].write(r).split(
            this.matcher
          ), n.length === 1) return t();
          n.shift(), this.overflow = false;
        } else this[Ee] += this[It].write(r), n = this[Ee].split(this.matcher);
        this[Ee] = n.pop();
        for (let i = 0; i < n.length; i++) try {
          As(this, this.mapper(n[i]));
        } catch (s) {
          return t(s);
        }
        if (this.overflow = this[Ee].length > this.maxLength, this.overflow && !this.skipOverflow) {
          t(new Error(
            "maximum buffer reached"
          ));
          return;
        }
        t();
      }
      a(ic, "transform");
      function sc(r) {
        if (this[Ee] += this[It].end(), this[Ee])
          try {
            As(this, this.mapper(this[Ee]));
          } catch (e) {
            return r(e);
          }
        r();
      }
      a(sc, "flush");
      function As(r, e) {
        e !== void 0 && r.push(e);
      }
      a(As, "push");
      function Es(r) {
        return r;
      }
      a(Es, "noop");
      function oc(r, e, t) {
        switch (r = r || /\r?\n/, e = e || Es, t = t || {}, arguments.length) {
          case 1:
            typeof r == "function" ? (e = r, r = /\r?\n/) : typeof r == "object" && !(r instanceof RegExp) && !r[Symbol.split] && (t = r, r = /\r?\n/);
            break;
          case 2:
            typeof r == "function" ? (t = e, e = r, r = /\r?\n/) : typeof e == "object" && (t = e, e = Es);
        }
        t = Object.assign({}, t), t.autoDestroy = true, t.transform = ic, t.flush = sc, t.readableObjectMode = true;
        let n = new rc(t);
        return n[Ee] = "", n[It] = new nc("utf8"), n.matcher = r, n.mapper = e, n.maxLength = t.maxLength, n.skipOverflow = t.skipOverflow || false, n.overflow = false, n._destroy = function(i, s) {
          this._writableState.errorEmitted = false, s(i);
        }, n;
      }
      a(oc, "split");
      Cs.exports = oc;
    });
    var Ps = T((ed, ge) => {
      "use strict";
      h();
      var Ts = (br(), O(wr)), ac = (Er(), O(Sr)).Stream, uc = _s(), Is = (at(), O(ot)), cc = 5432, Pt = y.platform === "win32", ut = y.stderr, lc = 56, fc = 7, hc = 61440, dc = 32768;
      function pc(r) {
        return (r & hc) == dc;
      }
      a(pc, "isRegFile");
      var qe = ["host", "port", "database", "user", "password"], _r = qe.length, yc = qe[_r - 1];
      function Tr() {
        var r = ut instanceof ac && ut.writable === true;
        if (r) {
          var e = Array.prototype.slice.call(arguments).concat(`
`);
          ut.write(Is.format.apply(Is, e));
        }
      }
      a(Tr, "warn");
      Object.defineProperty(ge.exports, "isWin", { get: a(function() {
        return Pt;
      }, "get"), set: a(function(r) {
        Pt = r;
      }, "set") });
      ge.exports.warnTo = function(r) {
        var e = ut;
        return ut = r, e;
      };
      ge.exports.getFileName = function(r) {
        var e = r || y.env, t = e.PGPASSFILE || (Pt ? Ts.join(e.APPDATA || "./", "postgresql", "pgpass.conf") : Ts.join(e.HOME || "./", ".pgpass"));
        return t;
      };
      ge.exports.usePgPass = function(r, e) {
        return Object.prototype.hasOwnProperty.call(y.env, "PGPASSWORD") ? false : Pt ? true : (e = e || "<unkn>", pc(r.mode) ? r.mode & (lc | fc) ? (Tr('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', e), false) : true : (Tr('WARNING: password file "%s" is not a plain file', e), false));
      };
      var mc = ge.exports.match = function(r, e) {
        return qe.slice(0, -1).reduce(function(t, n, i) {
          return i == 1 && Number(r[n] || cc) === Number(
            e[n]
          ) ? t && true : t && (e[n] === "*" || e[n] === r[n]);
        }, true);
      };
      ge.exports.getPassword = function(r, e, t) {
        var n, i = e.pipe(
          uc()
        );
        function s(c) {
          var l = gc(c);
          l && wc(l) && mc(r, l) && (n = l[yc], i.end());
        }
        a(s, "onLine");
        var o = a(function() {
          e.destroy(), t(n);
        }, "onEnd"), u = a(function(c) {
          e.destroy(), Tr("WARNING: error on reading file: %s", c), t(
            void 0
          );
        }, "onErr");
        e.on("error", u), i.on("data", s).on("end", o).on("error", u);
      };
      var gc = ge.exports.parseLine = function(r) {
        if (r.length < 11 || r.match(/^\s+#/)) return null;
        for (var e = "", t = "", n = 0, i = 0, s = 0, o = {}, u = false, c = a(
          function(f, m, g) {
            var w = r.substring(m, g);
            Object.hasOwnProperty.call(y.env, "PGPASS_NO_DEESCAPE") || (w = w.replace(/\\([:\\])/g, "$1")), o[qe[f]] = w;
          },
          "addToObj"
        ), l = 0; l < r.length - 1; l += 1) {
          if (e = r.charAt(l + 1), t = r.charAt(
            l
          ), u = n == _r - 1, u) {
            c(n, i);
            break;
          }
          l >= 0 && e == ":" && t !== "\\" && (c(n, i, l + 1), i = l + 2, n += 1);
        }
        return o = Object.keys(o).length === _r ? o : null, o;
      }, wc = ge.exports.isValidEntry = function(r) {
        for (var e = { 0: function(o) {
          return o.length > 0;
        }, 1: function(o) {
          return o === "*" ? true : (o = Number(o), isFinite(o) && o > 0 && o < 9007199254740992 && Math.floor(o) === o);
        }, 2: function(o) {
          return o.length > 0;
        }, 3: function(o) {
          return o.length > 0;
        }, 4: function(o) {
          return o.length > 0;
        } }, t = 0; t < qe.length; t += 1) {
          var n = e[t], i = r[qe[t]] || "", s = n(i);
          if (!s) return false;
        }
        return true;
      };
    });
    var Ls = T((id, Ir) => {
      "use strict";
      h();
      var nd = (br(), O(wr)), Rs = (vr(), O(xr)), Rt = Ps();
      Ir.exports = function(r, e) {
        var t = Rt.getFileName();
        Rs.stat(t, function(n, i) {
          if (n || !Rt.usePgPass(i, t)) return e(void 0);
          var s = Rs.createReadStream(
            t
          );
          Rt.getPassword(r, s, e);
        });
      };
      Ir.exports.warnTo = Rt.warnTo;
    });
    var Bs = {};
    X(Bs, { default: () => bc });
    var bc;
    var Fs = V(() => {
      "use strict";
      h();
      bc = {};
    });
    var Ms = {};
    X(Ms, { parse: () => xc });
    function xc(r, e = false) {
      let { protocol: t } = new URL(r), n = "http:" + r.substring(
        t.length
      ), { username: i, password: s, host: o, hostname: u, port: c, pathname: l, search: f, searchParams: m, hash: g } = new URL(
        n
      );
      s = decodeURIComponent(s), i = decodeURIComponent(i), l = decodeURIComponent(l);
      let w = i + ":" + s, S = e ? Object.fromEntries(m.entries()) : f;
      return {
        href: r,
        protocol: t,
        auth: w,
        username: i,
        password: s,
        host: o,
        hostname: u,
        port: c,
        pathname: l,
        search: f,
        query: S,
        hash: g
      };
    }
    var ks = V(() => {
      "use strict";
      h();
      a(xc, "parse");
    });
    var Lr = T((cd, Os) => {
      "use strict";
      h();
      var vc = (ks(), O(Ms)), Pr = (vr(), O(xr));
      function Rr(r) {
        if (r.charAt(0) === "/") {
          var t = r.split(" ");
          return { host: t[0], database: t[1] };
        }
        var e = vc.parse(/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(r) ? encodeURI(r).replace(/\%25(\d\d)/g, "%$1") : r, true), t = e.query;
        for (var n in t) Array.isArray(t[n]) && (t[n] = t[n][t[n].length - 1]);
        var i = (e.auth || ":").split(":");
        if (t.user = i[0], t.password = i.splice(1).join(
          ":"
        ), t.port = e.port, e.protocol == "socket:") return t.host = decodeURI(e.pathname), t.database = e.query.db, t.client_encoding = e.query.encoding, t;
        t.host || (t.host = e.hostname);
        var s = e.pathname;
        if (!t.host && s && /^%2f/i.test(s)) {
          var o = s.split("/");
          t.host = decodeURIComponent(o[0]), s = o.splice(1).join("/");
        }
        switch (s && s.charAt(
          0
        ) === "/" && (s = s.slice(1) || null), t.database = s && decodeURI(s), (t.ssl === "true" || t.ssl === "1") && (t.ssl = true), t.ssl === "0" && (t.ssl = false), (t.sslcert || t.sslkey || t.sslrootcert || t.sslmode) && (t.ssl = {}), t.sslcert && (t.ssl.cert = Pr.readFileSync(t.sslcert).toString()), t.sslkey && (t.ssl.key = Pr.readFileSync(t.sslkey).toString()), t.sslrootcert && (t.ssl.ca = Pr.readFileSync(t.sslrootcert).toString()), t.sslmode) {
          case "disable": {
            t.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full":
            break;
          case "no-verify": {
            t.ssl.rejectUnauthorized = false;
            break;
          }
        }
        return t;
      }
      a(Rr, "parse");
      Os.exports = Rr;
      Rr.parse = Rr;
    });
    var Lt = T((hd, Ds) => {
      "use strict";
      h();
      var Sc = (Fs(), O(Bs)), Qs = it(), Us = Lr().parse, j = a(function(r, e, t) {
        return t === void 0 ? t = y.env["PG" + r.toUpperCase()] : t === false || (t = y.env[t]), e[r] || t || Qs[r];
      }, "val"), Ec = a(function() {
        switch (y.env.PGSSLMODE) {
          case "disable":
            return false;
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full":
            return true;
          case "no-verify":
            return { rejectUnauthorized: false };
        }
        return Qs.ssl;
      }, "readSSLConfigFromEnvironment"), Ne = a(function(r) {
        return "'" + ("" + r).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
      }, "quoteParamValue"), re = a(function(r, e, t) {
        var n = e[t];
        n != null && r.push(t + "=" + Ne(n));
      }, "add"), Fr = class Fr {
        constructor(e) {
          e = typeof e == "string" ? Us(e) : e || {}, e.connectionString && (e = Object.assign({}, e, Us(e.connectionString))), this.user = j("user", e), this.database = j("database", e), this.database === void 0 && (this.database = this.user), this.port = parseInt(j("port", e), 10), this.host = j("host", e), Object.defineProperty(this, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: j("password", e)
          }), this.binary = j("binary", e), this.options = j("options", e), this.ssl = typeof e.ssl > "u" ? Ec() : e.ssl, typeof this.ssl == "string" && this.ssl === "true" && (this.ssl = true), this.ssl === "no-verify" && (this.ssl = { rejectUnauthorized: false }), this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this.client_encoding = j("client_encoding", e), this.replication = j("replication", e), this.isDomainSocket = !(this.host || "").indexOf("/"), this.application_name = j("application_name", e, "PGAPPNAME"), this.fallback_application_name = j("fallback_application_name", e, false), this.statement_timeout = j("statement_timeout", e, false), this.lock_timeout = j("lock_timeout", e, false), this.idle_in_transaction_session_timeout = j("idle_in_transaction_session_timeout", e, false), this.query_timeout = j("query_timeout", e, false), e.connectionTimeoutMillis === void 0 ? this.connect_timeout = y.env.PGCONNECT_TIMEOUT || 0 : this.connect_timeout = Math.floor(e.connectionTimeoutMillis / 1e3), e.keepAlive === false ? this.keepalives = 0 : e.keepAlive === true && (this.keepalives = 1), typeof e.keepAliveInitialDelayMillis == "number" && (this.keepalives_idle = Math.floor(e.keepAliveInitialDelayMillis / 1e3));
        }
        getLibpqConnectionString(e) {
          var t = [];
          re(t, this, "user"), re(t, this, "password"), re(t, this, "port"), re(t, this, "application_name"), re(
            t,
            this,
            "fallback_application_name"
          ), re(t, this, "connect_timeout"), re(t, this, "options");
          var n = typeof this.ssl == "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
          if (re(t, n, "sslmode"), re(t, n, "sslca"), re(t, n, "sslkey"), re(t, n, "sslcert"), re(t, n, "sslrootcert"), this.database && t.push("dbname=" + Ne(this.database)), this.replication && t.push("replication=" + Ne(this.replication)), this.host && t.push("host=" + Ne(this.host)), this.isDomainSocket) return e(null, t.join(" "));
          this.client_encoding && t.push("client_encoding=" + Ne(this.client_encoding)), Sc.lookup(this.host, function(i, s) {
            return i ? e(i, null) : (t.push("hostaddr=" + Ne(s)), e(null, t.join(" ")));
          });
        }
      };
      a(Fr, "ConnectionParameters");
      var Br = Fr;
      Ds.exports = Br;
    });
    var Ws = T((yd, Ns) => {
      "use strict";
      h();
      var Ac = tt(), qs = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/, kr = class kr {
        constructor(e, t) {
          this.command = null, this.rowCount = null, this.oid = null, this.rows = [], this.fields = [], this._parsers = void 0, this._types = t, this.RowCtor = null, this.rowAsArray = e === "array", this.rowAsArray && (this.parseRow = this._parseRowAsArray);
        }
        addCommandComplete(e) {
          var t;
          e.text ? t = qs.exec(e.text) : t = qs.exec(e.command), t && (this.command = t[1], t[3] ? (this.oid = parseInt(
            t[2],
            10
          ), this.rowCount = parseInt(t[3], 10)) : t[2] && (this.rowCount = parseInt(t[2], 10)));
        }
        _parseRowAsArray(e) {
          for (var t = new Array(
            e.length
          ), n = 0, i = e.length; n < i; n++) {
            var s = e[n];
            s !== null ? t[n] = this._parsers[n](s) : t[n] = null;
          }
          return t;
        }
        parseRow(e) {
          for (var t = {}, n = 0, i = e.length; n < i; n++) {
            var s = e[n], o = this.fields[n].name;
            s !== null ? t[o] = this._parsers[n](
              s
            ) : t[o] = null;
          }
          return t;
        }
        addRow(e) {
          this.rows.push(e);
        }
        addFields(e) {
          this.fields = e, this.fields.length && (this._parsers = new Array(e.length));
          for (var t = 0; t < e.length; t++) {
            var n = e[t];
            this._types ? this._parsers[t] = this._types.getTypeParser(n.dataTypeID, n.format || "text") : this._parsers[t] = Ac.getTypeParser(n.dataTypeID, n.format || "text");
          }
        }
      };
      a(kr, "Result");
      var Mr = kr;
      Ns.exports = Mr;
    });
    var Gs = T((wd, $s) => {
      "use strict";
      h();
      var { EventEmitter: Cc } = Se(), js = Ws(), Hs = st(), Ur = class Ur extends Cc {
        constructor(e, t, n) {
          super(), e = Hs.normalizeQueryConfig(e, t, n), this.text = e.text, this.values = e.values, this.rows = e.rows, this.types = e.types, this.name = e.name, this.binary = e.binary, this.portal = e.portal || "", this.callback = e.callback, this._rowMode = e.rowMode, y.domain && e.callback && (this.callback = y.domain.bind(e.callback)), this._result = new js(this._rowMode, this.types), this._results = this._result, this.isPreparedStatement = false, this._canceledDueToError = false, this._promise = null;
        }
        requiresPreparation() {
          return this.name || this.rows ? true : !this.text || !this.values ? false : this.values.length > 0;
        }
        _checkForMultirow() {
          this._result.command && (Array.isArray(this._results) || (this._results = [this._result]), this._result = new js(this._rowMode, this.types), this._results.push(this._result));
        }
        handleRowDescription(e) {
          this._checkForMultirow(), this._result.addFields(e.fields), this._accumulateRows = this.callback || !this.listeners("row").length;
        }
        handleDataRow(e) {
          let t;
          if (!this._canceledDueToError) {
            try {
              t = this._result.parseRow(
                e.fields
              );
            } catch (n) {
              this._canceledDueToError = n;
              return;
            }
            this.emit("row", t, this._result), this._accumulateRows && this._result.addRow(t);
          }
        }
        handleCommandComplete(e, t) {
          this._checkForMultirow(), this._result.addCommandComplete(
            e
          ), this.rows && t.sync();
        }
        handleEmptyQuery(e) {
          this.rows && e.sync();
        }
        handleError(e, t) {
          if (this._canceledDueToError && (e = this._canceledDueToError, this._canceledDueToError = false), this.callback) return this.callback(e);
          this.emit("error", e);
        }
        handleReadyForQuery(e) {
          if (this._canceledDueToError) return this.handleError(
            this._canceledDueToError,
            e
          );
          if (this.callback) try {
            this.callback(null, this._results);
          } catch (t) {
            y.nextTick(() => {
              throw t;
            });
          }
          this.emit(
            "end",
            this._results
          );
        }
        submit(e) {
          if (typeof this.text != "string" && typeof this.name != "string") return new Error(
            "A query must have either text or a name. Supplying neither is unsupported."
          );
          let t = e.parsedStatements[this.name];
          return this.text && t && this.text !== t ? new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`) : this.values && !Array.isArray(this.values) ? new Error("Query values must be an array") : (this.requiresPreparation() ? this.prepare(e) : e.query(this.text), null);
        }
        hasBeenParsed(e) {
          return this.name && e.parsedStatements[this.name];
        }
        handlePortalSuspended(e) {
          this._getRows(e, this.rows);
        }
        _getRows(e, t) {
          e.execute({ portal: this.portal, rows: t }), t ? e.flush() : e.sync();
        }
        prepare(e) {
          this.isPreparedStatement = true, this.hasBeenParsed(e) || e.parse({ text: this.text, name: this.name, types: this.types });
          try {
            e.bind({ portal: this.portal, statement: this.name, values: this.values, binary: this.binary, valueMapper: Hs.prepareValue });
          } catch (t) {
            this.handleError(t, e);
            return;
          }
          e.describe({ type: "P", name: this.portal || "" }), this._getRows(e, this.rows);
        }
        handleCopyInResponse(e) {
          e.sendCopyFail("No source stream defined");
        }
        handleCopyData(e, t) {
        }
      };
      a(Ur, "Query");
      var Or = Ur;
      $s.exports = Or;
    });
    var dn = T((_) => {
      "use strict";
      h();
      Object.defineProperty(_, "__esModule", { value: true });
      _.NoticeMessage = _.DataRowMessage = _.CommandCompleteMessage = _.ReadyForQueryMessage = _.NotificationResponseMessage = _.BackendKeyDataMessage = _.AuthenticationMD5Password = _.ParameterStatusMessage = _.ParameterDescriptionMessage = _.RowDescriptionMessage = _.Field = _.CopyResponse = _.CopyDataMessage = _.DatabaseError = _.copyDone = _.emptyQuery = _.replicationStart = _.portalSuspended = _.noData = _.closeComplete = _.bindComplete = _.parseComplete = void 0;
      _.parseComplete = { name: "parseComplete", length: 5 };
      _.bindComplete = { name: "bindComplete", length: 5 };
      _.closeComplete = { name: "closeComplete", length: 5 };
      _.noData = { name: "noData", length: 5 };
      _.portalSuspended = { name: "portalSuspended", length: 5 };
      _.replicationStart = { name: "replicationStart", length: 4 };
      _.emptyQuery = { name: "emptyQuery", length: 4 };
      _.copyDone = { name: "copyDone", length: 4 };
      var Jr = class Jr extends Error {
        constructor(e, t, n) {
          super(e), this.length = t, this.name = n;
        }
      };
      a(Jr, "DatabaseError");
      var Qr = Jr;
      _.DatabaseError = Qr;
      var Xr = class Xr {
        constructor(e, t) {
          this.length = e, this.chunk = t, this.name = "copyData";
        }
      };
      a(Xr, "CopyDataMessage");
      var Dr = Xr;
      _.CopyDataMessage = Dr;
      var en = class en {
        constructor(e, t, n, i) {
          this.length = e, this.name = t, this.binary = n, this.columnTypes = new Array(i);
        }
      };
      a(en, "CopyResponse");
      var qr = en;
      _.CopyResponse = qr;
      var tn = class tn {
        constructor(e, t, n, i, s, o, u) {
          this.name = e, this.tableID = t, this.columnID = n, this.dataTypeID = i, this.dataTypeSize = s, this.dataTypeModifier = o, this.format = u;
        }
      };
      a(tn, "Field");
      var Nr = tn;
      _.Field = Nr;
      var rn = class rn {
        constructor(e, t) {
          this.length = e, this.fieldCount = t, this.name = "rowDescription", this.fields = new Array(this.fieldCount);
        }
      };
      a(rn, "RowDescriptionMessage");
      var Wr = rn;
      _.RowDescriptionMessage = Wr;
      var nn = class nn {
        constructor(e, t) {
          this.length = e, this.parameterCount = t, this.name = "parameterDescription", this.dataTypeIDs = new Array(this.parameterCount);
        }
      };
      a(nn, "ParameterDescriptionMessage");
      var jr = nn;
      _.ParameterDescriptionMessage = jr;
      var sn = class sn {
        constructor(e, t, n) {
          this.length = e, this.parameterName = t, this.parameterValue = n, this.name = "parameterStatus";
        }
      };
      a(sn, "ParameterStatusMessage");
      var Hr = sn;
      _.ParameterStatusMessage = Hr;
      var on = class on {
        constructor(e, t) {
          this.length = e, this.salt = t, this.name = "authenticationMD5Password";
        }
      };
      a(on, "AuthenticationMD5Password");
      var $r = on;
      _.AuthenticationMD5Password = $r;
      var an = class an {
        constructor(e, t, n) {
          this.length = e, this.processID = t, this.secretKey = n, this.name = "backendKeyData";
        }
      };
      a(an, "BackendKeyDataMessage");
      var Gr = an;
      _.BackendKeyDataMessage = Gr;
      var un = class un {
        constructor(e, t, n, i) {
          this.length = e, this.processId = t, this.channel = n, this.payload = i, this.name = "notification";
        }
      };
      a(un, "NotificationResponseMessage");
      var Vr = un;
      _.NotificationResponseMessage = Vr;
      var cn = class cn {
        constructor(e, t) {
          this.length = e, this.status = t, this.name = "readyForQuery";
        }
      };
      a(cn, "ReadyForQueryMessage");
      var zr = cn;
      _.ReadyForQueryMessage = zr;
      var ln = class ln {
        constructor(e, t) {
          this.length = e, this.text = t, this.name = "commandComplete";
        }
      };
      a(ln, "CommandCompleteMessage");
      var Kr = ln;
      _.CommandCompleteMessage = Kr;
      var fn = class fn {
        constructor(e, t) {
          this.length = e, this.fields = t, this.name = "dataRow", this.fieldCount = t.length;
        }
      };
      a(fn, "DataRowMessage");
      var Yr = fn;
      _.DataRowMessage = Yr;
      var hn = class hn {
        constructor(e, t) {
          this.length = e, this.message = t, this.name = "notice";
        }
      };
      a(hn, "NoticeMessage");
      var Zr = hn;
      _.NoticeMessage = Zr;
    });
    var Vs = T((Bt) => {
      "use strict";
      h();
      Object.defineProperty(Bt, "__esModule", { value: true });
      Bt.Writer = void 0;
      var yn = class yn {
        constructor(e = 256) {
          this.size = e, this.offset = 5, this.headerPosition = 0, this.buffer = p.allocUnsafe(e);
        }
        ensure(e) {
          if (this.buffer.length - this.offset < e) {
            let n = this.buffer, i = n.length + (n.length >> 1) + e;
            this.buffer = p.allocUnsafe(i), n.copy(
              this.buffer
            );
          }
        }
        addInt32(e) {
          return this.ensure(4), this.buffer[this.offset++] = e >>> 24 & 255, this.buffer[this.offset++] = e >>> 16 & 255, this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
        }
        addInt16(e) {
          return this.ensure(2), this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
        }
        addCString(e) {
          if (!e) this.ensure(1);
          else {
            let t = p.byteLength(e);
            this.ensure(t + 1), this.buffer.write(e, this.offset, "utf-8"), this.offset += t;
          }
          return this.buffer[this.offset++] = 0, this;
        }
        addString(e = "") {
          let t = p.byteLength(e);
          return this.ensure(t), this.buffer.write(e, this.offset), this.offset += t, this;
        }
        addInt32PrefixedString(e) {
          let t = p.byteLength(e);
          this.ensure(4 + t);
          let n = this.buffer, i = this.offset;
          return n[i++] = t >>> 24 & 255, n[i++] = t >>> 16 & 255, n[i++] = t >>> 8 & 255, n[i++] = t >>> 0 & 255, n.write(e, i, "utf-8"), this.offset = i + t, this;
        }
        add(e) {
          return this.ensure(e.length), e.copy(this.buffer, this.offset), this.offset += e.length, this;
        }
        join(e) {
          if (e) {
            this.buffer[this.headerPosition] = e;
            let t = this.offset - (this.headerPosition + 1);
            this.buffer.writeInt32BE(t, this.headerPosition + 1);
          }
          return this.buffer.slice(e ? 0 : 5, this.offset);
        }
        flush(e) {
          let t = this.join(e);
          return this.offset = 5, this.headerPosition = 0, this.buffer = p.allocUnsafe(this.size), t;
        }
        clear() {
          this.offset = 5, this.headerPosition = 0;
        }
      };
      a(yn, "Writer");
      var pn = yn;
      Bt.Writer = pn;
    });
    var Ks = T((Mt) => {
      "use strict";
      h();
      Object.defineProperty(Mt, "__esModule", { value: true });
      Mt.serialize = void 0;
      var mn = Vs(), L = new mn.Writer(), _c = a((r) => {
        L.addInt16(3).addInt16(0);
        for (let n of Object.keys(r)) L.addCString(
          n
        ).addCString(r[n]);
        L.addCString("client_encoding").addCString("UTF8");
        let e = L.addCString("").flush(), t = e.length + 4;
        return new mn.Writer().addInt32(t).add(e).flush();
      }, "startup"), Tc = a(() => {
        let r = p.allocUnsafe(
          8
        );
        return r.writeInt32BE(8, 0), r.writeInt32BE(80877103, 4), r;
      }, "requestSsl"), Ic = a((r) => L.addCString(r).flush(
        112
      ), "password"), Pc = a(function(r, e) {
        return L.addCString(r).addInt32PrefixedString(e), L.flush(112);
      }, "sendSASLInitialResponseMessage"), Rc = a(function(r) {
        return L.addString(r).flush(112);
      }, "sendSCRAMClientFinalMessage"), Lc = a((r) => L.addCString(r).flush(81), "query"), zs = [], Bc = a((r) => {
        let e = r.name || "";
        e.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", e, e.length), console.error("This can cause conflicts and silent errors executing queries"));
        let t = r.types || zs, n = t.length, i = L.addCString(e).addCString(r.text).addInt16(n);
        for (let s = 0; s < n; s++) i.addInt32(t[s]);
        return L.flush(80);
      }, "parse"), We = new mn.Writer(), Fc = a(function(r, e) {
        for (let t = 0; t < r.length; t++) {
          let n = e ? e(r[t], t) : r[t];
          n == null ? (L.addInt16(0), We.addInt32(-1)) : n instanceof p ? (L.addInt16(
            1
          ), We.addInt32(n.length), We.add(n)) : (L.addInt16(0), We.addInt32PrefixedString(n));
        }
      }, "writeValues"), Mc = a(
        (r = {}) => {
          let e = r.portal || "", t = r.statement || "", n = r.binary || false, i = r.values || zs, s = i.length;
          L.addCString(
            e
          ).addCString(t), L.addInt16(s);
          try {
            Fc(i, r.valueMapper);
          } catch (o) {
            throw L.clear(), We.clear(), o;
          }
          return L.addInt16(s), L.add(We.flush()), L.addInt16(1), L.addInt16(n ? 1 : 0), L.flush(66);
        },
        "bind"
      ), kc = p.from([
        69,
        0,
        0,
        0,
        9,
        0,
        0,
        0,
        0,
        0
      ]), Oc = a((r) => {
        if (!r || !r.portal && !r.rows) return kc;
        let e = r.portal || "", t = r.rows || 0, n = p.byteLength(
          e
        ), i = 4 + n + 1 + 4, s = p.allocUnsafe(1 + i);
        return s[0] = 69, s.writeInt32BE(i, 1), s.write(e, 5, "utf-8"), s[n + 5] = 0, s.writeUInt32BE(t, s.length - 4), s;
      }, "execute"), Uc = a((r, e) => {
        let t = p.allocUnsafe(16);
        return t.writeInt32BE(
          16,
          0
        ), t.writeInt16BE(1234, 4), t.writeInt16BE(5678, 6), t.writeInt32BE(r, 8), t.writeInt32BE(e, 12), t;
      }, "cancel"), gn = a((r, e) => {
        let n = 4 + p.byteLength(e) + 1, i = p.allocUnsafe(1 + n);
        return i[0] = r, i.writeInt32BE(n, 1), i.write(e, 5, "utf-8"), i[n] = 0, i;
      }, "cstringMessage"), Qc = L.addCString("P").flush(68), Dc = L.addCString("S").flush(68), qc = a((r) => r.name ? gn(68, `${r.type}${r.name || ""}`) : r.type === "P" ? Qc : Dc, "describe"), Nc = a((r) => {
        let e = `${r.type}${r.name || ""}`;
        return gn(67, e);
      }, "close"), Wc = a((r) => L.add(r).flush(100), "copyData"), jc = a((r) => gn(
        102,
        r
      ), "copyFail"), Ft = a((r) => p.from([r, 0, 0, 0, 4]), "codeOnlyBuffer"), Hc = Ft(72), $c = Ft(83), Gc = Ft(88), Vc = Ft(99), zc = {
        startup: _c,
        password: Ic,
        requestSsl: Tc,
        sendSASLInitialResponseMessage: Pc,
        sendSCRAMClientFinalMessage: Rc,
        query: Lc,
        parse: Bc,
        bind: Mc,
        execute: Oc,
        describe: qc,
        close: Nc,
        flush: a(() => Hc, "flush"),
        sync: a(() => $c, "sync"),
        end: a(() => Gc, "end"),
        copyData: Wc,
        copyDone: a(() => Vc, "copyDone"),
        copyFail: jc,
        cancel: Uc
      };
      Mt.serialize = zc;
    });
    var Ys = T((kt) => {
      "use strict";
      h();
      Object.defineProperty(kt, "__esModule", { value: true });
      kt.BufferReader = void 0;
      var bn = class bn {
        constructor(e = 0) {
          this.offset = e, this.buffer = p.allocUnsafe(0), this.encoding = "utf-8";
        }
        setBuffer(e, t) {
          this.offset = e, this.buffer = t;
        }
        int16() {
          let e = this.buffer.readInt16BE(this.offset);
          return this.offset += 2, e;
        }
        byte() {
          let e = this.buffer[this.offset];
          return this.offset++, e;
        }
        int32() {
          let e = this.buffer.readInt32BE(
            this.offset
          );
          return this.offset += 4, e;
        }
        uint32() {
          let e = this.buffer.readUInt32BE(this.offset);
          return this.offset += 4, e;
        }
        string(e) {
          let t = this.buffer.toString(this.encoding, this.offset, this.offset + e);
          return this.offset += e, t;
        }
        cstring() {
          let e = this.offset, t = e;
          for (; this.buffer[t++]; ) ;
          return this.offset = t, this.buffer.toString(this.encoding, e, t - 1);
        }
        bytes(e) {
          let t = this.buffer.slice(this.offset, this.offset + e);
          return this.offset += e, t;
        }
      };
      a(bn, "BufferReader");
      var wn = bn;
      kt.BufferReader = wn;
    });
    var eo = T((Ot) => {
      "use strict";
      h();
      Object.defineProperty(Ot, "__esModule", { value: true });
      Ot.Parser = void 0;
      var F = dn(), Kc = Ys(), vn = 1, Yc = 4, Zs = vn + Yc, Z = -1, xn = p.allocUnsafe(0), En = class En {
        constructor(e) {
          if (this.buffer = xn, this.bufferLength = 0, this.bufferOffset = 0, this.reader = new Kc.BufferReader(), e?.mode === "binary") throw new Error(
            "Binary mode not supported yet"
          );
          this.mode = e?.mode || "text";
        }
        parse(e, t) {
          this.mergeBuffer(e);
          let n = this.bufferOffset + this.bufferLength, i = this.bufferOffset;
          for (; i + Zs <= n; ) {
            let s = this.buffer[i], o = this.buffer.readUInt32BE(i + vn), u = vn + o;
            if (u + i <= n) {
              let c = this.handlePacket(i + Zs, s, o, this.buffer);
              t(c), i += u;
            } else break;
          }
          i === n ? (this.buffer = xn, this.bufferLength = 0, this.bufferOffset = 0) : (this.bufferLength = n - i, this.bufferOffset = i);
        }
        mergeBuffer(e) {
          if (this.bufferLength > 0) {
            let t = this.bufferLength + e.byteLength;
            if (t + this.bufferOffset > this.buffer.byteLength) {
              let i;
              if (t <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) i = this.buffer;
              else {
                let s = this.buffer.byteLength * 2;
                for (; t >= s; ) s *= 2;
                i = p.allocUnsafe(s);
              }
              this.buffer.copy(i, 0, this.bufferOffset, this.bufferOffset + this.bufferLength), this.buffer = i, this.bufferOffset = 0;
            }
            e.copy(
              this.buffer,
              this.bufferOffset + this.bufferLength
            ), this.bufferLength = t;
          } else this.buffer = e, this.bufferOffset = 0, this.bufferLength = e.byteLength;
        }
        handlePacket(e, t, n, i) {
          let { reader: s } = this;
          s.setBuffer(e, i);
          let o;
          switch (t) {
            case 50:
              o = F.bindComplete;
              break;
            case 49:
              o = F.parseComplete;
              break;
            case 51:
              o = F.closeComplete;
              break;
            case 110:
              o = F.noData;
              break;
            case 115:
              o = F.portalSuspended;
              break;
            case 99:
              o = F.copyDone;
              break;
            case 87:
              o = F.replicationStart;
              break;
            case 73:
              o = F.emptyQuery;
              break;
            case 68:
              o = ol(s);
              break;
            case 67:
              o = Jc(s);
              break;
            case 90:
              o = Zc(s);
              break;
            case 65:
              o = rl(s);
              break;
            case 82:
              o = cl(s, n);
              break;
            case 83:
              o = al(s);
              break;
            case 75:
              o = ul(s);
              break;
            case 69:
              o = Js(s, "error");
              break;
            case 78:
              o = Js(s, "notice");
              break;
            case 84:
              o = nl(s);
              break;
            case 116:
              o = sl(s);
              break;
            case 71:
              o = el(
                s
              );
              break;
            case 72:
              o = tl(s);
              break;
            case 100:
              o = Xc(s, n);
              break;
            default:
              return new F.DatabaseError("received invalid response: " + t.toString(16), n, "error");
          }
          return s.setBuffer(0, xn), o.length = n, o;
        }
      };
      a(En, "Parser");
      var Sn = En;
      Ot.Parser = Sn;
      var Zc = a((r) => {
        let e = r.string(1);
        return new F.ReadyForQueryMessage(Z, e);
      }, "parseReadyForQueryMessage"), Jc = a((r) => {
        let e = r.cstring();
        return new F.CommandCompleteMessage(Z, e);
      }, "parseCommandCompleteMessage"), Xc = a((r, e) => {
        let t = r.bytes(e - 4);
        return new F.CopyDataMessage(Z, t);
      }, "parseCopyData"), el = a((r) => Xs(r, "copyInResponse"), "parseCopyInMessage"), tl = a((r) => Xs(r, "copyOutResponse"), "parseCopyOutMessage"), Xs = a((r, e) => {
        let t = r.byte() !== 0, n = r.int16(), i = new F.CopyResponse(Z, e, t, n);
        for (let s = 0; s < n; s++) i.columnTypes[s] = r.int16();
        return i;
      }, "parseCopyMessage"), rl = a((r) => {
        let e = r.int32(), t = r.cstring(), n = r.cstring();
        return new F.NotificationResponseMessage(Z, e, t, n);
      }, "parseNotificationMessage"), nl = a((r) => {
        let e = r.int16(), t = new F.RowDescriptionMessage(Z, e);
        for (let n = 0; n < e; n++) t.fields[n] = il(r);
        return t;
      }, "parseRowDescriptionMessage"), il = a((r) => {
        let e = r.cstring(), t = r.uint32(), n = r.int16(), i = r.uint32(), s = r.int16(), o = r.int32(), u = r.int16() === 0 ? "text" : "binary";
        return new F.Field(e, t, n, i, s, o, u);
      }, "parseField"), sl = a((r) => {
        let e = r.int16(), t = new F.ParameterDescriptionMessage(Z, e);
        for (let n = 0; n < e; n++) t.dataTypeIDs[n] = r.uint32();
        return t;
      }, "parseParameterDescriptionMessage"), ol = a((r) => {
        let e = r.int16(), t = new Array(e);
        for (let n = 0; n < e; n++) {
          let i = r.int32();
          t[n] = i === -1 ? null : r.string(i);
        }
        return new F.DataRowMessage(Z, t);
      }, "parseDataRowMessage"), al = a((r) => {
        let e = r.cstring(), t = r.cstring();
        return new F.ParameterStatusMessage(Z, e, t);
      }, "parseParameterStatusMessage"), ul = a((r) => {
        let e = r.int32(), t = r.int32();
        return new F.BackendKeyDataMessage(
          Z,
          e,
          t
        );
      }, "parseBackendKeyData"), cl = a((r, e) => {
        let t = r.int32(), n = { name: "authenticationOk", length: e };
        switch (t) {
          case 0:
            break;
          case 3:
            n.length === 8 && (n.name = "authenticationCleartextPassword");
            break;
          case 5:
            if (n.length === 12) {
              n.name = "authenticationMD5Password";
              let i = r.bytes(4);
              return new F.AuthenticationMD5Password(Z, i);
            }
            break;
          case 10:
            {
              n.name = "authenticationSASL", n.mechanisms = [];
              let i;
              do
                i = r.cstring(), i && n.mechanisms.push(i);
              while (i);
            }
            break;
          case 11:
            n.name = "authenticationSASLContinue", n.data = r.string(e - 8);
            break;
          case 12:
            n.name = "authenticationSASLFinal", n.data = r.string(e - 8);
            break;
          default:
            throw new Error("Unknown authenticationOk message type " + t);
        }
        return n;
      }, "parseAuthenticationResponse"), Js = a((r, e) => {
        let t = {}, n = r.string(1);
        for (; n !== "\0"; ) t[n] = r.cstring(), n = r.string(1);
        let i = t.M, s = e === "notice" ? new F.NoticeMessage(Z, i) : new F.DatabaseError(
          i,
          Z,
          e
        );
        return s.severity = t.S, s.code = t.C, s.detail = t.D, s.hint = t.H, s.position = t.P, s.internalPosition = t.p, s.internalQuery = t.q, s.where = t.W, s.schema = t.s, s.table = t.t, s.column = t.c, s.dataType = t.d, s.constraint = t.n, s.file = t.F, s.line = t.L, s.routine = t.R, s;
      }, "parseErrorMessage");
    });
    var An = T((Te) => {
      "use strict";
      h();
      Object.defineProperty(Te, "__esModule", { value: true });
      Te.DatabaseError = Te.serialize = void 0;
      Te.parse = dl;
      var ll = dn();
      Object.defineProperty(Te, "DatabaseError", { enumerable: true, get: a(
        function() {
          return ll.DatabaseError;
        },
        "get"
      ) });
      var fl = Ks();
      Object.defineProperty(Te, "serialize", {
        enumerable: true,
        get: a(function() {
          return fl.serialize;
        }, "get")
      });
      var hl = eo();
      function dl(r, e) {
        let t = new hl.Parser();
        return r.on("data", (n) => t.parse(n, e)), new Promise((n) => r.on("end", () => n()));
      }
      a(dl, "parse");
    });
    var to = {};
    X(to, { connect: () => pl });
    function pl({ socket: r, servername: e }) {
      return r.startTls(e), r;
    }
    var ro = V(
      () => {
        "use strict";
        h();
        a(pl, "connect");
      }
    );
    var Tn = T((Nd, so) => {
      "use strict";
      h();
      var no = (Ke(), O(Pi)), yl = Se().EventEmitter, { parse: ml, serialize: Q } = An(), io = Q.flush(), gl = Q.sync(), wl = Q.end(), _n = class _n extends yl {
        constructor(e) {
          super(), e = e || {}, this.stream = e.stream || new no.Socket(), this._keepAlive = e.keepAlive, this._keepAliveInitialDelayMillis = e.keepAliveInitialDelayMillis, this.lastBuffer = false, this.parsedStatements = {}, this.ssl = e.ssl || false, this._ending = false, this._emitMessage = false;
          var t = this;
          this.on("newListener", function(n) {
            n === "message" && (t._emitMessage = true);
          });
        }
        connect(e, t) {
          var n = this;
          this._connecting = true, this.stream.setNoDelay(true), this.stream.connect(e, t), this.stream.once("connect", function() {
            n._keepAlive && n.stream.setKeepAlive(true, n._keepAliveInitialDelayMillis), n.emit("connect");
          });
          let i = a(function(s) {
            n._ending && (s.code === "ECONNRESET" || s.code === "EPIPE") || n.emit("error", s);
          }, "reportStreamError");
          if (this.stream.on("error", i), this.stream.on("close", function() {
            n.emit("end");
          }), !this.ssl) return this.attachListeners(
            this.stream
          );
          this.stream.once("data", function(s) {
            var o = s.toString("utf8");
            switch (o) {
              case "S":
                break;
              case "N":
                return n.stream.end(), n.emit("error", new Error("The server does not support SSL connections"));
              default:
                return n.stream.end(), n.emit("error", new Error("There was an error establishing an SSL connection"));
            }
            var u = (ro(), O(to));
            let c = { socket: n.stream };
            n.ssl !== true && (Object.assign(c, n.ssl), "key" in n.ssl && (c.key = n.ssl.key)), no.isIP(t) === 0 && (c.servername = t);
            try {
              n.stream = u.connect(c);
            } catch (l) {
              return n.emit(
                "error",
                l
              );
            }
            n.attachListeners(n.stream), n.stream.on("error", i), n.emit("sslconnect");
          });
        }
        attachListeners(e) {
          e.on(
            "end",
            () => {
              this.emit("end");
            }
          ), ml(e, (t) => {
            var n = t.name === "error" ? "errorMessage" : t.name;
            this._emitMessage && this.emit("message", t), this.emit(n, t);
          });
        }
        requestSsl() {
          this.stream.write(Q.requestSsl());
        }
        startup(e) {
          this.stream.write(Q.startup(e));
        }
        cancel(e, t) {
          this._send(Q.cancel(e, t));
        }
        password(e) {
          this._send(Q.password(e));
        }
        sendSASLInitialResponseMessage(e, t) {
          this._send(Q.sendSASLInitialResponseMessage(e, t));
        }
        sendSCRAMClientFinalMessage(e) {
          this._send(Q.sendSCRAMClientFinalMessage(
            e
          ));
        }
        _send(e) {
          return this.stream.writable ? this.stream.write(e) : false;
        }
        query(e) {
          this._send(Q.query(e));
        }
        parse(e) {
          this._send(Q.parse(e));
        }
        bind(e) {
          this._send(Q.bind(e));
        }
        execute(e) {
          this._send(Q.execute(e));
        }
        flush() {
          this.stream.writable && this.stream.write(io);
        }
        sync() {
          this._ending = true, this._send(io), this._send(gl);
        }
        ref() {
          this.stream.ref();
        }
        unref() {
          this.stream.unref();
        }
        end() {
          if (this._ending = true, !this._connecting || !this.stream.writable) {
            this.stream.end();
            return;
          }
          return this.stream.write(wl, () => {
            this.stream.end();
          });
        }
        close(e) {
          this._send(Q.close(e));
        }
        describe(e) {
          this._send(Q.describe(e));
        }
        sendCopyFromChunk(e) {
          this._send(Q.copyData(e));
        }
        endCopyFrom() {
          this._send(Q.copyDone());
        }
        sendCopyFail(e) {
          this._send(Q.copyFail(e));
        }
      };
      a(_n, "Connection");
      var Cn = _n;
      so.exports = Cn;
    });
    var uo = T(($d, ao) => {
      "use strict";
      h();
      var bl = Se().EventEmitter, Hd = (at(), O(ot)), xl = st(), In = xs(), vl = Ls(), Sl = _t(), El = Lt(), oo = Gs(), Al = it(), Cl = Tn(), Pn = class Pn extends bl {
        constructor(e) {
          super(), this.connectionParameters = new El(e), this.user = this.connectionParameters.user, this.database = this.connectionParameters.database, this.port = this.connectionParameters.port, this.host = this.connectionParameters.host, Object.defineProperty(
            this,
            "password",
            { configurable: true, enumerable: false, writable: true, value: this.connectionParameters.password }
          ), this.replication = this.connectionParameters.replication;
          var t = e || {};
          this._Promise = t.Promise || b.Promise, this._types = new Sl(t.types), this._ending = false, this._connecting = false, this._connected = false, this._connectionError = false, this._queryable = true, this.connection = t.connection || new Cl({ stream: t.stream, ssl: this.connectionParameters.ssl, keepAlive: t.keepAlive || false, keepAliveInitialDelayMillis: t.keepAliveInitialDelayMillis || 0, encoding: this.connectionParameters.client_encoding || "utf8" }), this.queryQueue = [], this.binary = t.binary || Al.binary, this.processID = null, this.secretKey = null, this.ssl = this.connectionParameters.ssl || false, this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this._connectionTimeoutMillis = t.connectionTimeoutMillis || 0;
        }
        _errorAllQueries(e) {
          let t = a((n) => {
            y.nextTick(() => {
              n.handleError(e, this.connection);
            });
          }, "enqueueError");
          this.activeQuery && (t(this.activeQuery), this.activeQuery = null), this.queryQueue.forEach(t), this.queryQueue.length = 0;
        }
        _connect(e) {
          var t = this, n = this.connection;
          if (this._connectionCallback = e, this._connecting || this._connected) {
            let i = new Error("Client has already been connected. You cannot reuse a client.");
            y.nextTick(
              () => {
                e(i);
              }
            );
            return;
          }
          this._connecting = true, this.connectionTimeoutHandle, this._connectionTimeoutMillis > 0 && (this.connectionTimeoutHandle = setTimeout(() => {
            n._ending = true, n.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis)), this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
            t.ssl ? n.requestSsl() : n.startup(t.getStartupConf());
          }), n.on("sslconnect", function() {
            n.startup(t.getStartupConf());
          }), this._attachListeners(
            n
          ), n.once("end", () => {
            let i = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
            clearTimeout(this.connectionTimeoutHandle), this._errorAllQueries(i), this._ending || (this._connecting && !this._connectionError ? this._connectionCallback ? this._connectionCallback(i) : this._handleErrorEvent(i) : this._connectionError || this._handleErrorEvent(i)), y.nextTick(() => {
              this.emit("end");
            });
          });
        }
        connect(e) {
          if (e) {
            this._connect(e);
            return;
          }
          return new this._Promise((t, n) => {
            this._connect((i) => {
              i ? n(i) : t();
            });
          });
        }
        _attachListeners(e) {
          e.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this)), e.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this)), e.on("authenticationSASL", this._handleAuthSASL.bind(this)), e.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this)), e.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this)), e.on("backendKeyData", this._handleBackendKeyData.bind(this)), e.on("error", this._handleErrorEvent.bind(this)), e.on("errorMessage", this._handleErrorMessage.bind(this)), e.on("readyForQuery", this._handleReadyForQuery.bind(this)), e.on("notice", this._handleNotice.bind(this)), e.on("rowDescription", this._handleRowDescription.bind(this)), e.on("dataRow", this._handleDataRow.bind(this)), e.on("portalSuspended", this._handlePortalSuspended.bind(
            this
          )), e.on("emptyQuery", this._handleEmptyQuery.bind(this)), e.on("commandComplete", this._handleCommandComplete.bind(this)), e.on("parseComplete", this._handleParseComplete.bind(this)), e.on("copyInResponse", this._handleCopyInResponse.bind(this)), e.on("copyData", this._handleCopyData.bind(this)), e.on("notification", this._handleNotification.bind(this));
        }
        _checkPgPass(e) {
          let t = this.connection;
          typeof this.password == "function" ? this._Promise.resolve().then(() => this.password()).then((n) => {
            if (n !== void 0) {
              if (typeof n != "string") {
                t.emit("error", new TypeError(
                  "Password must be a string"
                ));
                return;
              }
              this.connectionParameters.password = this.password = n;
            } else this.connectionParameters.password = this.password = null;
            e();
          }).catch((n) => {
            t.emit("error", n);
          }) : this.password !== null ? e() : vl(
            this.connectionParameters,
            (n) => {
              n !== void 0 && (this.connectionParameters.password = this.password = n), e();
            }
          );
        }
        _handleAuthCleartextPassword(e) {
          this._checkPgPass(() => {
            this.connection.password(this.password);
          });
        }
        _handleAuthMD5Password(e) {
          this._checkPgPass(
            () => {
              let t = xl.postgresMd5PasswordHash(this.user, this.password, e.salt);
              this.connection.password(t);
            }
          );
        }
        _handleAuthSASL(e) {
          this._checkPgPass(() => {
            this.saslSession = In.startSession(e.mechanisms), this.connection.sendSASLInitialResponseMessage(
              this.saslSession.mechanism,
              this.saslSession.response
            );
          });
        }
        _handleAuthSASLContinue(e) {
          In.continueSession(
            this.saslSession,
            this.password,
            e.data
          ), this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        }
        _handleAuthSASLFinal(e) {
          In.finalizeSession(this.saslSession, e.data), this.saslSession = null;
        }
        _handleBackendKeyData(e) {
          this.processID = e.processID, this.secretKey = e.secretKey;
        }
        _handleReadyForQuery(e) {
          this._connecting && (this._connecting = false, this._connected = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback && (this._connectionCallback(null, this), this._connectionCallback = null), this.emit("connect"));
          let { activeQuery: t } = this;
          this.activeQuery = null, this.readyForQuery = true, t && t.handleReadyForQuery(this.connection), this._pulseQueryQueue();
        }
        _handleErrorWhileConnecting(e) {
          if (!this._connectionError) {
            if (this._connectionError = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback) return this._connectionCallback(e);
            this.emit("error", e);
          }
        }
        _handleErrorEvent(e) {
          if (this._connecting) return this._handleErrorWhileConnecting(e);
          this._queryable = false, this._errorAllQueries(e), this.emit("error", e);
        }
        _handleErrorMessage(e) {
          if (this._connecting) return this._handleErrorWhileConnecting(e);
          let t = this.activeQuery;
          if (!t) {
            this._handleErrorEvent(e);
            return;
          }
          this.activeQuery = null, t.handleError(
            e,
            this.connection
          );
        }
        _handleRowDescription(e) {
          this.activeQuery.handleRowDescription(e);
        }
        _handleDataRow(e) {
          this.activeQuery.handleDataRow(e);
        }
        _handlePortalSuspended(e) {
          this.activeQuery.handlePortalSuspended(this.connection);
        }
        _handleEmptyQuery(e) {
          this.activeQuery.handleEmptyQuery(this.connection);
        }
        _handleCommandComplete(e) {
          this.activeQuery.handleCommandComplete(e, this.connection);
        }
        _handleParseComplete(e) {
          this.activeQuery.name && (this.connection.parsedStatements[this.activeQuery.name] = this.activeQuery.text);
        }
        _handleCopyInResponse(e) {
          this.activeQuery.handleCopyInResponse(this.connection);
        }
        _handleCopyData(e) {
          this.activeQuery.handleCopyData(
            e,
            this.connection
          );
        }
        _handleNotification(e) {
          this.emit("notification", e);
        }
        _handleNotice(e) {
          this.emit("notice", e);
        }
        getStartupConf() {
          var e = this.connectionParameters, t = { user: e.user, database: e.database }, n = e.application_name || e.fallback_application_name;
          return n && (t.application_name = n), e.replication && (t.replication = "" + e.replication), e.statement_timeout && (t.statement_timeout = String(parseInt(e.statement_timeout, 10))), e.lock_timeout && (t.lock_timeout = String(parseInt(e.lock_timeout, 10))), e.idle_in_transaction_session_timeout && (t.idle_in_transaction_session_timeout = String(parseInt(e.idle_in_transaction_session_timeout, 10))), e.options && (t.options = e.options), t;
        }
        cancel(e, t) {
          if (e.activeQuery === t) {
            var n = this.connection;
            this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
              n.cancel(
                e.processID,
                e.secretKey
              );
            });
          } else e.queryQueue.indexOf(t) !== -1 && e.queryQueue.splice(e.queryQueue.indexOf(t), 1);
        }
        setTypeParser(e, t, n) {
          return this._types.setTypeParser(e, t, n);
        }
        getTypeParser(e, t) {
          return this._types.getTypeParser(e, t);
        }
        escapeIdentifier(e) {
          return '"' + e.replace(/"/g, '""') + '"';
        }
        escapeLiteral(e) {
          for (var t = false, n = "'", i = 0; i < e.length; i++) {
            var s = e[i];
            s === "'" ? n += s + s : s === "\\" ? (n += s + s, t = true) : n += s;
          }
          return n += "'", t === true && (n = " E" + n), n;
        }
        _pulseQueryQueue() {
          if (this.readyForQuery === true) if (this.activeQuery = this.queryQueue.shift(), this.activeQuery) {
            this.readyForQuery = false, this.hasExecuted = true;
            let e = this.activeQuery.submit(this.connection);
            e && y.nextTick(() => {
              this.activeQuery.handleError(e, this.connection), this.readyForQuery = true, this._pulseQueryQueue();
            });
          } else this.hasExecuted && (this.activeQuery = null, this.emit("drain"));
        }
        query(e, t, n) {
          var i, s, o, u, c;
          if (e == null) throw new TypeError(
            "Client was passed a null or undefined query"
          );
          return typeof e.submit == "function" ? (o = e.query_timeout || this.connectionParameters.query_timeout, s = i = e, typeof t == "function" && (i.callback = i.callback || t)) : (o = this.connectionParameters.query_timeout, i = new oo(e, t, n), i.callback || (s = new this._Promise((l, f) => {
            i.callback = (m, g) => m ? f(m) : l(g);
          }))), o && (c = i.callback, u = setTimeout(() => {
            var l = new Error("Query read timeout");
            y.nextTick(
              () => {
                i.handleError(l, this.connection);
              }
            ), c(l), i.callback = () => {
            };
            var f = this.queryQueue.indexOf(i);
            f > -1 && this.queryQueue.splice(f, 1), this._pulseQueryQueue();
          }, o), i.callback = (l, f) => {
            clearTimeout(u), c(l, f);
          }), this.binary && !i.binary && (i.binary = true), i._result && !i._result._types && (i._result._types = this._types), this._queryable ? this._ending ? (y.nextTick(() => {
            i.handleError(new Error("Client was closed and is not queryable"), this.connection);
          }), s) : (this.queryQueue.push(i), this._pulseQueryQueue(), s) : (y.nextTick(() => {
            i.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          }), s);
        }
        ref() {
          this.connection.ref();
        }
        unref() {
          this.connection.unref();
        }
        end(e) {
          if (this._ending = true, !this.connection._connecting) if (e) e();
          else return this._Promise.resolve();
          if (this.activeQuery || !this._queryable ? this.connection.stream.destroy() : this.connection.end(), e) this.connection.once("end", e);
          else return new this._Promise((t) => {
            this.connection.once("end", t);
          });
        }
      };
      a(Pn, "Client");
      var Ut = Pn;
      Ut.Query = oo;
      ao.exports = Ut;
    });
    var fo = T((zd, lo) => {
      "use strict";
      h();
      var _l = Se().EventEmitter, Rn = a(function() {
      }, "NOOP"), co = a((r, e) => {
        let t = r.findIndex(e);
        return t === -1 ? void 0 : r.splice(t, 1)[0];
      }, "removeWhere"), Fn = class Fn {
        constructor(e, t, n) {
          this.client = e, this.idleListener = t, this.timeoutId = n;
        }
      };
      a(Fn, "IdleItem");
      var Ln = Fn, Mn = class Mn {
        constructor(e) {
          this.callback = e;
        }
      };
      a(Mn, "PendingItem");
      var je = Mn;
      function Tl() {
        throw new Error("Release called on client which has already been released to the pool.");
      }
      a(Tl, "throwOnDoubleRelease");
      function Qt(r, e) {
        if (e)
          return { callback: e, result: void 0 };
        let t, n, i = a(function(o, u) {
          o ? t(o) : n(u);
        }, "cb"), s = new r(function(o, u) {
          n = o, t = u;
        }).catch((o) => {
          throw Error.captureStackTrace(o), o;
        });
        return { callback: i, result: s };
      }
      a(Qt, "promisify");
      function Il(r, e) {
        return a(function t(n) {
          n.client = e, e.removeListener("error", t), e.on("error", () => {
            r.log(
              "additional client error after disconnection due to error",
              n
            );
          }), r._remove(e), r.emit("error", n, e);
        }, "idleListener");
      }
      a(Il, "makeIdleListener");
      var kn = class kn extends _l {
        constructor(e, t) {
          super(), this.options = Object.assign({}, e), e != null && "password" in e && Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: e.password
          }), e != null && e.ssl && e.ssl.key && Object.defineProperty(this.options.ssl, "key", { enumerable: false }), this.options.max = this.options.max || this.options.poolSize || 10, this.options.min = this.options.min || 0, this.options.maxUses = this.options.maxUses || 1 / 0, this.options.allowExitOnIdle = this.options.allowExitOnIdle || false, this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0, this.log = this.options.log || function() {
          }, this.Client = this.options.Client || t || ct().Client, this.Promise = this.options.Promise || b.Promise, typeof this.options.idleTimeoutMillis > "u" && (this.options.idleTimeoutMillis = 1e4), this._clients = [], this._idle = [], this._expired = /* @__PURE__ */ new WeakSet(), this._pendingQueue = [], this._endCallback = void 0, this.ending = false, this.ended = false;
        }
        _promiseTry(e) {
          let t = this.Promise;
          return typeof t.try == "function" ? t.try(e) : new t((n) => n(e()));
        }
        _isFull() {
          return this._clients.length >= this.options.max;
        }
        _isAboveMin() {
          return this._clients.length > this.options.min;
        }
        _pulseQueue() {
          if (this.log("pulse queue"), this.ended) {
            this.log("pulse queue ended");
            return;
          }
          if (this.ending) {
            this.log("pulse queue on ending"), this._idle.length && this._idle.slice().map((t) => {
              this._remove(t.client);
            }), this._clients.length || (this.ended = true, this._endCallback());
            return;
          }
          if (!this._pendingQueue.length) {
            this.log("no queued requests");
            return;
          }
          if (!this._idle.length && this._isFull())
            return;
          let e = this._pendingQueue.shift();
          if (this._idle.length) {
            let t = this._idle.pop();
            clearTimeout(t.timeoutId);
            let n = t.client;
            n.ref && n.ref();
            let i = t.idleListener;
            return this._acquireClient(n, e, i, false);
          }
          if (!this._isFull()) return this.newClient(e);
          throw new Error("unexpected condition");
        }
        _remove(e, t) {
          let n = co(this._idle, (s) => s.client === e);
          n !== void 0 && clearTimeout(n.timeoutId), this._clients = this._clients.filter((s) => s !== e);
          let i = this;
          e.end(() => {
            i.emit("remove", e), typeof t == "function" && t();
          });
        }
        connect(e) {
          if (this.ending) {
            let i = new Error(
              "Cannot use a pool after calling end on the pool"
            );
            return e ? e(i) : this.Promise.reject(i);
          }
          let t = Qt(this.Promise, e), n = t.result;
          if (this._isFull() || this._idle.length) {
            if (this._idle.length && y.nextTick(() => this._pulseQueue()), !this.options.connectionTimeoutMillis) return this._pendingQueue.push(new je(t.callback)), n;
            let i = a((u, c, l) => {
              clearTimeout(o), t.callback(u, c, l);
            }, "queueCallback"), s = new je(i), o = setTimeout(() => {
              co(this._pendingQueue, (u) => u.callback === i), s.timedOut = true, t.callback(new Error("timeout exceeded when trying to connect"));
            }, this.options.connectionTimeoutMillis);
            return o.unref && o.unref(), this._pendingQueue.push(s), n;
          }
          return this.newClient(new je(t.callback)), n;
        }
        newClient(e) {
          let t = new this.Client(this.options);
          this._clients.push(t);
          let n = Il(this, t);
          this.log("checking client timeout");
          let i, s = false;
          this.options.connectionTimeoutMillis && (i = setTimeout(() => {
            t.connection ? (this.log("ending client due to timeout"), s = true, t.connection.stream.destroy()) : t.isConnected() || (this.log("ending client due to timeout"), s = true, t.end());
          }, this.options.connectionTimeoutMillis)), this.log("connecting new client"), t.connect((o) => {
            if (i && clearTimeout(i), t.on("error", n), o) this.log("client failed to connect", o), this._clients = this._clients.filter((u) => u !== t), s && (o = new Error("Connection terminated due to connection timeout", { cause: o })), this._pulseQueue(), e.timedOut || e.callback(
              o,
              void 0,
              Rn
            );
            else {
              if (this.log("new client connected"), this.options.onConnect) {
                this._promiseTry(() => this.options.onConnect(t)).then(() => {
                  this._afterConnect(t, e, n);
                }, (u) => {
                  this._clients = this._clients.filter((c) => c !== t), t.end(() => {
                    this._pulseQueue(), e.timedOut || e.callback(u, void 0, Rn);
                  });
                });
                return;
              }
              return this._afterConnect(
                t,
                e,
                n
              );
            }
          });
        }
        _afterConnect(e, t, n) {
          if (this.options.maxLifetimeSeconds !== 0) {
            let i = setTimeout(() => {
              this.log(
                "ending client due to expired lifetime"
              ), this._expired.add(e), this._idle.findIndex((o) => o.client === e) !== -1 && this._acquireClient(e, new je((o, u, c) => c()), n, false);
            }, this.options.maxLifetimeSeconds * 1e3);
            i.unref(), e.once("end", () => clearTimeout(i));
          }
          return this._acquireClient(e, t, n, true);
        }
        _acquireClient(e, t, n, i) {
          i && this.emit("connect", e), this.emit("acquire", e), e.release = this._releaseOnce(e, n), e.removeListener("error", n), t.timedOut ? i && this.options.verify ? this.options.verify(e, e.release) : e.release() : i && this.options.verify ? this.options.verify(e, (s) => {
            if (s) return e.release(s), t.callback(s, void 0, Rn);
            t.callback(void 0, e, e.release);
          }) : t.callback(void 0, e, e.release);
        }
        _releaseOnce(e, t) {
          let n = false;
          return (i) => {
            n && Tl(), n = true, this._release(
              e,
              t,
              i
            );
          };
        }
        _release(e, t, n) {
          if (e.on("error", t), e._poolUseCount = (e._poolUseCount || 0) + 1, this.emit(
            "release",
            n,
            e
          ), n || this.ending || !e._queryable || e._ending || e._poolUseCount >= this.options.maxUses) return e._poolUseCount >= this.options.maxUses && this.log("remove expended client"), this._remove(e, this._pulseQueue.bind(this));
          if (this._expired.has(e)) return this.log("remove expired client"), this._expired.delete(e), this._remove(
            e,
            this._pulseQueue.bind(this)
          );
          let s;
          this.options.idleTimeoutMillis && this._isAboveMin() && (s = setTimeout(
            () => {
              this._isAboveMin() && (this.log("remove idle client"), this._remove(e, this._pulseQueue.bind(this)));
            },
            this.options.idleTimeoutMillis
          ), this.options.allowExitOnIdle && s.unref()), this.options.allowExitOnIdle && e.unref(), this._idle.push(new Ln(e, t, s)), this._pulseQueue();
        }
        query(e, t, n) {
          if (typeof e == "function") {
            let s = Qt(
              this.Promise,
              e
            );
            return x(function() {
              return s.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
            }), s.result;
          }
          typeof t == "function" && (n = t, t = void 0);
          let i = Qt(this.Promise, n);
          return n = i.callback, this.connect((s, o) => {
            if (s) return n(s);
            let u = false, c = a((l) => {
              u || (u = true, o.release(
                l
              ), n(l));
            }, "onError");
            o.once("error", c), this.log("dispatching query");
            try {
              o.query(e, t, (l, f) => {
                if (this.log("query dispatched"), o.removeListener("error", c), !u) return u = true, o.release(l), l ? n(l) : n(void 0, f);
              });
            } catch (l) {
              return o.release(l), n(l);
            }
          }), i.result;
        }
        end(e) {
          if (this.log("ending"), this.ending) {
            let n = new Error("Called end on pool more than once");
            return e ? e(n) : this.Promise.reject(n);
          }
          this.ending = true;
          let t = Qt(
            this.Promise,
            e
          );
          return this._endCallback = t.callback, this._pulseQueue(), t.result;
        }
        get waitingCount() {
          return this._pendingQueue.length;
        }
        get idleCount() {
          return this._idle.length;
        }
        get expiredCount() {
          return this._clients.reduce((e, t) => e + (this._expired.has(t) ? 1 : 0), 0);
        }
        get totalCount() {
          return this._clients.length;
        }
      };
      a(kn, "Pool");
      var Bn = kn;
      lo.exports = Bn;
    });
    var ho = {};
    X(ho, { default: () => Pl });
    var Pl;
    var po = V(() => {
      "use strict";
      h();
      Pl = {};
    });
    var yo = T((Jd, Rl) => {
      Rl.exports = { name: "pg", version: "8.8.0", description: "PostgreSQL client - pure javascript & libpq with the same API", keywords: [
        "database",
        "libpq",
        "pg",
        "postgre",
        "postgres",
        "postgresql",
        "rdbms"
      ], homepage: "https://github.com/brianc/node-postgres", repository: { type: "git", url: "git://github.com/brianc/node-postgres.git", directory: "packages/pg" }, author: "Brian Carlson <brian.m.carlson@gmail.com>", main: "./lib", dependencies: { "buffer-writer": "2.0.0", "packet-reader": "1.0.0", "pg-connection-string": "^2.5.0", "pg-pool": "^3.5.2", "pg-protocol": "^1.5.0", "pg-types": "^2.1.0", pgpass: "1.x" }, devDependencies: {
        async: "2.6.4",
        bluebird: "3.5.2",
        co: "4.6.0",
        "pg-copy-streams": "0.3.0"
      }, peerDependencies: { "pg-native": ">=3.0.1" }, peerDependenciesMeta: { "pg-native": { optional: true } }, scripts: { test: "make test-all" }, files: ["lib", "SPONSORS.md"], license: "MIT", engines: { node: ">= 8.0.0" }, gitHead: "c99fb2c127ddf8d712500db2c7b9a5491a178655" };
    });
    var wo = T((Xd, go) => {
      "use strict";
      h();
      var mo = Se().EventEmitter, Ll = (at(), O(ot)), On = st(), He = go.exports = function(r, e, t) {
        mo.call(this), r = On.normalizeQueryConfig(r, e, t), this.text = r.text, this.values = r.values, this.name = r.name, this.callback = r.callback, this.state = "new", this._arrayMode = r.rowMode === "array", this._emitRowEvents = false, this.on("newListener", function(n) {
          n === "row" && (this._emitRowEvents = true);
        }.bind(this));
      };
      Ll.inherits(He, mo);
      var Bl = { sqlState: "code", statementPosition: "position", messagePrimary: "message", context: "where", schemaName: "schema", tableName: "table", columnName: "column", dataTypeName: "dataType", constraintName: "constraint", sourceFile: "file", sourceLine: "line", sourceFunction: "routine" };
      He.prototype.handleError = function(r) {
        var e = this.native.pq.resultErrorFields();
        if (e) for (var t in e) {
          var n = Bl[t] || t;
          r[n] = e[t];
        }
        this.callback ? this.callback(r) : this.emit("error", r), this.state = "error";
      };
      He.prototype.then = function(r, e) {
        return this._getPromise().then(
          r,
          e
        );
      };
      He.prototype.catch = function(r) {
        return this._getPromise().catch(r);
      };
      He.prototype._getPromise = function() {
        return this._promise ? this._promise : (this._promise = new Promise(function(r, e) {
          this._once("end", r), this._once("error", e);
        }.bind(this)), this._promise);
      };
      He.prototype.submit = function(r) {
        this.state = "running";
        var e = this;
        this.native = r.native, r.native.arrayMode = this._arrayMode;
        var t = a(function(s, o, u) {
          if (r.native.arrayMode = false, x(function() {
            e.emit("_done");
          }), s) return e.handleError(s);
          e._emitRowEvents && (u.length > 1 ? o.forEach(
            (c, l) => {
              c.forEach((f) => {
                e.emit("row", f, u[l]);
              });
            }
          ) : o.forEach(function(c) {
            e.emit("row", c, u);
          })), e.state = "end", e.emit("end", u), e.callback && e.callback(null, u);
        }, "after");
        if (y.domain && (t = y.domain.bind(t)), this.name) {
          this.name.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", this.name, this.name.length), console.error("This can cause conflicts and silent errors executing queries"));
          var n = (this.values || []).map(On.prepareValue);
          if (r.namedQueries[this.name]) {
            if (this.text && r.namedQueries[this.name] !== this.text) {
              let s = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
              return t(s);
            }
            return r.native.execute(this.name, n, t);
          }
          return r.native.prepare(this.name, this.text, n.length, function(s) {
            return s ? t(s) : (r.namedQueries[e.name] = e.text, e.native.execute(e.name, n, t));
          });
        } else if (this.values) {
          if (!Array.isArray(
            this.values
          )) {
            let s = new Error("Query values must be an array");
            return t(s);
          }
          var i = this.values.map(On.prepareValue);
          r.native.query(this.text, i, t);
        } else r.native.query(this.text, t);
      };
    });
    var So = T((np, vo) => {
      "use strict";
      h();
      var Fl = (po(), O(ho)), Ml = _t(), rp = yo(), bo = Se().EventEmitter, kl = (at(), O(ot)), Ol = Lt(), xo = wo(), Y = vo.exports = function(r) {
        bo.call(this), r = r || {}, this._Promise = r.Promise || b.Promise, this._types = new Ml(r.types), this.native = new Fl({ types: this._types }), this._queryQueue = [], this._ending = false, this._connecting = false, this._connected = false, this._queryable = true;
        var e = this.connectionParameters = new Ol(r);
        this.user = e.user, Object.defineProperty(this, "password", { configurable: true, enumerable: false, writable: true, value: e.password }), this.database = e.database, this.host = e.host, this.port = e.port, this.namedQueries = {};
      };
      Y.Query = xo;
      kl.inherits(Y, bo);
      Y.prototype._errorAllQueries = function(r) {
        let e = a((t) => {
          y.nextTick(() => {
            t.native = this.native, t.handleError(r);
          });
        }, "enqueueError");
        this._hasActiveQuery() && (e(this._activeQuery), this._activeQuery = null), this._queryQueue.forEach(e), this._queryQueue.length = 0;
      };
      Y.prototype._connect = function(r) {
        var e = this;
        if (this._connecting) {
          y.nextTick(() => r(new Error("Client has already been connected. You cannot reuse a client.")));
          return;
        }
        this._connecting = true, this.connectionParameters.getLibpqConnectionString(function(t, n) {
          if (t) return r(t);
          e.native.connect(n, function(i) {
            if (i) return e.native.end(), r(i);
            e._connected = true, e.native.on("error", function(s) {
              e._queryable = false, e._errorAllQueries(s), e.emit("error", s);
            }), e.native.on("notification", function(s) {
              e.emit("notification", { channel: s.relname, payload: s.extra });
            }), e.emit("connect"), e._pulseQueryQueue(true), r();
          });
        });
      };
      Y.prototype.connect = function(r) {
        if (r) {
          this._connect(r);
          return;
        }
        return new this._Promise((e, t) => {
          this._connect((n) => {
            n ? t(n) : e();
          });
        });
      };
      Y.prototype.query = function(r, e, t) {
        var n, i, s, o, u;
        if (r == null) throw new TypeError("Client was passed a null or undefined query");
        if (typeof r.submit == "function") s = r.query_timeout || this.connectionParameters.query_timeout, i = n = r, typeof e == "function" && (r.callback = e);
        else if (s = this.connectionParameters.query_timeout, n = new xo(r, e, t), !n.callback) {
          let c, l;
          i = new this._Promise((f, m) => {
            c = f, l = m;
          }), n.callback = (f, m) => f ? l(f) : c(m);
        }
        return s && (u = n.callback, o = setTimeout(() => {
          var c = new Error(
            "Query read timeout"
          );
          y.nextTick(() => {
            n.handleError(c, this.connection);
          }), u(c), n.callback = () => {
          };
          var l = this._queryQueue.indexOf(n);
          l > -1 && this._queryQueue.splice(l, 1), this._pulseQueryQueue();
        }, s), n.callback = (c, l) => {
          clearTimeout(o), u(c, l);
        }), this._queryable ? this._ending ? (n.native = this.native, y.nextTick(() => {
          n.handleError(
            new Error("Client was closed and is not queryable")
          );
        }), i) : (this._queryQueue.push(n), this._pulseQueryQueue(), i) : (n.native = this.native, y.nextTick(() => {
          n.handleError(new Error("Client has encountered a connection error and is not queryable"));
        }), i);
      };
      Y.prototype.end = function(r) {
        var e = this;
        this._ending = true, this._connected || this.once("connect", this.end.bind(this, r));
        var t;
        return r || (t = new this._Promise(function(n, i) {
          r = a((s) => s ? i(s) : n(), "cb");
        })), this.native.end(function() {
          e._errorAllQueries(new Error("Connection terminated")), y.nextTick(() => {
            e.emit("end"), r && r();
          });
        }), t;
      };
      Y.prototype._hasActiveQuery = function() {
        return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
      };
      Y.prototype._pulseQueryQueue = function(r) {
        if (this._connected && !this._hasActiveQuery()) {
          var e = this._queryQueue.shift();
          if (!e) {
            r || this.emit("drain");
            return;
          }
          this._activeQuery = e, e.submit(this);
          var t = this;
          e.once("_done", function() {
            t._pulseQueryQueue();
          });
        }
      };
      Y.prototype.cancel = function(r) {
        this._activeQuery === r ? this.native.cancel(function() {
        }) : this._queryQueue.indexOf(r) !== -1 && this._queryQueue.splice(this._queryQueue.indexOf(r), 1);
      };
      Y.prototype.ref = function() {
      };
      Y.prototype.unref = function() {
      };
      Y.prototype.setTypeParser = function(r, e, t) {
        return this._types.setTypeParser(
          r,
          e,
          t
        );
      };
      Y.prototype.getTypeParser = function(r, e) {
        return this._types.getTypeParser(r, e);
      };
    });
    var Un = T((op, Eo) => {
      "use strict";
      h();
      Eo.exports = So();
    });
    var ct = T((up, lt) => {
      "use strict";
      h();
      var Ul = uo(), Ql = it(), Dl = Tn(), ql = fo(), { DatabaseError: Nl } = An(), Wl = a(
        (r) => {
          var e;
          return e = class extends ql {
            constructor(n) {
              super(n, r);
            }
          }, a(e, "BoundPool"), e;
        },
        "poolFactory"
      ), Qn = a(
        function(r) {
          this.defaults = Ql, this.Client = r, this.Query = this.Client.Query, this.Pool = Wl(this.Client), this._pools = [], this.Connection = Dl, this.types = tt(), this.DatabaseError = Nl;
        },
        "PG"
      );
      typeof y.env.NODE_PG_FORCE_NATIVE < "u" ? lt.exports = new Qn(Un()) : (lt.exports = new Qn(Ul), Object.defineProperty(lt.exports, "native", {
        configurable: true,
        enumerable: false,
        get() {
          var r = null;
          try {
            r = new Qn(Un());
          } catch (e) {
            if (e.code !== "MODULE_NOT_FOUND") throw e;
          }
          return Object.defineProperty(lt.exports, "native", { value: r }), r;
        }
      }));
    });
    var Vl = {};
    X(Vl, {
      Client: () => $e,
      DatabaseError: () => de.DatabaseError,
      NeonDbError: () => q,
      NeonQueryPromise: () => me,
      Pool: () => Dt,
      SqlTemplate: () => Me,
      UnsafeRawSql: () => ke,
      _bundleExt: () => Gl,
      defaults: () => de.defaults,
      errorFields: () => er,
      escapeIdentifier: () => de.escapeIdentifier,
      escapeLiteral: () => de.escapeLiteral,
      neon: () => mr,
      neonConfig: () => he,
      parseIntoClientConfig: () => Io,
      types: () => de.types,
      warnIfBrowser: () => ze
    });
    module.exports = O(Vl);
    h();
    h();
    h();
    var pa = Object.defineProperty;
    var ya = Object.defineProperties;
    var ma = Object.getOwnPropertyDescriptors;
    var ci = Object.getOwnPropertySymbols;
    var ga = Object.prototype.hasOwnProperty;
    var wa = Object.prototype.propertyIsEnumerable;
    var li = a(
      (r, e, t) => e in r ? pa(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t,
      "__defNormalProp"
    );
    var ba = a((r, e) => {
      for (var t in e || (e = {})) ga.call(e, t) && li(r, t, e[t]);
      if (ci) for (var t of ci(e)) wa.call(e, t) && li(r, t, e[t]);
      return r;
    }, "__spreadValues");
    var xa = a((r, e) => ya(r, ma(e)), "__spreadProps");
    var va = 1008e3;
    var fi = new Uint8Array(
      new Uint16Array([258]).buffer
    )[0] === 2;
    var Sa = new TextDecoder();
    var Zt = new TextEncoder();
    var pt = Zt.encode("0123456789abcdef");
    var yt = Zt.encode("0123456789ABCDEF");
    var Ea = Zt.encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
    var hi = Ea.slice();
    hi[62] = 45;
    hi[63] = 95;
    var Ve;
    var mt;
    function Aa(r, { alphabet: e, scratchArr: t } = {}) {
      if (!Ve) if (Ve = new Uint16Array(256), mt = new Uint16Array(256), fi) for (let S = 0; S < 256; S++) Ve[S] = pt[S & 15] << 8 | pt[S >>> 4], mt[S] = yt[S & 15] << 8 | yt[S >>> 4];
      else for (let S = 0; S < 256; S++) Ve[S] = pt[S & 15] | pt[S >>> 4] << 8, mt[S] = yt[S & 15] | yt[S >>> 4] << 8;
      r.byteOffset % 4 !== 0 && (r = new Uint8Array(r));
      let n = r.length, i = n >>> 1, s = n >>> 2, o = t || new Uint16Array(n), u = new Uint32Array(
        r.buffer,
        r.byteOffset,
        s
      ), c = new Uint32Array(o.buffer, o.byteOffset, i), l = e === "upper" ? mt : Ve, f = 0, m = 0, g;
      if (fi)
        for (; f < s; ) g = u[f++], c[m++] = l[g >>> 8 & 255] << 16 | l[g & 255], c[m++] = l[g >>> 24] << 16 | l[g >>> 16 & 255];
      else for (; f < s; )
        g = u[f++], c[m++] = l[g >>> 24] << 16 | l[g >>> 16 & 255], c[m++] = l[g >>> 8 & 255] << 16 | l[g & 255];
      for (f <<= 2; f < n; ) o[f] = l[r[f++]];
      return Sa.decode(o.subarray(0, n));
    }
    a(Aa, "_toHex");
    function Ca(r, e = {}) {
      let t = "", n = r.length, i = va >>> 1, s = Math.ceil(n / i), o = new Uint16Array(s > 1 ? i : n), u = xa(ba({}, e), { scratchArr: o });
      for (let c = 0; c < s; c++) {
        let l = c * i, f = l + i;
        t += Aa(r.subarray(l, f), u);
      }
      return t;
    }
    a(Ca, "_toHexChunked");
    function di(r, e = {}) {
      return e.alphabet !== "upper" && typeof r.toHex == "function" ? r.toHex() : Ca(r, e);
    }
    a(di, "toHex");
    h();
    h();
    var Jt = class Jt {
      constructor(e, t, n) {
        E(this, "execute", e);
        E(this, "queryData", t);
        E(this, "opts", n);
      }
      then(e, t) {
        return this.execute(this.queryData, this.opts).then(e, t);
      }
      catch(e) {
        return this.execute(
          this.queryData,
          this.opts
        ).catch(e);
      }
      finally(e) {
        return this.execute(this.queryData, this.opts).finally(e);
      }
    };
    a(Jt, "NeonQueryPromise");
    var me = Jt;
    var gt = class gt2 {
      constructor(e, t) {
        E(this, "strings", e);
        E(this, "values", t);
      }
      toParameterizedQuery(e = {
        query: "",
        params: []
      }) {
        let { strings: t, values: n } = this;
        for (let i = 0, s = t.length; i < s; i++) if (e.query += t[i], i < n.length) {
          let o = n[i];
          if (o instanceof ke) e.query += o.sql;
          else if (o instanceof me) if (o.queryData instanceof gt2) o.queryData.toParameterizedQuery(e);
          else {
            if (o.queryData.params?.length) throw new Error("This query is not composable");
            e.query += o.queryData.query;
          }
          else {
            let { params: u } = e;
            u.push(o), e.query += "$" + u.length, (o instanceof p || ArrayBuffer.isView(o)) && (e.query += "::bytea");
          }
        }
        return e;
      }
    };
    a(gt, "SqlTemplate");
    var Me = gt;
    var Xt = class Xt {
      constructor(e) {
        E(this, "sql", e);
      }
    };
    a(Xt, "UnsafeRawSql");
    var ke = Xt;
    h();
    function ze() {
      typeof window < "u" && typeof document < "u" && typeof console < "u" && typeof console.warn == "function" && console.warn(`          
        ************************************************************
        *                                                          *
        *  WARNING: Running SQL directly from the browser can have *
        *  security implications. Even if your database is         *
        *  protected by Row-Level Security (RLS), use it at your   *
        *  own risk. This approach is great for fast prototyping,  *
        *  but ensure proper safeguards are in place to prevent    *
        *  misuse or execution of expensive SQL queries by your    *
        *  end users.                                              *
        *                                                          *
        *  If you've assessed the risks, suppress this message     *
        *  using the disableWarningInBrowsers configuration        *
        *  parameter.                                              *
        *                                                          *
        ************************************************************`);
    }
    a(ze, "warnIfBrowser");
    h();
    h();
    var wt = class wt2 extends Error {
      constructor(t) {
        super(t);
        E(this, "name", "NeonDbError");
        E(this, "severity");
        E(this, "code");
        E(this, "detail");
        E(this, "hint");
        E(this, "position");
        E(this, "internalPosition");
        E(
          this,
          "internalQuery"
        );
        E(this, "where");
        E(this, "schema");
        E(this, "table");
        E(this, "column");
        E(this, "dataType");
        E(this, "constraint");
        E(this, "file");
        E(this, "line");
        E(this, "routine");
        E(this, "sourceError");
        "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(this, wt2);
      }
    };
    a(
      wt,
      "NeonDbError"
    );
    var q = wt;
    var er = ["severity", "code", "detail", "hint", "position", "internalPosition", "internalQuery", "where", "schema", "table", "column", "dataType", "constraint", "file", "line", "routine"];
    function pi(r, e) {
      let t, n;
      try {
        t = new URL(r).protocol, n = new URL("http:" + r.slice(t.length));
      } catch {
        throw new q(
          `Database connection string provided to neon() is not a valid URL (connection string: ${r})`
        );
      }
      let {
        username: i,
        hostname: s,
        pathname: o
      } = n;
      if (t !== "postgres:" && t !== "postgresql:" || e && (!i || !s || s === "-" || !o || o === "/")) throw new q(
        "Wrong URL scheme or missing user, host or database in connection parameters"
      );
      return n;
    }
    a(pi, "URLFromPgConnectionString");
    function _a(r) {
      return "postgresql:" + r.href.slice(r.protocol.length);
    }
    a(_a, "pgConnectionStringFromURL");
    var Ta = ["connectionString", "user", "username", "password", "host", "hostname", "port", "database"];
    var Ia = { database: "pathname", user: "username", host: "hostname" };
    function yi(...r) {
      let e = {};
      for (let t of r) e = t.connectionString !== void 0 ? t : { ...e, ...t };
      return e;
    }
    a(yi, "mergeConnectionParams");
    async function mi(r = "postgresql://-", e = {}, t = {}) {
      if (e.connectionString !== void 0 && (r = e.connectionString), typeof r == "function" && (r = await r()), typeof r != "string") throw new q("Connection string must be a string or a function resolving to one");
      if (e.user !== void 0 && e.username !== void 0) throw new q("Please specify one only of user and username");
      if (e.host !== void 0 && e.hostname !== void 0) throw new q("Please specify one only of host and hostname");
      let n = pi(r, false);
      await Promise.all(Ta.map(async (u) => {
        if (u === "connectionString") return;
        let c = e[u];
        if (typeof c == "function" && (c = await c()), c === void 0) return;
        if (typeof c != "string" && !(u === "port" && typeof c == "number")) {
          let f = u === "port" ? " or a number" : "";
          throw new q(`Connection parameter "${u}" must be a string${f} or a function resolving to one`);
        }
        let l = Ia[u] ?? u;
        n[l] = c;
      }));
      let { searchParams: i } = n;
      for (let u in t) i.has(u) || i.append(u, t[u]);
      let s = _a(n), o = pi(s, true);
      return { resolvedConnectionString: s, resolvedURL: o };
    }
    a(mi, "resolveConnectionParams");
    Ke();
    h();
    var vt = "pkg:npm/%40neondatabase/serverless@1.2.0";
    var ps = xe(_t());
    var ys = xe(st());
    var fs = "transaction() expects an array of queries, or a function returning an array of queries";
    function Wu(r) {
      return r instanceof p ? "\\x" + di(r) : r;
    }
    a(Wu, "encodeBuffersAsBytea");
    function hs(r) {
      let { query: e, params: t } = r instanceof Me ? r.toParameterizedQuery() : r;
      return { query: e, params: t.map((n) => Wu((0, ys.prepareValue)(n))) };
    }
    a(hs, "prepareQuery");
    function mr(r, e = {}) {
      typeof r != "string" && (e = r ?? {}, r = void 0);
      let {
        arrayMode: t,
        fullResults: n,
        fetchOptions: i,
        isolationLevel: s,
        readOnly: o,
        deferrable: u,
        authToken: c,
        disableWarningInBrowsers: l
      } = e;
      function f(g, ...w) {
        if (!(Array.isArray(g) && Array.isArray(g.raw) && Array.isArray(w))) throw new Error('This function can now be called only as a tagged-template function: sql`SELECT ${value}`, not sql("SELECT $1", [value], options). For a conventional function call with value placeholders ($1, $2, etc.), use sql.query("SELECT $1", [value], options).');
        return new me(m, new Me(g, w));
      }
      a(f, "templateFn"), f.query = (g, w, S) => new me(
        m,
        { query: g, params: w ?? [] },
        S
      ), f.unsafe = (g) => new ke(g), f.transaction = async (g, w) => {
        if (typeof g == "function" && (g = g(f)), !Array.isArray(g)) throw new Error(fs);
        g.forEach((D) => {
          if (!(D instanceof me)) throw new Error(fs);
        });
        let S = g.map((D) => D.queryData), k = g.map((D) => D.opts ?? {});
        return m(S, k, w);
      };
      async function m(g, w, S) {
        let {
          fetchEndpoint: k,
          fetchFunction: D
        } = he, pe = Array.isArray(g) ? { queries: g.map((G) => hs(G)) } : hs(g), I = i ?? {}, C = t ?? false, ne = n ?? false, ie = s, H = o, oe = u;
        S !== void 0 && (S.fetchOptions !== void 0 && (I = { ...I, ...S.fetchOptions }), S.arrayMode !== void 0 && (C = S.arrayMode), S.fullResults !== void 0 && (ne = S.fullResults), S.isolationLevel !== void 0 && (ie = S.isolationLevel), S.readOnly !== void 0 && (H = S.readOnly), S.deferrable !== void 0 && (oe = S.deferrable)), w !== void 0 && !Array.isArray(
          w
        ) && w.fetchOptions !== void 0 && (I = { ...I, ...w.fetchOptions });
        let ae = c;
        !Array.isArray(w) && w?.authToken !== void 0 && (ae = w.authToken);
        let we = yi(e, S ?? {}, Array.isArray(w) || !w ? {} : w), { resolvedConnectionString: R, resolvedURL: $ } = await mi(
          r,
          we,
          { application_name: vt }
        ), Ae = typeof k == "function" ? k($.hostname, $.port, { jwtAuth: ae !== void 0 }) : k, ue = {
          "Neon-Connection-String": R,
          "Neon-Raw-Text-Output": "true",
          "Neon-Array-Mode": "true"
        }, Ie = await ju(ae);
        Ie && (ue.Authorization = `Bearer ${Ie}`), Array.isArray(g) && (ie !== void 0 && (ue["Neon-Batch-Isolation-Level"] = ie), H !== void 0 && (ue["Neon-Batch-Read-Only"] = String(H)), oe !== void 0 && (ue["Neon-Batch-Deferrable"] = String(
          oe
        ))), l || he.disableWarningInBrowsers || ze();
        let ce;
        try {
          ce = await (D ?? fetch)(Ae, { method: "POST", body: JSON.stringify(pe), headers: ue, ...I });
        } catch (G) {
          let N = new q(`Error connecting to database: ${G}`);
          throw N.sourceError = G, N;
        }
        if (ce.ok) {
          let G = await ce.json();
          if (Array.isArray(g)) {
            let N = G.results;
            if (!Array.isArray(N)) throw new q(
              "Neon internal error: unexpected result format"
            );
            return N.map((be, J) => {
              let se = w[J] ?? {}, qt = se.arrayMode ?? C, Po = se.fullResults ?? ne;
              return ds(be, { arrayMode: qt, fullResults: Po, types: se.types });
            });
          } else {
            let N = w ?? {}, be = N.arrayMode ?? C, J = N.fullResults ?? ne;
            return ds(G, { arrayMode: be, fullResults: J, types: N.types });
          }
        } else {
          let { status: G } = ce;
          if (G === 400) {
            let N = await ce.json(), be = new q(N.message);
            for (let J of er) be[J] = N[J] ?? void 0;
            throw be;
          } else {
            let N = await ce.text();
            throw new q(`Server error (HTTP status ${G}): ${N}`);
          }
        }
      }
      return a(
        m,
        "execute"
      ), f;
    }
    a(mr, "neon");
    function ds(r, { arrayMode: e, fullResults: t, types: n }) {
      let i = new ps.default(
        n
      ), s = r.fields.map((c) => c.name), o = r.fields.map((c) => i.getTypeParser(c.dataTypeID)), u = e === true ? r.rows.map((c) => c.map((l, f) => l === null ? null : o[f](l))) : r.rows.map((c) => Object.fromEntries(c.map((l, f) => [s[f], l === null ? null : o[f](l)])));
      return t ? (r.viaNeonFetch = true, r.rowAsArray = e, r.rows = u, r._parsers = o, r._types = i, r) : u;
    }
    a(ds, "processQueryResult");
    async function ju(r) {
      if (typeof r == "string") return r;
      if (typeof r == "function") try {
        return await Promise.resolve(r());
      } catch (e) {
        let t = new q("Error getting auth token.");
        throw e instanceof Error && (t = new q(`Error getting auth token: ${e.message}`)), t;
      }
    }
    a(ju, "getAuthToken");
    h();
    h();
    var Co = xe(ct());
    h();
    var Ao = xe(ct());
    var Dn = class Dn extends Ao.Client {
      constructor(t) {
        let n = typeof t == "string" ? { connectionString: t } : {
          ...t,
          ...t && "password" in t ? { password: t.password } : {}
        };
        super({ fallback_application_name: vt, ...n });
        E(this, "config", t);
      }
      get neonConfig() {
        return this.connection.stream;
      }
      connect(t) {
        let { neonConfig: n } = this;
        n.forceDisablePgSSL && (this.ssl = this.connection.ssl = false), this.ssl && n.useSecureWebSocket && console.warn("SSL is enabled for both Postgres (e.g. ?sslmode=require in the connection string + forceDisablePgSSL = false) and the WebSocket tunnel (useSecureWebSocket = true). Double encryption will increase latency and CPU usage. It may be appropriate to disable SSL in the Postgres connection parameters or set forceDisablePgSSL = true.");
        let i = typeof this.config != "string" && this.config?.host !== void 0 || typeof this.config != "string" && this.config?.connectionString !== void 0 || y.env.PGHOST !== void 0, s = y.env.USER ?? y.env.USERNAME;
        if (!i && this.host === "localhost" && this.user === s && this.database === s && this.password === null) throw new Error(`No database host or connection string was set, and key parameters have default values (host: localhost, user: ${s}, db: ${s}, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.`);
        let o = super.connect(
          t
        ), u = n.pipelineTLS && this.ssl, c = n.pipelineConnect === "password";
        if (!u && !n.pipelineConnect) return o;
        let l = this.connection;
        if (u && l.on("connect", () => l.stream.emit("data", "S")), c) {
          l.removeAllListeners("authenticationCleartextPassword"), l.removeAllListeners("readyForQuery"), l.once("readyForQuery", () => l.on("readyForQuery", this._handleReadyForQuery.bind(this)));
          let f = this.password, m = Promise.resolve(typeof f == "function" ? f() : f), g = this.ssl ? "sslconnect" : "connect";
          l.on(g, () => {
            this.neonConfig.disableWarningInBrowsers || ze(), m.then((w) => {
              this.password = w, this._handleAuthCleartextPassword(), this._handleReadyForQuery();
            }).catch(
              (w) => l.emit("error", w)
            );
          });
        }
        return o;
      }
      async _handleAuthSASLContinue(t) {
        if (typeof crypto > "u" || crypto.subtle === void 0 || crypto.subtle.importKey === void 0) throw new Error("Cannot use SASL auth when `crypto.subtle` is not defined");
        let n = crypto.subtle, i = this.saslSession, s = this.password, o = t.data;
        if (i.message !== "SASLInitialResponse" || typeof s != "string" || typeof o != "string") throw new Error("SASL: protocol error");
        let u = Object.fromEntries(o.split(",").map((J) => {
          if (!/^.=/.test(J)) throw new Error("SASL: Invalid attribute pair entry");
          let se = J[0], qt = J.substring(2);
          return [se, qt];
        })), c = u.r, l = u.s, f = u.i;
        if (!c || !/^[!-+--~]+$/.test(c))
          throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing/unprintable");
        if (!l || !/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(l)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing/not base64");
        if (!f || !/^[1-9][0-9]*$/.test(f)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: missing/invalid iteration count");
        if (!c.startsWith(
          i.clientNonce
        )) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
        if (c.length === i.clientNonce.length) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
        let m = parseInt(f, 10), g = p.from(l, "base64"), w = new TextEncoder(), S = w.encode(s), k = await n.importKey("raw", S, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]), D = new Uint8Array(await n.sign("HMAC", k, p.concat([g, p.from([0, 0, 0, 1])]))), pe = D;
        for (var I = 0; I < m - 1; I++) D = new Uint8Array(await n.sign("HMAC", k, D)), pe = p.from(pe.map((J, se) => pe[se] ^ D[se]));
        let C = pe, ne = await n.importKey("raw", C, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]), ie = new Uint8Array(await n.sign("HMAC", ne, w.encode("Client Key"))), H = await n.digest("SHA-256", ie), oe = "n=*,r=" + i.clientNonce, ae = "r=" + c + ",s=" + l + ",i=" + m, we = "c=biws,r=" + c, R = oe + "," + ae + "," + we, $ = await n.importKey("raw", H, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
        var Ae = new Uint8Array(await n.sign("HMAC", $, w.encode(R))), ue = p.from(ie.map((J, se) => ie[se] ^ Ae[se])), Ie = ue.toString("base64");
        let ce = await n.importKey("raw", C, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]), G = await n.sign("HMAC", ce, w.encode("Server Key")), N = await n.importKey("raw", G, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
        var be = p.from(await n.sign("HMAC", N, w.encode(R)));
        i.message = "SASLResponse", i.serverSignature = be.toString("base64"), i.response = we + ",p=" + Ie, this.connection.sendSCRAMClientFinalMessage(
          this.saslSession.response
        );
      }
    };
    a(Dn, "NeonClient");
    var $e = Dn;
    Ke();
    var _o = xe(Lt());
    function jl(r, e) {
      if (e) return { callback: e, result: void 0 };
      let t, n, i = a(function(o, u) {
        o ? t(o) : n(u);
      }, "cb"), s = new r(function(o, u) {
        n = o, t = u;
      });
      return { callback: i, result: s };
    }
    a(jl, "promisify");
    var qn = class qn extends Co.Pool {
      constructor() {
        super(...arguments);
        E(this, "Client", $e);
        E(this, "hasFetchUnsupportedListeners", false);
        E(this, "addListener", this.on);
      }
      on(t, n) {
        return t !== "error" && (this.hasFetchUnsupportedListeners = true), super.on(t, n);
      }
      query(t, n, i) {
        if (!he.poolQueryViaFetch || this.hasFetchUnsupportedListeners || typeof t == "function") return super.query(
          t,
          n,
          i
        );
        typeof n == "function" && (i = n, n = void 0);
        let s = jl(this.Promise, i);
        i = s.callback;
        try {
          let o = new _o.default(
            this.options
          ), u = encodeURIComponent, c = encodeURI, l = `postgresql://${u(o.user)}:${u(o.password)}@${u(o.host)}/${c(o.database)}`, f = typeof t == "string" ? t : t.text, m = n ?? t.values ?? [];
          mr(l, { fullResults: true, arrayMode: t.rowMode === "array" }).query(f, m, { types: t.types ?? this.options?.types }).then((w) => i(void 0, w)).catch((w) => i(
            w
          ));
        } catch (o) {
          i(o);
        }
        return s.result;
      }
    };
    a(qn, "NeonPool");
    var Dt = qn;
    Ke();
    var de = xe(ct());
    h();
    var To = xe(Lr());
    function Hl(r) {
      return Object.entries(r).reduce((t, [n, i]) => (i != null && (t[n] = i), t), /* @__PURE__ */ Object.create(null));
    }
    a(Hl, "toConnectionOptions");
    function $l(r) {
      return Object.entries(r).reduce((t, [n, i]) => {
        if (n === "ssl") {
          let s = i;
          typeof s == "boolean" && (t[n] = s), typeof s == "object" && (t[n] = Hl(s));
        } else if (i != null) if (n === "port") {
          if (i !== "") {
            let s = parseInt(i, 10);
            if (isNaN(s)) throw new Error(`Invalid ${n}: ${i}`);
            t[n] = s;
          }
        } else t[n] = i;
        return t;
      }, /* @__PURE__ */ Object.create(null));
    }
    a($l, "toClientConfig");
    function Io(r) {
      return $l((0, To.parse)(r));
    }
    a(
      Io,
      "parseIntoClientConfig"
    );
    var Gl = "js";
  }
});

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension) => {
        let configurations = extensions[extension];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes, createHash } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            if (!options || options.protocols === void 0) {
              protocols = [];
            } else if (Array.isArray(options.protocols)) {
              protocols = options.protocols;
            } else {
              protocols = [options.protocols];
            }
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              if (options.protocols === void 0) {
                protocols = [];
              } else if (Array.isArray(options.protocols)) {
                protocols = options.protocols;
              } else {
                protocols = [options.protocols];
              }
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate.extensionName]) {
          this._extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        this._readyState = _WebSocket.CLOSING;
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        protocols: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream2 = __commonJS({
  "node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http = __require("http");
    var { Duplex } = __require("stream");
    var { createHash } = __require("crypto");
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var subprotocol = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
              extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate.extensionName]) {
          const params = extensions[PerMessageDeflate.extensionName].params;
          const value = extension.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// node_modules/ws/index.js
var require_ws = __commonJS({
  "node_modules/ws/index.js"(exports, module) {
    "use strict";
    var createWebSocketStream = require_stream2();
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var subprotocol = require_subprotocol();
    var WebSocket2 = require_websocket();
    var WebSocketServer = require_websocket_server();
    WebSocket2.createWebSocketStream = createWebSocketStream;
    WebSocket2.extension = extension;
    WebSocket2.PerMessageDeflate = PerMessageDeflate;
    WebSocket2.Receiver = Receiver;
    WebSocket2.Sender = Sender;
    WebSocket2.Server = WebSocketServer;
    WebSocket2.subprotocol = subprotocol;
    WebSocket2.WebSocket = WebSocket2;
    WebSocket2.WebSocketServer = WebSocketServer;
    module.exports = WebSocket2;
  }
});

// node_modules/waddler/logger.cjs
var require_logger = __commonJS({
  "node_modules/waddler/logger.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var logger_exports = {};
    __export(logger_exports, {
      ConsoleLogWriter: () => ConsoleLogWriter,
      DefaultLogger: () => DefaultLogger,
      NoopLogger: () => NoopLogger
    });
    module.exports = __toCommonJS(logger_exports);
    var ConsoleLogWriter = class {
      write(message) {
        console.log(message);
      }
    };
    var DefaultLogger = class {
      writer;
      constructor(config2) {
        this.writer = config2?.writer ?? new ConsoleLogWriter();
      }
      logQuery(query, params, metadata) {
        let paramsStr = "";
        if (Array.isArray(params)) {
          const stringifiedParams = params.map((p) => {
            try {
              return JSON.stringify(p);
            } catch {
              return String(p);
            }
          });
          paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
        } else {
          const stringifiedParams = {};
          let paramsCount = 0;
          for (const [key, value] of Object.entries(params)) {
            try {
              stringifiedParams[key] = JSON.stringify(value);
              paramsCount++;
            } catch {
              stringifiedParams[key] = String(value);
              paramsCount++;
            }
          }
          paramsStr = paramsCount ? ` -- params: ${JSON.stringify(stringifiedParams)}` : "";
        }
        const metadataStr = metadata === void 0 ? "" : ` --metadata: ${JSON.stringify(metadata)}`;
        this.writer.write(`Query: ${query}${paramsStr}${metadataStr}`);
      }
    };
    var NoopLogger = class {
      logQuery() {
      }
    };
  }
});

// node_modules/waddler/sql-template-params.cjs
var require_sql_template_params = __commonJS({
  "node_modules/waddler/sql-template-params.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var sql_template_params_exports = {};
    __export(sql_template_params_exports, {
      Dialect: () => Dialect,
      SQLChunk: () => SQLChunk,
      SQLCommonParam: () => SQLCommonParam,
      SQLDefault: () => SQLDefault,
      SQLIdentifier: () => SQLIdentifier,
      SQLQuery: () => SQLQuery,
      SQLRaw: () => SQLRaw,
      SQLString: () => SQLString,
      SQLValues: () => SQLValues
    });
    module.exports = __toCommonJS(sql_template_params_exports);
    var Dialect = class {
      createEmptyParams() {
        return [];
      }
      pushParams(params, param, _lastParamIdx, mode = "bulk") {
        if (mode === "bulk") params.push(...param);
        else params.push(param);
      }
    };
    var SQLChunk = class {
    };
    var SQLQuery = class extends SQLChunk {
      constructor(sqlWrapper, dialect) {
        super();
        this.sqlWrapper = sqlWrapper;
        this.dialect = dialect;
      }
      generateSQL() {
        this.sqlWrapper.prepareQuery(this.dialect);
        return this.sqlWrapper.getQuery(this.dialect);
      }
      append(other) {
        this.sqlWrapper.append(other.sqlWrapper);
      }
      toSQL() {
        return this.generateSQL();
      }
    };
    var SQLCommonParam = class extends SQLChunk {
      constructor(value, type = "String") {
        super();
        this.value = value;
        this.type = type;
      }
      INT32_MAX = 2147483647;
      INT32_MIN = -2147483648;
      generateSQL({ dialect, lastParamIdx }) {
        if (typeof this.value === "bigint") this.type = "Int64";
        if (typeof this.value === "number" && this.value % 1 === 0) {
          this.type = "Int32";
          if (this.value > this.INT32_MAX || this.value < this.INT32_MIN) {
            this.type = "Int64";
          }
        }
        if (Array.isArray(this.value)) {
          const nodeType = typeof this.value[0];
          if (nodeType === "string") this.type = "Array(String)";
        }
        const params = dialect.createEmptyParams();
        dialect.pushParams(params, this.value, lastParamIdx + 1, "single");
        return {
          sql: dialect.escapeParam(lastParamIdx + 1, this.type),
          params,
          paramsCount: 1
        };
      }
    };
    var SQLString = class extends SQLChunk {
      constructor(value) {
        super();
        this.value = value;
      }
      generateSQL() {
        return { sql: this.value };
      }
    };
    var SQLIdentifier = class extends SQLChunk {
      constructor(value) {
        super();
        this.value = value;
      }
      objectToSQL(object, dialect) {
        dialect.checkIdentifierObject(object);
        const chunks = [];
        if (object.schema !== void 0) chunks.push(`${dialect.escapeIdentifier(object.schema)}`);
        if (object.table !== void 0) chunks.push(`${dialect.escapeIdentifier(object.table)}`);
        if (object.column !== void 0) chunks.push(`${dialect.escapeIdentifier(object.column)}`);
        const as = object.as === void 0 ? "" : ` as ${dialect.escapeIdentifier(object.as)}`;
        return `${chunks.join(".")}${as}`;
      }
      generateSQL({ dialect }) {
        if (typeof this.value === "string") {
          return {
            sql: `${dialect.escapeIdentifier(this.value)}`
          };
        }
        if (Array.isArray(this.value)) {
          if (this.value.length === 0) {
            throw new Error(
              `you can't specify empty array as parameter for sql.identifier.`
            );
          }
          const chunks = [];
          for (const val of this.value) {
            if (Array.isArray(val)) {
              throw new Error(
                `you can't specify array of arrays as parameter for sql.identifier.`
              );
            }
            if (typeof val === "string") {
              chunks.push(dialect.escapeIdentifier(val));
            } else if (typeof val === "object" && val !== null) {
              chunks.push(this.objectToSQL(val, dialect));
            } else {
              throw new Error(
                `you can't specify array of (null or undefined or number or bigint or boolean or symbol or function) as parameter for sql.identifier.`
              );
            }
          }
          return { sql: chunks.join(", ") };
        }
        if (typeof this.value === "object" && this.value !== null) {
          return { sql: this.objectToSQL(this.value, dialect) };
        }
        if (this.value === null) {
          throw new Error(
            `you can't specify null as parameter for sql.identifier.`
          );
        }
        throw new Error(
          `you can't specify ${typeof this.value} as parameter for sql.identifier.`
        );
      }
    };
    var SQLValues = class extends SQLChunk {
      constructor(value, types = []) {
        super();
        this.value = value;
        this.types = types;
      }
      params = [];
      paramsCount = 0;
      generateSQL({ dialect, lastParamIdx }) {
        this.params = dialect.createEmptyParams();
        this.paramsCount = 0;
        if (!Array.isArray(this.value)) {
          if (this.value === null) {
            throw new Error(`you can't specify null as parameter for sql.values.`);
          }
          throw new Error(
            `you can't specify ${typeof this.value} as parameter for sql.values.`
          );
        }
        if (this.value.length === 0) {
          throw new Error(
            `you can't specify empty array as parameter for sql.values.`
          );
        }
        const sql = this.value.map((rowValues) => this.rowValuesToSQL(rowValues, dialect, lastParamIdx)).join(", ");
        return {
          sql,
          params: this.params,
          paramsCount: this.paramsCount
        };
      }
      rowValuesToSQL(rowValues, dialect, lastParamIdx) {
        if (Array.isArray(rowValues)) {
          if (rowValues.length === 0) {
            throw new Error(`array of values can't be empty.`);
          }
          return `(${rowValues.map((value, index) => {
            const sql = dialect.valueToSQL({
              value,
              lastParamIdx,
              params: this.params,
              types: this.types,
              colIdx: index,
              paramsCount: this.paramsCount
            });
            this.paramsCount++;
            return sql;
          }).join(", ")})`;
        }
        if (rowValues === null) {
          throw new Error(
            `you can't specify array of null as parameter for sql.values.`
          );
        }
        throw new Error(
          `you can't specify array of ${typeof rowValues} as parameter for sql.values.`
        );
      }
    };
    var SQLRaw = class extends SQLChunk {
      constructor(value) {
        super();
        this.value = value;
      }
      generateSQL() {
        if (typeof this.value === "number" || typeof this.value === "bigint" || typeof this.value === "string" || typeof this.value === "boolean") {
          return { sql: `${this.value}` };
        }
        if (typeof this.value === "object") {
          throw new Error(
            "you can't specify array, object or null as parameter for sql.raw."
          );
        }
        if (this.value === void 0) {
          throw new Error(
            "you can't specify undefined as parameter for sql.raw, maybe you mean using sql.default?"
          );
        }
        if (typeof this.value === "symbol") {
          throw new Error("you can't specify symbol as parameter for sql.raw.");
        }
        throw new Error("you can't specify function as parameter for sql.raw.");
      }
    };
    var SQLDefault = class extends SQLChunk {
      generateSQL() {
        return { sql: "default" };
      }
    };
  }
});

// node_modules/waddler/sql-template.cjs
var require_sql_template = __commonJS({
  "node_modules/waddler/sql-template.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var sql_template_exports = {};
    __export(sql_template_exports, {
      SQLTemplate: () => SQLTemplate
    });
    module.exports = __toCommonJS(sql_template_exports);
    var import_logger = require_logger();
    var SQLTemplate = class {
      constructor(sqlWrapper, dialect, configOptions = {}) {
        this.sqlWrapper = sqlWrapper;
        this.dialect = dialect;
        this.configOptions = configOptions;
        this.logger = configOptions.logger ?? new import_logger.NoopLogger();
      }
      logger;
      append(other) {
        this.sqlWrapper.append(other.sqlWrapper);
        this.sqlWrapper.recalculateQuery(this.dialect);
      }
      toSQL() {
        return this.sqlWrapper.getQuery(this.dialect);
      }
      // Allow it to be awaited (like a Promise)
      then(onfulfilled, onrejected) {
        const result = this.execute();
        return Promise.resolve(result).then(onfulfilled, onrejected);
      }
      async *chunked(chunkSize = 1) {
        let rows = [];
        let row;
        const asyncIterator = this.stream();
        let iterResult = await asyncIterator.next();
        while (!iterResult.done) {
          row = iterResult.value;
          rows.push(row);
          if (rows.length % chunkSize === 0) {
            yield rows;
            rows = [];
          }
          iterResult = await asyncIterator.next();
        }
        if (rows.length !== 0) {
          yield rows;
        }
      }
    };
  }
});

// node_modules/waddler/sql.cjs
var require_sql = __commonJS({
  "node_modules/waddler/sql.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var sql_exports = {};
    __export(sql_exports, {
      SQLWrapper: () => SQLWrapper,
      paramsCheck: () => paramsCheck
    });
    module.exports = __toCommonJS(sql_exports);
    var import_sql_template_params = require_sql_template_params();
    var import_sql_template = require_sql_template();
    var SQLWrapper = class {
      constructor(queryChunks = [], sql, params) {
        this.queryChunks = queryChunks;
        this.sql = sql;
        this.params = params;
      }
      with({ templateParams, rawParams }) {
        if (templateParams) {
          const { strings, params } = templateParams;
          if (strings === void 0) return this;
          if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
            this.queryChunks.push(new import_sql_template_params.SQLString(strings[0]));
          }
          for (const [paramIndex, param] of params.entries()) {
            if (param instanceof import_sql_template_params.SQLQuery || param instanceof import_sql_template.SQLTemplate) {
              this.append(param.sqlWrapper);
              this.queryChunks.push(new import_sql_template_params.SQLString(strings[paramIndex + 1]));
            } else if (param instanceof import_sql_template_params.SQLChunk) this.queryChunks.push(param, new import_sql_template_params.SQLString(strings[paramIndex + 1]));
            else {
              paramsCheck(param);
              this.queryChunks.push(new import_sql_template_params.SQLCommonParam(param), new import_sql_template_params.SQLString(strings[paramIndex + 1]));
            }
          }
        } else if (rawParams) {
          this.sql = rawParams.sql;
          this.params = rawParams.params;
        }
        return this;
      }
      getQuery(dialect) {
        return {
          sql: this.sql ?? "",
          params: this.params ?? dialect.createEmptyParams()
        };
      }
      // This alias is provided to improve clarity when recalculating queries for functions such as "append."
      recalculateQuery(dialect) {
        return this.prepareQuery(dialect);
      }
      prepareQuery(dialect) {
        if (this.queryChunks.length === 1 && this.queryChunks[0] instanceof import_sql_template_params.SQLString) {
          this.sql = this.queryChunks[0].generateSQL().sql;
          this.params = dialect.createEmptyParams();
        }
        const params4driver = dialect.createEmptyParams();
        let paramsCount = 0;
        let query = "";
        for (const chunk of this.queryChunks) {
          if (chunk instanceof import_sql_template_params.SQLString || chunk instanceof import_sql_template_params.SQLRaw || chunk instanceof import_sql_template_params.SQLDefault) {
            query += chunk.generateSQL().sql;
          }
          if (chunk instanceof import_sql_template_params.SQLIdentifier) {
            query += chunk.generateSQL({ dialect }).sql;
          }
          if (chunk instanceof import_sql_template_params.SQLValues || chunk instanceof import_sql_template_params.SQLCommonParam) {
            const { sql, params, paramsCount: newParamsCount } = chunk.generateSQL({ dialect, lastParamIdx: paramsCount });
            query += sql;
            dialect.pushParams(params4driver, params, paramsCount + 1, "bulk");
            paramsCount += newParamsCount;
          }
        }
        this.sql = query;
        this.params = params4driver;
        return this;
      }
      append(other) {
        const thisLastChunk = this.queryChunks.at(-1), otherFirstChunk = other.queryChunks.at(0);
        if (thisLastChunk instanceof import_sql_template_params.SQLString && otherFirstChunk instanceof import_sql_template_params.SQLString) {
          const middleChunk = new import_sql_template_params.SQLString(
            `${thisLastChunk.generateSQL().sql}${otherFirstChunk.generateSQL().sql}`
          );
          this.queryChunks = [
            ...this.queryChunks.slice(0, -1),
            middleChunk,
            ...other.queryChunks.slice(1)
          ];
          return;
        }
        this.queryChunks.push(...other.queryChunks);
      }
    };
    function paramsCheck(param) {
      if (param === void 0) {
        throw new Error("you can't specify undefined as parameter");
      }
      if (typeof param === "symbol") {
        throw new Error("you can't specify symbol as parameter");
      }
      if (typeof param === "function") {
        throw new Error("you can't specify function as parameter");
      }
    }
  }
});

// node_modules/waddler/utils.cjs
var require_utils3 = __commonJS({
  "node_modules/waddler/utils.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    __export(utils_exports, {
      isConfig: () => isConfig,
      stringifyArray: () => stringifyArray,
      transformValueForArray: () => transformValueForArray
    });
    module.exports = __toCommonJS(utils_exports);
    var stringifyArray = (array) => {
      if (!Array.isArray(array)) {
        return transformValueForArray(array);
      }
      let returnStr = "[";
      for (const [idx, el] of array.entries()) {
        returnStr += `${stringifyArray(el)}`;
        if (idx === array.length - 1) continue;
        returnStr += ",";
      }
      returnStr += "]";
      return returnStr;
    };
    var transformValueForArray = (value) => {
      if (value === null || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value;
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === "object") {
        return JSON.stringify(value);
      }
      if (value === void 0) {
        throw new Error("you can't specify undefined as array value.");
      }
      if (typeof value === "string") {
        throw new Error("you can't specify string as array value.");
      }
    };
    function isConfig(data) {
      if (typeof data !== "object" || data === null) return false;
      if (data.constructor.name !== "Object") return false;
      if ("connection" in data) {
        const type = typeof data["connection"];
        if (type !== "string" && type !== "object" && type !== "undefined") return false;
        return true;
      }
      if ("client" in data) {
        const type = typeof data["client"];
        if (type !== "object" && type !== "function" && type !== "undefined") return false;
        return true;
      }
      if (Object.keys(data).length === 0) return true;
      return false;
    }
  }
});

// node_modules/waddler/pg/pg-core/utils.cjs
var require_utils4 = __commonJS({
  "node_modules/waddler/pg/pg-core/utils.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    __export(utils_exports, {
      makePgArray: () => makePgArray
    });
    module.exports = __toCommonJS(utils_exports);
    function makePgArray(array) {
      return `{${array.map((item) => {
        if (Array.isArray(item)) {
          return makePgArray(item);
        }
        if (typeof item === "object" && item !== null) {
          item = JSON.stringify(item);
        }
        if (typeof item === "string") {
          return `"${item.replace(/\\/g, "\\\\").replace(/"/g, String.raw`\"`)}"`;
        }
        return `${item}`;
      }).join(",")}}`;
    }
  }
});

// node_modules/waddler/pg/pg-core/dialect.cjs
var require_dialect = __commonJS({
  "node_modules/waddler/pg/pg-core/dialect.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var dialect_exports = {};
    __export(dialect_exports, {
      PgDialect: () => PgDialect,
      SQLFunctions: () => SQLFunctions
    });
    module.exports = __toCommonJS(dialect_exports);
    var import_sql_template_params = require_sql_template_params();
    var import_utils = require_utils4();
    var PgDialect = class extends import_sql_template_params.Dialect {
      escapeParam(lastParamIdx) {
        return `$${lastParamIdx}`;
      }
      escapeIdentifier(identifier) {
        return `"${identifier}"`;
      }
      checkIdentifierObject(object) {
        if (Object.values(object).includes(void 0)) {
          throw new Error(
            `you can't specify undefined parameters. maybe you want to omit it?`
          );
        }
        if (Object.keys(object).length === 0) {
          throw new Error(`you need to specify at least one parameter.`);
        }
        if (object.schema !== void 0 && object.table === void 0 && object.column !== void 0) {
          throw new Error(
            `you can't specify only "schema" and "column" properties, you need also specify "table".`
          );
        }
        if (Object.keys(object).length === 1 && object.as !== void 0) {
          throw new Error(`you can't specify only "as" property.`);
        }
        if (object.as !== void 0 && object.column === void 0 && object.table === void 0) {
          throw new Error(
            `you have to specify "column" or "table" property along with "as".`
          );
        }
        if (!["string", "undefined"].includes(typeof object.schema) || !["string", "undefined"].includes(typeof object.table) || !["string", "undefined"].includes(typeof object.column) || !["string", "undefined"].includes(typeof object.as)) {
          throw new Error(
            "object properties 'schema', 'table', 'column', 'as' should be of string type or omitted."
          );
        }
      }
      // SQLValues
      valueToSQL({ value, lastParamIdx, params }) {
        if (value instanceof import_sql_template_params.SQLDefault) {
          return value.generateSQL().sql;
        }
        if (Array.isArray(value)) {
          const mappedValue = (0, import_utils.makePgArray)(value);
          params.push(mappedValue);
          return this.escapeParam(lastParamIdx + params.length);
        }
        if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean" || typeof value === "string" || value === null || value instanceof Date || typeof value === "object") {
          params.push(value);
          return this.escapeParam(lastParamIdx + params.length);
        }
        if (value === void 0) {
          throw new Error("value can't be undefined, maybe you mean sql.default?");
        }
        throw new Error(`you can't specify ${typeof value} as value.`);
      }
    };
    var SQLFunctions = {
      identifier: (value) => {
        return new import_sql_template_params.SQLIdentifier(value);
      },
      values: (value) => {
        return new import_sql_template_params.SQLValues(value);
      },
      raw: (value) => {
        return new import_sql_template_params.SQLRaw(value);
      },
      default: new import_sql_template_params.SQLDefault()
    };
  }
});

// node_modules/waddler/errors/index.cjs
var require_errors = __commonJS({
  "node_modules/waddler/errors/index.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var errors_exports = {};
    __export(errors_exports, {
      WaddlerQueryError: () => WaddlerQueryError
    });
    module.exports = __toCommonJS(errors_exports);
    var WaddlerQueryError = class _WaddlerQueryError extends Error {
      constructor(query, params, cause) {
        super(`Failed query: ${query}
params: ${params}`);
        this.query = query;
        this.params = params;
        this.cause = cause;
        Error.captureStackTrace(this, _WaddlerQueryError);
        if (cause) this.cause = cause;
      }
    };
  }
});

// node_modules/waddler/pg/neon-http/session.cjs
var require_session = __commonJS({
  "node_modules/waddler/pg/neon-http/session.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var session_exports = {};
    __export(session_exports, {
      NeonHttpSQLTemplate: () => NeonHttpSQLTemplate
    });
    module.exports = __toCommonJS(session_exports);
    var import_serverless = require_serverless();
    var import_errors = require_errors();
    var import_sql_template = require_sql_template();
    var pgTypeConfig = {
      // @ts-expect-error
      getTypeParser: (typeId, format) => {
        if (typeId === import_serverless.types.builtins.INTERVAL) return (val) => val;
        if (typeId === 1187) return (val) => val;
        return import_serverless.types.getTypeParser(typeId, format);
      }
    };
    var rawQueryConfig = {
      arrayMode: false,
      fullResults: true,
      types: pgTypeConfig
    };
    var queryConfig = {
      arrayMode: true,
      fullResults: true,
      types: pgTypeConfig
    };
    var NeonHttpSQLTemplate = class extends import_sql_template.SQLTemplate {
      constructor(sqlWrapper, client, dialect, configOptions, options = { rowMode: "object" }) {
        super(sqlWrapper, dialect, configOptions);
        this.sqlWrapper = sqlWrapper;
        this.client = client;
        this.options = options;
      }
      async execute() {
        const { sql: query, params } = this.sqlWrapper.getQuery(this.dialect);
        let finalRes, finalMetadata;
        try {
          const queryResult = await (this.options.rowMode === "array" ? this.client.query(query, params, queryConfig) : this.client.query(query, params, rawQueryConfig));
          ({ rows: finalRes, ...finalMetadata } = queryResult);
        } catch (error) {
          throw new import_errors.WaddlerQueryError(query, params, error);
        }
        this.logger.logQuery(query, params, finalMetadata);
        return finalRes;
      }
      /**
       * For now, throws the Error.
       * Current implementation (a placeholder) will be replaced once @neondatabase/serverless acquires streaming support or when a suitable third-party solution is found.
       */
      // eslint-disable-next-line require-yield
      async *stream() {
        throw new Error("stream is not implemented for neon-http yet.");
      }
    };
  }
});

// node_modules/waddler/pg/neon-http/driver.cjs
var require_driver = __commonJS({
  "node_modules/waddler/pg/neon-http/driver.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var driver_exports = {};
    __export(driver_exports, {
      sql: () => sql,
      waddler: () => waddler
    });
    module.exports = __toCommonJS(driver_exports);
    var import_serverless = require_serverless();
    var import_logger = require_logger();
    var import_sql_template_params = require_sql_template_params();
    var import_sql = require_sql();
    var import_utils = require_utils3();
    var import_dialect = require_dialect();
    var import_session = require_session();
    var sql = (strings, ...params) => {
      const sqlWrapper = new import_sql.SQLWrapper();
      sqlWrapper.with({ templateParams: { strings, params } });
      const dialect = new import_dialect.PgDialect();
      return new import_sql_template_params.SQLQuery(sqlWrapper, dialect);
    };
    Object.assign(sql, import_dialect.SQLFunctions);
    var createSqlTemplate = (client, configOptions = {}) => {
      const dialect = new import_dialect.PgDialect();
      let logger;
      if (configOptions.logger === true) {
        logger = new import_logger.DefaultLogger();
      } else if (configOptions.logger !== false) {
        logger = configOptions.logger;
      }
      const fn = (strings, ...params) => {
        const sql2 = new import_sql.SQLWrapper();
        sql2.with({ templateParams: { strings, params } }).prepareQuery(dialect);
        return new import_session.NeonHttpSQLTemplate(sql2, client, dialect, { logger });
      };
      Object.assign(fn, {
        ...import_dialect.SQLFunctions,
        unsafe: async (query, params, options) => {
          params = params ?? [];
          options = options ?? { rowMode: "object" };
          const sql2 = new import_sql.SQLWrapper();
          sql2.with({ rawParams: { sql: query, params } });
          const unsafeDriver = new import_session.NeonHttpSQLTemplate(sql2, client, dialect, { logger }, options);
          return await unsafeDriver.execute();
        }
      });
      return fn;
    };
    function waddler(...params) {
      if (typeof params[0] === "string") {
        const instance = (0, import_serverless.neon)(params[0]);
        return createSqlTemplate(instance, params[1]);
      }
      if ((0, import_utils.isConfig)(params[0])) {
        const { connection, client, ...configOptions } = params[0];
        if (client) return createSqlTemplate(client, configOptions);
        if (typeof connection === "object") {
          const { connectionString, ...options } = connection;
          const instance2 = (0, import_serverless.neon)(connectionString, options);
          return createSqlTemplate(instance2, configOptions);
        }
        const instance = (0, import_serverless.neon)(connection);
        return createSqlTemplate(instance, configOptions);
      }
      throw new Error(
        "Invalid parameter for waddler."
      );
    }
  }
});

// node_modules/waddler/pg/neon-http/index.cjs
var require_neon_http = __commonJS({
  "node_modules/waddler/pg/neon-http/index.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps2(target, mod, "default"), secondTarget && __copyProps2(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var neon_http_exports = {};
    module.exports = __toCommonJS(neon_http_exports);
    __reExport(neon_http_exports, require_driver(), module.exports);
    __reExport(neon_http_exports, require_session(), module.exports);
  }
});

// node_modules/waddler/pg/node-postgres/session.cjs
var require_session2 = __commonJS({
  "node_modules/waddler/pg/node-postgres/session.cjs"(exports, module) {
    "use strict";
    var __create2 = Object.create;
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf2 = Object.getPrototypeOf;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var session_exports = {};
    __export(session_exports, {
      NodePgSQLTemplate: () => NodePgSQLTemplate
    });
    module.exports = __toCommonJS(session_exports);
    var import_pg = __toESM2(require_lib2(), 1);
    var import_errors = require_errors();
    var import_sql_template = require_sql_template();
    var { Pool, types } = import_pg.default;
    var pgTypeConfig = {
      // @ts-expect-error
      getTypeParser: (typeId, format) => {
        if (typeId === types.builtins.INTERVAL) return (val) => val;
        if (typeId === 1187) return (val) => val;
        return types.getTypeParser(typeId, format);
      }
    };
    var NodePgSQLTemplate = class extends import_sql_template.SQLTemplate {
      constructor(sqlWrapper, client, dialect, configOptions, options = { rowMode: "object" }) {
        super(sqlWrapper, dialect, configOptions);
        this.sqlWrapper = sqlWrapper;
        this.client = client;
        this.options = options;
        const query = this.sqlWrapper.getQuery(this.dialect).sql;
        this.queryConfig = {
          text: query,
          types: pgTypeConfig
        };
        this.rawQueryConfig = {
          rowMode: "array",
          text: query,
          types: pgTypeConfig
        };
      }
      queryConfig;
      rawQueryConfig;
      async execute() {
        const { params } = this.sqlWrapper.getQuery(this.dialect);
        let finalRes, finalMetadata;
        try {
          const queryResult = this.options.rowMode === "array" ? await this.client.query(this.rawQueryConfig, params) : await this.client.query(this.queryConfig, params);
          ({ rows: finalRes, ...finalMetadata } = queryResult);
        } catch (error) {
          throw new import_errors.WaddlerQueryError(this.queryConfig.text, params, error);
        }
        this.logger.logQuery(this.queryConfig.text, params, finalMetadata);
        return finalRes;
      }
      // TODO: revise: maybe I should override chunked method because we can use QueryStream with option 'batchSize' in QueryStreamConfig
      async *stream() {
        let conn;
        const { sql: query, params } = this.sqlWrapper.getQuery(this.dialect);
        try {
          conn = this.client instanceof Pool ? await this.client.connect() : this.client;
          const queryStreamObj = this.configOptions?.extensions?.find((it) => it.name === "WaddlerPgQueryStream");
          if (!queryStreamObj) {
            throw new Error(
              'To use stream feature, you would need to provide queryStream() function to waddler extensions, example: waddler("", { extensions: [queryStream()] })'
            );
          }
          const queryStream = new queryStreamObj.constructor(query, params, { types: this.queryConfig.types });
          const stream = conn.query(queryStream);
          for await (const row of stream) {
            yield row;
          }
          if (this.client instanceof Pool) {
            conn.release();
          }
        } catch (error) {
          if (this.client instanceof Pool) {
            conn?.release();
          }
          throw new import_errors.WaddlerQueryError(query, params, error);
        }
      }
    };
  }
});

// node_modules/waddler/pg/node-postgres/driver.cjs
var require_driver2 = __commonJS({
  "node_modules/waddler/pg/node-postgres/driver.cjs"(exports, module) {
    "use strict";
    var __create2 = Object.create;
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf2 = Object.getPrototypeOf;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var driver_exports = {};
    __export(driver_exports, {
      sql: () => sql,
      waddler: () => waddler
    });
    module.exports = __toCommonJS(driver_exports);
    var import_pg = __toESM2(require_lib2(), 1);
    var import_logger = require_logger();
    var import_sql_template_params = require_sql_template_params();
    var import_sql = require_sql();
    var import_utils = require_utils3();
    var import_dialect = require_dialect();
    var import_session = require_session2();
    var sql = (strings, ...params) => {
      const sqlWrapper = new import_sql.SQLWrapper();
      sqlWrapper.with({ templateParams: { strings, params } });
      const dialect = new import_dialect.PgDialect();
      return new import_sql_template_params.SQLQuery(sqlWrapper, dialect);
    };
    Object.assign(sql, import_dialect.SQLFunctions);
    var createSqlTemplate = (client, configOptions = {}) => {
      const dialect = new import_dialect.PgDialect();
      let logger;
      if (configOptions.logger === true) {
        logger = new import_logger.DefaultLogger();
      } else if (configOptions.logger !== false) {
        logger = configOptions.logger;
      }
      const extensions = configOptions.extensions;
      const fn = (strings, ...params) => {
        const sql2 = new import_sql.SQLWrapper();
        sql2.with({ templateParams: { strings, params } }).prepareQuery(dialect);
        return new import_session.NodePgSQLTemplate(sql2, client, dialect, { logger, extensions });
      };
      Object.assign(fn, {
        ...import_dialect.SQLFunctions,
        unsafe: async (query, params, options) => {
          params = params ?? [];
          options = options ?? { rowMode: "object" };
          const sql2 = new import_sql.SQLWrapper();
          sql2.with({ rawParams: { sql: query, params } });
          const unsafeDriver = new import_session.NodePgSQLTemplate(sql2, client, dialect, { logger, extensions }, options);
          return await unsafeDriver.execute();
        }
      });
      return fn;
    };
    function waddler(...params) {
      if (typeof params[0] === "string") {
        const client = new import_pg.default.Pool({
          connectionString: params[0]
        });
        return createSqlTemplate(client, params[1]);
      }
      if ((0, import_utils.isConfig)(params[0])) {
        const { connection, client, ...waddlerConfig } = params[0];
        if (client) return createSqlTemplate(client, waddlerConfig);
        const instance = typeof connection === "string" ? new import_pg.default.Pool({
          connectionString: connection
        }) : new import_pg.default.Pool(connection);
        return createSqlTemplate(instance, waddlerConfig);
      }
      throw new Error(
        "Invalid parameter for waddler.\nMust be a string, { connection: string | pg.PoolConfig }, { client: pg.Client | pg.Pool }, pg.ClientConfig or pg.PoolConfig"
      );
    }
  }
});

// node_modules/waddler/pg/node-postgres/index.cjs
var require_node_postgres = __commonJS({
  "node_modules/waddler/pg/node-postgres/index.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps2(target, mod, "default"), secondTarget && __copyProps2(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var node_postgres_exports = {};
    module.exports = __toCommonJS(node_postgres_exports);
    __reExport(node_postgres_exports, require_driver2(), module.exports);
    __reExport(node_postgres_exports, require_session2(), module.exports);
  }
});

// node_modules/@netlify/runtime-utils/dist/main.cjs
var require_main = __commonJS({
  "node_modules/@netlify/runtime-utils/dist/main.cjs"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var main_exports = {};
    __export(main_exports, {
      base64Decode: () => base64Decode,
      base64Encode: () => base64Encode,
      getEnvironment: () => getEnvironment
    });
    module.exports = __toCommonJS(main_exports);
    var getString = (input) => typeof input === "string" ? input : JSON.stringify(input);
    var base64Decode = globalThis.Buffer ? (input) => Buffer.from(input, "base64").toString() : (input) => atob(input);
    var base64Encode = globalThis.Buffer ? (input) => Buffer.from(getString(input)).toString("base64") : (input) => btoa(getString(input));
    var getEnvironment = () => {
      const { Deno, Netlify, process: process2 } = globalThis;
      return Netlify?.env ?? Deno?.env ?? {
        delete: (key) => delete process2?.env[key],
        get: (key) => process2?.env[key],
        has: (key) => Boolean(process2?.env[key]),
        set: (key, value) => {
          if (process2?.env) {
            process2.env[key] = value;
          }
        },
        toObject: () => process2?.env ?? {}
      };
    };
  }
});

// node_modules/@netlify/database/dist/main.cjs
var require_main2 = __commonJS({
  "node_modules/@netlify/database/dist/main.cjs"(exports, module) {
    "use strict";
    var __create2 = Object.create;
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf2 = Object.getPrototypeOf;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var main_exports = {};
    __export(main_exports, {
      MissingDatabaseConnectionError: () => MissingDatabaseConnectionError,
      getConnectionString: () => getConnectionString,
      getDatabase: () => getDatabase
    });
    module.exports = __toCommonJS(main_exports);
    var import_serverless = require_serverless();
    var import_ws = __toESM2(require_ws(), 1);
    var import_pg = __toESM2(require_lib2(), 1);
    var import_neon_http = require_neon_http();
    var import_node_postgres = require_node_postgres();
    var import_runtime_utils = require_main();
    var MissingDatabaseConnectionError = class extends Error {
      constructor() {
        super(
          "The environment has not been configured to use Netlify Database. You must supply the `connectionString` option when calling `getDatabase()`. See https://ntl.fyi/database-environment for details."
        );
        this.name = "MissingDatabaseConnectionError";
      }
    };
    function getConnectionString() {
      const env = (0, import_runtime_utils.getEnvironment)();
      const connectionString = env.get("NETLIFY_DB_URL");
      if (!connectionString) {
        throw new MissingDatabaseConnectionError();
      }
      return connectionString;
    }
    function ensureNeonWebSocket() {
      if (!import_serverless.neonConfig.webSocketConstructor && typeof WebSocket === "undefined") {
        import_serverless.neonConfig.webSocketConstructor = import_ws.default;
      }
    }
    function createRefreshingHttpClient(readConnectionString) {
      let cachedConnectionString;
      let cachedClient;
      const getClient = () => {
        const connectionString = readConnectionString();
        if (connectionString !== cachedConnectionString || cachedClient === void 0) {
          cachedConnectionString = connectionString;
          cachedClient = (0, import_serverless.neon)(connectionString);
        }
        return cachedClient;
      };
      getClient();
      const target = () => void 0;
      return new Proxy(target, {
        apply: (_target, _thisArg, args) => getClient()(...args),
        get: (_target, prop, receiver) => {
          const value = Reflect.get(getClient(), prop, receiver);
          if (typeof value !== "function") {
            return value;
          }
          return (...args) => {
            const fn = Reflect.get(getClient(), prop, receiver);
            return fn.apply(getClient(), args);
          };
        }
      });
    }
    function getDatabase(options = {}) {
      const env = (0, import_runtime_utils.getEnvironment)();
      const { connectionString: override } = options;
      const readConnectionString = () => {
        const connectionString2 = override ?? env.get("NETLIFY_DB_URL");
        if (!connectionString2) {
          throw new MissingDatabaseConnectionError();
        }
        return connectionString2;
      };
      const connectionString = readConnectionString();
      const driver = env.get("NETLIFY_DB_DRIVER");
      if (driver === "serverless") {
        ensureNeonWebSocket();
        const httpClient = createRefreshingHttpClient(readConnectionString);
        const pool2 = new import_serverless.Pool({ connectionString });
        return {
          driver: "serverless",
          sql: (0, import_neon_http.waddler)({ client: httpClient }),
          pool: pool2,
          httpClient,
          get connectionString() {
            return readConnectionString();
          }
        };
      }
      const pool = new import_pg.default.Pool({ connectionString });
      return {
        driver: "server",
        sql: (0, import_node_postgres.waddler)({ client: pool }),
        pool,
        get connectionString() {
          return readConnectionString();
        }
      };
    }
  }
});

// server/db.js
var require_db = __commonJS({
  "server/db.js"(exports, module) {
    "use strict";
    var pg = require_lib2();
    pg.types.setTypeParser(20, (v) => Number(v));
    var pool = null;
    function connectionString() {
      if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
      try {
        return require_main2().getConnectionString();
      } catch {
      }
      return process.env.NETLIFY_DB_URL;
    }
    function getPool() {
      if (!pool) {
        const cs = connectionString();
        if (!cs) throw new Error("Ingen databas konfigurerad (DATABASE_URL saknas).");
        pool = new pg.Pool({ connectionString: cs, max: 3, idleTimeoutMillis: 1e4 });
      }
      return pool;
    }
    async function closePool() {
      if (pool) {
        const p = pool;
        pool = null;
        await p.end();
      }
    }
    function toPg(sql) {
      let i = 0;
      return sql.replace(/\?/g, () => `$${++i}`);
    }
    function wrap(runner) {
      const q = async (sql, params) => (await runner.query(toPg(sql), params)).rows;
      return {
        all: (sql, ...p) => q(sql, p),
        get: async (sql, ...p) => (await q(sql, p))[0],
        run: async (sql, ...p) => {
          const r = await runner.query(toPg(sql), p);
          return { changes: r.rowCount, rows: r.rows };
        },
        exec: (sql) => runner.query(sql)
      };
    }
    function db() {
      return wrap(getPool());
    }
    async function tx(fn) {
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(262027)");
        const r = await fn(wrap(client));
        await client.query("COMMIT");
        return r;
      } catch (e) {
        try {
          await client.query("ROLLBACK");
        } catch {
        }
        throw e;
      } finally {
        client.release();
      }
    }
    async function nextNumber(t, name) {
      const r = await t.get("UPDATE counters SET value = value + 1 WHERE name = ? RETURNING value", name);
      return r.value;
    }
    module.exports = { db, tx, nextNumber, getPool, closePool, toPg };
  }
});

// server/logic.js
var require_logic = __commonJS({
  "server/logic.js"(exports, module) {
    "use strict";
    var TZ = "Europe/Stockholm";
    function todayStr(now) {
      if (!now && process.env.BK_TODAY) return process.env.BK_TODAY;
      now = now || /* @__PURE__ */ new Date();
      return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    }
    function isDate(s) {
      if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
      const d = /* @__PURE__ */ new Date(s + "T00:00:00Z");
      return !isNaN(d) && d.toISOString().slice(0, 10) === s;
    }
    function isMonth(s) {
      return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
    }
    function addDays(s, n) {
      const d = /* @__PURE__ */ new Date(s + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    }
    function daysBetween(a, b) {
      return Math.round((/* @__PURE__ */ new Date(b + "T00:00:00Z") - /* @__PURE__ */ new Date(a + "T00:00:00Z")) / 864e5);
    }
    function monthOf(s) {
      return s.slice(0, 7);
    }
    function monthEnd(ym) {
      const [y, m] = ym.split("-").map(Number);
      return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    }
    function monthStart(ym) {
      return ym + "-01";
    }
    function nextMonth(ym) {
      return monthOf(addDays(monthEnd(ym), 1));
    }
    function weekStart(s) {
      const d = /* @__PURE__ */ new Date(s + "T00:00:00Z");
      const dow = (d.getUTCDay() + 6) % 7;
      return addDays(s, -dow);
    }
    function isoWeek(s) {
      const d = /* @__PURE__ */ new Date(s + "T00:00:00Z");
      const day = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - day + 3);
      const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
      const w = 1 + Math.round(((d - firstThu) / 864e5 - 3 + (firstThu.getUTCDay() + 6) % 7) / 7);
      return `${d.getUTCFullYear()}-V${String(w).padStart(2, "0")}`;
    }
    function monthsBetween(fromYm, toYm) {
      const out = [];
      for (let m = fromYm; m <= toYm; m = nextMonth(m)) out.push(m);
      return out;
    }
    function defaultDueDate(issued) {
      return monthEnd(monthOf(issued));
    }
    async function activeSeason(db) {
      return db.get("SELECT * FROM seasons WHERE active = 1 ORDER BY id DESC LIMIT 1");
    }
    async function getSettings(db) {
      const s = {};
      for (const r of await db.all("SELECT key, value FROM settings")) s[r.key] = r.value;
      return s;
    }
    async function loadState(db, season, today = todayStr()) {
      const [players, fines, payments, allocs, cash] = await Promise.all([
        db.all("SELECT * FROM players ORDER BY last_name, first_name"),
        db.all("SELECT * FROM fines WHERE season_id = ? ORDER BY id", season.id),
        db.all("SELECT * FROM payments WHERE season_id = ? ORDER BY id", season.id),
        db.all(`SELECT a.*, p.date AS payment_date FROM allocations a
    JOIN payments p ON p.id = a.payment_id WHERE a.active = 1 AND p.season_id = ?`, season.id),
        db.all("SELECT * FROM cash_events WHERE season_id = ? ORDER BY date, id", season.id)
      ]);
      const allocByFine = /* @__PURE__ */ new Map();
      const allocByPayment = /* @__PURE__ */ new Map();
      for (const a of allocs) {
        if (!allocByFine.has(a.fine_id)) allocByFine.set(a.fine_id, []);
        allocByFine.get(a.fine_id).push(a);
        allocByPayment.set(a.payment_id, (allocByPayment.get(a.payment_id) || 0) + a.amount);
      }
      const fineById = /* @__PURE__ */ new Map();
      for (const f of fines) {
        const list = allocByFine.get(f.id) || [];
        f.paid = f.voided ? 0 : list.reduce((s, a) => s + a.amount, 0);
        f.remaining = f.voided ? 0 : f.amount - f.paid;
        f.status = f.voided ? "makulerad" : f.paid >= f.amount ? "betald" : f.paid > 0 ? "delvis" : "obetald";
        f.paid_date = f.status === "betald" ? list.reduce((m, a) => a.payment_date > m ? a.payment_date : m, "") : null;
        f.overdue = !f.voided && f.remaining > 0 && f.due_date < today;
        f.junior_exempt = !f.discount_amount && /Juniorrabatt gäller inte/.test(f.calc || "");
        fineById.set(f.id, f);
      }
      for (const p of payments) {
        p.allocated = p.reversed ? 0 : allocByPayment.get(p.id) || 0;
        p.unallocated = p.reversed ? 0 : p.amount - p.allocated;
      }
      const playerById = new Map(players.map((p) => [p.id, p]));
      for (const p of players) {
        Object.assign(p, {
          name: `${p.first_name} ${p.last_name}`,
          fine_count: 0,
          issued: 0,
          allocated: 0,
          paid: 0,
          refunded: 0,
          discounted: 0,
          unpaid_count: 0,
          overdue_count: 0,
          overdue_amount: 0,
          last_payment: null
        });
      }
      for (const f of fines) {
        const p = playerById.get(f.player_id);
        f.player_name = p ? p.name : f.player_id;
        if (!p || f.voided) continue;
        p.fine_count++;
        p.issued += f.amount;
        p.allocated += f.paid;
        p.discounted += f.discount_amount || 0;
        if (f.remaining > 0) p.unpaid_count++;
        if (f.overdue) {
          p.overdue_count++;
          p.overdue_amount += f.remaining;
        }
      }
      for (const pay of payments) {
        const p = playerById.get(pay.player_id);
        pay.player_name = p ? p.name : pay.player_id;
        if (!p || pay.reversed) continue;
        p.paid += pay.amount;
        if (!p.last_payment || pay.date > p.last_payment) p.last_payment = pay.date;
      }
      for (const c of cash) {
        const p = c.player_id ? playerById.get(c.player_id) : null;
        c.player_name = p ? p.name : null;
        if (p && c.type === "refund" && !c.voided) p.refunded += c.amount;
      }
      for (const p of players) {
        p.debt = p.issued - p.allocated;
        p.credit = p.paid - p.refunded - p.allocated;
      }
      return { season, today, players, playerById, fines, fineById, payments, allocs, cash };
    }
    function rank(rows, valueFn, dir = "desc", tieFn) {
      const sorted = [...rows].sort((a, b) => {
        const d = dir === "desc" ? valueFn(b) - valueFn(a) : valueFn(a) - valueFn(b);
        return d !== 0 ? d : tieFn ? tieFn(a, b) : a.name.localeCompare(b.name, "sv");
      });
      let prev = null;
      let place = 0;
      return sorted.map((r, i) => {
        const v = valueFn(r);
        if (prev === null || v !== prev) {
          place = i + 1;
          prev = v;
        }
        return { ...r, place, value: v };
      });
    }
    var sharesTop = (ranked) => ranked.filter((r) => r.place === 1);
    function dashboard(st, settings) {
      const month = monthOf(st.today);
      const active = st.players.filter((p) => p.active);
      const liveFines = st.fines.filter((f) => !f.voided);
      const livePays = st.payments.filter((p) => !p.reversed);
      const monthPayers = /* @__PURE__ */ new Map();
      for (const p of livePays) if (monthOf(p.date) === month) monthPayers.set(p.player_id, (monthPayers.get(p.player_id) || 0) + p.amount);
      const payerRows = [...monthPayers].map(([id, v]) => ({ id, name: st.playerById.get(id).name, v }));
      const topPayers = payerRows.length ? sharesTop(rank(payerRows, (r) => r.v)) : [];
      const byCount = rank(active, (p) => p.fine_count);
      const cashSum = cashSummary(st, settings);
      return {
        season: st.season,
        today: st.today,
        month,
        players_total: st.players.length,
        players_active: active.length,
        fines_count: liveFines.length,
        fines_voided: st.fines.length - liveFines.length,
        fines_amount: liveFines.reduce((s, f) => s + f.amount, 0),
        paid_in: livePays.reduce((s, p) => s + p.amount, 0),
        unpaid: st.players.reduce((s, p) => s + p.debt, 0),
        credit_total: st.players.reduce((s, p) => s + Math.max(0, p.credit), 0),
        players_with_debt: st.players.filter((p) => p.debt > 0).length,
        overdue_count: liveFines.filter((f) => f.overdue).length,
        overdue_amount: liveFines.filter((f) => f.overdue).reduce((s, f) => s + f.remaining, 0),
        month_top_payer: topPayers.map((r) => ({ id: r.id, name: r.name, amount: r.v })),
        most_fines: byCount.length && byCount[0].value > 0 ? sharesTop(byCount).map(slimPlayer) : [],
        least_fines: active.length ? sharesTop(rank(active, (p) => p.fine_count, "asc")).map(slimPlayer) : [],
        leaderboard: rank(active, (p) => p.issued).slice(0, 8).map((p) => ({ ...slimPlayer(p), place: p.place })),
        recent_fines: [...st.fines].sort((a, b) => b.id - a.id).slice(0, 8).map(slimFine),
        recent_payments: [...st.payments].sort((a, b) => b.id - a.id).slice(0, 8).map(slimPayment),
        cash: cashSum.totals,
        chart: monthlyChart(st)
      };
    }
    function slimPlayer(p) {
      return { id: p.id, name: p.name, jersey: p.jersey, fine_count: p.fine_count, issued: p.issued, debt: p.debt, paid: p.paid, credit: p.credit, is_demo: p.is_demo, active: p.active, junior_discount: p.junior_discount };
    }
    function slimFine(f) {
      return { id: f.id, fine_no: f.fine_no, player_id: f.player_id, player_name: f.player_name, category_number: f.category_number, category_name: f.category_name, issued_date: f.issued_date, amount: f.amount, base_amount: f.base_amount, discount_amount: f.discount_amount, discount_pct: f.discount_pct, status: f.status, is_demo: f.is_demo };
    }
    function slimPayment(p) {
      return { id: p.id, payment_no: p.payment_no, player_id: p.player_id, player_name: p.player_name, date: p.date, amount: p.amount, method: p.method, reversed: p.reversed, is_demo: p.is_demo };
    }
    function seasonMonths(st) {
      const end = st.today < st.season.end_date ? st.today : st.season.end_date;
      return monthsBetween(monthOf(st.season.start_date), monthOf(end < st.season.start_date ? st.season.start_date : end));
    }
    function monthlyChart(st) {
      return seasonMonths(st).map((m) => ({
        month: m,
        fines: st.fines.filter((f) => !f.voided && monthOf(f.issued_date) === m).reduce((s, f) => s + f.amount, 0),
        payments: st.payments.filter((p) => !p.reversed && monthOf(p.date) === m).reduce((s, p) => s + p.amount, 0)
      }));
    }
    function cashSummary(st, settings) {
      const start = parseInt(settings.start_balance || "0", 10) || 0;
      const pays = st.payments.filter((p) => !p.reversed);
      const live = st.cash.filter((c) => !c.voided);
      const sum = (arr) => arr.reduce((s, x) => s + x.amount, 0);
      const received = sum(pays);
      const income = sum(live.filter((c) => c.type === "income"));
      const refunds = sum(live.filter((c) => c.type === "refund"));
      const expenses = sum(live.filter((c) => c.type === "expense"));
      const events = [
        ...pays.map((p) => ({ kind: "payment", no: p.payment_no, date: p.date, amount: p.amount, sign: 1, text: `Inbetalning \u2013 ${p.player_name} (${p.method})`, is_demo: p.is_demo, created_at: p.created_at })),
        ...st.payments.filter((p) => p.reversed).map((p) => ({ kind: "payment_reversed", no: p.payment_no, date: p.date, amount: p.amount, sign: 0, text: `\xC5terf\xF6rd inbetalning \u2013 ${p.player_name}: ${p.reverse_reason}`, is_demo: p.is_demo, created_at: p.reversed_at })),
        ...st.cash.map((c) => ({ kind: c.type, id: c.id, no: c.event_no, date: c.date, amount: c.amount, sign: c.voided ? 0 : c.type === "income" ? 1 : -1, voided: c.voided, void_reason: c.void_reason, text: c.description + (c.player_name ? ` \u2013 ${c.player_name}` : ""), is_demo: c.is_demo, created_at: c.created_at }))
      ].sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at));
      const monthly = seasonMonths(st).map((m) => {
        const inM = (d) => monthOf(d) === m;
        const r = {
          month: m,
          payments: sum(pays.filter((p) => inM(p.date))),
          income: sum(live.filter((c) => c.type === "income" && inM(c.date))),
          refunds: sum(live.filter((c) => c.type === "refund" && inM(c.date))),
          expenses: sum(live.filter((c) => c.type === "expense" && inM(c.date))),
          fines_issued: st.fines.filter((f) => !f.voided && inM(f.issued_date)).reduce((s, f) => s + f.amount, 0)
        };
        r.net = r.payments + r.income - r.refunds - r.expenses;
        return r;
      });
      let running = start;
      for (const r of monthly) {
        running += r.net;
        r.balance = running;
      }
      return {
        totals: {
          start_balance: start,
          received,
          income,
          refunds,
          expenses,
          balance: start + received + income - refunds - expenses,
          issued: st.fines.filter((f) => !f.voided).reduce((s, f) => s + f.amount, 0),
          outstanding: st.players.reduce((s, p) => s + p.debt, 0),
          credits: st.players.reduce((s, p) => s + Math.max(0, p.credit), 0)
        },
        events,
        monthly
      };
    }
    function periodRange(st, q) {
      if (q.period === "month" && isMonth(q.month)) return { from: monthStart(q.month), to: monthEnd(q.month), label: q.month };
      if (q.period === "range" && isDate(q.from) && isDate(q.to) && q.from <= q.to) return { from: q.from, to: q.to, label: `${q.from} \u2013 ${q.to}` };
      return { from: st.season.start_date, to: st.season.end_date, label: `S\xE4song ${st.season.name}` };
    }
    function leaderboard(st, q) {
      const { from, to, label } = periodRange(st, q);
      const inR = (d) => d >= from && d <= to;
      const fines = st.fines.filter((f) => !f.voided && inR(f.issued_date));
      const pays = st.payments.filter((p) => !p.reversed && inR(p.date));
      const includeInactive = q.inactive === "1";
      const rows = st.players.filter((p) => p.active || includeInactive).map((p) => {
        const pf = fines.filter((f) => f.player_id === p.id);
        const amount = pf.reduce((s, f) => s + f.amount, 0);
        const paidOnThose = pf.reduce((s, f) => s + f.paid, 0);
        return {
          id: p.id,
          name: p.name,
          jersey: p.jersey,
          is_demo: p.is_demo,
          active: p.active,
          count: pf.length,
          amount,
          debt: p.debt,
          paid_in: pays.filter((x) => x.player_id === p.id).reduce((s, x) => s + x.amount, 0),
          paid_share: amount > 0 ? paidOnThose / amount : null,
          categories: new Set(pf.map((f) => f.category_number)).size
        };
      });
      const sortKey = ["count", "amount", "debt"].includes(q.sort) ? q.sort : "count";
      const tie = (a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "sv");
      const most = rank(rows, (r) => r[sortKey], "desc", tie);
      const payLeague = {
        paid_in: rank(rows, (r) => r.paid_in),
        paid_share: rank(rows.filter((r) => r.paid_share !== null), (r) => Math.round(r.paid_share * 1e3)),
        lowest_debt: rank(rows, (r) => r.debt, "asc")
      };
      const ref = st.today < to ? st.today < from ? from : st.today : to;
      const ws = weekStart(ref);
      const we = addDays(ws, 6);
      const weekFines = st.fines.filter((f) => !f.voided && f.issued_date >= ws && f.issued_date <= we);
      const maxWeek = weekFines.reduce((m, f) => Math.max(m, f.amount), 0);
      const refMonth = monthOf(ref);
      const monthPay = /* @__PURE__ */ new Map();
      for (const p of st.payments) if (!p.reversed && monthOf(p.date) === refMonth) monthPay.set(p.player_id, (monthPay.get(p.player_id) || 0) + p.amount);
      const weekCounts = /* @__PURE__ */ new Map();
      for (const f of fines) {
        const k = f.player_id + "|" + isoWeek(f.issued_date);
        weekCounts.set(k, (weekCounts.get(k) || 0) + 1);
      }
      let maxWeekCount = 0;
      for (const v of weekCounts.values()) maxWeekCount = Math.max(maxWeekCount, v);
      const catCounts = /* @__PURE__ */ new Map();
      for (const f of fines) catCounts.set(f.category_number, { n: (catCounts.get(f.category_number)?.n || 0) + 1, name: f.category_name });
      let maxCat = 0;
      for (const v of catCounts.values()) maxCat = Math.max(maxCat, v.n);
      const maxCats = rows.reduce((m, r) => Math.max(m, r.categories), 0);
      const monthPayRows = [...monthPay].map(([id, v]) => ({ id, name: st.playerById.get(id).name, v }));
      const topMonthPay = monthPayRows.length ? sharesTop(rank(monthPayRows, (r) => r.v)) : [];
      const fun = {
        week: { from: ws, to: we, label: isoWeek(ref) },
        week_biggest: maxWeek ? weekFines.filter((f) => f.amount === maxWeek).map(slimFine) : [],
        month: refMonth,
        month_top_payer: topMonthPay.map((r) => ({ id: r.id, name: r.name, amount: r.v })),
        most_in_week: maxWeekCount ? [...weekCounts].filter(([, v]) => v === maxWeekCount).map(([k, v]) => {
          const [id, w] = k.split("|");
          return { id, name: st.playerById.get(id).name, week: w, count: v };
        }) : [],
        common_category: maxCat ? [...catCounts].filter(([, v]) => v.n === maxCat).map(([num, v]) => ({ number: num, name: v.name, count: v.n })) : [],
        most_categories: maxCats ? rows.filter((r) => r.categories === maxCats).map((r) => ({ id: r.id, name: r.name, count: r.categories })) : []
      };
      return { range: { from, to, label }, sort: sortKey, most, pay: payLeague, fun };
    }
    function rule29Candidates(st, ym, settings) {
      const end = monthEnd(ym);
      const ended = end < st.today;
      const lateCat = 29;
      const rows = [];
      for (const p of st.players) {
        const due = st.fines.filter((f) => f.player_id === p.id && !f.voided && f.due_date <= end);
        let owed = 0;
        const items = [];
        for (const f of due) {
          const paidByEnd = st.allocs.filter((a) => a.fine_id === f.id && a.payment_date <= end).reduce((s, a) => s + a.amount, 0);
          const left = f.amount - paidByEnd;
          if (left > 0) {
            owed += left;
            items.push({ fine_no: f.fine_no, left, due_date: f.due_date });
          }
        }
        if (owed <= 0) continue;
        const existing = st.fines.find((f) => f.player_id === p.id && !f.voided && f.rule_key === `R29:${ym}`);
        rows.push({ player_id: p.id, name: p.name, is_demo: p.is_demo, owed, items, existing: existing ? existing.fine_no : null, current_debt: p.debt });
      }
      return { period: ym, deadline: end, ended, enabled: settings.rule29_enabled === "1", rows };
    }
    function rule22Candidates(st, settings) {
      const days = Math.max(1, parseInt(settings.rule22_days || "14", 10));
      const rows = [];
      for (const p of st.players.filter((x) => x.active)) {
        const created = todayStr(new Date(p.created_at));
        const fines = st.fines.filter((f) => f.player_id === p.id && !f.voided && f.issued_date <= st.today);
        const lastFine = fines.reduce((m, f) => f.issued_date > m ? f.issued_date : m, "");
        const base = [addDays(st.season.start_date, -1), addDays(created, -1), lastFine].sort().pop();
        const periodStart = addDays(base, 1);
        const periodEnd = addDays(base, days);
        const eligible = periodEnd < st.today && periodEnd <= st.season.end_date;
        rows.push({ player_id: p.id, name: p.name, is_demo: p.is_demo, last_fine: lastFine || null, days_without: daysBetween(base, st.today) - 1, period_start: periodStart, period_end: periodEnd, eligible, rule_key: `R22:${periodStart}` });
      }
      return { enabled: settings.rule22_enabled === "1", days, rows: rows.sort((a, b) => b.days_without - a.days_without) };
    }
    function rule23Ranking(st, settings) {
      const rows = st.players.filter((p) => p.active).map((p) => {
        const amount = st.fines.filter((f) => f.player_id === p.id && !f.voided && f.kind !== "least_fines").reduce((s, f) => s + f.amount, 0);
        const existing = st.fines.find((f) => f.player_id === p.id && !f.voided && f.rule_key === `R23:${st.season.id}`);
        return { id: p.id, name: p.name, is_demo: p.is_demo, amount, existing: existing ? existing.fine_no : null };
      });
      return { enabled: settings.rule23_enabled === "1", season_end: st.season.end_date, season_over: st.today >= st.season.end_date, ranking: rank(rows, (r) => r.amount, "asc") };
    }
    async function monthView(db, st, ym, settings) {
      const end = monthEnd(ym);
      const start = monthStart(ym);
      const closing = await db.get("SELECT * FROM month_closings WHERE season_id = ? AND period = ?", st.season.id, ym);
      const openRows = st.players.map((p) => {
        const open = st.fines.filter((f) => f.player_id === p.id && !f.voided && f.remaining > 0 && f.due_date <= end);
        if (!open.length) return null;
        return {
          player_id: p.id,
          name: p.name,
          is_demo: p.is_demo,
          credit: p.credit,
          amount: open.reduce((s, f) => s + f.remaining, 0),
          overdue_amount: open.filter((f) => f.overdue).reduce((s, f) => s + f.remaining, 0),
          earliest_due: open.reduce((m, f) => !m || f.due_date < m ? f.due_date : m, null),
          fines: open.map((f) => ({ fine_no: f.fine_no, category: f.category_name, remaining: f.remaining, due_date: f.due_date, overdue: f.overdue }))
        };
      }).filter(Boolean).sort((a, b) => b.amount - a.amount);
      const issued = st.fines.filter((f) => !f.voided && f.issued_date >= start && f.issued_date <= end);
      const pays = st.payments.filter((p) => !p.reversed && p.date >= start && p.date <= end);
      return {
        period: ym,
        start,
        end,
        ended: end < st.today,
        closing,
        payment_info: settings.payment_info,
        team_name: settings.team_name,
        open: openRows,
        total_open: openRows.reduce((s, r) => s + r.amount, 0),
        overdue: st.fines.filter((f) => f.overdue && f.due_date <= end).map((f) => ({ ...slimFine(f), due_date: f.due_date, remaining: f.remaining })),
        late: rule29Candidates(st, ym, settings),
        summary: {
          fines_count: issued.length,
          fines_amount: issued.reduce((s, f) => s + f.amount, 0),
          payments_count: pays.length,
          payments_amount: pays.reduce((s, p) => s + p.amount, 0),
          voided: st.fines.filter((f) => f.voided && f.issued_date >= start && f.issued_date <= end).length
        }
      };
    }
    module.exports = {
      TZ,
      todayStr,
      isDate,
      isMonth,
      addDays,
      daysBetween,
      monthOf,
      monthEnd,
      monthStart,
      defaultDueDate,
      weekStart,
      isoWeek,
      activeSeason,
      getSettings,
      loadState,
      rank,
      dashboard,
      cashSummary,
      leaderboard,
      rule29Candidates,
      rule22Candidates,
      rule23Ranking,
      monthView,
      slimFine,
      slimPayment
    };
  }
});

// server/ops.js
var require_ops = __commonJS({
  "server/ops.js"(exports, module) {
    "use strict";
    var { nextNumber, tx } = require_db();
    var L = require_logic();
    var AppError = class extends Error {
      constructor(message, status = 400, code) {
        super(message);
        this.status = status;
        this.code = code;
      }
    };
    var fail = (msg, status, code) => {
      throw new AppError(msg, status, code);
    };
    var MAX_AMOUNT = 1e7;
    function parseKr(v, field = "Belopp", { allowZero = false } = {}) {
      if (typeof v === "number") v = String(v);
      if (typeof v !== "string") fail(`${field} saknas.`);
      const s = v.trim().replace(/\s/g, "").replace(",", ".");
      if (!/^\d+(\.\d{1,2})?$/.test(s)) fail(`${field} m\xE5ste vara ett belopp i kronor, t.ex. 50 eller 12,50.`);
      const ore = Math.round(parseFloat(s) * 100);
      if (!allowZero && ore <= 0) fail(`${field} m\xE5ste vara st\xF6rre \xE4n 0 kr.`);
      if (ore > MAX_AMOUNT) fail(`${field} \xE4r orimligt h\xF6gt (max 100 000 kr).`);
      return ore;
    }
    function str(v, field, { max = 500, required = false } = {}) {
      const s = v == null ? "" : String(v).trim();
      if (required && !s) fail(`${field} m\xE5ste fyllas i.`);
      if (s.length > max) fail(`${field} f\xE5r vara h\xF6gst ${max} tecken.`);
      return s;
    }
    function date(v, field) {
      if (!L.isDate(v)) fail(`${field} m\xE5ste vara ett giltigt datum (\xC5\xC5\xC5\xC5-MM-DD).`);
      return v;
    }
    function notFuture(d, field) {
      if (d > L.todayStr()) fail(`${field} kan inte ligga i framtiden.`);
    }
    function inSeason(season, d, field) {
      if (d < season.start_date || d > season.end_date) fail(`${field} m\xE5ste ligga inom s\xE4songen ${season.name} (${season.start_date} \u2013 ${season.end_date}).`);
    }
    var kr = (ore) => (ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 }) + " kr";
    var now = () => (/* @__PURE__ */ new Date()).toISOString();
    var J = (o) => o == null ? null : JSON.stringify(o);
    var who = (user) => user.label || user.username;
    async function audit(db, user, action, entity, entityId, oldV, newV, reason) {
      await db.run("INSERT INTO audit_log (ts, username, action, entity, entity_id, old_value, new_value, reason) VALUES (?,?,?,?,?,?,?,?)", now(), who(user), action, entity, entityId == null ? null : String(entityId), J(oldV), J(newV), reason || null);
    }
    async function getPlayer(db, id) {
      const p = await db.get("SELECT * FROM players WHERE id = ?", String(id || ""));
      if (!p) fail("Spelaren finns inte.", 404);
      return p;
    }
    async function getFine(db, id) {
      const f = await db.get("SELECT * FROM fines WHERE id = ?", Number(id));
      if (!f) fail("Boten finns inte.", 404);
      return f;
    }
    async function fineAllocated(db, fineId) {
      return (await db.get("SELECT COALESCE(SUM(amount),0)::int s FROM allocations WHERE fine_id = ? AND active = 1", fineId)).s;
    }
    async function paymentAllocated(db, payId) {
      return (await db.get("SELECT COALESCE(SUM(amount),0)::int s FROM allocations WHERE payment_id = ? AND active = 1", payId)).s;
    }
    async function playerCredit(db, playerId, seasonId) {
      const paid = (await db.get("SELECT COALESCE(SUM(amount),0)::int s FROM payments WHERE player_id = ? AND season_id = ? AND reversed = 0", playerId, seasonId)).s;
      const refunded = (await db.get("SELECT COALESCE(SUM(amount),0)::int s FROM cash_events WHERE player_id = ? AND season_id = ? AND type = 'refund' AND voided = 0", playerId, seasonId)).s;
      const alloc = (await db.get(`SELECT COALESCE(SUM(a.amount),0)::int s FROM allocations a JOIN payments p ON p.id = a.payment_id
    WHERE p.player_id = ? AND p.season_id = ? AND a.active = 1`, playerId, seasonId)).s;
      return paid - refunded - alloc;
    }
    async function openFines(db, playerId, seasonId) {
      const rows = await db.all(`SELECT f.*, f.amount - COALESCE((SELECT SUM(a.amount) FROM allocations a WHERE a.fine_id = f.id AND a.active = 1), 0) AS remaining
    FROM fines f WHERE f.player_id = ? AND f.season_id = ? AND f.voided = 0 ORDER BY f.due_date, f.issued_date, f.id`, playerId, seasonId);
      return rows.filter((f) => f.remaining > 0);
    }
    function playerInput(body) {
      const first = str(body.first_name, "F\xF6rnamn", { max: 60, required: true });
      const last = str(body.last_name, "Efternamn", { max: 60, required: true });
      const jersey = str(body.jersey, "Tr\xF6jnummer", { max: 4 });
      if (jersey && !/^\d{1,3}$/.test(jersey)) fail("Tr\xF6jnummer m\xE5ste vara en siffra (0\u2013999).");
      return { first_name: first, last_name: last, jersey: jersey || null, position: str(body.position, "Position", { max: 40 }) || null, notes: str(body.notes, "Anteckningar", { max: 2e3 }) };
    }
    async function createPlayer(db, user, body, { isDemo = false } = {}) {
      const p = playerInput(body);
      const n = await nextNumber(db, isDemo ? "demo_player" : "player");
      const id = (isDemo ? "X-S" : "S-") + String(n).padStart(3, "0");
      const junior = body.junior_discount === true || body.junior_discount === "on" || Number(body.junior_discount) === 50 ? 50 : 0;
      await db.run("INSERT INTO players (id, first_name, last_name, jersey, position, notes, active, is_demo, junior_discount, created_at) VALUES (?,?,?,?,?,?,1,?,?,?)", id, p.first_name, p.last_name, p.jersey, p.position, p.notes, isDemo ? 1 : 0, junior, body.created_at || now());
      await audit(db, user, "Spelare skapad", "spelare", id, null, { ...p, ...junior ? { juniorrabatt: `${junior} %` } : {} });
      return id;
    }
    async function updatePlayer(db, user, id, body) {
      return tx(async (db2) => {
        const old = await getPlayer(db2, id);
        const p = playerInput(body);
        if (p.jersey !== old.jersey) await assertJerseyFreeForLogin(db2, old.id, p.jersey);
        await db2.run("UPDATE players SET first_name=?, last_name=?, jersey=?, position=?, notes=? WHERE id=?", p.first_name, p.last_name, p.jersey, p.position, p.notes, old.id);
        await audit(
          db2,
          user,
          "Spelare \xE4ndrad",
          "spelare",
          old.id,
          { first_name: old.first_name, last_name: old.last_name, jersey: old.jersey, position: old.position, notes: old.notes },
          p
        );
      });
    }
    async function assertJerseyFreeForLogin(db, playerId, jersey) {
      const hasAccount = await db.get("SELECT 1 AS x FROM users WHERE player_id = ?", playerId);
      if (!hasAccount || !jersey) {
        if (hasAccount && !jersey) fail("Spelaren har ett spelarkonto och loggar in med tr\xF6jnumret \u2013 tr\xF6jnumret kan inte tas bort. St\xE4ng av kontot f\xF6rst.");
        return;
      }
      const clash = await db.get(`SELECT p.first_name, p.last_name FROM players p JOIN users u ON u.player_id = p.id
    WHERE p.jersey = ? AND p.id <> ? AND p.is_demo = 0`, jersey, playerId);
      if (clash) fail(`Tr\xF6jnummer ${jersey} anv\xE4nds redan f\xF6r inloggning av ${clash.first_name} ${clash.last_name}. Byt nummer p\xE5 den spelaren f\xF6rst.`, 409);
    }
    async function setJuniorDiscount(db, user, id, enabled) {
      return tx(async (db2) => {
        const p = await getPlayer(db2, id);
        const pct = enabled ? 50 : 0;
        if (p.junior_discount === pct) return;
        await db2.run("UPDATE players SET junior_discount = ? WHERE id = ?", pct, p.id);
        await audit(
          db2,
          user,
          enabled ? "Juniorrabatt aktiverad" : "Juniorrabatt avst\xE4ngd",
          "spelare",
          p.id,
          { juniorrabatt: `${p.junior_discount} %` },
          { juniorrabatt: `${pct} %`, g\u00E4ller: "nya b\xF6ter \u2013 befintliga b\xF6ter \xE4ndras inte" }
        );
      });
    }
    async function setPlayerActive(db, user, id, active) {
      return tx(async (db2) => {
        const old = await getPlayer(db2, id);
        await db2.run("UPDATE players SET active = ? WHERE id = ?", active ? 1 : 0, old.id);
        await audit(db2, user, active ? "Spelare aktiverad" : "Spelare inaktiverad", "spelare", old.id, { active: old.active }, { active: active ? 1 : 0 });
      });
    }
    async function deletePlayer(db, user, id) {
      return tx(async (db2) => {
        const p = await getPlayer(db2, id);
        const used = (await db2.get("SELECT ((SELECT COUNT(*) FROM fines WHERE player_id=?) + (SELECT COUNT(*) FROM payments WHERE player_id=?) + (SELECT COUNT(*) FROM cash_events WHERE player_id=?))::int n", p.id, p.id, p.id)).n;
        if (used) fail("Spelaren har b\xF6ter eller betalningar och kan inte tas bort. Inaktivera spelaren i st\xE4llet \u2013 historiken sparas d\xE5.", 409);
        await db2.run("DELETE FROM players WHERE id = ?", p.id);
        await audit(db2, user, "Spelare borttagen", "spelare", p.id, { name: `${p.first_name} ${p.last_name}` }, null);
      });
    }
    async function importPlayers(db, user, text) {
      if (typeof text !== "string" || !text.trim()) fail("CSV-filen \xE4r tom.");
      if (text.length > 2e5) fail("Filen \xE4r f\xF6r stor.");
      const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
      const delim = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
      const parse = (line) => {
        const out = [];
        let cur = "";
        let q = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (q) {
            if (c === '"' && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else if (c === '"') q = false;
            else cur += c;
          } else if (c === '"') q = true;
          else if (c === delim) {
            out.push(cur);
            cur = "";
          } else cur += c;
        }
        out.push(cur);
        return out.map((s) => s.trim());
      };
      let rows = lines.map(parse);
      if (/f[öo]rnamn|first/i.test(rows[0][0] || "")) rows = rows.slice(1);
      const result = { created: [], skipped: [], errors: [] };
      if (rows.length > 300) fail("Max 300 rader per import.");
      return tx(async (db2) => {
        const existing = new Set((await db2.all("SELECT lower(first_name||' '||last_name) n FROM players WHERE is_demo = 0")).map((r) => r.n));
        for (const [i, r] of rows.entries()) {
          const lineNo = i + 1;
          try {
            const body = { first_name: r[0], last_name: r[1], jersey: r[2], position: r[3], notes: r[4] };
            const key = `${(r[0] || "").toLowerCase()} ${(r[1] || "").toLowerCase()}`;
            if (existing.has(key)) {
              result.skipped.push(`Rad ${lineNo}: ${r[0]} ${r[1]} finns redan`);
              continue;
            }
            const id = await createPlayer(db2, user, body);
            existing.add(key);
            result.created.push(`${id} ${r[0]} ${r[1]}`);
          } catch (e) {
            if (!(e instanceof AppError)) throw e;
            result.errors.push(`Rad ${lineNo}: ${e.message}`);
          }
        }
        return result;
      });
    }
    async function updateCategory(db, user, id, body) {
      return tx(async (db2) => {
        const c = await db2.get("SELECT * FROM categories WHERE id = ?", Number(id));
        if (!c) fail("Kategorin finns inte.", 404);
        const name = str(body.name ?? c.name, "Namn", { max: 80, required: true });
        const amount = ["stick", "planted"].includes(c.kind) ? 0 : parseKr(body.default_amount ?? String(c.default_amount / 100), "Standardbelopp");
        const active = body.active == null ? c.active : body.active ? 1 : 0;
        await db2.run("UPDATE categories SET name=?, default_amount=?, active=? WHERE id=?", name, amount, active, c.id);
        await audit(
          db2,
          user,
          "B\xF6teskategori \xE4ndrad",
          "kategori",
          c.number,
          { name: c.name, default_amount: kr(c.default_amount), active: c.active },
          { name, default_amount: kr(amount), active },
          body.reason
        );
      });
    }
    var RULE_KINDS = { no_fines: 22, least_fines: 23, late: 29 };
    async function insertFine(db, user, season, input, { isDemo = false, ruleKey = null, allowRuleKind = false, fixedAmount = null, reportId = null } = {}) {
      const player = await getPlayer(db, input.player_id);
      isDemo = isDemo || !!player.is_demo;
      if (!player.active && !isDemo) fail(`${player.first_name} ${player.last_name} \xE4r inaktiv. Aktivera spelaren f\xF6r att registrera nya b\xF6ter.`);
      const cat = await db.get("SELECT * FROM categories WHERE id = ?", Number(input.category_id));
      if (!cat) fail("V\xE4lj en b\xF6teskategori.");
      if (!cat.active) fail(`Kategorin "${cat.name}" \xE4r inaktiverad.`);
      if (RULE_KINDS[cat.kind] && !allowRuleKind) fail(`Bot nr ${cat.number} registreras via sidan Regler s\xE5 att dubbletter undviks.`);
      const issued = date(input.issued_date || L.todayStr(), "Datum");
      if (!isDemo) notFuture(issued, "Datum");
      inSeason(season, issued, "Datum");
      const due = input.due_date ? date(input.due_date, "Sista betalningsdag") : L.defaultDueDate(issued);
      if (due < issued) fail("Sista betalningsdag kan inte vara f\xF6re utf\xE4rdandedatum.");
      let quantity = 1;
      if (cat.kind === "per_item") {
        quantity = Number(input.quantity || 1);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 30) fail("Antal m\xE5ste vara ett heltal mellan 1 och 30.");
      }
      let amount;
      let calc = null;
      let refId = null;
      let description = str(input.description, "Beskrivning", { max: 500 });
      if (cat.kind === "stick") {
        const value = parseKr(input.stick_value, "Klubbans v\xE4rde");
        const cost = parseKr(input.new_stick_cost, "Kostnad f\xF6r ny klubba", { allowZero: true });
        amount = Math.round(value / 2) + cost;
        calc = `50 % av ${kr(value)} = ${kr(Math.round(value / 2))} + ny klubba ${kr(cost)} = ${kr(amount)}`;
      } else if (cat.kind === "planted") {
        const no2 = str(input.ref_fine_no, "Ursprungligt b\xF6tesnummer", { required: true, max: 20 }).toUpperCase();
        const ref = await db.get("SELECT * FROM fines WHERE fine_no = ?", no2);
        if (!ref) fail(`B\xF6tesnummer ${no2} finns inte.`);
        if (ref.voided) fail(`${no2} \xE4r makulerad och kan inte anv\xE4ndas som planterad bot.`);
        if (ref.is_demo && !isDemo) fail(`${no2} \xE4r exempeldata och kan inte anv\xE4ndas f\xF6r en riktig spelare.`);
        if (ref.kind === "planted") fail(`${no2} \xE4r sj\xE4lv en planterad bot. Ange den ursprungliga boten.`);
        amount = ref.base_amount ?? ref.amount;
        refId = ref.id;
        calc = `Samma belopp som ${ref.fine_no} (${ref.category_name}): ${kr(amount)}`;
      } else if (fixedAmount != null) {
        amount = fixedAmount;
        if (quantity > 1) calc = `${quantity} \xD7 ${kr(Math.round(amount / quantity))} = ${kr(amount)}`;
      } else {
        const standard = cat.default_amount * quantity;
        amount = input.amount != null && input.amount !== "" ? parseKr(input.amount) : standard;
        if (amount !== standard) calc = `Standardbelopp ${kr(standard)} \xE4ndrat till ${kr(amount)}`;
        else if (quantity > 1) calc = `${quantity} \xD7 ${kr(cat.default_amount)} = ${kr(amount)}`;
      }
      if (amount <= 0) fail("B\xF6tesbeloppet m\xE5ste vara st\xF6rre \xE4n 0 kr.");
      if (amount > MAX_AMOUNT) fail("B\xF6tesbeloppet \xE4r orimligt h\xF6gt.");
      const d = juniorDiscount(amount, player, cat);
      if (d.discount) calc = (calc ? calc + " \xB7 " : "") + `Juniorrabatt ${d.pct} %: ${kr(amount)} \u2212 ${kr(d.discount)} = ${kr(d.final)}`;
      else if (d.exempt) calc = (calc ? calc + " \xB7 " : "") + `Juniorrabatt g\xE4ller inte ${cat.name}: fullt belopp ${kr(amount)}`;
      const no = isDemo ? "X-" + String(await nextNumber(db, "demo_fine")).padStart(4, "0") : "B-" + String(await nextNumber(db, "fine")).padStart(4, "0");
      try {
        await db.run(`INSERT INTO fines (fine_no, season_id, player_id, category_id, category_name, category_number, kind, issued_date, due_date,
      description, quantity, amount, base_amount, discount_amount, discount_pct, report_id, ref_fine_id, rule_key, calc, registered_by, is_demo, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, no, season.id, player.id, cat.id, cat.name, cat.number, cat.kind, issued, due, description, quantity, d.final, amount, d.discount, d.pct, reportId, refId, ruleKey, calc, who(user), isDemo ? 1 : 0, now());
      } catch (e) {
        if (e.code === "23505" && reportId) fail("Anm\xE4lan har redan blivit en bot.", 409, "already_decided");
        if (e.code === "23505" && ruleKey) fail(`${player.first_name} ${player.last_name} har redan f\xE5tt bot nr ${cat.number} f\xF6r denna period.`, 409, "duplicate_rule");
        throw e;
      }
      await audit(db, user, "Bot registrerad", "bot", no, null, { spelare: `${player.first_name} ${player.last_name}`, kategori: `${cat.number}. ${cat.name}`, belopp: kr(d.final), ...d.discount ? { ordinarie: kr(amount), juniorrabatt: kr(d.discount) } : {}, datum: issued, f\u00F6rfaller: due, beskrivning: description, ber\u00E4kning: calc });
      return no;
    }
    function juniorDiscount(base, player, cat) {
      const pct = Number(player.junior_discount) || 0;
      if (pct > 0 && cat.junior_exempt) return { final: base, discount: 0, pct: 0, exempt: true };
      return { ...discountFor(base, pct), exempt: false };
    }
    function discountFor(base, pct) {
      pct = Number(pct) || 0;
      if (pct <= 0) return { final: base, discount: 0, pct: 0 };
      const discount = Math.floor(base * pct / 100);
      return { final: base - discount, discount, pct };
    }
    async function createFines(db, user, season, items) {
      if (!Array.isArray(items) || !items.length) fail("Inga b\xF6ter att registrera.");
      if (items.length > 60) fail("Max 60 b\xF6ter \xE5t g\xE5ngen.");
      return tx(async (db2) => {
        const out = [];
        for (const it of items) out.push(await insertFine(db2, user, season, it));
        return out;
      });
    }
    async function editFine(db, user, season, id, body) {
      return tx(async (db2) => {
        const f = await getFine(db2, id);
        if (f.voided) fail("En makulerad bot kan inte \xE4ndras.");
        const reason = str(body.reason, "Anledning", { required: true, max: 300 });
        const issued = date(body.issued_date ?? f.issued_date, "Datum");
        inSeason(season, issued, "Datum");
        const due = date(body.due_date ?? f.due_date, "Sista betalningsdag");
        if (due < issued) fail("Sista betalningsdag kan inte vara f\xF6re utf\xE4rdandedatum.");
        const description = str(body.description ?? f.description, "Beskrivning", { max: 500 });
        const base = body.amount != null && body.amount !== "" ? parseKr(body.amount) : f.base_amount ?? f.amount;
        const d = f.discount_pct > 0 ? discountFor(base, f.discount_pct) : { final: base, discount: 0, pct: 0 };
        const amount = d.final;
        const paid = await fineAllocated(db2, f.id);
        if (amount < paid) fail(`Beloppet kan inte s\xE4ttas l\xE4gre \xE4n det som redan betalats mot boten (${kr(paid)}). \xC5terf\xF6r eller flytta betalningen f\xF6rst.`);
        if (f.kind === "planted" && amount !== f.amount) fail("Beloppet f\xF6r en planterad bot h\xE4mtas fr\xE5n den ursprungliga boten och kan inte \xE4ndras.");
        const changes = {};
        const old = {};
        for (const [k, v] of Object.entries({ issued_date: issued, due_date: due, description, amount })) {
          if (v !== f[k]) {
            old[k] = k === "amount" ? kr(f[k]) : f[k];
            changes[k] = k === "amount" ? kr(v) : v;
          }
        }
        if (!Object.keys(changes).length) fail("Inga \xE4ndringar att spara.");
        if (d.discount && changes.amount) {
          old.ordinarie = kr(f.base_amount ?? f.amount);
          changes.ordinarie = kr(base);
          changes.juniorrabatt = kr(d.discount);
        }
        await db2.run("UPDATE fines SET issued_date=?, due_date=?, description=?, amount=?, base_amount=?, discount_amount=? WHERE id=?", issued, due, description, amount, f.base_amount == null && !d.discount ? null : base, d.discount, f.id);
        await audit(db2, user, "Bot \xE4ndrad", "bot", f.fine_no, old, changes, reason);
      });
    }
    async function voidFine(db, user, id, body) {
      return tx(async (db2) => {
        const f = await getFine(db2, id);
        if (f.voided) fail("Boten \xE4r redan makulerad.");
        const reason = str(body.reason, "Anledning till makulering", { required: true, max: 300 });
        const released = (await db2.get("SELECT COALESCE(SUM(amount),0)::int s FROM allocations WHERE fine_id = ? AND active = 1", f.id)).s;
        await db2.run("UPDATE allocations SET active = 0, released_at = ?, release_reason = ? WHERE fine_id = ? AND active = 1", now(), "Boten makulerades", f.id);
        await db2.run("UPDATE fines SET voided = 1, void_reason = ?, voided_at = ?, voided_by = ? WHERE id = ?", reason, now(), user.username, f.id);
        await audit(db2, user, "Bot makulerad", "bot", f.fine_no, { status: "aktiv", belopp: kr(f.amount) }, { status: "makulerad", frigjort_till_tillgodohavande: kr(released) }, reason);
        return { released };
      });
    }
    var METHODS = ["Swish", "Bank\xF6verf\xF6ring", "Kontant", "Annat"];
    async function allocate(db, payment, items) {
      let left = payment.amount - await paymentAllocated(db, payment.id);
      let total = 0;
      for (const it of items) {
        if (it.amount <= 0) continue;
        const f = await db.get("SELECT * FROM fines WHERE id = ?", it.fine_id);
        if (!f || f.player_id !== payment.player_id) fail("Boten tillh\xF6r inte spelaren.");
        if (f.voided) fail(`${f.fine_no} \xE4r makulerad.`);
        const remaining = f.amount - await fineAllocated(db, f.id);
        if (it.amount > remaining) fail(`${f.fine_no}: du f\xF6rs\xF6ker f\xF6rdela ${kr(it.amount)} men bara ${kr(remaining)} \xE5terst\xE5r.`);
        if (it.amount > left) fail("F\xF6rdelningen \xF6verstiger det tillg\xE4ngliga beloppet.");
        await db.run("INSERT INTO allocations (payment_id, fine_id, amount, created_at) VALUES (?,?,?,?)", payment.id, f.id, it.amount, now());
        left -= it.amount;
        total += it.amount;
      }
      return total;
    }
    async function autoItems(db, playerId, seasonId, amount) {
      const items = [];
      for (const f of await openFines(db, playerId, seasonId)) {
        if (amount <= 0) break;
        const a = Math.min(amount, f.remaining);
        items.push({ fine_id: f.id, amount: a, fine_no: f.fine_no });
        amount -= a;
      }
      return items;
    }
    async function manualItems(db, list) {
      if (!Array.isArray(list)) fail("Ogiltig f\xF6rdelning.");
      return list.map((x) => ({ fine_id: Number(x.fine_id), amount: x.amount === "" || x.amount == null ? 0 : parseKr(x.amount, "F\xF6rdelat belopp", { allowZero: true }) })).filter((x) => x.amount > 0);
    }
    async function createPayment(db, user, season, body, opts = {}) {
      return tx((t) => createPaymentTx(t, user, season, body, opts));
    }
    async function createPaymentTx(db, user, season, body, { isDemo = false } = {}) {
      {
        const player = await getPlayer(db, body.player_id);
        isDemo = isDemo || !!player.is_demo;
        const d = date(body.date, "Betalningsdatum");
        if (!isDemo) notFuture(d, "Betalningsdatum");
        inSeason(season, d, "Betalningsdatum");
        const amount = parseKr(body.amount);
        const method = str(body.method, "Betalningsmetod", { required: true, max: 30 });
        if (!METHODS.includes(method)) fail("Ogiltig betalningsmetod.");
        const reference = str(body.reference, "Referens", { max: 120 });
        const comment = str(body.comment, "Kommentar", { max: 500 });
        const key = body.idempotency_key ? str(body.idempotency_key, "Nyckel", { max: 80 }) : null;
        if (key) {
          const ex = await db.get("SELECT payment_no FROM payments WHERE idempotency_key = ?", key);
          if (ex) fail(`Betalningen \xE4r redan registrerad (${ex.payment_no}). Ingen dubblett skapades.`, 409, "already_registered");
        }
        if (!body.confirm_duplicate) {
          const dup = await db.get("SELECT payment_no FROM payments WHERE player_id=? AND date=? AND amount=? AND reversed=0", player.id, d, amount);
          if (dup) fail(`Det finns redan en inbetalning fr\xE5n ${player.first_name} ${player.last_name} p\xE5 ${kr(amount)} samma dag (${dup.payment_no}). \xC4r det en ny betalning?`, 409, "possible_duplicate");
        }
        const no = isDemo ? "X-I" + String(await nextNumber(db, "demo_payment")).padStart(4, "0") : "I-" + String(await nextNumber(db, "payment")).padStart(4, "0");
        const payment = await db.get(`INSERT INTO payments (payment_no, season_id, player_id, date, amount, method, reference, comment, idempotency_key, registered_by, is_demo, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`, no, season.id, player.id, d, amount, method, reference, comment, key, who(user), isDemo ? 1 : 0, now());
        const mode = body.allocation_mode || "auto";
        const items = mode === "manual" ? await manualItems(db, body.allocations) : mode === "none" ? [] : await autoItems(db, player.id, season.id, amount);
        const allocated = await allocate(db, payment, items);
        const credit = amount - allocated;
        await audit(db, user, body.verified ? "Verifierad inbetalning registrerad" : "Inbetalning registrerad", "betalning", no, null, { spelare: `${player.first_name} ${player.last_name}`, datum: d, belopp: kr(amount), metod: method, referens: reference, f\u00F6rdelat: kr(allocated), tillgodo: kr(credit), ...body.verified ? { verifierad: "ja \u2013 pengarna kontrollerade" } : {} });
        return { payment_no: no, allocated, credit };
      }
    }
    var VERIFY_METHODS = ["Swish", "Bank\xF6verf\xF6ring", "Kontant"];
    async function createVerifiedPaymentTx(db, user, season, body) {
      if (body.verified !== true) fail("Bekr\xE4fta att du har kontrollerat att pengarna har kommit in.");
      if (user.role === "player" && String(body.player_id) === user.player_id) fail("Du kan inte registrera din egen betalning. Be administrat\xF6ren.", 403);
      if (!VERIFY_METHODS.includes(body.method)) fail("V\xE4lj Swish, bank\xF6verf\xF6ring eller kontant.");
      const amount = parseKr(body.amount);
      const st = await L.loadState(db, season);
      const p = st.playerById.get(String(body.player_id || ""));
      if (!p || p.is_demo) fail("Spelaren finns inte.", 404);
      if (p.debt <= 0) fail(`${p.name} har ingen obetald skuld.`, 409, "no_debt");
      if (amount > p.debt) fail(`Beloppet (${kr(amount)}) \xE4r st\xF6rre \xE4n skulden (${kr(p.debt)}). \xD6verskott hanteras av administrat\xF6ren.`);
      if (body.mode === "full" && amount !== p.debt) fail("Skulden har \xE4ndrats sedan sidan laddades. Ladda om och f\xF6rs\xF6k igen.", 409, "debt_changed");
      return createPaymentTx(db, user, season, {
        player_id: p.id,
        date: body.date,
        amount: String(amount / 100),
        method: body.method,
        reference: body.reference,
        comment: str(body.comment, "Kommentar", { max: 300 }) || (body.mode === "full" ? "Hela skulden \u2013 verifierad" : "Delbetalning \u2013 verifierad"),
        idempotency_key: body.idempotency_key,
        confirm_duplicate: !!body.confirm_duplicate,
        allocation_mode: "auto",
        verified: true
      });
    }
    async function setPaymentPermission(db, user, id, enabled) {
      return tx(async (db2) => {
        const p = await getPlayer(db2, id);
        if (p.is_demo) fail("Exempelspelare kan inte f\xE5 beh\xF6righet.");
        const v = enabled ? 1 : 0;
        if (p.can_register_payments === v) return;
        await db2.run("UPDATE players SET can_register_payments = ? WHERE id = ?", v, p.id);
        await audit(db2, user, enabled ? "Kassabeh\xF6righet given" : "Kassabeh\xF6righet \xE5terkallad", "spelare", p.id, { kassabeh\u00F6righet: !!p.can_register_payments }, { kassabeh\u00F6righet: !!v });
      });
    }
    async function allocateCredit(db, user, season, playerId, body) {
      return tx(async (db2) => {
        const player = await getPlayer(db2, playerId);
        const credit = await playerCredit(db2, player.id, season.id);
        if (credit <= 0) fail("Spelaren har inget tillgodohavande att f\xF6rdela.");
        const items = body.mode === "manual" ? await manualItems(db2, body.allocations) : await autoItems(db2, player.id, season.id, credit);
        const want = items.reduce((s, i) => s + i.amount, 0);
        if (!want) fail("Det finns inga obetalda b\xF6ter att f\xF6rdela tillgodohavandet p\xE5.");
        if (want > credit) fail(`Du kan f\xF6rdela h\xF6gst ${kr(credit)}.`);
        const sources = await db2.all("SELECT * FROM payments WHERE player_id = ? AND season_id = ? AND reversed = 0 ORDER BY date, id", player.id, season.id);
        let total = 0;
        for (const it of items) {
          let need = it.amount;
          for (const s of sources) {
            if (need <= 0) break;
            const free = s.amount - await paymentAllocated(db2, s.id);
            if (free <= 0) continue;
            const a = Math.min(free, need);
            await allocate(db2, s, [{ fine_id: it.fine_id, amount: a }]);
            need -= a;
            total += a;
          }
        }
        await audit(db2, user, "Tillgodohavande f\xF6rdelat", "spelare", player.id, { tillgodo: kr(credit) }, { f\u00F6rdelat: kr(total), tillgodo: kr(credit - total) });
        return { allocated: total };
      });
    }
    async function reversePayment(db, user, season, id, body) {
      return tx(async (db2) => {
        const p = await db2.get("SELECT * FROM payments WHERE id = ?", Number(id));
        if (!p) fail("Betalningen finns inte.", 404);
        if (p.reversed) fail("Betalningen \xE4r redan \xE5terf\xF6rd.");
        const reason = str(body.reason, "Anledning", { required: true, max: 300 });
        const allocated = await paymentAllocated(db2, p.id);
        const credit = await playerCredit(db2, p.player_id, season.id);
        if (credit - (p.amount - allocated) < 0) fail("Delar av denna betalning har redan \xE5terbetalats till spelaren. Makulera \xE5terbetalningen i kassan f\xF6rst.", 409);
        await db2.run("UPDATE allocations SET active = 0, released_at = ?, release_reason = ? WHERE payment_id = ? AND active = 1", now(), "Betalningen \xE5terf\xF6rdes", p.id);
        await db2.run("UPDATE payments SET reversed = 1, reverse_reason = ?, reversed_at = ?, reversed_by = ? WHERE id = ?", reason, now(), user.username, p.id);
        await audit(db2, user, "Inbetalning \xE5terf\xF6rd", "betalning", p.payment_no, { status: "aktiv", belopp: kr(p.amount), f\u00F6rdelat: kr(allocated) }, { status: "\xE5terf\xF6rd" }, reason);
      });
    }
    async function createCashEvent(db, user, season, body, { isDemo = false } = {}) {
      return tx(async (db2) => {
        const type = body.type;
        if (!["income", "expense", "refund"].includes(type)) fail("Ogiltig typ av kassah\xE4ndelse.");
        const d = date(body.date, "Datum");
        if (!isDemo) notFuture(d, "Datum");
        inSeason(season, d, "Datum");
        const amount = parseKr(body.amount);
        let description = str(body.description, "Beskrivning", { required: type !== "refund", max: 300 });
        let playerId = null;
        if (type === "refund") {
          const player = await getPlayer(db2, body.player_id);
          const credit = await playerCredit(db2, player.id, season.id);
          if (amount > credit) fail(`\xC5terbetalningen (${kr(amount)}) \xE4r st\xF6rre \xE4n spelarens tillgodohavande (${kr(Math.max(0, credit))}).`);
          playerId = player.id;
          description = description || "\xC5terbetalning av tillgodohavande";
          isDemo = isDemo || !!player.is_demo;
        }
        const no = isDemo ? "X-K" + String(await nextNumber(db2, "demo_cash")).padStart(4, "0") : "K-" + String(await nextNumber(db2, "cash")).padStart(4, "0");
        await db2.run("INSERT INTO cash_events (event_no, season_id, type, date, amount, description, player_id, registered_by, is_demo, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", no, season.id, type, d, amount, description, playerId, user.username, isDemo ? 1 : 0, now());
        const label = { income: "\xD6vrig inkomst", expense: "Utgift", refund: "\xC5terbetalning" }[type];
        await audit(db2, user, `${label} registrerad`, "kassa", no, null, { datum: d, belopp: kr(amount), beskrivning: description, spelare: playerId });
        return no;
      });
    }
    async function voidCashEvent(db, user, id, body) {
      return tx(async (db2) => {
        const c = await db2.get("SELECT * FROM cash_events WHERE id = ?", Number(id));
        if (!c) fail("Kassah\xE4ndelsen finns inte.", 404);
        if (c.voided) fail("H\xE4ndelsen \xE4r redan makulerad.");
        const reason = str(body.reason, "Anledning", { required: true, max: 300 });
        await db2.run("UPDATE cash_events SET voided = 1, void_reason = ? WHERE id = ?", reason, c.id);
        await audit(db2, user, "Kassah\xE4ndelse makulerad", "kassa", c.event_no, { status: "aktiv", belopp: kr(c.amount) }, { status: "makulerad" }, reason);
      });
    }
    async function catByNumber(db, n) {
      return await db.get("SELECT * FROM categories WHERE number = ?", n);
    }
    async function applyRule(db, user, season, rule, body) {
      const settings = await L.getSettings(db);
      const ids = Array.isArray(body.player_ids) ? body.player_ids.map(String) : [];
      if (!ids.length) fail("V\xE4lj minst en spelare.");
      return tx(async (db2) => {
        const st = await L.loadState(db2, season);
        const out = [];
        if (rule === "29") {
          if (settings.rule29_enabled !== "1") fail("Regel 29 \xE4r avst\xE4ngd under Inst\xE4llningar.");
          if (!L.isMonth(body.period)) fail("Ange betalningsperiod (\xC5\xC5\xC5\xC5-MM).");
          const cand = L.rule29Candidates(st, body.period, settings);
          if (!cand.ended) fail(`Perioden ${body.period} \xE4r inte slut \xE4n. F\xF6rseningsbot kan registreras f\xF6rst efter ${cand.deadline}.`);
          for (const id of ids) {
            const c = cand.rows.find((r) => r.player_id === id);
            if (!c) fail("Spelaren hade ingen f\xF6rfallen skuld vid periodens slut.");
            if (c.existing) fail(`${c.name} har redan f\xF6rseningsbot f\xF6r ${body.period} (${c.existing}).`, 409, "duplicate_rule");
            out.push(await insertFine(db2, user, season, { player_id: id, category_id: (await catByNumber(db2, 29)).id, issued_date: L.todayStr(), description: `Ej betalat senast ${cand.deadline} (skuld d\xE5: ${kr(c.owed)})` }, { ruleKey: `R29:${body.period}`, allowRuleKind: true, isDemo: !!c.is_demo }));
          }
        } else if (rule === "22") {
          if (settings.rule22_enabled !== "1") fail("Regel 22 \xE4r avst\xE4ngd under Inst\xE4llningar.");
          const cand = L.rule22Candidates(st, settings);
          for (const id of ids) {
            const c = cand.rows.find((r) => r.player_id === id);
            if (!c || !c.eligible) fail("Spelaren uppfyller inte villkoret f\xF6r regel 22 just nu.");
            out.push(await insertFine(db2, user, season, { player_id: id, category_id: (await catByNumber(db2, 22)).id, issued_date: L.todayStr(), description: `Inga b\xF6ter ${c.period_start} \u2013 ${c.period_end}` }, { ruleKey: c.rule_key, allowRuleKind: true, isDemo: !!c.is_demo }));
          }
        } else if (rule === "23") {
          if (settings.rule23_enabled !== "1") fail("Regel 23 \xE4r avst\xE4ngd under Inst\xE4llningar.");
          const r23 = L.rule23Ranking(st, settings);
          const issued = r23.season_over ? L.todayStr() > season.end_date ? season.end_date : L.todayStr() : L.todayStr();
          for (const id of ids) {
            const c = r23.ranking.find((r) => r.id === id);
            if (!c) fail("Spelaren finns inte bland aktiva spelare.");
            if (c.existing) fail(`${c.name} har redan f\xE5tt bot nr 23 denna s\xE4song (${c.existing}).`, 409, "duplicate_rule");
            out.push(await insertFine(db2, user, season, { player_id: id, category_id: (await catByNumber(db2, 23)).id, issued_date: issued, description: `Minst b\xF6ter s\xE4songen ${season.name} (${kr(c.amount)})` }, { ruleKey: `R23:${season.id}`, allowRuleKind: true, isDemo: !!c.is_demo }));
          }
        } else fail("Ok\xE4nd regel.");
        return out;
      });
    }
    async function closeMonth(db, user, season, period, body) {
      if (!L.isMonth(period)) fail("Ogiltig m\xE5nad.");
      return tx(async (db2) => {
        const ex = await db2.get("SELECT * FROM month_closings WHERE season_id = ? AND period = ?", season.id, period);
        if (body.reopen) {
          if (!ex) fail("M\xE5naden \xE4r inte avst\xE4md.");
          const reason = str(body.reason, "Anledning", { required: true, max: 300 });
          await db2.run("DELETE FROM month_closings WHERE season_id = ? AND period = ?", season.id, period);
          await audit(db2, user, "M\xE5nadsavst\xE4mning \xE5ngrad", "m\xE5nad", period, ex, null, reason);
          return;
        }
        if (ex) fail("M\xE5naden \xE4r redan avst\xE4md.");
        const note = str(body.note, "Anteckning", { max: 500 });
        await db2.run("INSERT INTO month_closings (season_id, period, closed_by, closed_at, note) VALUES (?,?,?,?,?)", season.id, period, user.username, now(), note);
        await audit(db2, user, "M\xE5nad avst\xE4md", "m\xE5nad", period, null, { note });
      });
    }
    function swishNumber(v) {
      const s = String(v || "").replace(/[\s-]/g, "").replace(/^\+46/, "0").replace(/^46(?=7)/, "0");
      if (!s) return "";
      if (!/^(07\d{8}|123\d{7}|9\d{9})$/.test(s)) fail("Swish-numret ska vara ett mobilnummer (07X XXX XX XX) eller ett Swish-f\xF6retagsnummer (123 XXX XX XX).");
      return s;
    }
    async function updateSettings(db, user, body) {
      return tx(async (db2) => {
        const old = await L.getSettings(db2);
        const next = {};
        if (body.team_name != null) next.team_name = str(body.team_name, "Lagnamn", { max: 80, required: true });
        if (body.payment_info != null) next.payment_info = str(body.payment_info, "Betalningsinformation", { max: 300, required: true });
        if (body.swish_number != null) next.swish_number = swishNumber(body.swish_number);
        if (body.swish_name != null) next.swish_name = str(body.swish_name, "Mottagarens namn", { max: 50 });
        if (body.start_balance != null) next.start_balance = String(parseKr(String(body.start_balance), "Startsaldo", { allowZero: true }));
        for (const k of ["rule22_enabled", "rule23_enabled", "rule29_enabled"]) if (body[k] != null) next[k] = body[k] ? "1" : "0";
        if (body.rule22_days != null) {
          const d = Number(body.rule22_days);
          if (!Number.isInteger(d) || d < 7 || d > 60) fail("Antal dagar f\xF6r regel 22 m\xE5ste vara 7\u201360.");
          next.rule22_days = String(d);
        }
        const oldV = {};
        const newV = {};
        for (const [k, v] of Object.entries(next)) {
          if (old[k] !== v) {
            oldV[k] = old[k];
            newV[k] = v;
            await db2.run("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", k, v);
          }
        }
        if (Object.keys(newV).length) await audit(db2, user, "Inst\xE4llningar \xE4ndrade", "inst\xE4llningar", null, oldV, newV, body.reason);
      });
    }
    async function updateSeason(db, user, body) {
      return tx(async (db2) => {
        const s = await L.activeSeason(db2);
        const start = date(body.start_date, "S\xE4songsstart");
        const end = date(body.end_date, "S\xE4songsslut");
        if (end <= start) fail("S\xE4songsslut m\xE5ste vara efter s\xE4songsstart.");
        const outside = (await db2.get("SELECT COUNT(*)::int n FROM fines WHERE season_id = ? AND (issued_date < ? OR issued_date > ?)", s.id, start, end)).n + (await db2.get("SELECT COUNT(*)::int n FROM payments WHERE season_id = ? AND (date < ? OR date > ?)", s.id, start, end)).n;
        if (outside) fail("Det finns registreringar utanf\xF6r de nya datumen. Justera inte s\xE4songen s\xE5 att historik hamnar utanf\xF6r.");
        await db2.run("UPDATE seasons SET start_date = ?, end_date = ? WHERE id = ?", start, end, s.id);
        await audit(db2, user, "S\xE4song \xE4ndrad", "s\xE4song", s.name, { start_date: s.start_date, end_date: s.end_date }, { start_date: start, end_date: end });
      });
    }
    async function seedDemo(db, user, season) {
      if (await db.get("SELECT 1 FROM players WHERE is_demo = 1 LIMIT 1")) fail("Exempeldata finns redan. Ta bort den f\xF6rst om du vill skapa ny.");
      const today = L.todayStr();
      const ref = today < season.start_date ? season.start_date : today > season.end_date ? season.end_date : today;
      return tx(async (db2) => {
        const names = [["Exempel", "M\xE5lvakt", "1", "M\xE5lvakt"], ["Exempel", "Libero", "4", "Libero"], ["Exempel", "Halvback", "7", "Halvback"], ["Exempel", "Mittf\xE4ltare", "10", "Mittf\xE4lt"], ["Exempel", "Forward", "17", "Anfallare"], ["Exempel", "Ytter", "22", "Ytter"]];
        const ids = [];
        for (const [f, l, j, pos] of names) ids.push(await createPlayer(db2, user, { first_name: f, last_name: l, jersey: j, position: pos, notes: "EXEMPELDATA \u2013 inte en riktig spelare", created_at: season.start_date + "T08:00:00Z" }, { isDemo: true }));
        const catIds = Object.fromEntries((await db2.all("SELECT number, id FROM categories")).map((c) => [c.number, c.id]));
        const cat = (n) => catIds[n];
        const back = (d) => {
          const x = L.addDays(ref, -d);
          return x < season.start_date ? season.start_date : x;
        };
        const plan = [[0, 4, 40], [0, 1, 38], [1, 8, 33], [2, 13, 30], [3, 5, 27], [3, 19, 25], [4, 14, 21], [5, 2, 18], [1, 26, 14], [2, 4, 10], [4, 10, 7], [0, 27, 5], [3, 12, 3], [4, 6, 2]];
        const fineNos = [];
        for (const [pi, c, d] of plan) fineNos.push(await insertFine(db2, user, season, { player_id: ids[pi], category_id: cat(c), issued_date: back(d), description: "Exempelbot" }, { isDemo: true }));
        await insertFine(db2, user, season, { player_id: ids[5], category_id: cat(18), issued_date: back(9), stick_value: "600", new_stick_cost: "650", description: "Exempel: avslagen klubba" }, { isDemo: true });
        await insertFine(db2, user, season, { player_id: ids[2], category_id: cat(28), issued_date: back(6), ref_fine_no: fineNos[3], description: "Exempel: planterad bot" }, { isDemo: true });
        const pays = [[0, 75, 20], [1, 150, 12], [2, 50, 8], [3, 400, 4], [4, 100, 1]];
        for (const [pi, amt, d] of pays) {
          const body = { player_id: ids[pi], date: back(d) };
          const player = await getPlayer(db2, body.player_id);
          const no = "X-I" + String(await nextNumber(db2, "demo_payment")).padStart(4, "0");
          const p = await db2.get(`INSERT INTO payments (payment_no, season_id, player_id, date, amount, method, reference, comment, registered_by, is_demo, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,1,?) RETURNING *`, no, season.id, player.id, body.date, amt * 100, "Swish", "Exempel", "Exempelbetalning", user.username, now());
          await allocate(db2, p, await autoItems(db2, player.id, season.id, p.amount));
        }
        const ne = "X-K" + String(await nextNumber(db2, "demo_cash")).padStart(4, "0");
        await db2.run("INSERT INTO cash_events (event_no, season_id, type, date, amount, description, registered_by, is_demo, created_at) VALUES (?,?,'expense',?,?,?,?,1,?)", ne, season.id, back(2), 3e4, "Exempel: fika till laget", user.username, now());
        await audit(db2, user, "Exempeldata skapad", "exempeldata", null, null, { spelare: ids.length });
        return { players: ids.length };
      });
    }
    async function removeDemo(db, user) {
      return tx(async (db2) => {
        const n = (await db2.get("SELECT COUNT(*)::int n FROM players WHERE is_demo = 1")).n;
        if (!n) fail("Det finns ingen exempeldata att ta bort.");
        const mixed = (await db2.get(`SELECT COUNT(*)::int n FROM fines WHERE is_demo = 0 AND (player_id IN (SELECT id FROM players WHERE is_demo=1) OR ref_fine_id IN (SELECT id FROM fines WHERE is_demo=1))`)).n + (await db2.get("SELECT COUNT(*)::int n FROM payments WHERE is_demo = 0 AND player_id IN (SELECT id FROM players WHERE is_demo=1)")).n;
        if (mixed) fail("Riktiga registreringar \xE4r kopplade till exempelspelare. Inget togs bort.", 409);
        await db2.run("DELETE FROM allocations WHERE payment_id IN (SELECT id FROM payments WHERE is_demo=1) OR fine_id IN (SELECT id FROM fines WHERE is_demo=1)");
        await db2.run("UPDATE fines SET ref_fine_id = NULL WHERE is_demo = 1");
        await db2.run("DELETE FROM fines WHERE is_demo = 1");
        await db2.run("DELETE FROM payments WHERE is_demo = 1");
        await db2.run("DELETE FROM cash_events WHERE is_demo = 1");
        await db2.run("DELETE FROM players WHERE is_demo = 1");
        for (const c of ["demo_fine", "demo_payment", "demo_player", "demo_cash"]) await db2.run("UPDATE counters SET value = 0 WHERE name = ?", c);
        await audit(db2, user, "Exempeldata borttagen", "exempeldata", null, { spelare: n }, null);
        return { removed_players: n };
      });
    }
    var REPORT_KINDS = ["fixed", "per_item"];
    async function getReport(db, id) {
      const r = await db.get("SELECT * FROM fine_reports WHERE id = ?", Number(id));
      if (!r) fail("Anm\xE4lan finns inte.", 404);
      return r;
    }
    async function createReport(db, user, season, body) {
      return tx(async (db2) => {
        if (user.role !== "player" || !user.player_id) fail("Endast spelarkonton kan anm\xE4la b\xF6ter.", 403);
        const reporter = await getPlayer(db2, user.player_id);
        const target = await getPlayer(db2, body.player_id);
        if (target.id === reporter.id) fail("Du kan inte anm\xE4la dig sj\xE4lv.");
        if (target.is_demo) fail("Exempelspelare kan inte anm\xE4las.");
        if (!target.active) fail(`${target.first_name} ${target.last_name} \xE4r inaktiv och kan inte anm\xE4las.`);
        const cat = await db2.get("SELECT * FROM categories WHERE id = ?", Number(body.category_id));
        if (!cat) fail("V\xE4lj en b\xF6teskategori.");
        if (!cat.active) fail(`Kategorin "${cat.name}" \xE4r inaktiverad.`);
        if (!REPORT_KINDS.includes(cat.kind)) fail(`Bot nr ${cat.number} kan inte anm\xE4las \u2013 den hanteras av administrat\xF6ren.`);
        let quantity = 1;
        if (cat.kind === "per_item") {
          quantity = Number(body.quantity || 1);
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > 30) fail("Antal m\xE5ste vara ett heltal mellan 1 och 30.");
        }
        const incident = date(body.incident_date || L.todayStr(), "Datum f\xF6r h\xE4ndelsen");
        notFuture(incident, "Datum f\xF6r h\xE4ndelsen");
        inSeason(season, incident, "Datum f\xF6r h\xE4ndelsen");
        const comment = str(body.comment, "Kommentar", { max: 300 });
        const key = body.idempotency_key ? str(body.idempotency_key, "Nyckel", { max: 80 }) : null;
        if (key) {
          const ex = await db2.get("SELECT report_no FROM fine_reports WHERE idempotency_key = ?", key);
          if (ex) fail(`Anm\xE4lan \xE4r redan skickad (${ex.report_no}).`, 409, "already_registered");
        }
        const dup = await db2.get(`SELECT report_no FROM fine_reports WHERE reporter_user_id = ? AND player_id = ? AND category_id = ?
      AND incident_date = ? AND status IN ('pending','disputed')`, user.id, target.id, cat.id, incident);
        if (dup) fail(`Du har redan en \xF6ppen anm\xE4lan av ${target.first_name} f\xF6r samma bot och dag (${dup.report_no}).`, 409, "duplicate_report");
        const amount = cat.default_amount * quantity;
        if (amount <= 0) fail("Kategorin saknar standardbelopp.");
        const no = "A-" + String(await nextNumber(db2, "report")).padStart(4, "0");
        const reporterName = `${reporter.first_name} ${reporter.last_name}`;
        const r = await db2.get(
          `INSERT INTO fine_reports (report_no, season_id, player_id, category_id, category_name, category_number, quantity, amount,
      incident_date, comment, reporter_user_id, reporter_player_id, reporter_name, reporter_jersey, status, idempotency_key, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?) RETURNING *`,
          no,
          season.id,
          target.id,
          cat.id,
          cat.name,
          cat.number,
          quantity,
          amount,
          incident,
          comment,
          user.id,
          reporter.id,
          reporterName,
          reporter.jersey,
          key,
          now()
        );
        await audit(db2, user, "Bot anm\xE4ld", "anm\xE4lan", no, null, { anm\u00E4ld: `${target.first_name} ${target.last_name}`, kategori: `${cat.number}. ${cat.name}`, belopp: kr(amount), datum: incident, kommentar: comment, anm\u00E4lare: reporterName });
        return r;
      });
    }
    function assertSameReport(r, expect) {
      if (expect?.report_no && expect.report_no !== r.report_no) fail("Fel anm\xE4lan \u2013 ladda om sidan.", 409, "stale");
      if (expect?.status && expect.status !== r.status) fail(`${r.report_no} har redan hanterats (status \xE4ndrad). Sidan uppdateras.`, 409, "stale");
    }
    async function approveReport(db, user, season, id, { asPlayer = false, note = "", expect = null } = {}) {
      return tx(async (db2) => {
        const r = await getReport(db2, id);
        assertSameReport(r, expect);
        if (asPlayer) {
          if (user.player_id !== r.player_id) fail("Bara den anm\xE4lda spelaren kan godk\xE4nna sin anm\xE4lan.", 403);
          if (r.status !== "pending") fail(r.status === "disputed" ? "Du har bestridit anm\xE4lan \u2013 administrat\xF6ren avg\xF6r den nu." : "Anm\xE4lan \xE4r redan avgjord.", 409, "already_decided");
        } else if (!["pending", "disputed"].includes(r.status)) fail("Anm\xE4lan \xE4r redan avgjord.", 409, "already_decided");
        if (r.fine_id) fail("Anm\xE4lan har redan blivit en bot.", 409, "already_decided");
        const desc = `Anm\xE4lan ${r.report_no} av ${r.reporter_jersey ? `#${r.reporter_jersey} ` : ""}${r.reporter_name} (h\xE4ndelse ${r.incident_date})${r.comment ? `: ${r.comment}` : ""}`.slice(0, 500);
        const fineNo = await insertFine(
          db2,
          user,
          season,
          { player_id: r.player_id, category_id: r.category_id, quantity: r.quantity, issued_date: L.todayStr(), description: desc },
          { fixedAmount: r.amount, reportId: r.id }
        );
        const fine = await db2.get("SELECT id FROM fines WHERE fine_no = ?", fineNo);
        const decisionNote = str(note, "Kommentar", { max: 300 });
        const upd = await db2.run(
          `UPDATE fine_reports SET status = 'approved', fine_id = ?, decided_by = ?, decided_at = ?, decision_note = ?, approved_by_player = ? WHERE id = ? AND status IN ('pending','disputed') AND fine_id IS NULL`,
          fine.id,
          who(user),
          now(),
          decisionNote || null,
          asPlayer ? 1 : 0,
          r.id
        );
        if (upd.changes !== 1) fail("Anm\xE4lan \xE4r redan avgjord.", 409, "already_decided");
        await audit(db2, user, asPlayer ? "Anm\xE4lan godk\xE4nd av den anm\xE4lde" : "Anm\xE4lan godk\xE4nd", "anm\xE4lan", r.report_no, { status: r.status }, { status: "godk\xE4nd", bot: fineNo });
        return { fine_no: fineNo, report: { id: r.id, report_no: r.report_no, status: "approved" } };
      });
    }
    async function disputeReport(db, user, id, body) {
      return tx(async (db2) => {
        const r = await getReport(db2, id);
        assertSameReport(r, body.expect);
        if (user.player_id !== r.player_id) fail("Bara den anm\xE4lda spelaren kan bestrida sin anm\xE4lan.", 403);
        if (r.status !== "pending") fail("Anm\xE4lan kan inte bestridas i nuvarande status.", 409, "already_decided");
        const reason = str(body.reason, "Varf\xF6r du bestrider", { required: true, max: 300 });
        await db2.run("UPDATE fine_reports SET status = 'disputed', dispute_reason = ?, disputed_at = ? WHERE id = ?", reason, now(), r.id);
        await audit(db2, user, "Anm\xE4lan bestriden", "anm\xE4lan", r.report_no, { status: "v\xE4ntar" }, { status: "bestriden" }, reason);
      });
    }
    async function rejectReport(db, user, id, body) {
      return tx(async (db2) => {
        const r = await getReport(db2, id);
        assertSameReport(r, body.expect);
        if (!["pending", "disputed"].includes(r.status)) fail("Anm\xE4lan \xE4r redan avgjord.", 409, "already_decided");
        const reason = str(body.reason, "Anledning", { required: true, max: 300 });
        await db2.run("UPDATE fine_reports SET status = 'rejected', decided_by = ?, decided_at = ?, decision_note = ? WHERE id = ?", who(user), now(), reason, r.id);
        await audit(db2, user, "Anm\xE4lan avslagen", "anm\xE4lan", r.report_no, { status: r.status }, { status: "avslagen" }, reason);
      });
    }
    module.exports = {
      AppError,
      fail,
      parseKr,
      kr,
      audit,
      METHODS,
      createPlayer: (db, user, body) => tx(async (db2) => await createPlayer(db2, user, body)),
      updatePlayer,
      setPlayerActive,
      deletePlayer,
      importPlayers,
      updateCategory,
      setJuniorDiscount,
      assertJerseyFreeForLogin,
      createReport,
      approveReport,
      disputeReport,
      rejectReport,
      getPlayer,
      who,
      createVerifiedPayment: (db, user, season, body) => tx(async (t) => createVerifiedPaymentTx(t, user, season, body)),
      setPaymentPermission,
      swishNumber,
      juniorDiscount,
      createFines,
      editFine,
      voidFine,
      createPayment,
      allocateCredit,
      reversePayment,
      createCashEvent,
      voidCashEvent,
      applyRule,
      closeMonth,
      updateSettings,
      updateSeason,
      seedDemo,
      removeDemo,
      playerCredit
    };
  }
});

// server/app.js
var require_app = __commonJS({
  "server/app.js"(exports, module) {
    "use strict";
    var crypto2 = __require("crypto");
    var { db: getDb, tx } = require_db();
    var L = require_logic();
    var O = require_ops();
    var SESSION_DAYS = 30;
    var COOKIE = "bk_session";
    function hashPassword(pw) {
      const salt = crypto2.randomBytes(16).toString("hex");
      return `${salt}:${crypto2.scryptSync(pw, salt, 64).toString("hex")}`;
    }
    function checkPassword(pw, stored) {
      const [salt, hash] = String(stored).split(":");
      if (!salt || !hash) return false;
      const a = Buffer.from(hash, "hex");
      const b = crypto2.scryptSync(pw, salt, 64);
      return a.length === b.length && crypto2.timingSafeEqual(a, b);
    }
    function validatePassword(pw) {
      if (typeof pw !== "string" || pw.length < 8) O.fail("L\xF6senordet m\xE5ste vara minst 8 tecken.");
      if (pw.length > 200) O.fail("L\xF6senordet \xE4r f\xF6r l\xE5ngt.");
    }
    function validUsername(u) {
      const s = String(u || "").trim();
      if (!/^[a-zA-Z0-9._-]{3,30}$/.test(s)) O.fail("Anv\xE4ndarnamn: 3\u201330 tecken, bokst\xE4ver a\u2013z, siffror, punkt, bindestreck eller understreck.");
      if (/^\d+$/.test(s)) O.fail("Anv\xE4ndarnamn f\xE5r inte bara vara siffror \u2013 siffror anv\xE4nds n\xE4r spelare loggar in med tr\xF6jnummer.");
      return s;
    }
    var krCsv = (ore) => (ore / 100).toFixed(2).replace(".", ",");
    function csv(headers, rows) {
      const esc = (v) => {
        const s = v == null ? "" : String(v);
        return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      return "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n") + "\r\n";
    }
    var STATUS_SV = { obetald: "Obetald", delvis: "Delvis betald", betald: "Betald", makulerad: "Makulerad" };
    var TYPE_SV = { income: "\xD6vrig inkomst", expense: "Utgift", refund: "\xC5terbetalning", payment: "Inbetalning", payment_reversed: "\xC5terf\xF6rd inbetalning" };
    var SEC_HEADERS = { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin", "Cache-Control": "no-store" };
    function json(data, status = 200, extra = {}) {
      return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...SEC_HEADERS, ...extra } });
    }
    function file(body, filename, type) {
      return new Response(body, { status: 200, headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${filename}"`, ...SEC_HEADERS } });
    }
    var routes = [];
    var route = (method, path, level, fn) => {
      const keys = [];
      const re = new RegExp("^" + path.replace(/:(\w+)/g, (_, k) => {
        keys.push(k);
        return "([^/]+)";
      }) + "$");
      routes.push({ method, re, keys, level, fn });
    };
    var GET = (p, l, f) => route("GET", p, l, f);
    var POST = (p, l, f) => route("POST", p, l, f);
    var PUT = (p, l, f) => route("PUT", p, l, f);
    var DEL = (p, l, f) => route("DELETE", p, l, f);
    var failures = /* @__PURE__ */ new Map();
    async function userFromToken(db, token) {
      if (!token) return null;
      const row = await db.get(`SELECT u.*, s.expires_at, p.first_name, p.last_name, p.jersey, p.active AS player_active, p.can_register_payments
    FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN players p ON p.id = u.player_id WHERE s.token = ?`, token);
      if (!row || !row.active || row.expires_at < (/* @__PURE__ */ new Date()).toISOString()) return null;
      const user = { id: row.id, username: row.username, display_name: row.display_name, role: row.role, token };
      if (row.role === "player") {
        if (!row.player_id || !row.player_active) return null;
        Object.assign(user, {
          player_id: row.player_id,
          jersey: row.jersey,
          display_name: `${row.first_name} ${row.last_name}`,
          can_register_payments: !!row.can_register_payments,
          label: `${row.jersey ? `#${row.jersey} ` : ""}${row.first_name} ${row.last_name}`
        });
      }
      return user;
    }
    var publicUser = (u) => u ? {
      username: u.username,
      display_name: u.display_name,
      role: u.role,
      player_id: u.player_id || null,
      jersey: u.jersey || null,
      can_register_payments: u.role === "admin" || !!u.can_register_payments
    } : null;
    var canRegisterPayments = (u) => u.role === "admin" || u.role === "player" && u.can_register_payments === true;
    var swishMsgSafe = (t) => String(t).normalize("NFC").replace(/[^0-9A-Za-zÅÄÖåäöÉéÜü \-]/g, "").replace(/\s+/g, " ").trim();
    function swishInfo(settings, p) {
      const number = settings.swish_number || "";
      const amountOre = Math.max(0, p.debt);
      const message = swishMsgSafe(`B\xF6ter ${p.id} ${p.jersey ? `nr ${p.jersey} ` : ""}${p.first_name} ${p.last_name}`).slice(0, 50);
      const amt = amountOre % 100 ? (amountOre / 100).toFixed(2) : String(amountOre / 100);
      const url = number && amountOre > 0 ? `https://app.swish.nu/1/p/sw/?sw=${encodeURIComponent(number)}&amt=${encodeURIComponent(amt)}&cur=SEK&msg=${encodeURIComponent(message)}&src=qr` : null;
      return {
        configured: !!number,
        number,
        name: settings.swish_name || "",
        amount: amountOre,
        message,
        url,
        note: "Betalningen registreras f\xF6rst n\xE4r kass\xF6ren har kontrollerat att pengarna kommit in."
      };
    }
    function readCookie(request) {
      const m = (request.headers.get("cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(COOKIE + "="));
      return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null;
    }
    function isSecure(request) {
      return process.env.COOKIE_SECURE === "1" || request.url.startsWith("https:") || request.headers.get("x-forwarded-proto") === "https";
    }
    async function newSession(db, request, userId) {
      const token = crypto2.randomBytes(32).toString("hex");
      const exp = new Date(Date.now() + SESSION_DAYS * 864e5);
      await db.run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)", token, userId, exp.toISOString());
      await db.run("DELETE FROM sessions WHERE expires_at < ?", (/* @__PURE__ */ new Date()).toISOString());
      return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${isSecure(request) ? "; Secure" : ""}`;
    }
    var season = (db) => L.activeSeason(db);
    var state = async (db) => L.loadState(db, await season(db));
    GET("/api/status", "public", async ({ db, user }) => ({
      needs_setup: !await db.get("SELECT 1 AS x FROM users LIMIT 1"),
      user: publicUser(user)
    }));
    POST("/api/setup", "public", async ({ body, request }) => {
      validatePassword(body.password);
      const username = validUsername(body.username);
      const display = String(body.display_name || username).trim().slice(0, 60) || username;
      const cookie = await tx(async (t) => {
        if (await t.get("SELECT 1 AS x FROM users LIMIT 1")) O.fail("Appen \xE4r redan konfigurerad.", 409);
        const u = await t.get(
          "INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?,?,?,'admin',?) RETURNING id",
          username,
          display,
          hashPassword(body.password),
          (/* @__PURE__ */ new Date()).toISOString()
        );
        await O.audit(t, { username }, "F\xF6rsta administrat\xF6r skapad", "anv\xE4ndare", username, null, { role: "admin" });
        return newSession(t, request, u.id);
      });
      return json({ ok: true }, 200, { "Set-Cookie": cookie });
    });
    POST("/api/login", "public", async ({ db, body, request, ip }) => {
      const f = failures.get(ip) || { n: 0, t: Date.now() };
      if (Date.now() - f.t > 15 * 6e4) {
        f.n = 0;
        f.t = Date.now();
      }
      if (f.n >= 10) O.fail("F\xF6r m\xE5nga misslyckade f\xF6rs\xF6k. V\xE4nta 15 minuter.", 429);
      const name = String(body.username || "").trim().replace(/^#/, "");
      const u = /^\d{1,3}$/.test(name) ? await db.get(`SELECT u.* FROM users u JOIN players p ON p.id = u.player_id
        WHERE u.role = 'player' AND p.jersey = ? AND p.is_demo = 0 AND p.active = 1`, name) : await db.get("SELECT * FROM users WHERE lower(username) = lower(?) AND role <> 'player'", name);
      if (!u || !u.active || !checkPassword(String(body.password || ""), u.password_hash)) {
        f.n++;
        failures.set(ip, f);
        O.fail("Fel anv\xE4ndarnamn eller l\xF6senord.", 401);
      }
      failures.delete(ip);
      return json({ ok: true }, 200, { "Set-Cookie": await newSession(db, request, u.id) });
    });
    POST("/api/logout", "public", async ({ db, user }) => {
      if (user) await db.run("DELETE FROM sessions WHERE token = ?", user.token);
      return json({ ok: true }, 200, { "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` });
    });
    POST("/api/me/password", "auth", async ({ db, user, body }) => {
      const u = await db.get("SELECT * FROM users WHERE id = ?", user.id);
      if (!checkPassword(String(body.current || ""), u.password_hash)) O.fail("Nuvarande l\xF6senord st\xE4mmer inte.");
      validatePassword(body.password);
      await tx(async (t) => {
        await t.run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(body.password), u.id);
        await t.run("DELETE FROM sessions WHERE user_id = ? AND token != ?", u.id, user.token);
        await O.audit(t, user, "L\xF6senord bytt", "anv\xE4ndare", u.username, null, null);
      });
      return { ok: true };
    });
    GET("/api/dashboard", "auth", async ({ db, user }) => ({ ...L.dashboard(await state(db), await L.getSettings(db)), reports: await reportTodo(db, user) }));
    GET("/api/categories", "auth", ({ db }) => db.all("SELECT * FROM categories ORDER BY number"));
    GET("/api/players", "auth", async ({ db }) => (await state(db)).players);
    GET("/api/players/:id", "auth", async ({ db, params, user }) => {
      const st = await state(db);
      const p = st.playerById.get(params.id);
      if (!p) O.fail("Spelaren finns inte.", 404);
      const fines = st.fines.filter((f) => f.player_id === p.id).sort((a, b) => b.issued_date.localeCompare(a.issued_date) || b.id - a.id);
      const payments = st.payments.filter((x) => x.player_id === p.id).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      const refunds = st.cash.filter((c) => c.player_id === p.id);
      const history = [
        ...fines.map((f) => ({ date: f.issued_date, ts: f.created_at, text: `${f.fine_no} \u2013 ${f.category_name}`, amount: f.amount, type: "fine", status: f.status })),
        ...fines.filter((f) => f.voided).map((f) => ({ date: f.voided_at.slice(0, 10), ts: f.voided_at, text: `${f.fine_no} makulerad: ${f.void_reason}`, amount: f.amount, type: "void" })),
        ...payments.map((x) => ({ date: x.date, ts: x.created_at, text: `${x.payment_no} \u2013 inbetalning via ${x.method}`, amount: x.amount, type: "payment" })),
        ...payments.filter((x) => x.reversed).map((x) => ({ date: x.reversed_at.slice(0, 10), ts: x.reversed_at, text: `${x.payment_no} \xE5terf\xF6rd: ${x.reverse_reason}`, amount: x.amount, type: "reverse" })),
        ...refunds.map((c) => ({ date: c.date, ts: c.created_at, text: `${c.event_no} \u2013 \xE5terbetalning${c.voided ? " (makulerad)" : ""}`, amount: c.amount, type: "refund" }))
      ].sort((a, b) => (b.date + b.ts).localeCompare(a.date + a.ts));
      const cats = {};
      for (const f of fines.filter((x) => !x.voided)) {
        cats[f.category_name] = cats[f.category_name] || { count: 0, amount: 0 };
        cats[f.category_name].count++;
        cats[f.category_name].amount += f.amount;
      }
      const lb = L.rank(st.players.filter((x) => x.active), (x) => x.issued);
      const reports = (await reportsFor(db, user)).filter((r) => r.player_id === p.id);
      const account = user.role === "admin" ? await db.get("SELECT id, active FROM users WHERE player_id = ?", p.id) : void 0;
      return { player: p, fines, payments, refunds, history, categories: cats, place: lb.find((x) => x.id === p.id)?.place || null, of: lb.length, reports, account: account || null };
    });
    GET("/api/fines", "auth", async ({ db }) => (await state(db)).fines.sort((a, b) => b.id - a.id));
    GET("/api/fines/lookup", "auth", async ({ db, query }) => {
      const no = String(query.get("no") || "").trim().toUpperCase();
      const f = (await state(db)).fines.find((x) => x.fine_no === no);
      if (!f) O.fail(`B\xF6tesnummer ${no || "?"} finns inte.`, 404);
      return { id: f.id, fine_no: f.fine_no, player_name: f.player_name, category_name: f.category_name, amount: f.amount, voided: f.voided, kind: f.kind, is_demo: f.is_demo, issued_date: f.issued_date };
    });
    GET("/api/fines/:id", "auth", async ({ db, params, user }) => {
      const st = await state(db);
      const f = st.fineById.get(Number(params.id));
      if (!f) O.fail("Boten finns inte.", 404);
      const allocs = await db.all("SELECT a.*, p.payment_no, p.date AS payment_date, p.method FROM allocations a JOIN payments p ON p.id = a.payment_id WHERE a.fine_id = ? ORDER BY a.id", f.id);
      const history = user.role === "admin" ? await db.all("SELECT * FROM audit_log WHERE entity = 'bot' AND entity_id = ? ORDER BY id DESC", f.fine_no) : [];
      const ref = f.ref_fine_id ? st.fineById.get(f.ref_fine_id) : null;
      const plantedBy = st.fines.filter((x) => x.ref_fine_id === f.id).map((x) => ({ fine_no: x.fine_no, player_name: x.player_name, voided: x.voided }));
      const report = f.report_id ? await db.get("SELECT report_no, reporter_name, reporter_jersey, incident_date, comment, decided_by, approved_by_player, dispute_reason FROM fine_reports WHERE id = ?", f.report_id) : null;
      return { fine: f, allocations: allocs, history, ref: ref ? { fine_no: ref.fine_no, player_name: ref.player_name } : null, planted_by: plantedBy, report };
    });
    GET("/api/payments", "auth", async ({ db }) => (await state(db)).payments.sort((a, b) => b.id - a.id));
    GET("/api/payments/:id", "auth", async ({ db, params }) => {
      const p = (await state(db)).payments.find((x) => x.id === Number(params.id));
      if (!p) O.fail("Betalningen finns inte.", 404);
      const allocs = await db.all("SELECT a.*, f.fine_no, f.category_name FROM allocations a JOIN fines f ON f.id = a.fine_id WHERE a.payment_id = ? ORDER BY a.id", p.id);
      return { payment: p, allocations: allocs };
    });
    GET("/api/leaderboard", "auth", async ({ db, query }) => L.leaderboard(await state(db), Object.fromEntries(query)));
    GET("/api/month", "auth", async ({ db, query }) => {
      const st = await state(db);
      const q = query.get("period");
      const period = L.isMonth(q) ? q : L.monthOf(st.today);
      return L.monthView(db, st, period, await L.getSettings(db));
    });
    GET("/api/cash", "auth", async ({ db }) => L.cashSummary(await state(db), await L.getSettings(db)));
    GET("/api/rules", "auth", async ({ db, query }) => {
      const st = await state(db);
      const s = await L.getSettings(db);
      const prev = L.monthOf(L.addDays(L.monthStart(L.monthOf(st.today)), -1));
      const q = query.get("period");
      const period = L.isMonth(q) ? q : prev;
      return { r22: L.rule22Candidates(st, s), r23: L.rule23Ranking(st, s), r29: L.rule29Candidates(st, period, s), today: st.today };
    });
    GET("/api/settings", "auth", async ({ db, user }) => {
      const s = await L.getSettings(db);
      const out = { team_name: s.team_name, payment_info: s.payment_info, swish_number: s.swish_number || "", swish_name: s.swish_name || "", season: await season(db), today: L.todayStr(), demo: !!await db.get("SELECT 1 AS x FROM players WHERE is_demo=1 LIMIT 1"), methods: O.METHODS };
      if (user.role === "admin") Object.assign(out, s, { start_balance: Number(s.start_balance) });
      return out;
    });
    var ok = { ok: true };
    POST("/api/players", "admin", async ({ db, user, body }) => ({ id: await O.createPlayer(db, user, body) }));
    PUT("/api/players/:id", "admin", async ({ db, user, params, body }) => {
      await O.updatePlayer(db, user, params.id, body);
      return ok;
    });
    POST("/api/players/import", "admin", ({ db, user, body }) => O.importPlayers(db, user, body.csv));
    POST("/api/players/:id/active", "admin", async ({ db, user, params, body }) => {
      await O.setPlayerActive(db, user, params.id, !!body.active);
      return ok;
    });
    DEL("/api/players/:id", "admin", async ({ db, user, params }) => {
      await O.deletePlayer(db, user, params.id);
      return ok;
    });
    POST("/api/players/:id/allocate-credit", "admin", async ({ db, user, params, body }) => O.allocateCredit(db, user, await season(db), params.id, body));
    PUT("/api/categories/:id", "admin", async ({ db, user, params, body }) => {
      await O.updateCategory(db, user, params.id, body);
      return ok;
    });
    POST("/api/fines", "admin", async ({ db, user, body }) => ({ fine_nos: await O.createFines(db, user, await season(db), body.items) }));
    PUT("/api/fines/:id", "admin", async ({ db, user, params, body }) => {
      await O.editFine(db, user, await season(db), params.id, body);
      return ok;
    });
    POST("/api/fines/:id/void", "admin", ({ db, user, params, body }) => O.voidFine(db, user, params.id, body));
    POST("/api/payments", "admin", async ({ db, user, body }) => O.createPayment(db, user, await season(db), body));
    POST("/api/payments/:id/reverse", "admin", async ({ db, user, params, body }) => {
      await O.reversePayment(db, user, await season(db), params.id, body);
      return ok;
    });
    POST("/api/cash", "admin", async ({ db, user, body }) => ({ event_no: await O.createCashEvent(db, user, await season(db), body) }));
    POST("/api/cash/:id/void", "admin", async ({ db, user, params, body }) => {
      await O.voidCashEvent(db, user, params.id, body);
      return ok;
    });
    POST("/api/rules/:rule", "admin", async ({ db, user, params, body }) => ({ fine_nos: await O.applyRule(db, user, await season(db), params.rule, body) }));
    POST("/api/month/:period/close", "admin", async ({ db, user, params, body }) => {
      await O.closeMonth(db, user, await season(db), params.period, body);
      return ok;
    });
    PUT("/api/settings", "admin", async ({ db, user, body }) => {
      await O.updateSettings(db, user, body);
      return ok;
    });
    PUT("/api/season", "admin", async ({ db, user, body }) => {
      await O.updateSeason(db, user, body);
      return ok;
    });
    POST("/api/demo", "admin", async ({ db, user }) => O.seedDemo(db, user, await season(db)));
    DEL("/api/demo", "admin", ({ db, user }) => O.removeDemo(db, user));
    GET("/api/audit", "admin", ({ db, query }) => db.all("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", Math.min(Number(query.get("limit")) || 300, 2e3)));
    POST("/api/players/:id/junior-discount", "admin", async ({ db, user, params, body }) => {
      await O.setJuniorDiscount(db, user, params.id, !!body.enabled);
      return ok;
    });
    async function reportsFor(db, user) {
      const s = await season(db);
      const rows = await db.all(`SELECT r.*, p.first_name || ' ' || p.last_name AS player_name, p.jersey AS player_jersey, f.fine_no, f.amount AS fine_amount,
    f.base_amount AS fine_base_amount, f.discount_amount AS fine_discount_amount, f.voided AS fine_voided, p.junior_discount
    FROM fine_reports r JOIN players p ON p.id = r.player_id LEFT JOIN fines f ON f.id = r.fine_id WHERE r.season_id = ? ORDER BY r.id DESC`, s.id);
      return user.role === "player" ? rows.filter((r) => r.player_id === user.player_id || r.reporter_user_id === user.id).map(({ idempotency_key, ...r }) => r) : rows.map(({ idempotency_key, ...r }) => r);
    }
    async function reportTodo(db, user) {
      if (user.role === "admin") {
        const r = await db.get("SELECT COUNT(*) FILTER (WHERE status = 'pending')::int pending, COUNT(*) FILTER (WHERE status = 'disputed')::int disputed FROM fine_reports");
        return { pending: r.pending, disputed: r.disputed, todo: r.pending + r.disputed };
      }
      if (user.role === "player") {
        const r = await db.get("SELECT COUNT(*)::int n FROM fine_reports WHERE player_id = ? AND status = 'pending'", user.player_id);
        return { pending: r.n, disputed: 0, todo: r.n };
      }
      return { pending: 0, disputed: 0, todo: 0 };
    }
    GET("/api/reports", "auth", ({ db, user }) => reportsFor(db, user));
    GET("/api/me/swish", "player", async ({ db, user }) => {
      const st = await state(db);
      const p = st.playerById.get(user.player_id);
      if (!p) O.fail("Spelaren finns inte.", 404);
      return { ...swishInfo(await L.getSettings(db), p), debt: p.debt, credit: Math.max(0, p.credit), player: { id: p.id, name: p.name, jersey: p.jersey } };
    });
    GET("/api/verify/overview", "payments", async ({ db, user }) => {
      const st = await state(db);
      const players = st.players.filter((p) => !p.is_demo && p.debt > 0).sort((a, b) => b.debt - a.debt || a.name.localeCompare(b.name, "sv")).map((p) => ({
        id: p.id,
        name: p.name,
        jersey: p.jersey,
        active: p.active,
        debt: p.debt,
        overdue_amount: p.overdue_amount,
        unpaid_count: p.unpaid_count,
        self: user.player_id === p.id,
        fines: st.fines.filter((f) => f.player_id === p.id && f.remaining > 0).sort((a, b) => a.due_date.localeCompare(b.due_date) || a.id - b.id).map((f) => ({ fine_no: f.fine_no, category_name: f.category_name, remaining: f.remaining, due_date: f.due_date, overdue: f.overdue }))
      }));
      const recent = st.payments.filter((x) => !x.is_demo).sort((a, b) => b.id - a.id).slice(0, 15).map((x) => ({ payment_no: x.payment_no, player_name: x.player_name, amount: x.amount, date: x.date, method: x.method, reference: x.reference, registered_by: x.registered_by, created_at: x.created_at, reversed: x.reversed }));
      return { players, recent, total: players.reduce((sum, p) => sum + p.debt, 0), methods: ["Swish", "Bank\xF6verf\xF6ring", "Kontant"], today: st.today };
    });
    POST("/api/verify/payments", "payments", async ({ db, user, body }) => O.createVerifiedPayment(db, user, await season(db), body));
    POST("/api/players/:id/payment-permission", "admin", async ({ db, user, params, body }) => {
      await O.setPaymentPermission(db, user, params.id, !!body.enabled);
      return ok;
    });
    GET("/api/reports/todo", "auth", ({ db, user }) => reportTodo(db, user));
    POST("/api/reports", "player", async ({ db, user, body }) => {
      const r = await O.createReport(db, user, await season(db), body);
      return { id: r.id, report_no: r.report_no };
    });
    POST("/api/reports/:id/accept", "player", async ({ db, user, params, body }) => O.approveReport(db, user, await season(db), params.id, { asPlayer: true, expect: body.expect }));
    POST("/api/reports/:id/dispute", "player", async ({ db, user, params, body }) => {
      await O.disputeReport(db, user, params.id, body);
      return ok;
    });
    POST("/api/reports/:id/approve", "admin", async ({ db, user, params, body }) => O.approveReport(db, user, await season(db), params.id, { note: body.note, expect: body.expect }));
    POST("/api/reports/:id/reject", "admin", async ({ db, user, params, body }) => {
      await O.rejectReport(db, user, params.id, body);
      return ok;
    });
    POST("/api/players/:id/account", "admin", async ({ user, params, body }) => {
      validatePassword(body.password);
      return tx(async (t) => {
        const p = await O.getPlayer(t, params.id);
        if (p.is_demo) O.fail("Exempelspelare kan inte f\xE5 konto.");
        if (!p.active) O.fail("Spelaren \xE4r inaktiv. Aktivera spelaren f\xF6rst.");
        if (!p.jersey) O.fail("Spelaren m\xE5ste ha ett tr\xF6jnummer \u2013 det \xE4r anv\xE4ndarnamnet vid inloggning.");
        if (await t.get("SELECT 1 AS x FROM users WHERE player_id = ?", p.id)) O.fail("Spelaren har redan ett konto. Byt l\xF6senord i st\xE4llet.", 409);
        const clash = await t.get(`SELECT pl.first_name, pl.last_name FROM users u JOIN players pl ON pl.id = u.player_id WHERE pl.jersey = ? AND pl.is_demo = 0`, p.jersey);
        if (clash) O.fail(`Tr\xF6jnummer ${p.jersey} anv\xE4nds redan f\xF6r inloggning av ${clash.first_name} ${clash.last_name}.`, 409);
        const username = `spelare-${p.id.toLowerCase()}`;
        const u = await t.get(
          "INSERT INTO users (username, display_name, password_hash, role, player_id, created_at) VALUES (?,?,?,'player',?,?) RETURNING id",
          username,
          `${p.first_name} ${p.last_name}`,
          hashPassword(body.password),
          p.id,
          (/* @__PURE__ */ new Date()).toISOString()
        );
        await O.audit(t, user, "Spelarkonto skapat", "anv\xE4ndare", `#${p.jersey} ${p.first_name} ${p.last_name}`, null, { spelare: p.id, inloggning: `tr\xF6jnummer ${p.jersey}` });
        return { id: u.id, login: p.jersey };
      });
    });
    GET("/api/users", "admin", ({ db }) => db.all(`SELECT u.id, u.username, u.display_name, u.role, u.active, u.created_at, u.player_id, p.jersey, p.active AS player_active, p.can_register_payments,
  p.first_name || ' ' || p.last_name AS player_name FROM users u LEFT JOIN players p ON p.id = u.player_id ORDER BY u.id`));
    POST("/api/users", "admin", async ({ user, body }) => {
      const username = validUsername(body.username);
      const role = body.role === "admin" ? "admin" : "viewer";
      validatePassword(body.password);
      const display = String(body.display_name || username).trim().slice(0, 60) || username;
      await tx(async (t) => {
        if (await t.get("SELECT 1 AS x FROM users WHERE lower(username) = lower(?)", username)) O.fail("Anv\xE4ndarnamnet \xE4r upptaget.");
        await t.run("INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?,?,?,?,?)", username, display, hashPassword(body.password), role, (/* @__PURE__ */ new Date()).toISOString());
        await O.audit(t, user, "Anv\xE4ndare skapad", "anv\xE4ndare", username, null, { role, display_name: display });
      });
      return ok;
    });
    PUT("/api/users/:id", "admin", async ({ user, params, body }) => {
      if (body.password) validatePassword(body.password);
      await tx(async (t) => {
        const u = await t.get("SELECT * FROM users WHERE id = ?", Number(params.id));
        if (!u) O.fail("Anv\xE4ndaren finns inte.", 404);
        if (body.role && u.role === "player") O.fail("Ett spelarkonto kan inte byta roll. Skapa ett separat konto f\xF6r administrat\xF6r eller l\xE4sbeh\xF6righet.");
        const role = body.role ? body.role === "admin" ? "admin" : "viewer" : u.role;
        const active = body.active == null ? u.active : body.active ? 1 : 0;
        const admins = (await t.get("SELECT COUNT(*)::int n FROM users WHERE role = 'admin' AND active = 1 AND id != ?", u.id)).n;
        if ((role !== "admin" || !active) && u.role === "admin" && u.active && admins === 0) O.fail("Det m\xE5ste finnas minst en aktiv administrat\xF6r.");
        await t.run("UPDATE users SET role = ?, active = ? WHERE id = ?", role, active, u.id);
        if (!active) await t.run("DELETE FROM sessions WHERE user_id = ?", u.id);
        if (body.password) {
          await t.run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(body.password), u.id);
          await t.run("DELETE FROM sessions WHERE user_id = ?", u.id);
        }
        await O.audit(t, user, "Anv\xE4ndare \xE4ndrad", "anv\xE4ndare", u.username, { role: u.role, active: u.active }, { role, active, nytt_l\u00F6senord: !!body.password });
      });
      return ok;
    });
    GET("/api/export/:name", "admin", async ({ db, user, params, query }) => {
      const st = await state(db);
      const s = await L.getSettings(db);
      const name = params.name;
      const CSV = "text/csv; charset=utf-8";
      if (name === "boter.csv") {
        return file(csv(
          ["B\xF6tesnummer", "Spelar-ID", "Spelare", "Datum", "Kategori nr", "Kategori", "Beskrivning", "Antal", "Belopp (kr)", "Betalt (kr)", "Kvar (kr)", "Status", "Sista betalningsdag", "Betaldatum", "F\xF6rsenad", "Ber\xE4kning", "Makuleringsorsak", "Registrerad av", "Exempeldata", "Ordinarie belopp (kr)", "Juniorrabatt (kr)"],
          [...st.fines].sort((a, b) => a.id - b.id).map((f) => [f.fine_no, f.player_id, f.player_name, f.issued_date, f.category_number, f.category_name, f.description, f.quantity, krCsv(f.amount), krCsv(f.paid), krCsv(f.remaining), STATUS_SV[f.status], f.due_date, f.paid_date || "", f.overdue ? "Ja" : "", f.calc || "", f.void_reason || "", f.registered_by, f.is_demo ? "Ja" : "", krCsv(f.base_amount ?? f.amount), f.discount_amount ? krCsv(f.discount_amount) : ""])
        ), "boter.csv", CSV);
      }
      if (name === "anmalningar.csv") {
        const REP_SV = { pending: "V\xE4ntar p\xE5 godk\xE4nnande", disputed: "Bestriden", approved: "Godk\xE4nd", rejected: "Avslagen" };
        return file(csv(
          ["Anm\xE4lnings-ID", "Skickad", "Anm\xE4ld spelare", "Kategori nr", "Kategori", "Antal", "Standardbelopp (kr)", "H\xE4ndelsedatum", "Kommentar", "Anm\xE4lare", "Anm\xE4larens tr\xF6jnr", "Status", "Bestridd: orsak", "Avgjord av", "Avgjord", "Beslutskommentar", "B\xF6tesnummer"],
          [...await reportsFor(db, user)].reverse().map((r) => [r.report_no, r.created_at, r.player_name, r.category_number, r.category_name, r.quantity, krCsv(r.amount), r.incident_date, r.comment, r.reporter_name, r.reporter_jersey || "", REP_SV[r.status], r.dispute_reason || "", r.decided_by || "", r.decided_at || "", r.decision_note || "", r.fine_no || ""])
        ), name, CSV);
      }
      if (name === "inbetalningar.csv") {
        return file(csv(
          ["Betalnings-ID", "Spelar-ID", "Spelare", "Datum", "Belopp (kr)", "F\xF6rdelat (kr)", "Of\xF6rdelat (kr)", "Metod", "Referens", "Kommentar", "Status", "\xC5terf\xF6ringsorsak", "Registrerad av", "Exempeldata"],
          st.payments.map((p) => [p.payment_no, p.player_id, p.player_name, p.date, krCsv(p.amount), krCsv(p.allocated), krCsv(p.unallocated), p.method, p.reference, p.comment, p.reversed ? "\xC5terf\xF6rd" : "Aktiv", p.reverse_reason || "", p.registered_by, p.is_demo ? "Ja" : ""])
        ), name, CSV);
      }
      if (name === "spelare.csv") {
        return file(csv(
          ["Spelar-ID", "F\xF6rnamn", "Efternamn", "Tr\xF6jnummer", "Position", "Status", "Antal b\xF6ter", "Utf\xE4rdat (kr)", "Inbetalt (kr)", "Skuld (kr)", "Tillgodo (kr)", "Obetalda b\xF6ter", "Senaste inbetalning", "Anteckningar", "Exempeldata", "Juniorrabatt"],
          st.players.map((p) => [p.id, p.first_name, p.last_name, p.jersey || "", p.position || "", p.active ? "Aktiv" : "Inaktiv", p.fine_count, krCsv(p.issued), krCsv(p.paid), krCsv(p.debt), krCsv(Math.max(0, p.credit)), p.unpaid_count, p.last_payment || "", p.notes, p.is_demo ? "Ja" : "", p.junior_discount ? `${p.junior_discount} %` : ""])
        ), name, CSV);
      }
      if (name === "kassa.csv") {
        const c = L.cashSummary(st, s);
        return file(csv(
          ["Nummer", "Datum", "Typ", "Beskrivning", "In (kr)", "Ut (kr)", "Status"],
          [...c.events].reverse().map((e) => [e.no, e.date, TYPE_SV[e.kind], e.text, e.sign > 0 ? krCsv(e.amount) : "", e.sign < 0 ? krCsv(e.amount) : "", e.voided ? `Makulerad: ${e.void_reason}` : e.kind === "payment_reversed" ? "\xC5terf\xF6rd" : ""])
        ), name, CSV);
      }
      if (name === "andringslogg.csv") {
        return file(csv(
          ["Tid (UTC)", "Anv\xE4ndare", "\xC4ndring", "Objekt", "ID", "Tidigare v\xE4rde", "Nytt v\xE4rde", "Orsak"],
          (await db.all("SELECT * FROM audit_log ORDER BY id")).map((a) => [a.ts, a.username, a.action, a.entity, a.entity_id || "", a.old_value || "", a.new_value || "", a.reason || ""])
        ), name, CSV);
      }
      if (name === "manadsrapport.csv") {
        const q = query.get("period");
        const period = L.isMonth(q) ? q : L.monthOf(st.today);
        const mv = await L.monthView(db, st, period, s);
        const cm = L.cashSummary(st, s).monthly.find((m) => m.month === period) || { payments: 0, income: 0, refunds: 0, expenses: 0, net: 0, balance: "" };
        const rows = [
          ["M\xE5nadsrapport", period],
          ["Lag", s.team_name],
          ["S\xE4song", st.season.name],
          ["Avst\xE4md", mv.closing ? `${mv.closing.closed_at.slice(0, 10)} av ${mv.closing.closed_by}` : "Nej"],
          [],
          ["Utf\xE4rdade b\xF6ter (antal)", mv.summary.fines_count],
          ["Utf\xE4rdade b\xF6ter (kr)", krCsv(mv.summary.fines_amount)],
          ["Makulerade b\xF6ter (antal)", mv.summary.voided],
          ["Inbetalningar (antal)", mv.summary.payments_count],
          ["Inbetalningar (kr)", krCsv(cm.payments)],
          ["\xD6vriga inkomster (kr)", krCsv(cm.income)],
          ["\xC5terbetalningar (kr)", krCsv(cm.refunds)],
          ["Utgifter (kr)", krCsv(cm.expenses)],
          ["Netto (kr)", krCsv(cm.net)],
          ["Kassasaldo vid m\xE5nadens slut (kr)", cm.balance === "" ? "" : krCsv(cm.balance)],
          [],
          ["Obetalt per spelare", "Belopp (kr)", "Varav f\xF6rfallet (kr)", "Tidigaste f\xF6rfallodag"],
          ...mv.open.map((r) => [r.name, krCsv(r.amount), krCsv(r.overdue_amount), r.earliest_due])
        ];
        return file(csv(rows[0], rows.slice(1)), `manadsrapport-${period}.csv`, CSV);
      }
      if (name === "sasongsrapport.csv") {
        const c = L.cashSummary(st, s);
        const rows = [
          ["Lag", s.team_name],
          ["Period", `${st.season.start_date} \u2013 ${st.season.end_date}`],
          ["Skapad", L.todayStr()],
          [],
          ["Startsaldo (kr)", krCsv(c.totals.start_balance)],
          ["Mottagna inbetalningar (kr)", krCsv(c.totals.received)],
          ["\xD6vriga inkomster (kr)", krCsv(c.totals.income)],
          ["\xC5terbetalningar (kr)", krCsv(c.totals.refunds)],
          ["Utgifter (kr)", krCsv(c.totals.expenses)],
          ["Kassasaldo (kr)", krCsv(c.totals.balance)],
          ["Utf\xE4rdade b\xF6ter (kr)", krCsv(c.totals.issued)],
          ["Utest\xE5ende skulder (kr)", krCsv(c.totals.outstanding)],
          ["Tillgodohavanden (kr)", krCsv(c.totals.credits)],
          [],
          ["M\xE5nad", "Utf\xE4rdat (kr)", "Inbetalt (kr)", "\xD6vr. inkomst (kr)", "\xC5terbetalt (kr)", "Utgifter (kr)", "Netto (kr)", "Saldo (kr)"],
          ...c.monthly.map((m) => [m.month, krCsv(m.fines_issued), krCsv(m.payments), krCsv(m.income), krCsv(m.refunds), krCsv(m.expenses), krCsv(m.net), krCsv(m.balance)]),
          [],
          ["Spelare", "Antal b\xF6ter", "Utf\xE4rdat (kr)", "Inbetalt (kr)", "Skuld (kr)", "Tillgodo (kr)"],
          ...st.players.map((p) => [p.name + (p.is_demo ? " (EXEMPEL)" : ""), p.fine_count, krCsv(p.issued), krCsv(p.paid), krCsv(p.debt), krCsv(Math.max(0, p.credit))])
        ];
        return file(csv(["S\xE4songsrapport", st.season.name], rows), `sasongsrapport-${st.season.name.replace("/", "-")}.csv`, CSV);
      }
      if (name === "sakerhetskopia.json") {
        const dump = {};
        for (const t of ["seasons", "settings", "counters", "players", "categories", "fines", "payments", "allocations", "cash_events", "month_closings", "audit_log", "fine_reports"]) dump[t] = await db.all(`SELECT * FROM ${t} ORDER BY 1`);
        dump.users = await db.all("SELECT id, username, display_name, role, active, created_at, player_id FROM users ORDER BY id");
        return file(JSON.stringify({ app: "B\xF6teskassan 26/27", exported_at: (/* @__PURE__ */ new Date()).toISOString(), data: dump }, null, 2), `boteskassan-backup-${L.todayStr()}.json`, "application/json; charset=utf-8");
      }
      O.fail("Ok\xE4nd export.", 404);
    });
    async function handle2(request, { ip = "" } = {}) {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      if (!url.pathname.startsWith("/api/")) return json({ error: "Ok\xE4nd adress." }, 404);
      if (!["GET", "HEAD"].includes(method) && request.headers.get("x-requested-with") !== "boteskassan") return json({ error: "Ogiltig f\xF6rfr\xE5gan." }, 403);
      let r;
      let params = {};
      for (const x of routes) {
        if (x.method !== method) continue;
        const m = url.pathname.match(x.re);
        if (m) {
          r = x;
          x.keys.forEach((k, i) => {
            params[k] = decodeURIComponent(m[i + 1]);
          });
          break;
        }
      }
      if (!r) return json({ error: "Ok\xE4nd adress." }, 404);
      try {
        const db = getDb();
        const user = await userFromToken(db, readCookie(request));
        if (r.level !== "public" && !user) return json({ error: "Du m\xE5ste logga in." }, 401);
        if (r.level === "admin" && user.role !== "admin") return json({ error: user.role === "player" ? "Spelarkonton kan l\xE4sa och anm\xE4la b\xF6ter men inte \xE4ndra uppgifter." : "Du har l\xE4sbeh\xF6righet och kan inte \xE4ndra uppgifter." }, 403);
        if (r.level === "player" && user.role !== "player") return json({ error: "Det h\xE4r kan bara g\xF6ras med ett spelarkonto." }, 403);
        if (r.level === "payments" && !canRegisterPayments(user)) return json({ error: "Du har inte beh\xF6righet att registrera betalningar." }, 403);
        let body = {};
        if (!["GET", "HEAD", "DELETE"].includes(method)) {
          const text = await request.text();
          if (text.length > 5e5) return json({ error: "F\xF6r stor f\xF6rfr\xE5gan." }, 413);
          if (text) {
            try {
              body = JSON.parse(text);
            } catch {
              return json({ error: "Ogiltig JSON." }, 400);
            }
          }
          if (!body || typeof body !== "object") body = {};
        }
        const out = await r.fn({ db, user, body, params, query: url.searchParams, request, ip });
        return out instanceof Response ? out : json(out === void 0 ? ok : out);
      } catch (e) {
        if (e instanceof O.AppError) return json({ error: e.message, code: e.code }, e.status);
        console.error(e);
        return json({ error: "Ett ov\xE4ntat fel uppstod. Inget har sparats." }, 500);
      }
    }
    async function bootstrapAdmin() {
      const u = process.env.ADMIN_USERNAME;
      const p = process.env.ADMIN_PASSWORD;
      if (!u || !p) return;
      await tx(async (t) => {
        if (await t.get("SELECT 1 AS x FROM users LIMIT 1")) return;
        await t.run("INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?,?,?,'admin',?)", u, u, hashPassword(p), (/* @__PURE__ */ new Date()).toISOString());
      });
    }
    module.exports = { handle: handle2, bootstrapAdmin };
  }
});

// netlify/src/api.mjs
var import_app = __toESM(require_app(), 1);
var { handle } = import_app.default;
var api_default = async (request, context) => handle(request, { ip: context.ip || "" });
export const config = { path: "/api/*" };
export {
  api_default as default
};
/*! Bundled license information:

@neondatabase/serverless/index.js:
  (*! Bundled license information:
  
  ieee754/index.js:
    (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)
  
  buffer/index.js:
    (*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <https://feross.org>
     * @license  MIT
     *)
  *)
*/
