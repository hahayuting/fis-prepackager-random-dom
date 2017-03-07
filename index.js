'use strict';

var path = require("path");
var Mix  = require("random-dom-mix");
/**
 * 提供给用户可配置的参数说明
 * @param  {[Array]} list      [指定进行混淆的widget下的路径，支持正则]
 * @param  {[Object]} ignore   [不进行混淆的选择器]
 *                             ignore: {
 *                                 'name': ..clearfix', '#container, //可包含类名和id名
 *                                 'classReg': [/^global-.+/]
 *                             }
 * @param  {[Array]} onlyMixClass [只对指定的类名进行混淆]
 *                                onlyMixClass: .global-test', /^global-.+/]
 * @param  {[Array]} jsPrefixs       [对有特殊前缀的进行处理，因为在js中有些写法无法匹配到]
 *                                   jsPrefix: .JS-
 * @param  {[Function]} mixNameFun      [自定义类名混淆方法，选择器名称按自定义方法进行混淆]
 * @param  {[Object]} mixer          [自定义混淆逻辑]
 *                                   mixer: {
 *                                       js: [function(code){
 *                                           var map = this.map; // 混淆前后索引表, map.id, map.class
 *                                           // process
 *                                           return code;
 *                                       }],
 *                                       html: [],
 *                                       css: []
 *                                   }
 * @param  {[Object]} customMix      [指定使用自定义的字符散列规则mixNameFun进行混淆处理的]
 *                                   customMix: {
 *                                       name: .module-test', /^frame-.+/],
 *                                       path: [/\/test\/.*test.(css|js)/i]
 *                                   }
 * @param  {[Object]} getProcessedResult      [获取处理结果]
 *                                   functon (map, customMap) {
 *                                       // map.id, map.class
 *                                       // customMap.id, customMap,class
 *                                   }
 *                                   
 */
var exports = module.exports = function(ret, conf, settings, opt) {
    //混淆指定组件
    // for(var i = 0; i < list.length; i++){
    //     var mix = new Mix({
    //         'res'   : ids,
    //         'path'  : list[i],
    //         'ignore': settings.ignore || {},
    //         'onlyMixClass': settings.onlyMixClass || [],
    //         'jsPrefixs': settings.jsPrefix || [],
    //         'mixNameFun': settings.mixNameFun,
    //         'customMix': settings.customMix || {},
    //         'mixer' : settings.mixer || [],
    //         getProcessedResult: settings.getProcessedResult
    //     });
    // }
    var list = settings.list;
    if (!list) {
        console.log('if you wanna do the Mix thing, [list] is required as parameter');
        return;
    }
    // 处理的文件内容分为两种：
    // 一种是经过打包工具处理过的文件资源对象
    // 一种是原生的本地文件资源，
    // 因为编译过程不可能直接修改本地文件，所以不支持第二种，但如果有这种需求可以自己构造resource,和list
    var options = {
        // 以下是处理过程中需要的判断参数
        ignore: settings.ignore || {},
        onlyMixClass: settings.onlyMixClass || [],
        jsPrefixs: settings.jsPrefix || [],
        mixNameFun: settings.mixNameFun,
        customMix: settings.customMix || {},
        mixer: settings.mixer || [],
        getProcessedResult: settings.getProcessedResult,
        // 以下是处理的文件用的判断
        // 在fis中list文件路径以模块目录开始，如：widget/xx/xx
        list: list,
        // 以下是传入的跟打包工具相关的处理参数
        // 文件资源对象
        resource: ret.ids || {},
        // 如果不传入这个，则默认是使用resource对象的key值作为文件标志(即文件名)
        pathKey: 'realpath',
        // 单文件资源对象，因为不同打包处理工具的文件资源对象数据格式不同，所以由具体插件编写者来定义。
        // 这里先作为纪录－ 
        // fis - ret.id[fileKey] = {};  
        //  -- example: ret.id[moduleName:widget/xx/xx.js] = {realpath: Document/moduleName/widget/xx/xx.js, _content: xxxxxbbbsdfasf}
        // webpack - compilation.assets[filename] = source;
        //  -- example: compilation.assets[filename] = source;
        getFileContent: function (fileItem) {
            return fileItem._content;
        },
        setFileContent: function (fileItem, data) {
            // console.log(fileItem.realpath);
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

