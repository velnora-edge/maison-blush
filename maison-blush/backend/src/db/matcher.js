// Chota MongoDB-style filter matcher — sirf test wali in-memory DB ke liye. Asli MongoDB apna query engine use karta hai.
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
const val = (v) => (v instanceof Date ? v.getTime() : v)

function matchField(actual, cond) {
  if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond) && Object.keys(cond).some((k) => k.startsWith('$'))) {
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case '$in': return arg.some((a) => val(a) === val(actual))
        case '$nin': return !arg.some((a) => val(a) === val(actual))
        case '$ne': return val(actual) !== val(arg)
        case '$gt': return actual != null && val(actual) > val(arg)
        case '$gte': return actual != null && val(actual) >= val(arg)
        case '$lt': return actual != null && val(actual) < val(arg)
        case '$lte': return actual != null && val(actual) <= val(arg)
        case '$exists': return (actual !== undefined) === Boolean(arg)
        case '$regex': return typeof actual === 'string' && new RegExp(arg, cond.$options || '').test(actual)
        case '$options': return true
        default: throw new Error(`Unsupported operator ${op}`)
      }
    })
  }
  if (Array.isArray(actual)) return actual.some((a) => val(a) === val(cond))
  return val(actual) === val(cond)
}

export function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some((f) => matches(doc, f))
    if (key === '$and') return cond.every((f) => matches(doc, f))
    return matchField(get(doc, key), cond)
  })
}
export { get as getPath }
