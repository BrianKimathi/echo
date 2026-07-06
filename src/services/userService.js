import { getAll, getById, updateById, removeById } from './dataService'
import { db } from '../firebase/config'
import { ref, set } from 'firebase/database'
import { DB_ROOT } from '../constants'

const PATH = 'users'
const userRef = (uid) => ref(db, `${DB_ROOT}/${PATH}/${uid}`)

export const userService = {
  create: async (uid, data) => {
    await set(userRef(uid), data)
    return uid
  },
  getAll: () => getAll(PATH),
  getById: (uid) => getById(PATH, uid),
  update: (uid, data) => updateById(PATH, uid, data),
  remove: (uid) => removeById(PATH, uid),
  toggleActive: async (uid, active) => updateById(PATH, uid, { active }),
}
