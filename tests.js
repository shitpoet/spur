for (let i = 0; i < 20; i++) log('')

use('spur')

global.test_var = 0
global.test_var_1 = 0
global.test_var_2 = 0

fun init()
  rewrite_module('m1', `
    let x = {
      m1: function(){
        return 1
      },
      m2: function(){
        return 2
      }
    }
    function foo() {
      test_var = x.m1
    }
  `)
    //global.foo = foo
  foo()
  test_var_1 = test_var
  //test_var_1 = test_var
  console.log(test_var_1+'')

export fun update()
  update_module('m1', `
    let x = {
      m1: function(){
        return 2
      },
      m2: function(){
        return 2
      }
    }
    function foo() {
      test_var = x.m1
    }
  `)
  //update_mod_var('x')
  //*/
  //global.foo = foo
  foo()
  test_var_2 = test_var
  //test_var_2 = test_var
  console.log(test_var_2+'')

  if test_var_2 == 2 && test_var_2 > test_var_1
    console.log('UPDATED')
  else
    console.log('not updated')
  //*/

init()
log('--------------------------')
update()

let repl = require('repl')
let r = repl.start({
  useGlobal: true,
  ignoreUndefined: true,
  replMode: repl.REPL_MODE_MAGIC,
})
r.on('exit', function() { process.exit() });
//*/
