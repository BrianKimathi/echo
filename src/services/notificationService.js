import { create, getAll, removeById } from './dataService'

const PATH = 'notifications'

export const notificationService = {
  create: (data) => create(PATH, { ...data, createdAt: Date.now(), read: false }),
  getAll: () => getAll(PATH),
  remove: (id) => removeById(PATH, id),
  push: (message, type = 'info', forRole = null) =>
    create(PATH, { message, type, forRole, createdAt: Date.now(), read: false }),
}
