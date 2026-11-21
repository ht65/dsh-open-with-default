/**
 * Default-app chooser Host half.
 *
 * Stores one preference per file type in DSH storage, reports the preferred
 * application as the default in the existing open-in-app query, and routes a
 * default open through that application. Windows file associations are left
 * untouched.
 */
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { z } from 'zod'
import { nativeFileApplications } from '@deepseek-ai/dsh-native-command'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'

export const name = 'open-with-default'
export const inject = ['sessionController', 'storageDomain', 'webServer', 'connection']

const STATE_ROUTE = '/open-with-default/state'
const SET_ROUTE = '/open-with-default/set'
const LIBRARY_ROUTE = '/open-with-default/library'
const EXT_APPS_ROUTE = '/open-with-default/apps'
const EXT_SET_ROUTE = '/open-with-default/set-ext'
const DELETE_ROUTE = '/open-with-default/delete'
const EXTENSION_PATTERN = /^[a-z0-9]{1,12}$/
const MAX_BODY_BYTES = 64 * 1024
const ASSOCIATION_TIMEOUT_MS = 20_000
const ASSOCIATION_CACHE_MS = 15_000

const preferenceSchema = z.object({
  applicationId: z.string(),
  applicationName: z.string().optional(),
  updatedAt: z.string(),
})

const domainSpec = defineDomain({
  name: 'open_with_default',
  version: 1,
  tables: { preferences: domainTable(preferenceSchema) },
})

/** Final path component, for both Windows and POSIX paths. */
function baseName(path) {
  return path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
}

/**
 * Identify a preference class: the extension when the name has one, otherwise
 * the exact name. Lower-casing keeps `.PNG` and `.png` together.
 */
function classOf(path) {
  const fileName = baseName(path)
  const dot = fileName.lastIndexOf('.')
  if (dot > 0 && dot < fileName.length - 1) {
    return { scope: 'extension', key: `ext:${fileName.slice(dot + 1).toLowerCase()}`, extension: `.${fileName.slice(dot + 1)}` }
  }
  return { scope: 'file', key: `name:${fileName.toLowerCase()}`, extension: '' }
}

/** Normalize a user-entered extension; null when it is not a simple suffix. */
function normalizeExtension(value) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/^\.+/, '')
  return EXTENSION_PATTERN.test(raw) ? raw : null
}

/**
 * Run a Shell association query against an empty probe file with the wanted
 * extension. The file exists only for the query and is removed afterwards.
 */
async function withProbeFile(extension, run) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-open-with-default-'))
  const path = join(directory, `probe.${extension}`)
  try {
    await writeFile(path, '')
    return await run(path)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

/**
 * Mark the operating system's handler and the DSH override independently, so
 * the picker can label both without either hiding the other.
 */
function presentApplications(apps, preference) {
  const systemDefaultId = apps.find((app) => app.default)?.id
  const withSystemDefault = apps.map((app) => ({
    ...app,
    systemDefault: app.id === systemDefaultId,
  }))
  if (preference === undefined) return withSystemDefault
  const chosen = withSystemDefault.find((app) => app.id === preference.applicationId)
    ?? withSystemDefault.find((app) => preference.applicationName !== undefined
      && app.name === preference.applicationName)
  if (chosen === undefined) return withSystemDefault
  return withSystemDefault.map((app) => app.id === chosen.id
    ? { ...app, default: true }
    : app.default ? { ...app, default: false } : app)
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function sendMethodNotAllowed(res, allow) {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.end()
}

async function readBoundedBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) {
      req.resume()
      return null
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, size).toString('utf8')
}

function parseSetBody(text) {
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof body !== 'object' || body === null) return null
  const { path, applicationId, applicationName } = body
  if (typeof path !== 'string' || path.length === 0) return null
  if (applicationId !== null && typeof applicationId !== 'string') return null
  if (applicationId !== null && applicationId.length === 0) return null
  if (applicationName !== undefined && typeof applicationName !== 'string') return null
  return { path, applicationId, applicationName }
}

/** Validate a settings-page rule deletion. */
function parseDeleteBody(text) {
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof body !== 'object' || body === null || typeof body.key !== 'string') return null
  return /^(ext:[a-z0-9]{1,12}|name:.{1,255})$/u.test(body.key) ? body.key : null
}
function parseExtensionSetBody(text) {
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof body !== 'object' || body === null) return null
  const extension = normalizeExtension(body.extension)
  const { applicationId, applicationName } = body
  if (extension === null) return null
  if (applicationId !== null && typeof applicationId !== 'string') return null
  if (applicationId !== null && applicationId.length === 0) return null
  if (applicationName !== undefined && typeof applicationName !== 'string') return null
  return { extension, applicationId, applicationName }
}

async function isExistingFile(path) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

export function apply(ctx) {
  const domainReady = ctx.storageDomain.open(domainSpec)
  ctx.effect(() => () => {
    void domainReady.then((opened) => opened.close()).catch(() => {})
  }, 'open-with-default: preference domain')

  const preferences = async () => (await domainReady).table('preferences')

  /**
   * Last raw Shell answer per association class. A successful save primes it
   * with the handler list it just read, so the remounted native control
   * resolves immediately instead of waiting for another PowerShell query.
   */
  const associationCache = new Map()

  /** Raw handlers for one simple extension, queried through a short-lived probe file. */
  const rawExtensionApplications = async (extension, signal) => {
    const key = `ext:${extension}`
    const cached = associationCache.get(key)
    if (cached !== undefined && cached.expiresAt > Date.now()) return cached.apps
    const apps = await withProbeFile(extension, (path) => nativeFileApplications(
      path, signal ?? AbortSignal.timeout(ASSOCIATION_TIMEOUT_MS),
    ))
    associationCache.set(key, { apps, expiresAt: Date.now() + ASSOCIATION_CACHE_MS })
    return apps
  }

  /** All stored overrides, for the settings page. */
  const library = async () => {
    const table = await preferences()
    const entries = []
    for (const [key, record] of table.entries()) {
      if (key.startsWith('ext:')) {
        entries.push({
          key, scope: 'extension', extension: `.${key.slice(4)}`, name: '',
          applicationId: record.applicationId,
          applicationName: record.applicationName ?? record.applicationId,
          updatedAt: record.updatedAt,
        })
      } else if (key.startsWith('name:')) {
        entries.push({
          key, scope: 'file', extension: '', name: key.slice(5),
          applicationId: record.applicationId,
          applicationName: record.applicationName ?? record.applicationId,
          updatedAt: record.updatedAt,
        })
      }
    }
    entries.sort((left, right) => left.key.localeCompare(right.key, 'en'))
    return entries
  }

  const preferenceFor = async (path) => {
    if (typeof path !== 'string' || path.length === 0) return undefined
    try {
      return (await preferences()).get(classOf(path).key)
    } catch {
      return undefined
    }
  }

  const rejected = (req, res) => {
    const rejection = ctx.connection.requestRejection(req)
    if (rejection === undefined) return false
    res.statusCode = rejection
    res.end()
    return true
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: STATE_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      try {
        const path = new URL(String(req.url), 'http://localhost').searchParams.get('path') ?? ''
        if (!isAbsolute(path)) {
          sendJson(res, 400, { code: 'bad-request', message: 'path must be absolute' })
          return
        }
        const pref = await preferenceFor(path)
        const info = classOf(path)
        sendJson(res, 200, {
          ok: true,
          scope: info.scope,
          key: info.key,
          preference: pref ?? null,
        })
      } catch (error) {
        ctx.logger.warn(`open-with-default: state read failed: ${String(error)}`)
        sendJson(res, 500, { code: 'internal', message: 'state read failed' })
      }
    },
  }), `open-with-default: GET ${STATE_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: SET_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'POST') {
        sendMethodNotAllowed(res, 'POST')
        return
      }
      try {
        const essence = String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
        if (essence !== 'application/json') {
          sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
          return
        }
        const text = await readBoundedBody(req)
        if (text === null) {
          sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' })
          return
        }
        const body = parseSetBody(text)
        if (body === null) {
          sendJson(res, 400, { code: 'bad-request', message: 'body must contain an absolute path and applicationId or null' })
          return
        }
        if (!isAbsolute(body.path) || !await isExistingFile(body.path)) {
          sendJson(res, 400, { code: 'not-found', message: 'path does not name an existing file' })
          return
        }
        const info = classOf(body.path)
        const table = await preferences()
        if (body.applicationId === null) {
          await table.delete(info.key)
          sendJson(res, 200, { ok: true, scope: info.scope, key: info.key, preference: null })
          return
        }
        let applications
        const cached = associationCache.get(info.key)
        if (cached !== undefined && cached.expiresAt > Date.now()) {
          applications = cached.apps
        } else {
          try {
            applications = await nativeFileApplications(body.path, AbortSignal.timeout(ASSOCIATION_TIMEOUT_MS))
            associationCache.set(info.key, { apps: applications, expiresAt: Date.now() + ASSOCIATION_CACHE_MS })
          } catch (error) {
            ctx.logger.warn(`open-with-default: association query failed: ${String(error)}`)
            sendJson(res, 502, { code: 'query-failed', message: 'could not read registered applications' })
            return
          }
        }
        const selected = applications.find((app) => app.id === body.applicationId)
          ?? (body.applicationName ? applications.find((app) => app.name === body.applicationName) : undefined)
        if (selected === undefined) {
          sendJson(res, 400, { code: 'unknown-application', message: 'application is not registered for this file' })
          return
        }
        associationCache.set(info.key, { apps: applications, expiresAt: Date.now() + ASSOCIATION_CACHE_MS })
        const record = {
          applicationId: selected.id,
          applicationName: selected.name,
          updatedAt: new Date().toISOString(),
        }
        await table.put(info.key, record)
        sendJson(res, 200, { ok: true, scope: info.scope, key: info.key, preference: record })
      } catch (error) {
        ctx.logger.warn(`open-with-default: preference write failed: ${String(error)}`)
        sendJson(res, 500, { code: 'internal', message: 'preference write failed' })
      }
    },
  }), `open-with-default: POST ${SET_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: LIBRARY_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      try {
        sendJson(res, 200, { ok: true, preferences: await library() })
      } catch (error) {
        ctx.logger.warn(`open-with-default: library read failed: ${String(error)}`)
        sendJson(res, 500, { code: 'internal', message: 'library read failed' })
      }
    },
  }), `open-with-default: GET ${LIBRARY_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: EXT_APPS_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      try {
        const extension = normalizeExtension(new URL(String(req.url), 'http://localhost').searchParams.get('ext'))
        if (extension === null) {
          sendJson(res, 400, { code: 'bad-request', message: 'ext must be a simple file extension' })
          return
        }
        const apps = await rawExtensionApplications(extension)
        const preference = await preferenceFor(`probe.${extension}`)
        sendJson(res, 200, {
          ok: true,
          extension: `.${extension}`,
          apps: presentApplications(apps, preference),
          preference: preference ?? null,
        })
      } catch (error) {
        ctx.logger.warn(`open-with-default: extension query failed: ${String(error)}`)
        sendJson(res, 502, { code: 'query-failed', message: 'could not read registered applications' })
      }
    },
  }), `open-with-default: GET ${EXT_APPS_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: EXT_SET_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'POST') {
        sendMethodNotAllowed(res, 'POST')
        return
      }
      try {
        const essence = String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
        if (essence !== 'application/json') {
          sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
          return
        }
        const text = await readBoundedBody(req)
        if (text === null) {
          sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' })
          return
        }
        const body = parseExtensionSetBody(text)
        if (body === null) {
          sendJson(res, 400, { code: 'bad-request', message: 'body must contain a simple extension and applicationId or null' })
          return
        }
        const key = `ext:${body.extension}`
        const table = await preferences()
        if (body.applicationId === null) {
          await table.delete(key)
          sendJson(res, 200, { ok: true, extension: `.${body.extension}`, preference: null })
          return
        }
        const apps = await rawExtensionApplications(body.extension)
        const selected = apps.find((app) => app.id === body.applicationId)
          ?? (body.applicationName ? apps.find((app) => app.name === body.applicationName) : undefined)
        if (selected === undefined) {
          sendJson(res, 400, { code: 'unknown-application', message: 'application is not registered for this extension' })
          return
        }
        const record = {
          applicationId: selected.id,
          applicationName: selected.name,
          updatedAt: new Date().toISOString(),
        }
        await table.put(key, record)
        sendJson(res, 200, { ok: true, extension: `.${body.extension}`, preference: record })
      } catch (error) {
        ctx.logger.warn(`open-with-default: extension write failed: ${String(error)}`)
        sendJson(res, 500, { code: 'internal', message: 'extension write failed' })
      }
    },
  }), `open-with-default: POST ${EXT_SET_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: DELETE_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'POST') {
        sendMethodNotAllowed(res, 'POST')
        return
      }
      try {
        const essence = String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
        if (essence !== 'application/json') {
          sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
          return
        }
        const text = await readBoundedBody(req)
        if (text === null) {
          sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' })
          return
        }
        const key = parseDeleteBody(text)
        if (key === null) {
          sendJson(res, 400, { code: 'bad-request', message: 'body must contain a supported preference key' })
          return
        }
        await (await preferences()).delete(key)
        sendJson(res, 200, { ok: true, key })
      } catch (error) {
        ctx.logger.warn(`open-with-default: preference delete failed: ${String(error)}`)
        sendJson(res, 500, { code: 'internal', message: 'preference delete failed' })
      }
    },
  }), `open-with-default: POST ${DELETE_ROUTE}`)

  const service = ctx.sessionController
  const originalService = service[Symbol.for('cordis.original')] ?? service
  const prototype = Object.getPrototypeOf(originalService)
  // Use the class prototype, not the current instance property: an older
  // generation of this plugin can leave its wrapper behind, and the system
  // default must always come from the unpatched Session query.
  const originalApplications = typeof prototype.workspacePathApplications === 'function'
    ? prototype.workspacePathApplications
    : originalService.workspacePathApplications
  const originalOpen = typeof prototype.openWorkspacePath === 'function'
    ? prototype.openWorkspacePath
    : originalService.openWorkspacePath

  /**
   * Raw Shell handlers for one path, reusing the cache a save or a recent
   * preview query filled. Calls the unpatched Session method so the Shell's
   * own default flag is preserved for the separate `systemDefault` marker.
   */
  const associationFor = async (service, path, signal) => {
    if (typeof path !== 'string' || path.length === 0) {
      return originalApplications.call(service, { path }, signal)
    }
    const info = classOf(path)
    const cached = associationCache.get(info.key)
    if (cached !== undefined && cached.expiresAt > Date.now()) return cached.apps
    const apps = await originalApplications.call(service, { path }, signal)
    if (Array.isArray(apps) && signal?.aborted !== true) {
      associationCache.set(info.key, { apps, expiresAt: Date.now() + ASSOCIATION_CACHE_MS })
    }
    return apps
  }

  ctx.effect(() => {
    const applications = async function (request, signal) {
      const result = await associationFor(this, request?.path, signal)
      if (!Array.isArray(result)) return result
      return presentApplications(result, await preferenceFor(request?.path))
    }
    const openWorkspacePath = async function (request, signal) {
      if (request !== null && typeof request === 'object' && request.action !== 'reveal' && request.application === undefined) {
        const preference = await preferenceFor(request.path)
        if (preference !== undefined) {
          try {
            // Resolve against a fresh handler list so the id handed to the
            // Shell's validation is the one it currently reports, even when a
            // packaged app alternates between a path and a display name.
            const apps = await originalApplications.call(this, { path: request.path }, signal)
            const chosen = Array.isArray(apps)
              ? apps.find((app) => app.id === preference.applicationId)
                ?? apps.find((app) => preference.applicationName !== undefined && app.name === preference.applicationName)
              : undefined
            if (chosen !== undefined) {
              return await originalOpen.call(this, { ...request, application: chosen.id }, signal)
            }
          } catch (error) {
            if (signal?.aborted) throw error
            // A path or Shell query failure falls through to the OS default.
            ctx.logger.warn(`open-with-default: preferred application resolution failed, using system default: ${String(error)}`)
          }
        }
      }
      return originalOpen.call(this, request, signal)
    }
    Object.defineProperty(originalService, 'workspacePathApplications', {
      configurable: true,
      writable: true,
      value: applications,
    })
    Object.defineProperty(originalService, 'openWorkspacePath', {
      configurable: true,
      writable: true,
      value: openWorkspacePath,
    })
    return () => {
      if (originalService.workspacePathApplications === applications) delete originalService.workspacePathApplications
      if (originalService.openWorkspacePath === openWorkspacePath) delete originalService.openWorkspacePath
    }
  }, 'open-with-default: session open hooks')
}
