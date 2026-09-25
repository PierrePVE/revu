/**
 * server/types/sql.d.ts — lets TypeScript accept `import x from './file.sql'`.
 *
 * Nitro's bundler inlines .sql files as plain strings (built-in "raw" plugin),
 * which is how server code ships SQL fixtures without reading the filesystem —
 * the source tree isn't available inside a deployed serverless function.
 */
declare module '*.sql' {
  /** The file's full text content. */
  const contenu: string
  export default contenu
}
