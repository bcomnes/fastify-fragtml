/** @import { FastifyInstance, FastifyReply } from 'fastify' */
/** @import { FastifyFragtmlOptions, FragtmlLayout, FragtmlLayoutObject, FragtmlRenderable, FragtmlRenderOptions, FragtmlTemplate } from '../types.js' */

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
  const propertyName = opts.propertyName ?? 'render'
  const charset = opts.charset ?? 'utf-8'
  const defaultContentType = opts.contentType === undefined
    ? `text/html; charset=${charset}`
    : opts.contentType
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

  fastify.decorateReply(propertyName, replyRender)

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
   * @returns {Promise<string>}
   */
  async function replyRender (template, data, renderOptions) {
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
    const resolvedLayout = input.renderOptions.layout === false
      ? null
      : resolveLayout(input.renderOptions.layout ?? globalLayout)
    const output = resolvedLayout
      ? await resolvedLayout.render(result, input.context, input.renderOptions)
      : result
    let html = await fragtml.render(output)

    if (minify && !isPathExcludedFromMinify(reply)) {
      html = await minify(html, minifyOptions)
    }

    const contentType = input.renderOptions.contentType ??
      resolvedLayout?.contentType ??
      defaultContentType

    if (reply && !reply.getHeader('Content-Type') && contentType !== false) {
      reply.header('Content-Type', contentType)
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
   * @returns {FragtmlLayoutObject | null}
   */
  function resolveLayout (layout) {
    if (layout == null || layout === false) return null

    if (typeof layout === 'string') {
      const namedLayout = layouts[layout]

      if (!isLayout(namedLayout)) {
        throw new Error(`Unknown layout "${layout}"`)
      }

      return normalizeLayout(namedLayout)
    }

    if (!isLayout(layout)) {
      throw new Error('Invalid layout')
    }

    return normalizeLayout(layout)
  }

  /**
   * @param {unknown} layout
   * @returns {layout is FragtmlLayout}
   */
  function isLayout (layout) {
    const candidate = /** @type {{ render?: unknown }} */ (layout)

    return typeof layout === 'function' ||
      (typeof layout === 'object' && layout !== null && typeof candidate.render === 'function')
  }

  /**
   * @param {FragtmlLayout} layout
   * @returns {FragtmlLayoutObject}
   */
  function normalizeLayout (layout) {
    return typeof layout === 'function'
      ? { render: layout }
      : layout
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
