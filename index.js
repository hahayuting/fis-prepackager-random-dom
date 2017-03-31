'use strict';

var path = require('path');
var Mix  = require('random-dom-mix');

var exports = module.exports = function(ret, conf, settings, opt) {
    var list = settings.list;
    if (!list) {
        console.log('if you wanna do the Mix thing, [list] is required as parameter');
        return;
    }
    var options = {
        ignore: settings.ignore || {},
        onlyMixClass: settings.onlyMixClass || [],
        jsPrefix: settings.jsPrefix || [],
        mixNameFun: settings.mixNameFun,
        customMix: settings.customMix || {},
        mixAttr: settings.mixAttr,
        mixer: settings.mixer || [],
        getProcessedResult: function (map, customMap) {
            if (typeof settings.getProcessedResult === 'function') {
                settings.getProcessedResult(ret, map, customMap);
            }
        },
        list: list,
        resource: ret.ids || {},
        pathKey: 'realpath',
        getFileContent: function (fileItem) {
            return fileItem._content;
        },
        setFileContent: function (fileItem, data) {
            fileItem._content = data;
        }
    };
    if (list instanceof Array) {
        new Mix(options);
    }
    else if (typeof list === 'object') {
        for (var groupItem in list) {
            if (list.hasOwnProperty(groupItem)) {
                options.list = list[groupItem];
                new Mix(options);
            }
        }
    }
};

