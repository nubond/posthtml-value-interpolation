<h1 align="center">A <a href="https://parceljs.org/">Parcel</a>\<a href="https://github.com/posthtml/posthtml/">PostHTML</a> interpolation plugin for <a href="https://github.com/nubond/nubond">nuBond</a></h1>

<p align="center">
  <strong>Interpolates mustache-style templates {{ expression }} to &lt;span nb-value="expression"&gt;&lt;/span&gt; bindings at build time.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@nubond/posthtml-value-interpolation"><img alt="npm" src="https://img.shields.io/npm/v/@nubond/posthtml-value-interpolation.svg"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/npm/l/nubond.svg"></a>
  <img alt="coverage" src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg">
  <img alt="Made in Ukraine" src="https://img.shields.io/badge/Made_in-Ukraine-FFD800.svg?labelColor=0056B9">
</p>

## What it does

Write Mustache-style templates:

```html
<h1>Hello, {{ this.name }}!</h1>
```

The plugin emits nuBond-native bindings:

```html
<h1>Hello, <span nb-value=" this.name "></span>!</h1>
```

## Installation

> If you scaffolded your project from [`npm create nubond`](https://github.com/nubond/create-nubond), this plugin is already wired up — no need to do anything.

1. Install the package:

```bash
npm install --save-dev @nubond/posthtml-value-interpolation
```

2. Add a `.posthtmlrc` file to the root of your Parcel project.

3. Place the following content in the file:

```json
{
  "plugins": {
    "@nubond/posthtml-value-interpolation": {}
  }
}
```

Or use it directly with PostHTML:

```js
import posthtml from 'posthtml';
import valueInterpolation from '@nubond/posthtml-value-interpolation';

const { html } = await posthtml([valueInterpolation()])
    .process('<div>{{ this.user.name }}</div>');
```

## Supported expressions

Anything between `{{ … }}` is passed verbatim into `nb-value`, so the full nuBond expression grammar works — member access, method calls, ternaries, template literals, repeat-scope vars, expression prefixes (`#`, `@`), etc.

The plugin only transforms **text nodes** — HTML attributes (`<div class="{{ x }}">`), `<script>`/`<style>` blocks, and unmatched braces are left untouched.


## License

[MIT](LICENSE) © Dmytro Tomayly
