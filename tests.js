for (let i = 0; i < 20; i++) log('')

use('spur')

global.test_var = 0
global.test_var_1 = 0
global.test_var_2 = 0

rewrite_module('m1', `
  //let old_var, old_var_2 = 2;
  function foo(a,b) {
    function inner() {
      return 1;
    }
    return inner
  }
`)
  //global.foo = foo
log('--------------------------')
export fun update()
  update_module('m1', `
    //let new_var = 2;
    function foo(a,b) {
      function inner() {
        return 2;
      }
      return inner
    }
  `)
  //*/
  //global.foo = foo

  if test_var_2 == 2 && test_var_2 > test_var_1
    console.log('UPDATED')
  else
    console.log('not updated')
  //*/

let repl = require('repl')
let r = repl.start({
  useGlobal: true,
  ignoreUndefined: true,
  replMode: repl.REPL_MODE_MAGIC,
})
r.on('exit', function() { process.exit() });
//*/
