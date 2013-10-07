var fs = require('fs'),
	path = require('path'),
	Utils = new Object(null),
	_ = require('lodash'),
	_s = require('underscore.string');

/**
 * Проверяет на соответствие объекта типу (вместо typeof)
 * @param {string} type Имя типа.
 * @param {Object} obj Проверяемый объект.
 * @return {boolean}
 */
Utils.isType = function (type, obj) {
	return Object.prototype.toString.call(obj).slice(8, -1).toUpperCase() === type.toUpperCase();
};

/**
 * Проверяет что в объекте нет собственный свойств
 * @param {Object} obj Проверяемый объект.
 * @return {boolean}
 */
Utils.isObjectEmpty = function (obj) {
	return this.getObjectPropertyLength(obj) === 0;
};

Utils.getObjectPropertyLength = function (obj) {
	return Object.keys(obj).length;
};

Utils.dummyFn = function () {
};

Utils.randomString = (function () {
	'use strict';
	var charsAll = String('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz').split(''),
		charsLow = String('0123456789abcdefghijklmnopqrstuvwxyz').split('');

	return function (resultLen, lowOnly) {
		var chars = lowOnly ? charsLow : charsAll,
			charsLen = chars.length,
			str = '';

		if (!resultLen) {
			resultLen = Math.random() * charsLen + 1 >> 0;
		}

		while (resultLen--) {
			str += chars[Math.random() * charsLen >> 0];
		}

		return str;
	};
}());


/**
 * Асинхронный memoize с опциональным временем жизни
 * @param memoizedFunc Функция, результат которой будет запомнен
 * @param ttl Время жизни в ms
 * @returns {Function}
 */
Utils.memoizeAsync = function (memoizedFunc, ttl) {
	'use strict';

	var cache,
		waitings = []; //Массив коллбеков, которые будут наполняться пока функция работает и вызванны, после её завершения

	function memoizeHandler() {
		cache = arguments;
		for (var i = waitings.length; i--;) {
			waitings[i].apply(null, arguments);
		}
		waitings = [];
		if (ttl) {
			setTimeout(function () {
				cache = undefined;
			}, ttl);
		}
	}

	return function (cb) {
		if (cache !== undefined) {
			cb.apply(null, cache);
		} else {
			waitings.push(cb); //Сначала кладем, а потом проверяем на то что положили первый, чтобы корректно вызвалось, когда memoizedFunc выполнится мгновенно
			if (waitings.length === 1) {
				memoizedFunc(memoizeHandler);
			}
		}
	};
};

Utils.linkifyMailString = function (inputText, className) {
	var replacedText, replacePattern;
	className = className ? ' class="' + className + '"' : '';

	//Change email addresses to mailto:: links.
	replacePattern = /(\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6})/gim;
	replacedText = replacedText.replace(replacePattern, '<a href="mailto:$1"' + className + '>$1</a>');

	return replacedText;
};

Utils.linkifyUrlString = function (text, target, className) {
	var replacePattern, matches, url, i;

	target = target ? ' target="' + target + '"' : '';
	className = className ? ' class="' + className + '"' : '';

	//Используем match и вручную перебираем все совпадающие ссылки, чтобы декодировать их с decodeURI,
	//на случай, если ссылка, содержащая не аски символы, вставлена из строки браузера, вида http://ru.wikipedia.org/wiki/%D0%A1%D0%B5%D0%BA%D1%81
	//Массив совпадений делаем уникальными (uniq)

	//Starting with http://, https://, or ftp://
	replacePattern = /(\b(https?|ftp):\/\/[-A-Z0-9А-Я+&@#\/%?=~_|!:,.;]*[-A-Z0-9А-Я+&@#\/%=~_|])/gim;
	matches = _.uniq(text.match(replacePattern));
	for (i = 0; i < matches.length; i++) {
		url = decodeURI(matches[i]);
		text = text.replace(matches[i], '<a href="' + url + '"' + target + className + '>' + url + '<\/a>');
	}

	//Starting with "www." (without // before it, or it'd re-link the ones done above).
	replacePattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
	matches = _.uniq(text.match(replacePattern));
	for (i = 0; i < matches.length; i++) {
		matches[i] = _s.trim(matches[i]); //Так как в результат match попадут и переносы и пробелы (^|[^\/]), то надо их удалить
		url = decodeURI(matches[i]);
		text = text.replace(matches[i], '<a href="http:\/\/' + url + '"' + target + className + '>' + url + '<\/a>');
	}

	return text;
};
Utils.inputIncomingParse = (function () {
	var host = global.appVar && global.appVar.serverAddr && global.appVar.serverAddr.host || '',
		reversedEscapeChars = {"<": "lt", ">": "gt", "\"": "quot", "&": "amp", "'": "#39"};

	function escape(txt) {
		//Паттерн из _s.escapeHTML(result); исключая амперсант
		return txt.replace(/[<>"']/g, function (m) {
			return '&' + reversedEscapeChars[m] + ';';
		});
	}

	return function (txt) {
		var result = txt;

		result = _s.trim(result); //Обрезаем концы
		result = escape(result); //Эскейпим

		//Заменяем ссылку на фото на диез-ссылку #xxx
		//Например, http://domain.com/p/123456 -> #123456
		result = result.replace(new RegExp('(\\b)(?:https?://)?(?:www.)?' + host + '/p/(\\d{1,8})/?(?=[\\s\\)\\.,;>]|$)', 'gi'), '$1#$2');

		//Восстанавливаем внтуреннюю ссылку чтобы на следующей операции обернуть её в линк
		//Например, /u/klimashkin/photo -> http://domain.com/u/klimashkin/photo
		result = result.replace(new RegExp('(^|\\s|\\()(/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])', 'gim'), '$1' + host + '$2');

		//Все ссылки на адреса внутри портала оставляем без доменного имени, от корня, и оборачиваем в линк
		//Например, http://domain.com/u/klimashkin/photo -> /u/klimashkin/photo
		result = result.replace(new RegExp('(\\b)(?:https?://)?(?:www.)?' + host + '(/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])', 'gim'), '$1<a target="_blank" class="innerLink" href="$2">$2</a>');

		//Заменяем диез-ссылку фото #xxx на линк
		//Например, #123456 -> <a target="_blank" class="sharpPhoto" href="/p/123456">#123456</a>
		result = result.replace(/(^|\s|\()#(\d{1,8})(?=[\s\)\.\,]|$)/g, '$1<a target="_blank" class="sharpPhoto" href="/p/$2">#$2</a>');

		result = Utils.linkifyUrlString(result, '_blank'); //Оборачиваем остальные url в ahref
		result = result.replace(/\n{3,}/g, '<br><br>').replace(/\n/g, '<br>'); //Заменяем переносы на <br>
		result = _s.clean(result); //Очищаем лишние пробелы
		return result;
	};
}());

Utils.copyFile = function (source, target, cb) {
	'use strict';
	var cbCalled = false;

	var rd = fs.createReadStream(source);
	rd.on("error", function (err) {
		done(err);
	});

	var wr = fs.createWriteStream(target);
	wr.on("error", function (err) {
		done(err);
	});
	wr.on("close", function (ex) {
		done();
	});

	rd.pipe(wr);

	function done(err) {
		if (!cbCalled) {
			cb(err);
			cbCalled = true;
		}
	}
};

//Экстракт данных из курсора MongoDB-native
Utils.cursorExtract = function (err, cursor) {
	if (err || !cursor) {
		this(err || {message: 'Create cursor error', error: true});
		return;
	}
	cursor.toArray(this);
};
//Экстракт всех входящих параметров-курсоров MongoDB-native
Utils.cursorsExtract = function cursorsExtract(err) {
	if (err) {
		this({message: err && err.message, error: true});
		return;
	}

	for (var i = 1; i < arguments.length; i++) {
		arguments[i].toArray(this.parallel());
	}
};

//Проверка на валидность geo [lng, lat]
Utils.geoCheck = function (geo) {
	return Array.isArray(geo) && geo.length === 2 && (geo[0] || geo[1]) && geo[0] > -180 && geo[0] < 180 && geo[1] > -90 && geo[1] < 90;
};

//Находит свойства объекта a, значения которых не совпадают с такими свойствами объекта b
Utils.diff = function (a, b) {
	var res = {},
		i;
	for (i in a) {
		if (a[i] !== undefined && !_.isEqual(a[i], b[i])) {
			res[i] = a[i];
		}
	}
	return res;
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
	if (!num) {
		num = 0;
	}
	var str = '0' + num;
	return str.substr(str.length - 2, 2);
};

Utils.format = (function () {
	'use strict';

	function formatFileSize(bytes) {
		if (typeof bytes !== 'number') {
			return '';
		}
		if (bytes >= 1000000000) {
			return (bytes / 1000000000).toFixed(2) + 'GB';
		}
		if (bytes >= 1000000) {
			return (bytes / 1000000).toFixed(2) + 'MB';
		}
		return (bytes / 1000).toFixed(2) + 'KB';
	}

	function formatBitrate(bits) {
		if (typeof bits !== 'number') {
			return '';
		}
		if (bits >= 1000000000) {
			return (bits / 1000000000).toFixed(2) + ' Gbit/s';
		}
		if (bits >= 1000000) {
			return (bits / 1000000).toFixed(2) + ' Mbit/s';
		}
		if (bits >= 1000) {
			return (bits / 1000).toFixed(2) + ' kbit/s';
		}
		return bits.toFixed(2) + ' bit/s';
	}

	function secondsToTime(secs) {
		if (secs < 60) {
			return '0:' + (secs > 9 ? secs : '0' + secs);
		}

		var hours = (secs / (60 * 60)) >> 0,
			divisor_for_minutes = secs % (60 * 60),
			minutes = (divisor_for_minutes / 60) >> 0,
			divisor_for_seconds = divisor_for_minutes % 60,
			seconds = Math.ceil(divisor_for_seconds);

		return (hours > 0 ? hours + ':' + (minutes > 9 ? minutes : '0' + minutes) : minutes) + ':' + (seconds > 9 ? seconds : '0' + seconds);
	}

	function formatPercentage(floatValue) {
		return (floatValue * 100).toFixed(2) + ' %';
	}

	var wordEndOfNumCases = [2, 0, 1, 1, 1, 2];

	function declOfNum(number, titles) {
		return titles[ (number % 100 > 4 && number % 100 < 20) ? 2 : wordEndOfNumCases[(number % 10 < 5) ? number % 10 : 5] ];
	}

	return {
		fileSize: formatFileSize,
		bitrate: formatBitrate,
		secondsToTime: secondsToTime,
		percentage: formatPercentage,
		wordEndOfNum: declOfNum
	};
}());

Utils.filesListProcess = function filesRecursive(files, dirCutOff, prefixAdd, filter) {
	'use strict';

	var result = [],
		file,
		dirCutOffLen = dirCutOff && dirCutOff.length,
		i = files.length;

	while (i--) {
		file = files[i];

		if (dirCutOffLen && file.indexOf(dirCutOff) === 0) {
			file = file.substr(dirCutOffLen);
		}
		if (prefixAdd) {
			file = prefixAdd + file;
		}
		result.unshift(file);
	}

	if (filter) {
		result = result.filter(filter);
	}

	return result;
};

/**
 * List on files in folder recursive (in parallel mode)
 * @param dir Folder to search files
 */
Utils.walkParallel = function (dir/*, noDir, excludeFolders, done*/) {
	var done = arguments[arguments.length - 1],
		noDir = arguments.length > 2 && arguments[1],
		excludeFolders = arguments.length > 3 && arguments[2],
		checkDirsExcluding = Array.isArray(excludeFolders) && excludeFolders.length,
		results = [];

	fs.readdir(dir, function (err, list) {
		if (err) {
			return done(err);
		}
		var pending = list.length,
			checkEnd = function () {
				if (!--pending) {
					done(null, results);
				}
			};

		if (!pending) {
			return done(null, results);
		}

		list.forEach(function (file) {
			var fileFull = path.join(dir, file);

			fs.stat(fileFull, function (err, stat) {
				if (stat && stat.isDirectory()) {
					if (checkDirsExcluding && ~excludeFolders.indexOf(file)) {
						checkEnd();
					} else {
						Utils.walkParallel(fileFull, noDir, excludeFolders, function (err, res) {
							results = results.concat(res);
							checkEnd();
						});
					}
				} else {
					results.push((noDir ? file : fileFull).split(path.sep).join('/'));
					checkEnd();
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
			file = path.join(dir, file);
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
