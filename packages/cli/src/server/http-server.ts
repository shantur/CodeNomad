import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify"
import cors from "@fastify/cors"
import fastifyStatic from "@fastify/static"
import fs from "fs"
import path from "path"
import { Readable } from "node:stream"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"
import { fetch } from "undici"
import type { Logger } from "../logger"
import { WorkspaceManager } from "../workspaces/manager"

import { ConfigStore } from "../config/store"
import { BinaryRegistry } from "../config/binaries"
import { FileSystemBrowser } from "../filesystem/browser"
import { EventBus } from "../events/bus"
import { registerWorkspaceRoutes } from "./routes/workspaces"
import { registerConfigRoutes } from "./routes/config"
import { registerFilesystemRoutes } from "./routes/filesystem"
import { registerMetaRoutes } from "./routes/meta"
import { registerEventRoutes } from "./routes/events"
import { registerStorageRoutes } from "./routes/storage"
import { ServerMeta } from "../api-types"
import { InstanceStore } from "../storage/instance-store"

interface HttpServerDeps {
  host: string
  port: number
  workspaceManager: WorkspaceManager
  configStore: ConfigStore
  binaryRegistry: BinaryRegistry
  fileSystemBrowser: FileSystemBrowser
  eventBus: EventBus
  serverMeta: ServerMeta
  instanceStore: InstanceStore
  uiStaticDir: string
  uiDevServerUrl?: string
  logger: Logger
}


export function createHttpServer(deps: HttpServerDeps) {
  const app = Fastify({ logger: false })
  const proxyLogger = deps.logger.child({ component: "proxy" })

  const sseClients = new Set<() => void>()
  const registerSseClient = (cleanup: () => void) => {
    sseClients.add(cleanup)
    return () => sseClients.delete(cleanup)
  }
  const closeSseClients = () => {
    for (const cleanup of Array.from(sseClients)) {
      cleanup()
    }
    sseClients.clear()
  }

  app.register(cors, {
    origin: true,
    credentials: true,
  })

  registerWorkspaceRoutes(app, { workspaceManager: deps.workspaceManager })
  registerConfigRoutes(app, { configStore: deps.configStore, binaryRegistry: deps.binaryRegistry })
  registerFilesystemRoutes(app, { fileSystemBrowser: deps.fileSystemBrowser })
  registerMetaRoutes(app, { serverMeta: deps.serverMeta })
  registerEventRoutes(app, { eventBus: deps.eventBus, registerClient: registerSseClient })
  registerStorageRoutes(app, { instanceStore: deps.instanceStore })
  registerInstanceProxyRoutes(app, { workspaceManager: deps.workspaceManager, logger: proxyLogger })

  if (deps.uiDevServerUrl) {
    setupDevProxy(app, deps.uiDevServerUrl)
  } else {
    setupStaticUi(app, deps.uiStaticDir)
  }

  return {
    instance: app,
    start: () => app.listen({ port: deps.port, host: deps.host }),
    stop: () => {
      closeSseClients()
      return app.close()
    },
  }
}

interface InstanceProxyDeps {
  workspaceManager: WorkspaceManager
  logger: Logger
}

function registerInstanceProxyRoutes(app: FastifyInstance, deps: InstanceProxyDeps) {
  app.register(async (instance) => {
    instance.removeAllContentTypeParsers()
    instance.addContentTypeParser("*", { parseAs: "buffer" }, (req, body, done) => done(null, body))

    const proxyBaseHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      await proxyWorkspaceRequest({
        request,
        reply,
        workspaceManager: deps.workspaceManager,
        pathSuffix: "",
        logger: deps.logger,
      })
    }

    const proxyWildcardHandler = async (
      request: FastifyRequest<{ Params: { id: string; "*": string } }>,
      reply: FastifyReply,
    ) => {
      await proxyWorkspaceRequest({
        request,
        reply,
        workspaceManager: deps.workspaceManager,
        pathSuffix: request.params["*"] ?? "",
        logger: deps.logger,
      })
    }

    instance.all("/workspaces/:id/instance", proxyBaseHandler)
    instance.all("/workspaces/:id/instance/*", proxyWildcardHandler)
  })
}

const INSTANCE_PROXY_HOST = "127.0.0.1"
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD", "OPTIONS"])

async function proxyWorkspaceRequest(args: {
  request: FastifyRequest
  reply: FastifyReply
  workspaceManager: WorkspaceManager
  logger: Logger
  pathSuffix?: string
}) {
  const { request, reply, workspaceManager, logger } = args
  const workspaceId = (request.params as { id: string }).id
  const workspace = workspaceManager.get(workspaceId)

  if (!workspace) {
    reply.code(404).send({ error: "Workspace not found" })
    return
  }

  const port = workspaceManager.getInstancePort(workspaceId)
  if (!port) {
    reply.code(502).send({ error: "Workspace instance is not ready" })
    return
  }

  const normalizedSuffix = normalizeInstanceSuffix(args.pathSuffix)
  const queryIndex = (request.raw.url ?? "").indexOf("?")
  const search = queryIndex >= 0 ? (request.raw.url ?? "").slice(queryIndex) : ""
  const targetUrl = `http://${INSTANCE_PROXY_HOST}:${port}${normalizedSuffix}${search}`

  try {
    const abortController = new AbortController()
    const bodyPayload = METHODS_WITHOUT_BODY.has(request.method.toUpperCase())
      ? undefined
      : (request.body as Buffer | undefined)
    const headers = buildProxyHeaders(request.headers)
    if (bodyPayload && bodyPayload.byteLength > 0) {
      headers["content-length"] = String(bodyPayload.byteLength)
    } else {
      delete headers["content-length"]
    }
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: bodyPayload,
      signal: abortController.signal,
    })

    const headersToForward: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "content-length") {
        return
      }
      headersToForward[key] = value
    })

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase()
    const isEventStream = contentType.includes("text/event-stream")

    if (isEventStream && response.body) {
      reply.hijack()
      Object.entries(headersToForward).forEach(([key, value]) => reply.raw.setHeader(key, value))
      reply.raw.setHeader("Cache-Control", "no-cache")
      reply.raw.setHeader("Connection", "keep-alive")
      reply.raw.setHeader("Content-Type", "text/event-stream")
      reply.raw.writeHead(response.status)
      const stream = Readable.fromWeb(response.body as NodeReadableStream)
      const cleanup = () => {
        stream.destroy()
        abortController.abort()
      }
      request.raw.on("close", cleanup)
      request.raw.on("error", cleanup)
      stream.on("error", cleanup)
      stream.pipe(reply.raw)
      return
    }

    Object.entries(headersToForward).forEach(([key, value]) => reply.header(key, value))

    reply.code(response.status)

    if (request.method === "HEAD") {
      reply.send()
      abortController.abort()
      return
    }

    const bodyBuffer = Buffer.from(await response.arrayBuffer())
    reply.header("content-length", String(bodyBuffer.byteLength))
    reply.send(bodyBuffer)
    abortController.abort()
  } catch (error) {
    logger.error({ err: error, workspaceId, targetUrl }, "Failed to proxy workspace request")
    if (!reply.sent) {
      reply.code(502).send({ error: "Workspace instance proxy failed" })
    }
  }
}

function normalizeInstanceSuffix(pathSuffix: string | undefined) {
  if (!pathSuffix || pathSuffix === "/") {
    return "/"
  }
  const trimmed = pathSuffix.replace(/^\/+/, "")
  return trimmed.length === 0 ? "/" : `/${trimmed}`
}

function setupStaticUi(app: FastifyInstance, uiDir: string) {
  if (!uiDir) {
    app.log.warn("UI static directory not provided; API endpoints only")
    return
  }

  if (!fs.existsSync(uiDir)) {
    app.log.warn({ uiDir }, "UI static directory missing; API endpoints only")
    return
  }

  app.register(fastifyStatic, {
    root: uiDir,
    prefix: "/",
    decorateReply: false,
  })

  const indexPath = path.join(uiDir, "index.html")

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const url = request.raw.url ?? ""
    if (isApiRequest(url)) {
      reply.code(404).send({ message: "Not Found" })
      return
    }

    if (fs.existsSync(indexPath)) {
      reply.type("text/html").send(fs.readFileSync(indexPath, "utf-8"))
    } else {
      reply.code(404).send({ message: "UI bundle missing" })
    }
  })
}

function setupDevProxy(app: FastifyInstance, upstreamBase: string) {
  app.log.info({ upstreamBase }, "Proxying UI requests to development server")
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const url = request.raw.url ?? ""
    if (isApiRequest(url)) {
      reply.code(404).send({ message: "Not Found" })
      return
    }
    void proxyToDevServer(request, reply, upstreamBase)
  })
}

async function proxyToDevServer(request: FastifyRequest, reply: FastifyReply, upstreamBase: string) {
  try {
    const targetUrl = new URL(request.raw.url ?? "/", upstreamBase)
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: buildProxyHeaders(request.headers),
    })

    response.headers.forEach((value, key) => {
      reply.header(key, value)
    })

    reply.code(response.status)

    if (!response.body || request.method === "HEAD") {
      reply.send()
      return
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    reply.send(buffer)
  } catch (error) {
    request.log.error({ err: error }, "Failed to proxy UI request to dev server")
    if (!reply.sent) {
      reply.code(502).send("UI dev server is unavailable")
    }
  }
}

function isApiRequest(rawUrl: string | null | undefined) {
  if (!rawUrl) return false
  const pathname = rawUrl.split("?")[0] ?? ""
  return pathname === "/api" || pathname.startsWith("/api/")
}

function buildProxyHeaders(headers: FastifyRequest["headers"]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (!value || key.toLowerCase() === "host") continue
    result[key] = Array.isArray(value) ? value.join(",") : value
  }
  return result
}
