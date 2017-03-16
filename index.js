'use strict';

var path = require('path');
var Mix  = require('random-dom-mix');
/**
 * 提供给用户可配置的参数说明
 */
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
        getProcessedResult: settings.getProcessedResult,
        // 在fis中list文件路径以模块目录开始，如：widget/xx/xx
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

