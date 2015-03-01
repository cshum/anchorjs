(function (name, context, definition) {
  if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
    module.exports = definition();
  } else if (typeof define === 'function' && typeof define.amd  === 'object') {
    define(function () {
      return definition();
    });
  } else {
    var old = context[name];
    context[name] = definition();
    context[name].noConflict = function(){
      context[name] = old;
      return this;
    };
  }
})('ginga', this, function() {

  var is = {
    'string': function(val){
      return typeof val === 'string';
    },
    'boolean': function(val){
      return typeof val === 'boolean';
    },
    'function': function(val){
      return typeof val === 'function';
    },
    'number': function(val){
      return typeof val === 'number';
    },
    'object': function(val){
      return typeof val === 'object' && !!val;
    },
    'array': function(val){
      if(Array.isArray)
        return Array.isArray(val);
      else
        return Object.prototype.call(val) === '[object Array]';
    }
  };

  function dummy(){
    return true;
  }

  //params parsing middleware
  function params(){
    var args = Array.prototype.slice.call(arguments);
    var spec = [];
    var specLen = args.length;
    var min = 0;
    var i, l;
    for(i = 0; i<specLen; i++){
      var obj = {};
      var str = args[i];

      var ch = str.slice(-1);
      obj.required = '?'.indexOf(ch) === -1;

      if(obj.required)
        min++;

      if( '?'.indexOf(ch) > -1)
        str = str.slice(0,-1);

      var arg = str.split(':');
      obj.name = arg[0];
      if(arg.length > 1){
        //defined type
        var check = is[arg[1]];
        if(typeof check !== 'function')
          throw new Error('Parameter `'+arg[0]+'`: type `'+arg[1]+'` not exist');
        obj.check = check;
      }else
        obj.check = dummy;
      spec.push(obj);
    }
    return function(ctx, next){
      var i, l;
      var args = ctx.args;
      var len = args.length;
      var params = {};
      var index = 0;
      var offset = 0;

      ctx.params = params;
      if(len < min)
        return next(new Error('Too few arguments. Expected at least '+min));
      while(offset < len && index < specLen){
        while(
          !spec[index].check(args[offset]) && 
          !spec[index].required
        ){
          index++;
          if(args[offset] === null || args[offset] === undefined)
            offset++;
          if(index >= specLen || offset >= len)
            return next();
        }
        if( !spec[index].check(args[offset]) )
          return next(new Error('Invalid type on argument `'+args[offset]+'`.'));

        params[spec[index].name] = args[offset];
        index++;
        offset++;
      }
      next();
    };
  }

  //ginga use method
  function use(){
    //init hooks
    if(!this._hooks){
      this._hooks = {};
    }else{
      //prototype instance
      if(!this.hasOwnProperty('_hooks')){
        var _hooks = this._hooks;
        this._hooks = {};
        for(var _name in _hooks)
          this._hooks[_name] = [ _hooks[_name] ];
      }
    }

    var args = Array.prototype.slice.call(arguments);
    var name = null, i, j, l, m;

    if(is.array(args[0])){
      //use(['a','b','c'], ...)
      var arr = args.shift();
      for(i = 0, l = arr.length; i<l; i++)
        use.apply(this, [arr[i]].concat(args));
      return this;
    }else if(is.object(args[0]) && args[0]._hooks){
      //use(ginga)
      for(var _name in args[0]._hooks)
        use.call(this, _name, args[0]._hooks[_name]);
      return this;
    }

    //method name
    if(is.string(args[0]))
      name = args.shift();
    if(!name)
      throw new Error('Method name is not defined.');
    if(!this._hooks[name])
      this._hooks[name] = [];

    for(i = 0, l = args.length; i<l; i++){
      if(is.function(args[i])){
        this._hooks[name].push(args[i]);
      }else if(is.array(args[i])){
        //use('a', [fn1, fn2, fn3])
        for(j = 0, m = args[i].length; j<m; j++)
          use.call(this, name, args[i][j]);
        return this;
      }else
        throw new Error('Middleware must be a function');
    }

    return this;
  }

  //util: flatten array
  function flatten(arr, res){
    if(!res){
      res = [];
    }
    for(var i = 0, l = arr.length; i < l; i++){
      if(arr[i] && arr[i].constructor == Array){
        flatten(arr[i], res);
      }else{
        res.push(arr[i]);
      }
    }
    return res;
  }

  //ginga define method
  function define(){
    var args = Array.prototype.slice.call(arguments);
    var i, l;

    var name = args.shift();
    if(is.array(name)) {
      name = args.shift();
      for(i = 0, l = name.length; i<l; i++)
        define.apply(this, [name[i]].concat(args));
      return this;
    }

    if(!is.string(name))
      throw new Error('method name is not defined');

    var invoke = args.pop();
    if (!is.function(invoke))
      invoke = null;

    var pre = args;

    //define scope method
    this[name] = function(){
      var args = Array.prototype.slice.call(arguments);
      var self = this;

      var callbacks = [];
      if (is.function(args[args.length - 1]))
        callbacks.push(args.pop());

      //define pipeline;
      var pipe = [pre];
      if(this._hooks && this._hooks[name])
        pipe.push(this._hooks[name]);
      if(invoke)
        pipe.push(invoke);

      pipe = flatten(pipe);

      //context object and next triggerer
      var ctx = {
        method: name,
        args: args
      };
      var index = 0;
      var size = pipe.length;

      function onEnd(fn){
        if(is.function(fn))
          callbacks.push(fn);
      }
      function next(){
        if(arguments.length > 0){
          for(var i = 0, l = callbacks.length; i<l; i++)
            callbacks[i].apply(self, arguments);
          return;
        }
        if(index < size){
          var fn = pipe[index];
          var len = fn.length;
          index++;

          if(len >= 2) 
            fn.call(self, ctx, next, onEnd);
          else if(len === 1) 
            fn.call(self, next);
          else if(len === 0){
            throw new Error('Missing callback function.');
          }
        }else{
          //trigger empty callback if no more pipe
          next(null);
        }
      }
      next();

      return this;
    };
    return this;
  }

  function Ginga(scope){
    scope = scope || {};
    scope.use = use;
    scope.define = define;

    return scope;
  }
  Ginga.use = use;
  Ginga.define = define;
  Ginga.params = params;

  return Ginga;
});
