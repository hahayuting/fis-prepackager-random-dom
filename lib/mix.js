'use strict';

/**
 * 获取随机长度的字符串
 * @param  {[type]} len [description]
 * @return {[type]}     [description]
 */
function getRandomStr(len) {
    var str = '';
    len = len || 5;
    for (var i = 0; i < len; i++) {
        str+= String.fromCharCode(Math.floor( Math.random() * 26) + 'a'.charCodeAt(0));
    }
    return str;
};

var css_parser = require("css-parse");
var Hashids = require('hashids');
var hashids = new Hashids(getRandomStr(), 4);

/**
 * 混淆类
 * @param {[type]} args [description]
 */
var Mix = function (args){
    //选择器混淆前后map表
    this.map = {
        'id'    : {},
        'class' : {}
    };
    // 用户自定义的混淆map表
    this.customMap = {
        'id': {},
        'class': {},
        'attr': {}
    };
    // ignore classes
    this.ignoreClasses = ['clearfix','cbg-ads'];
    // ignore ids
    this.ignoreIds = [];
    // token counter
    this.mapCounter = -1;
    //组件内文件列表
    this.files = {};
    this.currentFile = null;
    //自定义混淆器, 自定义混淆的处理函数
    this.mixer = {
        'js'   : [],
        'html' : [],
        'css'  : []
    };
    // 固定方式混淆
    this.customMix = {
        'name': [],
        'path': []
    };

    // 处理用户的配置文件
    // 处理的文件路径，支持正则
    this.path = args['path'];
    // set the ignore maps for Ids and Classes
    this.ignore = args['ignore'].name || [];
    this.ignoreClassRegs = args['ignore'].classReg || [];
    this.mixNameFun = args['mixNameFun'] || null;
    this.jsPrefixs = args['jsPrefixs'] || [];
    this.getProcessedResult = args['getProcessedResult'] || null;

    this.mixClass = [];
    this.mixClassReg = [];

    //初始化运行
    if (args) {
        this.init(args);
        this.run();
        if (this.getProcessedResult != null && typeof this.getProcessedResult === 'function') {
            this.getProcessedResult.call(this, this.map, this.customMap);
        }
    }
};

/**
 * 初始化参数
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 */
Mix.prototype.init = function (args) {
    var that = this;
    fis.util.map(this.ignore, function (id, ign) {
        ign = ign.replace(/\s/,'');
        if (ign.indexOf('.') === 0) that.ignoreClasses.push(ign.replace('.', ''));
        if (ign.indexOf('#') === 0) that.ignoreIds.push(ign.replace('#', ''));
    });

    //读取组件内所有文件
    if(that.path && args.res){
        fis.util.map(args.res, function (id, file) {
            if (typeof that.path === 'string') {
                if(file.subpath.indexOf(that.path) > -1){
                    that.files[id] = file;
                }
            }
            else if (that.path instanceof RegExp) {
                if (that.path.test(file.subpath)) {
                    that.files[id] = file;
                }
            }
        });
    }
    // 指定只混淆的类名处理
    if (args['onlyMixClass'] && args['onlyMixClass'] instanceof Array) {
        args['onlyMixClass'].forEach(function (onlyMixName) {
            if (onlyMixName instanceof RegExp) {
                that.mixClassReg.push(onlyMixName);
            }
            else if (typeof onlyMixName === 'string'){
                that.mixClass.push(onlyMixName);
            }
        });
    }
    //自定义混淆项处理
    if (args['customMix']) {
        fis.util.map(this.customMix,function (key, value){
            var customMix = args['customMix'];
            if (customMix[key] != null && customMix[key] instanceof Array) {
                that.customMix[key] = customMix[key];
            }
        })
    }

    //自定义混淆方法处理
    if (args['mixer']) {
        fis.util.map(args['mixer'],function (type,mixers){
            mixers.forEach(function (mixer) {
                if (typeof mixer == 'function'){
                    that.addCustomMixer(type,mixer);
                }
            });
        })
    }
};


/**
 * 添加自定义混淆
 * @param {[type]}   type [description]
 * @param {Function} cb   [description]
 */
Mix.prototype.addCustomMixer = function (type, cb) {
    if (typeof cb == 'function' && this.mixer[type]) {
        this.mixer[type].push(cb);
    }
};

/**
 * 执行混淆操作入口
 */
Mix.prototype.run = function () {
    this.parserFiles();
    this.mixFiles();
};

/**
 * 解析组件内所有css的待混淆的选择器
 */
Mix.prototype.parserFiles = function (){
    var that = this;
    var files = that.files;
    //处理所有css
    fis.util.map(files, function (id, file) {
        that.currentFile = file;
        if (file.isCssLike) {
            that.parseCss(file.getContent());
        } else if (file.isHtmlLike) {
            that.parseHtml(file.getContent());
        }
    })
};


/**
 * 混淆指定文件
 */
Mix.prototype.mixFiles = function (){
    var that  = this;
    var files = that.files;
    //处理所有css
    fis.util.map(files,function (id,file){
        if (file.isCssLike) {
            that.mixCss(file);
        } else if(file.isHtmlLike) {
            that.mixHtml(file);
        } else if(file.isJsLike) {
            that.mixJs(file);
        }
    });
};

/**
 * 解析css文件
 * @param  {[type]}
 * @return {[type]}
 */
Mix.prototype.parseCss = function (css) {
    var that = this;
    var css = css_parser(css);
    var styles = [];

    fis.util.map(css.stylesheet.rules, function (i, style) {
        if (style.media) {
            styles = styles.concat(style.rules);
        }
        if (style.selectors) {
            styles.push(css.stylesheet.rules[i]);
        }
    });

    fis.util.map(styles, function (o, style) {
        style.selectors.forEach(function (selector) {
            that.parseCssSelector(selector);
        });
    });
    this.styles = styles;
};

/**
 * 解析html/tpl文件中的css片段
 * @param  {[type]}
 * @return {[type]}
 */
Mix.prototype.parseHtml = function (html){
    //支持<style> <%style%> {%style%} 三种格式
    var re = /(<|{%|<%)style.*(%}|%>|>)([\s\S]*?)(<|{%|<%)\/style(%}|%>|>)/m;
    var match;
    var that = this;
    while (match = re.exec(html)) {
        that.parseCss(match[3]);
        html = html.replace(match[0],"");
    }
};

/**
 * parseCssSelector
 *
 * parse CSS strings to get their classes and ids
 *
 * @param css String the css string
 */
Mix.prototype.parseCssSelector = function (selector) {
    var that = this;
    var match = null;
    var tid = selector.match(/#[\w\-]+/gi);
    var tcl = selector.match(/\.[\w\-]+/gi);

    if (tid) {
        tid.forEach(function (match) {
            var id = match.replace('#', '');
            that.setMixStr(id, 'id');
        });
    }
    if (tcl) {
        tcl.forEach(function (match) {
            var cl = match.replace('.', '');
            that.setMixStr(cl, 'class');
        });
    }
};

/**
 * addCss
 *
 * adds Classes to the CLASS map
 *
 * @param cl String
 */
Mix.prototype.addClass = function (cl) {
    if (typeof cl == 'object'){
        if (cl) {
            cl.forEach(function (pass) {
                that.setMixStr(pass, 'class');
            });
        }
    } else {
        that.setMixStr(cl, 'class');
    }
};

/**
 * 匹配用户设定的自定义混淆方法的元素
 * @param  {[type]} original [description]
 * @return {[type]}          [description]
 */
Mix.prototype.checkCustomMix = function (original) {
    var that = this;
    var customMix = this.customMix;
    var flag = false;
    fis.util.map(customMix, function (key, mixArray) {
        if (key === 'name') {
            mixArray.forEach(function (mixName) {
                if (mixName instanceof RegExp) {
                    if (mixName.test(original)) {
                        flag = true;
                        return;
                    }
                }
                else if (typeof mixName === 'string'){
                    if (mixName === original) {
                        flag = true;
                    }
                }
            });
        }
        else if (key === 'path') {
            var subpath = that.currentFile.subpath;
            mixArray.forEach(function (mixRegorStr) {
                if (mixRegorStr instanceof RegExp) {
                    if (mixRegorStr.test(subpath)) {
                        flag = true;
                        return;
                    }
                } else if (typeof mixRegorStr === 'string'){
                    if (subpath.indexOf(mixRegorStr) > -1) {
                        flag = true;
                    }
                }
            });
        }
    });
    return flag;
};

/**
 * 对有特殊JS前缀的class做处理，此处为了做兼容
 * @param  {[type]} classname [description]
 * @return {[type]}           [description]
 */
Mix.prototype.processPrefix = function (original) {
    if (this.jsPrefixs.length > 0) {
        var matchPrefix;
        for (var i = 0; i < this.jsPrefixs.length; i++) {
            var reg = new RegExp('^' + this.jsPrefixs[i], 'g');
            if (reg.test(original)) {
                matchPrefix = this.jsPrefixs[i];
                break;
            }
        }
        if (matchPrefix != null) {
            return original.replace(matchPrefix, '');
        }
    }
    return original;
};

/**
 * 获取选择器混淆之后的名称
 * @param  {[type]} original [description]
 * @param  {[type]} type     [description]
 * @return {[type]}          [description]
 */
Mix.prototype.getMixStr = function (original, type) {
    if (type === 'id') {
        return this.map['id'][original];
    }
    else {
        // original = this.processPrefix(original);
        return this.map['class'][classname];
    }
};

/**
 * 对选择器进行混淆，并保存到全局变量中
 * @param {[type]} original [选择器]
 * @param {[type]} type     [类型class/id]
 */
Mix.prototype.setMixStr = function (original, type) {
    var that = this;
    // 判断名称是否可以被混淆，有指定只混淆某些，也有全部混淆
    var checkMix = function (original, type) {
        // 对id不做特殊处理
        if (type === 'id') {
            return true;
        }
        // 未设置mixClass，即未设置只处理哪些类
        if (that.mixClass.length === 0 && that.mixClassReg.length === 0) {
            return true;
        }
        // 设置了只对某些类名进行处理并且该class在list中
        else if (that.mixClass.length > 0) {
            if (that.mixClass.indexOf(original) > -1) {
                return true;
            }
            return false;
        }
        else if (that.mixClassReg.length > 0) {
            var flag = false;
            for (var i = 0; i < this.mixClassReg.length; i++) {
                if (this.mixClassReg[i].test(original)) {
                    flag = true;
                    break;
                }
            }
            return flag;
        }
        return false;
    };
    // 对有特殊JS前缀的做处理
    var prefixOriginal = this.processPrefix(original);
    if (checkMix(prefixOriginal, type)) {
        //忽略class
        if (!that.isIgnored(original, type) && !that.map[type][original]) {
            this.mapCounter++;
            var mixStr;
            var isCustom = false;
            // 以去掉前缀的className作为混淆的字符，为了做兼容
            // 即map['class']['JS-test'] === map['class']['test'],并都是以test为key去做md5
            if (original != null && typeof this.mixNameFun === 'function') {
                if (this.checkCustomMix(prefixOriginal)) {
                    mixStr = this.mixNameFun.call(this, prefixOriginal);
                    isCustom = true;
                }
            }
            mixStr = mixStr ? mixStr
                : (prefixOriginal != null && this.map[type][prefixOriginal] != null)
                    ? this.map[type][prefixOriginal] : getRandomStr(2) + hashids.encode(this.mapCounter);
            if (isCustom) {
                this.customMap[type][original] = mixStr;
            }
            this.map[type][original] = mixStr;
            return mixStr;
        }
        else if (that.map[type][original]) {
            return that.map[type][original];
        }
        return original;
    }
    return original;
};

/**
 * 判断选择器是否被设置为忽略
 * @param  {[type]}  name [description]
 * @param  {[type]}  type [class/id]
 * @return {Boolean}      [description]
 */
Mix.prototype.isIgnored = function (name, type) {
    if (type === 'id') {
        if (this.ignoreIds.indexOf(name) > -1) {
            return true;
        }
    }
    else {
        var ignoreClasses = this.ignoreClasses;
        var flag = false;
        if (ignoreClasses.indexOf(name) > -1) {
            return true;
        }
        for (var i = 0; i < this.ignoreClassRegs.length; i++) {
            if (this.ignoreClassRegs[i].test(name)) {
                flag = true;
                break;
            }
        }
        return flag;
    }
    return false;
};

/**
 * 根据map表计算混淆后的样式
 * @param  {[type]} css [description]
 * @return {[type]}     [description]
 */
Mix.prototype.getMixCssString = function (css) {
    var that = this;
    var text = css;
    var styles = this.styles;
    css = css_parser(text);

    // custom parsers
    if (this.mixer.css.length > 0) {
        this.mixer.css.forEach(function (cb) {
            text = cb.call(that, text);
        });
    }

    // fis.util.map(css.stylesheet.rules, function (i, style) {
    //     if(style.media) {
    //         styles = styles.concat(style.rules);
    //     }

    //     if(style.selectors){
    //         styles.push(css.stylesheet.rules[i]);
    //     }
    // })

    fis.util.map(styles, function (u, style) {
        style.selectors.forEach(function (selector) {
            var original = selector;
            var tid = selector.match(/#[\w\-]+/gi);
            var tcl = selector.match(/\.[\w\-]+/gi);

            if (tid) {
                fis.util.map(tid, function (i, match) {
                    match = match.replace('#', '');
                    if (that.map["id"][match]) {
                        selector = selector.replace(new RegExp("#" + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '#' + that.map["id"][match]);
                    }
                })
            }
            if (tcl) {
                var countList = {};
                fis.util.map(tcl, function (o, match) {
                    match = match.replace('.', '');
                    if (that.map["class"][match]) {
                        selector = selector.replace(new RegExp("\\." + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "i"), '.' + that.map["class"][match]);
                    }
                });
            }

            text = text.replace(original, selector);
        })
    })


    return text;
};

/**
 * 获取混淆后的js代码
 * @param  {[type]} js [description]
 * @return {[type]}    [description]
 */
Mix.prototype.getMixJsString = function (js){
    var  that = this,
        match = null;

    // custom parsers
    if (this.mixer.js.length > 0) {
        this.mixer.js.forEach(function (cb) {
            js = cb.call(that, js);
        });
    }

    //js getElementsByClassName、getElementById
    var parser_1 = /(getElementsByClassName|getElementById)\(\s*[\'"](.*?)[\'"]/gi;
    while ((match = parser_1.exec(js)) !== null) {
        var type = match[1].indexOf("Class") > -1 ? "class" : "id";
        var name = match[2].trim();
        if(that.map[type][name]){
            var passed = match[0].replace(new RegExp(match[2], "gi"), that.map[type][name]);
            js = js.replace(match[0], passed);
        }
        else if (!that.isIgnored(name)) {
            var passed = match[0].replace(new RegExp(match[2], "gi"), that.setMixStr(name, 'class'));
            js = js.replace(match[0], passed);
        }

    }

    //js setAttribute id class
    var parser_2 = /(setAttribute|attr)\(\s*[\'"](id|class)[\'"],\s*[\'"](.+?)[\'"]/gi;
    while ((match = parser_2.exec(js)) !== null) {
        var key = (match[2] == 'id') ? 'id': 'class';
        // var passed = match[0];
        var replacedStr = match[0];
        if (key == 'class') {
            var splitd = match[3].split(/\s+/);
            replacedStr = 'attr(\'class\', \'';
            fis.util.map(splitd, function (i, cls) {
                if (cls.length === 0) {
                    replacedStr += ' ';
                    return;
                }
                if (that.map[key][cls]){
                    replacedStr += that.map[key][cls];
                }
                else if (!that.isIgnored(cls)) {
                    replacedStr += that.setMixStr(cls, 'class');
                }
                replacedStr += ' ';
            });
            replacedStr = replacedStr.slice(0, -1);
            replacedStr += '\'';
        }else if(that.ignoreIds.indexOf(match[3]) < 0 &&
            that.map[key][match[3]]){
            var replacedStr = 'attr(\'id\', \'' + that.map[key][match[3]] + '\'';
        }
        js = js.replace(match[0], replacedStr);
    }

    //jquery $("selector") 注意带.或#前缀
    // 适应find('.test img');   '.thumb[_src]'等写法
    var parser_3 =  /[\'"](([.#][^.#\[\]\'"]+?)+[^\'"]*?)[\'"]/gi;
    while ((match = parser_3.exec(js)) !== null) {
        //如果路径字符串不处理
        if(match[1].indexOf("/") > -1){
            continue;
        }
        var matchList = match[1].split(/\s+/);
        var passed = match[0];
        fis.util.map(matchList, function (i, preMatchStr) {
            var subParser = /[.#]([^.#\[\]]+)/gi;
            if (subParser.test(preMatchStr)) {
                var matchStr = preMatchStr.match(subParser)[0];
                if (matchStr.length > 0 && matchStr.slice(1).length > 0) {
                    if (matchStr.indexOf('#') > -1) {
                        matchStr = matchStr.slice(1);
                        if (that.map.id[matchStr]) {
                            passed = passed.replace('#' + matchStr, '#' + that.map.id[matchStr]);
                        }
                    }
                    else if (matchStr.indexOf('.') > -1) {
                        matchStr = matchStr.slice(1);
                        if (that.map.class[matchStr]){
                            passed = passed.replace('.' + matchStr, '.' + that.map.class[matchStr]);
                        }
                        else if (!that.isIgnored(matchStr)) {
                            passed = passed.replace('.' + matchStr, '.' + that.setMixStr(matchStr, 'class'));
                        }
                    }
                }
            }
        });
        js = js.replace(match[0], passed);
    }

    //jquery add/remove class
    var parser_4 = /(addClass|removeClass|hasClass|toggleClass)\([\'"](.*?)[\'"]/gi;
    while ((match = parser_4.exec(js)) !== null) {
        var passed = match[0];
        var splitd = match[2].trim().split(/\s+/);
        fis.util.map(splitd, function (i, cls) {
            if (that.map.class[cls]){
                passed = passed.replace(new RegExp(cls, "gi"), that.map.class[cls]);
            }
            else if (!that.isIgnored(cls)) {
                passed = passed.replace(new RegExp(cls, "gi"), that.setMixStr(cls, 'class'));
            }
        });
        js = js.replace(match[0], passed);
    }

    //tpl class － 但会影响子类的模块名功能
    var parser_5 = /class\=\"(.[^+\<\{]+?)\"/g;
    var matchList = js.match(parser_5);
    js = js.replace(parser_5, function (a, b) {
        var matchList = b.split(/\s+/);
        var replacedStr = 'class="';
        fis.util.map(matchList, function (i, cls) {
            if (that.map.class[cls]){
                replacedStr += that.map.class[cls] + ' ';
            }
            else if (!that.isIgnored(cls)) {
                replacedStr += that.setMixStr(cls, 'class') + ' ';
            }
            else {
                replacedStr += cls + ' ';
            }
        });
        replacedStr = ' ' + replacedStr.trim() + '"';
        return replacedStr;
    });

    if (this.jsPrefixs.length > 0) {
        for (var i = 0; i < this.jsPrefixs.length; i++) {
            var reg = new RegExp('(' + this.jsPrefixs[i] + '.*?)[\'\"\\s]', 'g');
            js = js.replace(reg, function (a, b) {
                var otherStr = '';
                var replacedStr = '';
                var cls = b;
                if (new RegExp(b + '.+').test(a)) {
                    otherStr = a.replace(b, '');
                }
                if (that.map.class[cls]){
                    replacedStr += that.map.class[cls];
                }
                else if (!that.isIgnored(cls)) {
                    replacedStr += that.setMixStr(cls, 'class');
                }
                else {
                    replacedStr += cls;
                }
                replacedStr += otherStr;
                return replacedStr;
            });
        }
    }

    return js;
};

/**
 * 混淆css
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
Mix.prototype.mixCss = function (file) {
    var content = this.getMixCssString(file.getContent());
    file.setContent(content);
};


/**
 * 混淆Js的选择器
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
Mix.prototype.mixJs = function (file) {
    var content = this.getMixJsString(file.getContent());
    file.setContent(content);
};


/**
 * 混淆html页面中的css和js区块
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
Mix.prototype.mixCssJsBlock = function (file){
    var re = /(<|{%|<%)(style|script).*(%}|%>|>)([\s\S]*?)(<|{%|<%)\/(style|script)(%}|%>|>)/m;
    var match;
    var that = this;
    var html = file.getContent();
    var codes = {};
    var count = 0;
    while (match = re.exec(html)) {
        count++;
        var type = match[2].trim();
        var innerCode = match[4];
        var text = type == "style" ? that.getMixCssString(innerCode)
                        : that.getMixJsString(innerCode);
        var flag = "ad_mix_" + type + "_" + count;
        html = html.replace(match[0],"<!--"+ flag +"-->");
        codes[flag] = match[0].replace(innerCode,text);
    }

    fis.util.map(codes,function (flag,code){
        html = html.replace("<!--" + flag + "-->",code);
    });

    file.setContent(html);
};



/**
 * 混淆Html
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
Mix.prototype.mixHtml = function (file) {
    var that = this;
    //混淆 js css 区块
    this.mixCssJsBlock(file);

    //混淆html中的样式选择器
    //只处理html中的id 和 class属性
    var html = file.getContent();
    var re = /\s+(id|class)\s*=\s*[\'"](.*?)[\'"]/gi;

    // custom parsers
    if (this.mixer.html.length > 0) {
        this.mixer.html.forEach(function (cb) {
            html = cb.call(that, html);
        });
    }
    
    var parseHtml = function (str, cls, mixedCls) {
        var parsedStr = '';
        var reg = new RegExp('[\"\'\\s]' + cls);
        str = str.replace(reg, function (a, b) {
            var otherStr = a.replace(cls, '');
            return otherStr + mixedCls;
        });
        return str;
    };

    html = html.replace(re,function (origin,type,selector){
        var splitd = selector.trim().split(/\s+/);
        var passed = origin;
        fis.util.map(splitd, function (i, cls) {
            if (that.map[type][cls]){
                passed = parseHtml(passed, cls, that.map[type][cls]);
            }
            else if (!that.isIgnored(cls)) {
                passed = parseHtml(passed, cls, that.setMixStr(cls, type));
            }
        });
        return passed;
    });


    file.setContent(html);
};

module.exports  = Mix;
