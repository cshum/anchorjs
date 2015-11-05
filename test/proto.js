var tape = require('tape')
var ginga = require('../')

tape('ginga prototype', function (t) {
  t.plan(12)

  function Clock () {
    this._tick = 'tick'
    this._tock = 'tock'
  }
  function base (ctx, next) {
    ctx.logs = ['clock']
    // async callback
    setTimeout(next, 10)
  }
  function tick (ctx, next) {
    ctx.logs.push(this._tick)
    // resolver function
    next(function (result) {
      t.equal(result, 167199, 'resolver result')
    })(null, 167199)
  }
  function tock (ctx) {
    // no next arg
    ctx.logs.push(this._tock)
  }
  function end (ctx, done) {
    ctx.logs.push('done')
    done(null, ctx.logs)
  }
  var C = ginga(Clock.prototype)

  var clock1 = new Clock()
  var clock2 = new Clock()

  clock2.use(
    'tick',
    function (ctx) {
      ctx.logs.push('more')
    },
    function (ctx) {
      ctx.logs.push('and more tick')
    }
  )
  clock2.use(
    'tock',
    function (ctx, next) {
      // resolver function err
      next(function (res) {
        t.error('resolver called')
      })('booooom')
    }
  )

  C.define('tick', end)
  C.define('tock', end)
  C.use('tick', base, tick)
  C.use('tock', base, tick, tock)

  clock1.tick(function (err, res) {
    t.notOk(err, 'no error')
    t.deepEqual(res, ['clock', 'tick', 'done'])
  })
  clock1.tock(function (err, res) {
    t.notOk(err, 'no error')
    t.deepEqual(res, ['clock', 'tick', 'tock', 'done'])
  })
  clock2.tick(function (err, res) {
    t.notOk(err, 'no error')
    t.deepEqual(res, ['clock', 'tick', 'more', 'and more tick', 'done'])
  })
  clock2.tock(function (err, res) {
    t.notOk(res, 'no result')
    t.equal(err, 'booooom', 'return error')
  })
})
