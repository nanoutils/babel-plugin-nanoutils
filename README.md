# babel-plugin-nanoutils

This plugin is a transform to remove unused nanoutils dependencies, without forcing the user to cherry pick methods manually.  
Works the same as [`babel-plugin-ramda`](https://github.com/megawac/babel-plugin-ramda)

#### Example
Converts
```js
import N, { map } from 'nanoutils'

map(N.add(1), [1, 2, 3])
```

To
```js
import add from 'nanoutils/es/add'
import map from 'nanoutils/es/map'
```

#### Install

```
npm install babel-plugin-nanoutils
```

### Usage

###### Via `.babelrc`:
```json
{
  "plugins": ["nanoutils"]
}
```

###### Via CLI
```bash
babel --plugins nanoutils script.js
```

###### Via Node API
```js
require("babel-core").transform("code", {
  plugins: ["nanoutils"]
});
```

### Plugin options

###### cjs: true|false
Instead of `es` folder, it will use `cjs` folder with `require` instead of `import`
