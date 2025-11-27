#!/usr/bin/env node
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const root = path.resolve(__dirname, "..")
const workspaceRoot = path.resolve(root, "..", "..")
const serverRoot = path.resolve(root, "..", "server")
const uiRoot = path.resolve(root, "..", "ui")
const uiDist = path.resolve(uiRoot, "src", "renderer", "dist")
const serverDest = path.resolve(root, "src-tauri", "resources", "server")
const uiLoadingDest = path.resolve(root, "src-tauri", "resources", "ui-loading")

const sources = ["dist", "public", "node_modules", "package.json"]

const serverInstallCommand =
  "npm install --omit=dev --ignore-scripts --workspaces=false --package-lock=false --install-strategy=shallow --fund=false --audit=false"
const serverDevInstallCommand =
  "npm ci --workspace @neuralnomads/codenomad --include-workspace-root=false --install-strategy=nested --fund=false --audit=false"
const uiDevInstallCommand =
  "npm ci --workspace @codenomad/ui --include-workspace-root=false --install-strategy=nested --fund=false --audit=false"

const envWithRootBin = {
  ...process.env,
  PATH: `${path.join(workspaceRoot, "node_modules/.bin")}:${process.env.PATH}`,
}

const braceExpansionPath = path.join(
  serverRoot,
  "node_modules",
  "@fastify",
  "static",
  "node_modules",
  "brace-expansion",
  "package.json",
)

const viteBinPath = path.join(uiRoot, "node_modules", ".bin", "vite")

function ensureServerBuild() {
  const distPath = path.join(serverRoot, "dist")
  const publicPath = path.join(serverRoot, "public")
  if (fs.existsSync(distPath) && fs.existsSync(publicPath)) {
    return
  }

  console.log("[prebuild] server build missing; running workspace build...")
  execSync("npm --workspace @neuralnomads/codenomad run build", {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `${path.join(workspaceRoot, "node_modules/.bin")}:${process.env.PATH}`,
    },
  })

  if (!fs.existsSync(distPath) || !fs.existsSync(publicPath)) {
    throw new Error("[prebuild] server artifacts still missing after build")
  }
}

function ensureUiBuild() {
  const loadingHtml = path.join(uiDist, "loading.html")
  if (fs.existsSync(loadingHtml)) {
    return
  }

  console.log("[prebuild] ui build missing; running workspace build...")
  execSync("npm --workspace @codenomad/ui run build", {
    cwd: workspaceRoot,
    stdio: "inherit",
  })

  if (!fs.existsSync(loadingHtml)) {
    throw new Error("[prebuild] ui loading assets missing after build")
  }
}

function ensureServerDevDependencies() {
  if (fs.existsSync(braceExpansionPath)) {
    return
  }

  console.log("[prebuild] ensuring server build dependencies (with dev)...")
  execSync(serverDevInstallCommand, {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: envWithRootBin,
  })
}

function ensureServerDependencies() {
  if (fs.existsSync(braceExpansionPath)) {
    return
  }

  console.log("[prebuild] ensuring server production dependencies...")
  execSync(serverInstallCommand, {
    cwd: serverRoot,
    stdio: "inherit",
  })
}

function ensureUiDevDependencies() {
  if (fs.existsSync(viteBinPath)) {
    return
  }

  console.log("[prebuild] ensuring ui build dependencies...")
  execSync(uiDevInstallCommand, {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: envWithRootBin,
  })
}

function ensureRollupPlatformBinary() {
  if (process.platform !== "linux" || process.arch !== "x64") {
    return
  }

  const rollupLinuxPath = path.join(
    workspaceRoot,
    "node_modules",
    "@rollup",
    "rollup-linux-x64-gnu",
  )

  if (fs.existsSync(rollupLinuxPath)) {
    return
  }

  let rollupVersion = ""
  try {
    rollupVersion = require(path.join(workspaceRoot, "node_modules", "rollup", "package.json")).version
  } catch (error) {
    // leave version empty; fallback install will use latest compatible
  }

  const packageSpec = rollupVersion
    ? `@rollup/rollup-linux-x64-gnu@${rollupVersion}`
    : "@rollup/rollup-linux-x64-gnu"

  console.log("[prebuild] installing rollup linux binary (optional dep workaround)...")
  execSync(`npm install ${packageSpec} --no-save --ignore-scripts --fund=false --audit=false`, {
    cwd: workspaceRoot,
    stdio: "inherit",
  })
}

function copyServerArtifacts() {
  fs.rmSync(serverDest, { recursive: true, force: true })
  fs.mkdirSync(serverDest, { recursive: true })

  for (const name of sources) {
    const from = path.join(serverRoot, name)
    const to = path.join(serverDest, name)
    if (!fs.existsSync(from)) {
      console.warn(`[prebuild] skipped missing ${from}`)
      continue
    }
    fs.cpSync(from, to, { recursive: true, dereference: true })
    console.log(`[prebuild] copied ${from} -> ${to}`)
  }
}

function copyUiLoadingAssets() {
  const loadingSource = path.join(uiDist, "loading.html")
  const assetsSource = path.join(uiDist, "assets")

  if (!fs.existsSync(loadingSource)) {
    throw new Error("[prebuild] cannot find built loading.html")
  }

  fs.rmSync(uiLoadingDest, { recursive: true, force: true })
  fs.mkdirSync(uiLoadingDest, { recursive: true })

  fs.copyFileSync(loadingSource, path.join(uiLoadingDest, "loading.html"))
  if (fs.existsSync(assetsSource)) {
    fs.cpSync(assetsSource, path.join(uiLoadingDest, "assets"), { recursive: true })
  }

  console.log(`[prebuild] prepared UI loading assets from ${uiDist}`)
}

ensureServerDevDependencies()
ensureUiDevDependencies()
ensureRollupPlatformBinary()
ensureServerBuild()
ensureUiBuild()
ensureServerDependencies()
copyServerArtifacts()
copyUiLoadingAssets()
