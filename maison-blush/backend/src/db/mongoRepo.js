const isId = (v) => /^[a-f\d]{24}$/i.test(String(v))
const norm = (d) => { if (!d) return null; const { _id, __v, ...rest } = d; return { id: String(_id), ...rest } }
const toFilter = (filter = {}) => { const { id, ...rest } = filter; return id !== undefined ? { _id: id, ...rest } : rest }

/** Mongoose Model ko wahi chhota interface deta hai jo memoryRepo deta hai. Baqi code DB ke baare mein kuch nahi jaanta. */
export function mongoRepo(Model) {
  return {
    async find(filter = {}, { sort, skip = 0, limit = 0, select } = {}) {
      let q = Model.find(toFilter(filter))
      if (select) q = q.select(select)
      if (sort) q = q.sort(sort)
      if (skip) q = q.skip(skip)
      if (limit) q = q.limit(limit)
      return (await q.lean()).map(norm)
    },
    async findOne(filter) { return norm(await Model.findOne(toFilter(filter)).lean()) },
    count: (filter = {}) => Model.countDocuments(toFilter(filter)),
    async get(id) { return isId(id) ? norm(await Model.findById(id).lean()) : null },
    async create(data) { const doc = await Model.create(data); return norm(doc.toObject()) },
    async atomicUpdate(filter, update) {
      return norm(await Model.findOneAndUpdate(toFilter(filter), update, { new: true, runValidators: true }).lean())
    },
    async update(id, patch) { return isId(id) ? this.atomicUpdate({ id }, { $set: patch }) : null },
    async remove(id) { return isId(id) ? Boolean(await Model.findByIdAndDelete(id)) : false },
    async removeMany(filter) { return (await Model.deleteMany(toFilter(filter))).deletedCount },
  }
}
