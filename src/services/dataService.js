import {
  ref,
  push,
  set,
  update,
  remove,
  get,
  query,
  orderByChild,
  equalTo,
  onValue,
  off,
} from 'firebase/database'
import { db } from '../firebase/config'
import { DB_ROOT } from '../constants'

const root = (path) => `${DB_ROOT}/${path}`

export const create = async (path, data) => {
  const nodeRef = push(ref(db, root(path)))
  await set(nodeRef, data)
  return nodeRef.key
}

export const setById = async (path, id, data) => {
  await set(ref(db, `${root(path)}/${id}`), data)
  return id
}

export const updateById = async (path, id, data) => {
  await update(ref(db, `${root(path)}/${id}`), data)
  return id
}

export const removeById = async (path, id) => {
  await remove(ref(db, `${root(path)}/${id}`))
  return id
}

export const getById = async (path, id) => {
  const snap = await get(ref(db, `${root(path)}/${id}`))
  return snap.exists() ? { id: snap.key, ...snap.val() } : null
}

export const getAll = async (path) => {
  const snap = await get(ref(db, root(path)))
  if (!snap.exists()) return []
  const val = snap.val()
  return Object.entries(val).map(([id, item]) => ({ id, ...item }))
}

export const listenAll = (path, cb) => {
  const nodeRef = ref(db, root(path))
  const handler = (snap) => {
    if (!snap.exists()) return cb([])
    const val = snap.val()
    cb(Object.entries(val).map(([id, item]) => ({ id, ...item })))
  }
  onValue(nodeRef, handler)
  return () => off(nodeRef, 'value', handler)
}

export const searchByField = async (path, field, value) => {
  const q = query(ref(db, root(path)), orderByChild(field), equalTo(value))
  const snap = await get(q)
  if (!snap.exists()) return []
  const val = snap.val()
  return Object.entries(val).map(([id, item]) => ({ id, ...item }))
}

export const textSearch = (items, fields, term) => {
  if (!term) return items
  const t = term.toLowerCase()
  return items.filter((item) =>
    fields.some((f) => String(item[f] ?? '').toLowerCase().includes(t)),
  )
}
