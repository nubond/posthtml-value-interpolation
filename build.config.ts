import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  rollup: {
    emitCJS: true,
  },
  rootDir: './lib',
  outDir: '../dist/src',
  entries: ['index.js'],
})
