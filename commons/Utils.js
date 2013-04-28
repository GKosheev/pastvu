var fs = require('fs'),
	Utils = new Object(null),
	_ = require('lodash');

/**
 * Проверяет на соответствие объекта типу (вместо typeof)
 * @param {string} type Имя типа.
 * @param {Object} obj Проверяемый объект.
 * @return {boolean}
 */
Utils.isType = function (type, obj) {
	return Object.prototype.toString.call(obj).slice(8, -1).toUpperCase() === type.toUpperCase();
};

Utils.randomString = (function () {
	'use strict';
	var chars = String('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz').split('');

	return function (length) {
		var str = '';

		if (!length) {
			length = Math.random() * 62 + 1 >> 0;
		}

		while (length--) {
			str += chars[Math.random() * 62 >> 0];
		}

		return str;
	};
}());

Utils.filesRecursive = function filesRecursive(files, prefix, excludeFolders, filter) {
	'use strict';
	var result = [];

	Object.keys(files).forEach(function (element, index, array) {
		if (Utils.isType('object', files[element])) {
			if (!Utils.isType('array', excludeFolders) || (Utils.isType('array', excludeFolders) && excludeFolders.indexOf(element) === -1)) {
				Array.prototype.push.apply(result, filesRecursive(files[element], prefix + element + '/', excludeFolders, filter));
			}
		} else {
			result.push(prefix + element);
		}
	});

	if (filter) {
		result = result.filter(filter);
	}

	return result;
};

Utils.math = (function () {
	'use strict';

	/**
	 * Обрезание числа с плавающей запятой до указанного количества знаков после запятой
	 * http://jsperf.com/math-round-vs-tofixed-with-decimals/2
	 * @param number Число для обрезания
	 * @param precision Точность
	 * @return {Number}
	 */
	function toPrecision(number, precision) {
		var divider = Math.pow(10, precision || 6);
		return ~~(number * divider) / divider;
	}

	/**
	 * Обрезание с округлением числа с плавающей запятой до указанного количества знаков после запятой
	 * @param number Число
	 * @param precision Точность
	 * @return {Number}
	 */
	function toPrecisionRound(number, precision) {
		var divider = Math.pow(10, precision || 6);
		return Math.round(number * divider) / divider;
	}

	return {
		toPrecision: toPrecision,
		toPrecisionRound: toPrecisionRound
	};
}());

Utils.geo = (function () {
	'use strict';

	/**
	 * Haversine formula to calculate the distance
	 * @param lat1
	 * @param lon1
	 * @param lat2
	 * @param lon2
	 * @return {Number}
	 */
	function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
		var R = 6371, // Mean radius of the earth in km
			dLat = deg2rad(lat2 - lat1), // deg2rad below
			dLon = deg2rad(lon2 - lon1),
			a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2),
			c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
			d = R * c; // Distance in km
		return d;
	}

	function deg2rad(deg) {
		return deg * (Math.PI / 180);
	}

	function geoToPrecision(geo, precision) {
		_.forEach(geo, function (item, index, array) {
			array[index] = Utils.math.toPrecision(item, precision || 6);
		});
		return geo;
	}

	function geoToPrecisionRound(geo, precision) {
		_.forEach(geo, function (item, index, array) {
			array[index] = Utils.math.toPrecisionRound(item, precision || 6);
		});
		return geo;
	}

	return {
		getDistanceFromLatLonInKm: getDistanceFromLatLonInKm,
		deg2rad: deg2rad,
		geoToPrecision: geoToPrecision,
		geoToPrecisionRound: geoToPrecisionRound
	};
}());

Utils.presentDateStart = function () {
	var present_date = new Date();
	present_date.setHours(0);
	present_date.setMinutes(0);
	present_date.setSeconds(0);
	present_date.setMilliseconds(0);
	return present_date;
};

Utils.tomorrowDateStart = function () {
	var date = Utils.presentDateStart();
	date.setDate(date.getDate() + 1);
	return date;
};

/**
 * Adds left zero to number and rteturn string in format xx (01, 23 etc)
 * @param {number} num
 * @return {string}
 */
Utils.addLeftZero = function (num) {
	if (!num) num = 0;
	var str = '0' + num;
	return str.substr(str.length - 2, 2);
};

/**
 * List on files in folder recursive (in parallel mode)
 * @param dir Folder to search files
 * @param done Callback function with params (err, resultArr)
 */
Utils.walkParallel = function (dir, done) {
	var results = [];
	fs.readdir(dir, function (err, list) {
		if (err) {
			return done(err);
		}
		var pending = list.length;
		if (!pending) {
			return done(null, results);
		}
		list.forEach(function (file) {
			file = dir + '/' + file;
			fs.stat(file, function (err, stat) {
				if (stat && stat.isDirectory()) {
					Utils.walkParallel(file, function (err, res) {
						results = results.concat(res);
						if (!--pending) {
							done(null, results);
						}
					});
				} else {
					results.push(file);
					if (!--pending) {
						done(null, results);
					}
				}
			});
		});
	});
};

/**
 * List on files in folder recursive (in serial mode)
 * @param dir Folder to search files
 * @param done Callback function with params (err, resultArr)
 */
Utils.walkSerial = function (dir, done) {
	var results = [];
	fs.readdir(dir, function (err, list) {
		if (err) {
			return done(err);
		}
		var i = 0;
		(function next() {
			var file = list[i++];
			if (!file) {
				return done(null, results);
			}
			file = dir + '/' + file;
			fs.stat(file, function (err, stat) {
				if (stat && stat.isDirectory()) {
					Utils.walkSerial(file, function (err, res) {
						results = results.concat(res);
						next();
					});
				} else {
					results.push(file);
					next();
				}
			});
		})();
	});
};

/**
 * Example walkParallel
 */
/*walkParallel('./public/style', function(err, results) {
 if (err) {
 throw err;
 }
 console.log(results);
 });*/

Object.freeze(Utils);
module.exports = Utils;
