/** @import { DefineFastifyFragtmlOptions, DefineFragtmlLayouts, FastifyFragtmlOptions } from '../types.js' */

/**
 * @param {Record<string, unknown>} [layouts]
 * @returns {unknown}
 */
const defineFragtmlLayoutsImpl = layouts => {
  if (layouts === undefined) {
    /**
     * @param {Record<string, unknown>} value
     * @returns {Record<string, unknown>}
     */
    return function defineLayouts (value) {
      return value
    }
  }

  return layouts
}

/**
 * @param {FastifyFragtmlOptions} options
 * @returns {FastifyFragtmlOptions}
 */
const defineFastifyFragtmlOptionsImpl = options => options

const defineFragtmlLayouts = /** @type {DefineFragtmlLayouts} */ (defineFragtmlLayoutsImpl)
const defineFastifyFragtmlOptions = /** @type {DefineFastifyFragtmlOptions} */ (defineFastifyFragtmlOptionsImpl)

export { defineFastifyFragtmlOptions, defineFragtmlLayouts }
