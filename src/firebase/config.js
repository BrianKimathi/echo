import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCDBAQvb-D1u_oupCEDhCOq8ufSQz6Vb_8',
  authDomain: 'kile-kitabu.firebaseapp.com',
  databaseURL: 'https://kile-kitabu-default-rtdb.firebaseio.com',
  projectId: 'kile-kitabu',
  storageBucket: 'kile-kitabu.appspot.com',
  messagingSenderId: '705930421981',
  appId: '1:705930421981:web:4836c009965119df6d5d34',
  measurementId: 'G-52Z41HG8DT',
}

export const app = initializeApp(firebaseConfig, 'primary')
export const auth = getAuth(app)
export const db = getDatabase(app)
export const storage = getStorage(app)

// Secondary app instance used to create new users without affecting the
// currently signed-in administrator session.
export const secondaryApp = initializeApp(firebaseConfig, 'secondary')
export const secondaryAuth = getAuth(secondaryApp)
