const vm = require('vm')
//let fal = require('falafel')
var parse = require('acorn').parse
use('patch-str')

var mod = {
}

global.$__pt = {}
global.$__ctx = {}

fun wrap_module(code)
  return (
    `function $__P(path, rev) {
      console.log('check for patch for '+path);
      path = path.split('.');
      let p = $__pt[path.shift()];
      while (p && path.length > 0) {
        p = p[path.shift()];
      }
      if (p) {
        //let curr_rev = p["[[rev]]"];
        let curr_rev = global_rev-1;
        console.log('curr rev '+curr_rev);
        if (curr_rev > rev) {
          p = '('+p["[[code]]"]+')';
        } else {
          p = null;
        }
      }
      console.log('result '+p);
      return p;
    };`+
    'with($__ctx){'+code+'}'
  )

fun ast_node_source(source, node)
  ret source.slice(node.start, node.end)

fun reflect(name, mod_code)
  let pt = {} // patch tree
  let ast = parse(mod_code)

  fun walk_var(c, a)
    for d of a.declarations
      //log(d)
      if d.id && d.id.type == 'Identifier'
        log('VAR '+d.id.name)
        let cc = {
          '[[type]]': 'variable',
          '[[init]]': d.init===null?'':ast_node_source(mod_code, d.init),
          '[[rev]]': 0,
        }
        c[d.id.name] = cc
        if d.init
          walk(cc, d.init)

  fun walk_fun(c, a)
    //log(Array(depth).join('. ')+ node.type)
    if a.id
      log('FUN '+a.id.name)
      //log(node)
      let cc = {
        '[[type]]': 'function',
        '[[code]]': ast_node_source(mod_code, a),
        '[[body-start]]': a.body.start,
        '[[rev]]': 0,
      }
      c[a.id.name] = cc
      walk(cc, a.body.body)

  /*fun walk_childs(c, a)
    //log(a)
    Object.keys(a).forEach(fun(key){
      //if key != 'parent'?
      var val = a[key]
      if Array.isArray(val)
        val.forEach(fun(el) {
          if el && typeof el.type=='string'
            walk(c, el)
        })
      elif val && typeof val.type=='string'
        walk(c, val)
    })*/

  fun walk(c, a)
    if Array.isArray(a)
      a.forEach(fun(aa){
        walk(c, aa)
      })
    else
      let t = a.type
      //log(t)
      if t == 'VariableDeclaration'
        walk_var(c, a)
      if t == 'FunctionDeclaration'
        walk_fun(c, a)

  walk(pt, ast.body)

  //log(ctree)
  ret pt

fun rewrite(code, ctree, rev)
  rev = rev|0
  var patches = []
  fun gen_patches(path, c)
    for key of Object.keys(c)
      if key == '[[body-start]]'
        let pathstr = path.join('.')
        //let rev = c['[[rev]]']
        patches.push({
          pos: c[key]+1, len: 0,
          str: (
            'if ($__Q=$__P("'+pathstr+'",'+rev+')) return eval($__Q).apply(this,arguments);'
            //'if ($__Q=$__P("'+pathstr+'")) return eval($__Q).apply(this,arguments);'
            //'if ($__Q=$__P("'+path.join('.')+'")) return eval("("+$__Q["[[code]]"]+")").apply(this,arguments);'
            //'let $__p;if($__p=$__pt.' + path.join('.')+')return eval("("+$__p["[[code]]"]+")").apply(this,arguments);'
          )
        })
      elif !key.startsWith('[[')
        path.push(key)
        gen_patches(path, c[key])
        path.pop()
  gen_patches([], ctree)
  ret patch_str(code, patches)

global.global_rev = 1;

fun generate_patch_code(name, old_code, new_code)
  //log(old_code)
  //log(new_code)
  let s = reflect(name, old_code)
  let d = reflect(name, new_code)
  new_code_r = rewrite(new_code, d, global_rev)
  let dr = reflect(name, new_code_r)
  //console.log('rewrite*')
  //console.log(new_code);
  //log(d)
  //$__pt = d
  $__pt = dr
  //$__pt = {}

  fun introduce_var(name, init)
    log('introduce_var '+name)
    //log('introduce_var '+name+' = '+init)
    $__ctx[name] = eval(init)

  fun introduce_func(name, code)

    log('introduce_func '+name)
    log('code',code)
    let script = new vm.Script(code, {filename: fn, displayErrors: true})
    script.runInThisContext()

  let skeys = Object.keys(s)
  //log('skeys',skeys)
  let dkeys = Object.keys(d)
  for dkey of dkeys
    dr[dkey]['[[rev]]'] = global_rev
    if !(dkey in s)
      let p = d[dkey]
      let type = p['[[type]]']
      if type == 'variable'
        introduce_var(dkey, p['[[init]]'])
      elif type == 'function'
        // introduce new function
        introduce_func(dkey, dr[dkey]['[[code]]'])

  global_rev++;

var fn = 'm1.js'

export fun rewrite_module(fn, code)
  mod.code = code
  let pt = reflect(fn, code)
  code = rewrite(code, pt)
  code = wrap_module(code)

  console.log('rewrite');console.log(code)
  let script = new vm.Script(code, {filename: fn, displayErrors: true})
  script.runInThisContext()
  test_var_1 = foo()
  //test_var_1 = test_var
  console.log(test_var_1+'')

export fun update_module(fn, code)
  generate_patch_code(fn, mod.code, code)
  test_var_2 = foo()
  //test_var_2 = test_var
  console.log(test_var_2+'')
