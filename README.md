# Anchor.js

Anchor.js enables (express inspired) middleware function attached to Javascript prototype and instance.
This leverages multi-tier, evented, encapsulated, callback 'nightmare' suppressing architecture
for scaffolding asynchronous APIs.

Anchor.js also includes `params` middleware that allows optional parameters and type-checking for method arguments.

## Installation

#### Node.js

```bash
$ npm install anchorjs
```

#### Browser

Include the Anchor.js browser build in your pages.
```html
<script src="anchor.js" type="text/javascript"></script>
```
This will provide `anchor` as a global object, or `define` it if you are using AMD.

##Example

Middleware

```js
var anchor = require('anchorjs');

function Clock(){
  this._tick = 'tick';
  this._tock = 'tock';
}
anchor(Clock.prototype)
  .use(function(ctx, next){
    ctx.logs = ['clock',this._tick];
    next();
  })
  .use('tock',function(ctx, next){
    ctx.logs.push(this._tock);
    next();
  })
  .define(['tick','tock'],function(ctx, done){
    ctx.logs.push('done');
    done(null, ctx.logs);
  });

var clock1 = new Clock();
var clock2 = new Clock();

//middleware on prototypal instance
clock2.use('tick',function(ctx, next){
  ctx.logs.push('tick2');
  next();
});
clock2.use('tock',function(ctx, next){
  next('booooom'); //error
});

//Results
clock1.tick(console.log.bind(console)); //null [ 'clock', 'tick', 'done' ]
clock1.tock(console.log.bind(console)); //null ['clock','tick','tock','done']
clock2.tick(console.log.bind(console)); //null ['clock','tick','tick2','done']
clock2.tock(console.log.bind(console)); //'booooom'
```
#### Changelog

`0.2.1`
- Clean up unnecessary API methods

`0.2.0`
- ADD params parser middleware

`0.1.2`
- Simplify API
