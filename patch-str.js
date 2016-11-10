export fun patch_str(s, patches)
  patches.sort( (a,b)=>(
    a.pos < b.pos ? -1 : (a.pos > b.pos ? 1 : 0)
  ))
  let n = patches.length
  let patched = ''
  let prev = 0
  for (let i = 0; i < n; i++) {
    let patch = patches[i]
    let pos = patch.pos
    let len = patch.len
    let str = patch.str
    patched += s.substr(prev, pos-prev) + str
    prev = pos + len
  }
  patched += s.substr(prev)
  /*for (let i = n-1; i >= 0; i--) {
    let patch = patches[i]
    let pos = patch.tok.pos
    let len = patch.tok.len
    let str = patch.str
    code =
      code.substr(0,pos) +
      str +
      code.substr(pos+len)
  }*/
  ret patched
