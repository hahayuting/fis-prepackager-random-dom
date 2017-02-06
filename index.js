'use strict';

var path = require("path");
var Mix  = require("./lib/mix");
/**
 * [settings description 提供给用户可配置的参数说明]
 * @param  {[Array]} list      [指定进行混淆的widget下的路径，支持正则]
 * @param  {[Object]} ignore   [不进行混淆的选择器]
 *                    ignore: {
 *                        'name': ['.clearfix', '#container'], //可包含类名和id名
 *                        'classReg': [/^global-.+/]
 *                    }
 * @param  {[Array]} onlyMixClass [只对指定的类名进行混淆]
 *                  onlyMixClass: ['global-test', /^global-.+/]
 * @param  {[Array]} jsPrefixs       [对有特殊前缀的进行处理，因为在js中有些写法无法匹配到]
 *                   jsPrefix: ['JS-']
 * @param  {[Function]} mixNameFun      [自定义类名混淆方法，选择器名称按自定义方法进行混淆]
 * @param  {[Object]} mixer          [自定义混淆逻辑]
 *                  mixer: {
 *                      js: [function(code){
 *                              var map = this.map; // 混淆前后索引表, map.id, map.class
 *                              // process
 *                              return code;
 *                          }],
 *                      html: [],
 *                      css: []
 *                  }
 * @param  {[Object]} customMix      [指定使用自定义的字符散列规则mixNameFun进行混淆处理的]
 *                  customMix: {
 *                      name: ['module-test', /^frame-.+/],
 *                      path: [/\/test\/.*test.(css|js)/i]
 *                  }
 */
var exports = module.exports = function(ret, conf, settings, opt) {
    var ids         = ret.ids || {};
    var list        = settings['list']  || [];

    //混淆指定组件
    for(var i = 0; i < list.length; i++){
        var mix = new Mix({
            'res'   : ids,
            'path'  : list[i],
            'ignore': settings['ignore'] || {},
            'onlyMixClass': settings['onlyMixClass'] || [],
            'jsPrefixs': settings['jsPrefix'] || [],
            'mixNameFun': settings['mixNameFun'],
            'customMix': settings['customMix'] || {},
            'mixer' : settings['mixer'] || []
        });
    }
};

