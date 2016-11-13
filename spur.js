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
        //console.log('curr rev '+curr_rev);
        if (curr_rev > rev) {
          p = '('+p["[[code]]"]+')';
        } else {
          p = null;
        }
      }
      //console.log('result '+p);
      return p;
    };`+
    'with($__ctx){'+
      code+
      ';function __eval(s){return eval(s)};'+
    '}'
  )

fun ast_node_source(source, node)
  ret source.slice(node.start, node.end)

fun reflect(name, mod_code)
  let pt = {} // patch tree
  let ast = parse(mod_code)

  fun walk_var(c, p, a)
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
          walk(cc, d, d.init)

  fun guess_funexpr_name(c, p, a)
    if p.type == 'AssignmentExpression'
      // funexpr is right value in assignment
      // f.ex. let x = function(){}
      let l = p.left
      if l
        let lt = p.left.type
        if lt == 'Identifier'
          ret l.name
        elif lt == 'MemberExpression'
          let lp = l.property
          let pt = lp.type
          if pt == 'Identifier'
            ret lp.name
          if pt == 'Literal'
            ret lp.value
    elif p.type == 'Property'
      if p.key.type == 'Identifier'
        ret p.key.name
      elif p.key.type == 'Literal'
        ret p.key.value
    /*elif p.type == 'CallExpression'
      // funexpr is argument in fun call
      // f.ex. foo(function(){})
      too ambigous...., f.ex:
        foo(fun(){code1})
        foo(fun(){code2})
      - needs diff analysis
      ret '__arg__'*/
    elif p.type == 'ReturnStatement'
      // funexpr is returned
      // f.ex. return function(){}
      ret '__return__'
    //todo: what about IIFE ???
    ret null

  fun walk_fun(c, p, a)
    //log(Array(depth).join('. ')+ node.type)
    let id
    if a.id
      id = a.id.name
    else
      id = guess_funexpr_name(c, p, a)
      if !id
        log(p)
        log('FUN anonymous!')
        walk(c, a, a.body.body) // walk through
        ret false
    log('FUN '+id)
    //log(node)
    let cc = {
      '[[type]]': 'function',
      '[[code]]': ast_node_source(mod_code, a),
      '[[body-start]]': a.body.start,
      '[[rev]]': 0,
    }
    c[id] = cc
    walk(cc, a, a.body.body)

  fun walk_childs(c, p, a)
    //log(a)
    Object.keys(a).forEach(fun(key){
      //if key != 'parent'?
      var val = a[key]
      if Array.isArray(val)
        val.forEach(fun(el) {
          if el && typeof el.type=='string'
            walk(c, a, el)
        })
      elif val && typeof val.type=='string'
        walk(c, a, val)
    })

  fun walk(c, p, a, toplevel)
    if Array.isArray(a)
      a.forEach(fun(aa){
        walk(c, p, aa)
      })
    else
      let t = a.type
      //log(t)
      if t == 'VariableDeclaration'
        walk_var(c, p, a)
      elif t == 'FunctionDeclaration'
        walk_fun(c, p, a)
      /*if t == 'ExpressionStatement'
        let e = a.expression
        let tt = e.type
        if tt == 'AssignmentExpression'
          walk(*/
      /*if t == 'AssignmentExpression'
        ;*/
      elif t == 'FunctionExpression'
        //log(a)
        walk_fun(c, p, a)
      else
        walk_childs(c, p, a)

  walk(pt, ast, ast.body, true)

  //log(pt)
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

  //console.log('rewrite');console.log(code)

  let script = new vm.Script(code, {filename: fn, displayErrors: true})
  script.runInThisContext()

export fun update_module(fn, code)
  generate_patch_code(fn, mod.code, code)

export fun update_mod_var(name)
  log('update_mod_var '+name)
  log($__pt[name])
  let init = $__pt[name]['[[init]]']
  if init
    log('init', init)
    __eval(name+'='+init)
