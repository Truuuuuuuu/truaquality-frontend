import { spawnSync } from "node:child_process"
import {
  mkdtemp,
  readFile,
  realpath,
  rm,
  mkdir,
  writeFile,
  stat,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const root = await realpath(fileURLToPath(new URL("../", import.meta.url)))
const args = process.argv.slice(2)
let temporary

function insideRoot(file) {
  const relative = path.relative(root, file)
  return (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

async function resolveLocal(specifier, importer) {
  const base = specifier.startsWith("@/")
    ? path.join(root, "src", specifier.slice(2))
    : path.resolve(path.dirname(importer), specifier)
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    path.join(base, "index.ts"),
  ]) {
    try {
      if (!(await stat(candidate)).isFile()) continue
      const file = await realpath(candidate)
      if (!insideRoot(file) || !/\.[cm]?[jt]sx?$/.test(file)) {
        throw new Error(
          `Local test import must be source inside frontend: ${specifier}`
        )
      }
      return file
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error
    }
  }
  throw new Error(
    `Cannot resolve ${specifier} from ${path.relative(root, importer)}`
  )
}

try {
  if (!args.length)
    throw new Error(
      "Pass explicit test file paths, for example src/lib/do-display.test.ts"
    )
  temporary = await mkdtemp(path.join(root, "scripts", ".do-tests-"))
  const visited = new Map()
  async function compile(file) {
    if (visited.has(file)) return visited.get(file)
    const output = path.join(
      temporary,
      path.relative(root, file).replace(/\.[cm]?[jt]sx?$/, ".mjs")
    )
    visited.set(file, output)
    const source = await readFile(file, "utf8")
    const result = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2023,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
      },
    })
    const errors =
      result.diagnostics?.filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
      ) ?? []
    if (errors.length)
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(errors, {
          getCanonicalFileName: (name) => name,
          getCurrentDirectory: () => root,
          getNewLine: () => "\n",
        })
      )
    const parsed = ts.createSourceFile(
      output,
      result.outputText,
      ts.ScriptTarget.ES2023,
      true,
      ts.ScriptKind.JS
    )
    const replacements = []
    async function visit(node) {
      let literal
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier
      )
        literal = node.moduleSpecifier
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      )
        literal = node.arguments[0]
      if (literal && ts.isStringLiteral(literal)) {
        const specifier = literal.text
        if (specifier.startsWith("@/") || specifier.startsWith(".")) {
          const dependency = await compile(await resolveLocal(specifier, file))
          let relative = path
            .relative(path.dirname(output), dependency)
            .split(path.sep)
            .join("/")
          if (!relative.startsWith(".")) relative = `./${relative}`
          replacements.push({
            start: literal.getStart(parsed),
            end: literal.end,
            text: JSON.stringify(relative),
          })
        }
      }
      const children = []
      ts.forEachChild(node, (child) => {
        children.push(child)
      })
      for (const child of children) await visit(child)
    }
    await visit(parsed)
    let code = result.outputText
    for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
      code =
        code.slice(0, replacement.start) +
        replacement.text +
        code.slice(replacement.end)
    }
    await mkdir(path.dirname(output), { recursive: true })
    await writeFile(output, code)
    return output
  }
  const tests = []
  for (const arg of args) {
    const file = await realpath(path.resolve(root, arg))
    if (!insideRoot(file) || !/\.(test|spec)\.[cm]?[jt]sx?$/.test(file))
      throw new Error(`Expected a local test file: ${arg}`)
    tests.push(await compile(file))
  }
  const result = spawnSync(process.execPath, ["--test", ...tests], {
    cwd: root,
    stdio: "inherit",
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true })
}
