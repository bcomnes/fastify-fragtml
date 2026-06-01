/** @import { FastifyFragtml } from './types.js' */

import fp from 'fastify-plugin'
import { raw } from 'fragtml'
import { defineFastifyFragtmlOptions, defineFragtmlLayouts } from './lib/define-helpers.js'
import { fastifyFragtmlPlugin } from './lib/plugin.js'

const fastifyFragtml = /** @type {FastifyFragtml} */ (fp(fastifyFragtmlPlugin, {
  fastify: '5.x',
  name: 'fastify-fragtml',
}))

export { defineFastifyFragtmlOptions, defineFragtmlLayouts, fastifyFragtml, raw }
export default fastifyFragtml
