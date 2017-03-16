选择器混淆插件
==========================================

根据用户配置自动混淆代码中的选择器名称，包括类html、css和js文件的自动混淆，支持多种过滤形式和自定义混淆处理。

**注意:**
 - 使用前请自行保证css模块化，跨模块使用同一选择器需要自行处理。
 - 可在整个模块内使用，建议先单个组件进行调试
 - 如果在fis中使用，请注意需要混淆的文件是否设置了isHtmlLike、isCssLike、isJsLike属性

## 使用方法
### 安装
执行`npm install -g fis-prepackager-random-dom`安装插件

### 配置
**FIS2:**
```javascript
// vi fis-conf.js
// 加此判断条件，可以方便两种模式切换（后面`测试`中会写如何使用，可不加）
if (!/.*nomix.*/.test(process.title)) {

    fis.config.merge({
        modules: {
            prepackager: 'random-dom'
        },
        settings: {
            prepackager: {
                'random-dom':  {
                    // 不进行混淆的选择器
                    ignore: {
                        name: ['.clearfix', '#container']
                    },
                    // 需要混淆的组件，相对模块根目录路径，支持正则
                    list: [
                        'widget/test',
                        /static\/(js|css)/
                    ]
                }
            }
        }
    });
}
```

注意：如果您已使用其他prepackager插件，请在已有地方添加random-dom,逗号隔开
```javascript
    // 可以这样写～
    fis.config.set('modules.prepackager', fis.config.get('modules.prepackager') + ',random-dom');
```

**FIS3:**
```javascript
// vi fis-conf.js

fis.match('::package',{
    prepackager : fis.plugin('random-dom',{
        ignore: { //不进行混淆的选择器
            name: ['.clearfix', '#container']
        },
        list: [ //需要混淆的组件，相对模块根目录路径
          'widget/slogan'
        ],
        //自定义混淆处理
        mix : { }
    })
})
```

### 配置参数详细说明
 - list: [ ] || '' ;`必填` 指定进行混淆的widget下的路径，支持正则 
 ```javascript
    list: [
        'widget/test',
        /widget\/dialog\/.*\.js/
    ]
```
**以下是处理过程中需要的判断参数**
 - ignore: { }; 不进行混淆的选择器
```javascript
    ignore:{
        name: ['.test', '.clearfix', '#test'],
        classReg: [/^global-.+/]
    }
```
 - onlyMixClass: [ ] ; 只对指定的类名进行混淆
```javascript
    onlyMixClass: ['module-test', /^module-.+/]
```
 - jsPrefix: [ ] ; 对有特殊前缀的进行处理，因为在js中有些写法无法匹配到，以此标志进行识别`此项需要用户排查代码添加前缀`
```javascript
    jsPrefix:['JS-']
```
 - randomStrLen: Number; 被混淆后的随机字符串的长度，不填默认为6位
 - randdomStrMaxLen: Number; 随机字符串的最大长度，用它来指定长度的变化范围[randomStrLen, randdomStrMaxLen], 不填默认8位
 - mixNameFun: Function ; 用户自定义选择器名称的混淆方法
 - customMix { }; 这里设置的选择器才会被mixNameFun进行混淆处理，支持正则
```javascript
    customMix: {
        name: ['module-test', /^frame-.+/],
        path: [/\/test\/.*test.(css|js)/i]
    }
```
 - mixAttr: [ ]; 需要混淆的属性值。 对于自定义混淆的属性，因为属性值不涉及到跨模块使用，所以不支持ignore配置。并且只支持简单的选择器写法以及attr这种，如发现不符合要求，可自行扩展mixer。only be processed in html & js [String or Array]
```javascript
    mixAttr: ['data-id']
```
 - mixer: { }; 感觉功能无法被满足，可以自定义混淆逻辑
```javascript
    mixer: {
        js: [function(code) {
            // var map = this.map; // 混淆前后索引表, map.id, map.class
            // do the process
            return code;
        }],
        html: [ ],
        css: [ ]
    }
```
 - getProcessedResult: Function; 调试方法，获取处理结果的map表。对于处理结果比较多的，建议单个组件进行调试。
```javascript
    getProcessedResult: function (map, customMap) {
        console.log(map.id, map.class);
        console.log(customMap.id, customMap,class);
    }
```

### 使用效果

#### 自动替换模板文件中的样式选择器(id|class="xxx"), 同步替换对应css中的选择器

**开发代码：**

```html
    <style>
        #id-test {
            color: red;
        }
        .module-test {
            position: relative;
        }
    </style>
    <div class="module-test ignore-test" id="id-test"></div>
```

**编译后：**
```html
    <style>
        #dU9d2K {
            color: red;
        }
        .KD9eiR {
            position: relative;
        }
    </style>
    <div class="KD9eiR ignore-test" id="dU9d2K"></div>
```

#### 自动替换JS代码中的选择器名称
 - 自动匹配原生JS方法getElementsByClassName、getElementById、setAttribute中的class|id
 - 自动匹配jquery方法中的(add|remove|has|toggle)Class对应的一个或多个class
 - 自动匹配jquery方法中的$('')及find('')等写法中对应的一个或多个class
 - 支持自定义js前缀匹配,用于匹配无特殊标志的js写法(详见`jsPrefix`介绍)
 - 支持属性值的混淆(详见`mixAttr`介绍)
 - 支持自定义混淆逻辑(详见`mixer`介绍)

**开发代码：**

```javascript
    var a = document.getElementsByClassName('module-test');
    var b = $('.module-test2');
    b.addClass('style-test style-test2');
    // 配置的jsPrefix: ['JS-']
    var className1 = 'JS-test1';
    var className2 = className1 + ' JS-test2';
    // 可配置mixAttr: ['data-test']，来混淆属性中的值
    b.html('<div class="' + className2 + '" data-test="attr-test">');
```

**编译后:**

```javascript
    var a = document.getElementsByClassName('de93SIL');
    var b = $('.Lkj9cn');
    b.addClass('ogPy3k KSwjd9');
    // 配置的jsPrefix: ['JS-']
    var className1 = 'k8dNHG';
    var className2 = className1 + ' lcjWSo';
    // 可配置mixAttr: ['data-test']，来混淆属性中的值
    b.html('<div class="' + className2 + '" data-test="bhg7YT">');
```

### 对开发过程的影响
 - js代码中无法匹配的写法, 即没有特殊标志的需要手动添加自己在jsPrefix里配置的前缀
 ```javascript
 // 如下代码没有无法匹配到：
 var className = 'module-test';
 // 如果jsPrefix配置为'JS-',需要改写为
 var className = 'JS-module-test';
 ```
 - 代码中有设置颜色属性的，如下这种，需要自己在配置里ignore掉
 ```javascript
 $header.css('color', '#6EB562');
 // ignore的配置中需要加上
ignore: {
    name : ['#6EB562']
}
 ```
 - css注释中使用要规范，不要使用//, 应使用/**/



## 测试

```
cd test/moduleA
fis release -d output
// 如果像切换为不混淆模式，可以使用该命令行
fis release nomix -d output
```
