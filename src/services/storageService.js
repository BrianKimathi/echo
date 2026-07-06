import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'

const ROOT = 'tuktukSales'

export const uploadImage = async (path, file) => {
  const storageRef = ref(storage, `${ROOT}/${path}/${Date.now()}-${file.name}`)
  const snap = await uploadBytes(storageRef, file)
  return getDownloadURL(snap.ref)
}

export const uploadDocument = async (path, file) => {
  const storageRef = ref(storage, `${ROOT}/${path}/${Date.now()}-${file.name}`)
  const snap = await uploadBytes(storageRef, file)
  return { name: file.name, url: await getDownloadURL(snap.ref) }
}

export const uploadMany = async (path, files = []) => {
  const results = []
  for (const file of files) {
    results.push(await uploadDocument(path, file))
  }
  return results
}
