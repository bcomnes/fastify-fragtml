/** @import { FastifyInstance, FastifyReply } from 'fastify' */
/** @import { FastifyFragtmlOptions, FragtmlLayout, FragtmlRenderable, FragtmlRenderOptions, FragtmlTemplate } from '../types.js' */

import { raw, render as defaultRender } from 'fragtml'

const defaultFragtml = {
  raw,
  render: defaultRender,
}

/**
 * @param {FastifyInstance} fastify
 * @param {FastifyFragtmlOptions} [opts]
 */
async function fastifyFragtmlPlugin (fastify, opts = {}) {
  const localsStore = new WeakMap()
  const defaultContext = opts.defaultContext ?? {}
  const propertyName = opts.propertyName ?? 'view'
  const asyncPropertyName = opts.asyncPropertyName ?? `${propertyName}Async`
  const charset = opts.charset ?? 'utf-8'
  const fragtml = opts.fragtml ?? defaultFragtml
  const layouts = opts.layouts ?? {}
  const globalLayout = opts.layout
  const htmlMinifier = opts.options?.useHtmlMinifier
  const minify = opts.minify ?? (
    typeof htmlMinifier === 'function'
      ? htmlMinifier
      : typeof htmlMinifier?.minify === 'function'
        ? htmlMinifier.minify.bind(htmlMinifier)
        : null
  )
  const minifyOptions = opts.minifyOptions ?? opts.options?.htmlMinifierOptions
  const minifyExcludedPaths = new Set([
    ...(opts.pathsToExcludeMinify ?? []),
    ...(opts.options?.pathsToExcludeHtmlMinifier ?? []),
  ])

  if (typeof globalLayout === 'string') {
    resolveLayout(globalLayout)
  }

  /**
   * @this {FastifyInstance}
   * @param {FragtmlTemplate | FragtmlRenderable} template
   * @param {Record<string, unknown>} [data]
   * @param {FragtmlRenderOptions} [renderOptions]
   * @param {(err: Error | null, html?: string) => void} [done]
   * @returns {Promise<string> | void}
   */
  function instanceRender (template, data, renderOptions, done) {
    const promise = renderTemplate(null, template, data, renderOptions)

    if (typeof done === 'function') {
      promise.then(html => done(null, html), done)
      return
    }

    return promise
  }

  instanceRender.clearCache = function clearCache () {}

  fastify.decorate(propertyName, instanceRender)

  fastify.decorateReply(propertyName, replyRender)
  fastify.decorateReply(asyncPropertyName, replyRenderAsync)

  if (!fastify.hasReplyDecorator('locals')) {
    fastify.decorateReply('locals', {
      /**
       * @this {FastifyReply}
       * @returns {Record<string, unknown>}
       */
      getter () {
        let locals = localsStore.get(this)
        if (!locals) {
          locals = {}
          localsStore.set(this, locals)
        }
        return locals
      },
      /**
       * @this {FastifyReply}
       * @param {Record<string, unknown>} value
       */
      setter (value) {
        localsStore.set(this, value ?? {})
      },
    })
  }

  /**
   * @this {FastifyReply}
   * @param {FragtmlTemplate | FragtmlRenderable} template
   * @param {Record<string, unknown>} [data]
   * @param {FragtmlRenderOptions} [renderOptions]
   * @returns {Promise<FastifyReply>}
   */
  async function replyRender (template, data, renderOptions) {
    try {
      const html = await renderTemplate(this, template, data, renderOptions)
      this.send(html)
    } catch (err) {
      this.send(err)
    }

    return this
  }

  /**
   * @this {FastifyReply}
   * @param {FragtmlTemplate | FragtmlRenderable} template
   * @param {Record<string, unknown>} [data]
   * @param {FragtmlRenderOptions} [renderOptions]
   * @returns {Promise<string>}
   */
  async function replyRenderAsync (template, data, renderOptions) {
    return renderTemplate(this, template, data, renderOptions)
  }

  /**
   * @param {FastifyReply | null} reply
   * @param {FragtmlTemplate | FragtmlRenderable} template
   * @param {Record<string, unknown>} [data]
   * @param {FragtmlRenderOptions} [renderOptions]
   * @returns {Promise<string>}
   */
  async function renderTemplate (reply, template, data = {}, renderOptions = {}) {
    const input = normalizeRenderInput(reply, data, renderOptions)

    const result = typeof template === 'function'
      ? await template(input.templateData, input.renderOptions)
      : template
    const layout = input.renderOptions.layout === false
      ? null
      : resolveLayout(input.renderOptions.layout ?? globalLayout)
    const output = layout
      ? await layout(result, input.context, input.renderOptions)
      : result
    let html = await fragtml.render(output)

    if (minify && !isPathExcludedFromMinify(reply)) {
      html = await minify(html, minifyOptions)
    }

    if (reply && !reply.getHeader('Content-Type')) {
      reply.header('Content-Type', `text/html; charset=${charset}`)
    }

    return html
  }

  /**
   * @param {FastifyReply | null} reply
   * @param {Record<string, unknown>} data
   * @param {FragtmlRenderOptions} renderOptions
   * @returns {{ context: Record<string, unknown>, renderOptions: FragtmlRenderOptions, templateData: Record<string, unknown> }}
   */
  function normalizeRenderInput (reply, data, renderOptions) {
    if (isContextArgs(data)) {
      const context = {
        ...defaultContext,
        ...(reply?.locals ?? {}),
        ...data.context,
      }
      const fragmentId = data.fragmentId ?? renderOptions.fragmentId
      const nextRenderOptions = {
        ...renderOptions,
        ...(fragmentId === undefined ? {} : { fragmentId }),
      }
      const templateData = {
        ...data,
        context,
        ...(fragmentId === undefined ? {} : { fragmentId }),
      }

      return {
        context,
        renderOptions: nextRenderOptions,
        templateData,
      }
    }

    const context = {
      ...defaultContext,
      ...(reply?.locals ?? {}),
      ...data,
    }

    return {
      context,
      renderOptions,
      templateData: context,
    }
  }

  /**
   * @param {FragtmlRenderOptions['layout']} layout
   * @returns {FragtmlLayout | null | undefined}
   */
  function resolveLayout (layout) {
    if (layout == null || layout === false) return null

    if (typeof layout === 'string') {
      const namedLayout = layouts[layout]

      if (typeof namedLayout !== 'function') {
        throw new Error(`Unknown layout "${layout}"`)
      }

      return namedLayout
    }

    return layout
  }

  /**
   * @param {FastifyReply | null} reply
   * @returns {boolean}
   */
  function isPathExcludedFromMinify (reply) {
    if (!reply || minifyExcludedPaths.size === 0) return false
    const path = reply.request.routeOptions.url
    return typeof path === 'string' && minifyExcludedPaths.has(path)
  }

  /**
   * @param {Record<string, unknown>} data
   * @returns {data is { context: Record<string, unknown>, fragmentId?: string }}
   */
  function isContextArgs (data) {
    return typeof data['context'] === 'object' && data['context'] !== null && !Array.isArray(data['context'])
  }
}

export { fastifyFragtmlPlugin }
