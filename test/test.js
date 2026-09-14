import { describe, test, expect, vi } from 'vitest'
import posthtml from 'posthtml'
import plugin from '../lib/index.js'

const process = (html, options) =>
  posthtml([plugin(options)])
    .process(html)
    .then(result => result.html)

// ---------------------------------------------------------------------------
// 1. Basic interpolation
// ---------------------------------------------------------------------------
describe('Basic interpolation', () => {
  test('single interpolation in text node', async () => {
    const html = '<div>{{ this.name }}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=" this.name "></span></div>')
  })

  test('interpolation preserves inner whitespace exactly', async () => {
    const html = '<p>{{value}}</p>'
    const result = await process(html)
    expect(result).toBe('<p><span nb-value="value"></span></p>')
  })

  test('interpolation with extra spaces around expression', async () => {
    const html = '<p>{{   this.foo   }}</p>'
    const result = await process(html)
    expect(result).toBe('<p><span nb-value="   this.foo   "></span></p>')
  })
})

// ---------------------------------------------------------------------------
// 2. Text before, after, and surrounding interpolation
// ---------------------------------------------------------------------------
describe('Text surrounding interpolation', () => {
  test('text before interpolation', async () => {
    const html = '<div>Hello {{ this.name }}</div>'
    const result = await process(html)
    expect(result).toBe('<div>Hello <span nb-value=" this.name "></span></div>')
  })

  test('text after interpolation', async () => {
    const html = '<div>{{ this.name }} world</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=" this.name "></span> world</div>')
  })

  test('text before and after interpolation', async () => {
    const html = '<div>Hello {{ this.name }} world</div>'
    const result = await process(html)
    expect(result).toBe('<div>Hello <span nb-value=" this.name "></span> world</div>')
  })
})

// ---------------------------------------------------------------------------
// 3. Multiple interpolations
// ---------------------------------------------------------------------------
describe('Multiple interpolations', () => {
  test('two interpolations separated by text', async () => {
    const html = '<div>{{ this.first }} and {{ this.last }}</div>'
    const result = await process(html)
    expect(result).toBe(
      '<div><span nb-value=" this.first "></span> and <span nb-value=" this.last "></span></div>'
    )
  })

  test('three interpolations in a row', async () => {
    const html = '<p>{{ a }}{{ b }}{{ c }}</p>'
    const result = await process(html)
    expect(result).toBe(
      '<p><span nb-value=" a "></span><span nb-value=" b "></span><span nb-value=" c "></span></p>'
    )
  })

  test('text before first, between, and after last', async () => {
    const html = '<div>start {{ a }} mid {{ b }} end</div>'
    const result = await process(html)
    expect(result).toBe(
      '<div>start <span nb-value=" a "></span> mid <span nb-value=" b "></span> end</div>'
    )
  })

  test('many interpolations', async () => {
    const html = '<div>{{ a }} {{ b }} {{ c }} {{ d }} {{ e }}</div>'
    const result = await process(html)
    expect(result).toContain('<span nb-value=" a "></span>')
    expect(result).toContain('<span nb-value=" b "></span>')
    expect(result).toContain('<span nb-value=" c "></span>')
    expect(result).toContain('<span nb-value=" d "></span>')
    expect(result).toContain('<span nb-value=" e "></span>')
  })
})

// ---------------------------------------------------------------------------
// 4. No interpolation — passthrough
// ---------------------------------------------------------------------------
describe('No interpolation passthrough', () => {
  test('plain text passes through unchanged', async () => {
    const html = '<div>Hello world</div>'
    const result = await process(html)
    expect(result).toBe('<div>Hello world</div>')
  })

  test('empty element passes through', async () => {
    const html = '<div></div>'
    const result = await process(html)
    expect(result).toBe('<div></div>')
  })

  test('self-closing element passes through', async () => {
    const html = '<br>'
    const result = await process(html)
    expect(result).toBe('<br>')
  })

  test('HTML without any text interpolation', async () => {
    const html = '<div class="foo"><span>bar</span></div>'
    const result = await process(html)
    expect(result).toBe('<div class="foo"><span>bar</span></div>')
  })

  test('HTML attributes with braces are not affected', async () => {
    const html = '<div nb-value="this.name"></div>'
    const result = await process(html)
    expect(result).toBe('<div nb-value="this.name"></div>')
  })

  test('doctype passes through', async () => {
    const html = '<!doctype html>'
    const result = await process(html)
    expect(result).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 5. Edge cases — incomplete / malformed braces
// ---------------------------------------------------------------------------
describe('Incomplete and malformed braces', () => {
  test('only opening braces — no replacement', async () => {
    const html = '<div>{{ no close</div>'
    const result = await process(html)
    expect(result).toBe('<div>{{ no close</div>')
  })

  test('only closing braces — no replacement', async () => {
    const html = '<div>no open }}</div>'
    const result = await process(html)
    expect(result).toBe('<div>no open }}</div>')
  })

  test('single brace — not interpolation', async () => {
    const html = '<div>{ not interpolation }</div>'
    const result = await process(html)
    expect(result).toBe('<div>{ not interpolation }</div>')
  })

  test('closing before opening — no replacement', async () => {
    const html = '<div>}} before {{ opening</div>'
    const result = await process(html)
    expect(result).toBe('<div>}} before {{ opening</div>')
  })

  test('triple braces — treats inner ones', async () => {
    const html = '<div>{{{ value }}}</div>'
    const result = await process(html)
    expect(result).toContain('nb-value=')
  })
})

// ---------------------------------------------------------------------------
// 6. Empty and whitespace-only expressions
// ---------------------------------------------------------------------------
describe('Empty and whitespace expressions', () => {
  test('empty interpolation', async () => {
    const html = '<div>{{}}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=""></span></div>')
  })

  test('whitespace-only interpolation', async () => {
    const html = '<div>{{   }}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value="   "></span></div>')
  })
})

// ---------------------------------------------------------------------------
// 7. Complex expressions
// ---------------------------------------------------------------------------
describe('Complex expressions', () => {
  test('dotted member access', async () => {
    const html = '<div>{{ this.user.name }}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=" this.user.name "></span></div>')
  })

  test('method call expression', async () => {
    const html = '<div>{{ this.getLabel() }}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=" this.getLabel() "></span></div>')
  })

  test('ternary expression', async () => {
    const html = "<div>{{ this.active ? 'yes' : 'no' }}</div>"
    const result = await process(html)
    expect(result).toContain("nb-value=")
    expect(result).toContain("this.active")
  })

  test('arithmetic expression', async () => {
    const html = '<div>{{ this.a + this.b }}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=" this.a + this.b "></span></div>')
  })

  test('template literal inside interpolation', async () => {
    const html = `<div>{{ \`\${this.name}\` }}</div>`
    const result = await process(html)
    expect(result).toContain('nb-value=')
    expect(result).toContain('this.name')
  })

  test('expression with pipe/transformer', async () => {
    const html = '<div>{{ this.date | dateFormat }}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=" this.date | dateFormat "></span></div>')
  })

  test('expression with comparison operators', async () => {
    const html = '<div>{{ this.count > 0 }}</div>'
    const result = await process(html)
    expect(result).toContain('nb-value=')
  })
})

// ---------------------------------------------------------------------------
// 8. Nested HTML structure
// ---------------------------------------------------------------------------
describe('Nested HTML structure', () => {
  test('interpolation in nested child', async () => {
    const html = '<div><p><span>{{ this.text }}</span></p></div>'
    const result = await process(html)
    expect(result).toBe('<div><p><span><span nb-value=" this.text "></span></span></p></div>')
  })

  test('interpolation in multiple nested elements', async () => {
    const html = '<div>{{ this.a }}<p>{{ this.b }}</p></div>'
    const result = await process(html)
    expect(result).toContain('<span nb-value=" this.a "></span>')
    expect(result).toContain('<span nb-value=" this.b "></span>')
  })

  test('interpolation in sibling text nodes', async () => {
    const html = '<ul><li>{{ this.first }}</li><li>{{ this.second }}</li></ul>'
    const result = await process(html)
    expect(result).toContain('<span nb-value=" this.first "></span>')
    expect(result).toContain('<span nb-value=" this.second "></span>')
  })

  test('deeply nested interpolation', async () => {
    const html = '<div><section><article><p>{{ this.deep }}</p></article></section></div>'
    const result = await process(html)
    expect(result).toContain('<span nb-value=" this.deep "></span>')
  })
})

// ---------------------------------------------------------------------------
// 9. Mixed content — elements and interpolation
// ---------------------------------------------------------------------------
describe('Mixed content', () => {
  test('text and elements mixed with interpolation', async () => {
    const html = '<div>Hello <strong>world</strong> {{ this.name }}</div>'
    const result = await process(html)
    expect(result).toContain('<strong>world</strong>')
    expect(result).toContain('<span nb-value=" this.name "></span>')
  })

  test('interpolation does not affect element attributes', async () => {
    const html = '<div class="{{ this.cls }}">{{ this.text }}</div>'
    const result = await process(html)
    expect(result).toContain('<span nb-value=" this.text "></span>')
  })
})

// ---------------------------------------------------------------------------
// 10. Plugin options parameter
// ---------------------------------------------------------------------------
describe('Plugin options', () => {
  test('works with no options argument', async () => {
    const result = await posthtml([plugin()]).process('<div>{{ x }}</div>').then(r => r.html)
    expect(result).toContain('nb-value="')
  })

  test('works with empty options object', async () => {
    const result = await process('<div>{{ x }}</div>', {})
    expect(result).toContain('nb-value="')
  })

  test('works with null options', async () => {
    const result = await process('<div>{{ x }}</div>', null)
    expect(result).toContain('nb-value="')
  })

  test('works with undefined options', async () => {
    const result = await process('<div>{{ x }}</div>', undefined)
    expect(result).toContain('nb-value="')
  })
})

// ---------------------------------------------------------------------------
// 11. Newlines and whitespace within interpolation
// ---------------------------------------------------------------------------
describe('Whitespace handling', () => {
  test('newline inside interpolation', async () => {
    const html = '<div>{{\nthis.value\n}}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value="\nthis.value\n"></span></div>')
  })

  test('tabs inside interpolation', async () => {
    const html = '<div>{{\tthis.value\t}}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value="\tthis.value\t"></span></div>')
  })

  test('text node with only whitespace — no interpolation', async () => {
    const html = '<div>   </div>'
    const result = await process(html)
    expect(result).toBe('<div>   </div>')
  })
})

// ---------------------------------------------------------------------------
// 12. Special characters in expressions
// ---------------------------------------------------------------------------
describe('Special characters in expressions', () => {
  test('expression with single quotes', async () => {
    const html = "<div>{{ this.fn('arg') }}</div>"
    const result = await process(html)
    expect(result).toContain("nb-value=")
    expect(result).toContain("this.fn(")
  })

  test('expression with square brackets', async () => {
    const html = '<div>{{ this.arr[0] }}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=" this.arr[0] "></span></div>')
  })

  test('expression with ampersand entity', async () => {
    const html = '<div>{{ this.a &amp;&amp; this.b }}</div>'
    const result = await process(html)
    expect(result).toContain('nb-value=')
  })
})

// ---------------------------------------------------------------------------
// 13. getStartIndex edge cases — multiple {{ before }}
// ---------------------------------------------------------------------------
describe('getStartIndex — multiple opening closed braces before close error', () => {
  test('two separate opening braces with white space before single close', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const result = await process('<div>{{ {{ value }}</div>')
      console.log(result);
      expect(error).toHaveBeenCalledTimes(1)
      expect(error.mock.calls[0][0]).toBe('[posthtml-value-interpolation] {{ {{ value }} contains invalid interpolation')
    } finally {
      error.mockRestore()
    }
  })

  test('two separate opening braces without white space before single close', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const result = await process('<div>aa {{ bb {{ cc }}</div>')
      console.log(result);
      expect(error).toHaveBeenCalledTimes(1)
      expect(error.mock.calls[0][0]).toBe('[posthtml-value-interpolation] aa {{ bb {{ cc }} contains invalid interpolation')
    } finally {
      error.mockRestore()
    }
  })

  test('two separate closing braces with white space before single close', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const result = await process('<div>{{ value }} }}</div>')
      console.log(result);
      expect(error).toHaveBeenCalledTimes(1)
      expect(error.mock.calls[0][0]).toBe('[posthtml-value-interpolation] {{ value }} }} contains invalid interpolation')
    } finally {
      error.mockRestore()
    }
  })

  test('two separate closing braces without white space before single close', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const result = await process('<div>{{ aa }} bb }} cc</div>')
      console.log(result);
      expect(error).toHaveBeenCalledTimes(1)
      expect(error.mock.calls[0][0]).toBe('[posthtml-value-interpolation] {{ aa }} bb }} cc contains invalid interpolation')
    } finally {
      error.mockRestore()
    }
  })
})

// ---------------------------------------------------------------------------
// 14. Full HTML document
// ---------------------------------------------------------------------------
describe('Full HTML document', () => {
  test('interpolation in a complete document', async () => {
    const html = `<!doctype html>
<html>
<head><title>{{ this.title }}</title></head>
<body>
  <h1>{{ this.heading }}</h1>
  <p>Welcome, {{ this.user }}!</p>
</body>
</html>`
    const result = await process(html)
    expect(result).toContain('<span nb-value=" this.title "></span>')
    expect(result).toContain('<span nb-value=" this.heading "></span>')
    expect(result).toContain('Welcome, <span nb-value=" this.user "></span>!')
  })

  test('no interpolation in full document', async () => {
    const html = `<!doctype html>
<html>
<head><title>Static</title></head>
<body><p>Hello</p></body>
</html>`
    const result = await process(html)
    expect(result).toContain('<title>Static</title>')
    expect(result).toContain('<p>Hello</p>')
  })
})

// ---------------------------------------------------------------------------
// 15. Return value contract
// ---------------------------------------------------------------------------
describe('Return value contract', () => {
  test('plugin returns a function that accepts tree', () => {
    const pluginFn = plugin()
    expect(typeof pluginFn).toBe('function')
  })

  test('plugin factory accepts options', () => {
    const pluginFn = plugin({ custom: true })
    expect(typeof pluginFn).toBe('function')
  })

  test('result is a promise resolving to PostHTML result', async () => {
    const result = posthtml([plugin()]).process('<div>{{ x }}</div>')
    expect(result).toBeInstanceOf(Promise)
    const resolved = await result
    expect(resolved).toHaveProperty('html')
    expect(typeof resolved.html).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// 16. Output format verification
// ---------------------------------------------------------------------------
describe('Output format', () => {
  test('generated span uses nb-value attribute', async () => {
    const result = await process('<p>{{ expr }}</p>')
    expect(result).toMatch(/<span nb-value="[^"]*"><\/span>/)
  })

  test('generated span has closing tag not self-closing', async () => {
    const result = await process('<p>{{ expr }}</p>')
    expect(result).toContain('></span>')
    expect(result).not.toContain('/>')
  })

  test('expression content is placed exactly in nb-value', async () => {
    const result = await process('<p>{{ this.foo.bar() }}</p>')
    expect(result).toBe('<p><span nb-value=" this.foo.bar() "></span></p>')
  })
})

// ---------------------------------------------------------------------------
// 17. Boundary conditions
// ---------------------------------------------------------------------------
describe('Boundary conditions', () => {
  test('interpolation at very start of text node', async () => {
    const html = '<div>{{ start }}rest</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=" start "></span>rest</div>')
  })

  test('interpolation at very end of text node', async () => {
    const html = '<div>rest{{ end }}</div>'
    const result = await process(html)
    expect(result).toBe('<div>rest<span nb-value=" end "></span></div>')
  })

  test('entire text node is one interpolation', async () => {
    const html = '<div>{{ everything }}</div>'
    const result = await process(html)
    expect(result).toBe('<div><span nb-value=" everything "></span></div>')
  })

  test('adjacent closing and opening braces', async () => {
    const html = '<div>{{ a }}{{ b }}</div>'
    const result = await process(html)
    expect(result).toBe(
      '<div><span nb-value=" a "></span><span nb-value=" b "></span></div>'
    )
  })

  test('very long expression', async () => {
    const expr = `this.${'a'.repeat(1000)}`
    const html = `<div>{{ ${expr} }}</div>`
    const result = await process(html)
    expect(result).toContain(`nb-value=" ${expr} "`)
  })
})

// ---------------------------------------------------------------------------
// 18. Double-quote escaping in expressions
// ---------------------------------------------------------------------------
describe('Double-quote escaping', () => {
  test('double-quoted string argument is escaped as &quot;', async () => {
    const html = '<div>{{ this.getLabel("x") }}</div>'
    const result = await process(html)
    expect(result).toBe(`<div><span nb-value=" this.getLabel('x') "></span></div>`)
  })

  test('multiple double quotes are all escaped', async () => {
    const html = '<div>{{ this.fn("a", "b") }}</div>'
    const result = await process(html)
    expect(result).toBe(`<div><span nb-value=" this.fn('a', 'b') "></span></div>`)
  })

  test('single quotes are left as-is', async () => {
    const html = "<div>{{ this.fn('a') }}</div>"
    const result = await process(html)
    expect(result).toBe(`<div><span nb-value=" this.fn('a') "></span></div>`)
  })

  test('escaped attribute never terminates early', async () => {
    const html = '<div>{{ this.getLabel("x") }}</div>'
    const result = await process(html)
    expect(result).toMatch(/<span nb-value="[^"]*"><\/span>/)
  })
})

// ---------------------------------------------------------------------------
// 19. Script, style, and comment content is skipped
// ---------------------------------------------------------------------------
describe('Script, style, and comment content', () => {
  test('nested block braces inside inline script are untouched', async () => {
    const html = '<script>if(a){{b()}}</script>'
    const result = await process(html)
    expect(result).toBe('<script>if(a){{b()}}</script>')
  })

  test('interpolation-shaped token inside style is untouched', async () => {
    const html = '<style>/* {{ not a binding }} */ .a{color:red}</style>'
    const result = await process(html)
    expect(result).toBe('<style>/* {{ not a binding }} */ .a{color:red}</style>')
  })

  test('interpolation inside an HTML comment is untouched', async () => {
    const html = '<div><!-- {{ this.x }} --></div>'
    const result = await process(html)
    expect(result).toBe('<div><!-- {{ this.x }} --></div>')
  })

  test('text around a script is still transformed', async () => {
    const html = '<div>{{ this.a }}<script>let o = {{}};</script>{{ this.b }}</div>'
    const result = await process(html)
    expect(result).toBe(
      '<div><span nb-value=" this.a "></span><script>let o = {{}};</script><span nb-value=" this.b "></span></div>'
    )
  })

  test('script nested deeper in the tree is still skipped', async () => {
    const html = '<div><section><script>if(a){{b()}}</script></section>{{ this.x }}</div>'
    const result = await process(html)
    expect(result).toBe(
      '<div><section><script>if(a){{b()}}</script></section><span nb-value=" this.x "></span></div>'
    )
  })
})

// ---------------------------------------------------------------------------
// 20. Unbalanced-brace
// ---------------------------------------------------------------------------
describe('Unbalanced-brace', () => {
  test('single object', async () => {
    const html = '<div>{{ {a: {b: 1}} }}</div>'
    const result = await process(html)
    expect(result).toBe(
      '<div><span nb-value=" {a: {b: 1}} "></span></div>'
    )
  })

  test('multiple objects', async () => {
    const html = '<div>{{ this.a }} and {{ this.fn({k: 1}) }} and {{ {a: {b: 1}} }}</div>'
    const result = await process(html)
    expect(result).toBe(
      '<div><span nb-value=" this.a "></span> and <span nb-value=" this.fn({k: 1}) "></span> and <span nb-value=" {a: {b: 1}} "></span></div>'
    )
  })
})