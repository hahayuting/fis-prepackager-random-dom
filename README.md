组件样式混淆插件
==========================================

通过分析组件widget代码，根据用户配置自动混淆组件所有相关选择器名称，包括类html、css和js文件的自动混淆，支持多种过滤形式和自定义混淆处理。

**注意:**
 - 使用前请自行保证css模块化，混淆的组件选择器不能被其他组件所调用(因为只混淆当前组件内的代码)
 - 由于混淆范围大，请务必在指定组件内谨慎使用！如果JS中混淆不充分请设置自定义混淆处理
 - 如果在fis中使用，请注意需要混淆的文件是否设置了isHtmlLike、isCssLike、isJsLike属性

## 使用方法
### 安装
执行`npm install -g fis-prepackager-random-dom`安装插件

### 配置
**FIS2:**
```javascript
// vi fis-conf.js
fis.config.merge({
    modules: {
        prepackager: 'random-dom'
    },
    settings: {
        prepackager: {
            'random-dom':  {
                ignore: { //不进行混淆的选择器
                    name: ['.clearfix', '#container']
                },
                list: [ //需要混淆的组件，相对模块根目录路径，支持正则
                    'widget/test'
                ]
            }
        }
    }
});
```

注意：如果您已使用其他prepackager插件，请在已有地方添加random-dom,逗号隔开

**FIS3:**
```javascript
// vi fis-conf.js

fis.match("::package",{
    prepackager : fis.plugin('random-dom',{
        ignore: { //不进行混淆的选择器
            name: ['.clearfix', '#container']
        },
        list: [ //需要混淆的组件，相对模块根目录路径
          'widget/slogan'
        ],
        //自定义混淆处理
        mix : {}
    })
})
```

### 可配置参数详细说明
 - list : 指定进行混淆的widget下的路径，支持正则
 - ignore : 不进行混淆的选择器
```javascript
    ignore: {
        'name': ['.clearfix', '#container'], //可包含类名和id名
        'classReg': [/^global-.+/]
    }
```
 - onlyMixClass : 只对指定的类名进行混淆
```javascript
    onlyMixClass: ['global-test', /^global-.+/]
```
 - jsPrefixs : 对有特殊前缀的字符进行混淆，因为在js中有些写法无法匹配到，以此标志进行识别
```javascript
    jsPrefix: ['JS-']
```
 - mixNameFun : 自定义类名混淆方法，选择器名称按自定义方法进行混淆
```javascript
    mixNameFun: function (input) {
        return md5_test(input);
    }
```
 - mixer : 自定义混淆逻辑
```javascript
    mixer: {
        js: [function(code){
              var map = this.map; // 混淆前后索引表, map.id, map.class
              // process
              return code;
          }],
        html: [],
        css: []
    }
```
 - customMix : 指定使用自定义的字符散列规则mixNameFun进行混淆处理的,都支持正则
```javascript
    customMix: {
        name: ['module-test', /^frame-.+/],
        path: [/\/test\/.*test.(css|js)/i]
    }
```
 - getProcessedResult : 获取处理结果，可用于调试校验。对于处理结果比较多的，建议单个组件进行调试。
```javascript
    getProcessedResult: function (map, customMap) {
        console.log(map.id, map.class);
        console.log(customMap.id, customMap.class);
    }
```

### 使用效果

#### 自动获取组件内所有css文件和模板内嵌css选择器，生成hash值进行混淆处理

每次编译都重新生成一遍

**开发时:**

```css
/*css文件*/
#slogan {
    position: relative;
}
```

```html
<!-- isHtmlLike 的文件 -->
//默认支持html style和smarty {%style%}、<%style%>标签
<style>
    .style_test a{
        color:black;
    }
</style>

```

**编译后:**

```css
/*css文件*/
#llM67m {
    position: relative;
}
```

```html
<!-- isHtmlLike 的文件 -->
<style>
    .aiMy8D a{
        color:black;
    }
</style>

```

#### 自动替换模板文件中的样式选择器(id|class="xxx")

**开发时:**

```html
<section class="section ignore_class" id='slogan'>
</section>

```

**编译后:**


```html
<section class="zhDXWk ignore_class"  id='zhDXWk'>
</section>

```

#### 自动替换JS代码中的选择器或class名称

 - 替换原生JS中getElementsByClassName、getElementById、setAttribute中的 class/id
 - 替换 css3选择器字符串 .class #id
 - 替换 jquery (add|remove|has|toggle)Class对应的一个或多个class
 - 支持自定义js前缀匹配
 - 支持自定义混淆逻辑


**开发时:**

```javascript
    var a = document.getElementsByClassName("style_test");
    var b = $(".style_test");
    b.addClass("style_test style_test2");
    // 配置的jsPrefix: ['JS-']
    var className1 = 'JS-test1';
    var className2 = className1 + ' JS-test2';
    b.html('<div class="' + className2 + '">');
```

**编译后:**

```javascript
    var a = document.getElementsByClassName("cakPrn");
    var b = $(".cakPrn");
    b.addClass("cakPrn cakPrn2");
    var className1 = 'erd9erP';
    var className2 = className1 + 'Mdr3er2';
    b.html('<div class="' + className2 + '">');
```

## 测试

```
cd test/moduleA
fis release -d output
```
