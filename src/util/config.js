//import firebase from 'firebase/compat/app';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import 'firebase/compat/firestore';
console.log('fouth last');
const appFirebase = initializeApp({
  apiKey: 'AIzaSyCv2JKIQUiE7Qv1WV0UsqkuDo5J9aK8yEc',

  authDomain: 'socialapp-4276f.firebaseapp.com',

  databaseURL: 'https://socialapp-4276f.firebaseio.com',

  projectId: 'socialapp-4276f',

  storageBucket: 'socialapp-4276f.appspot.com',

  messagingSenderId: '610276974111',

  appId: '1:610276974111:web:2acdc1fefe71d5052b3f2a',

  measurementId: 'G-6V6R4WQPQQ',
});

console.log('third last');
const auth = getAuth(appFirebase);
//auth.setPersistence(browserLocalPersistence);
console.log('second last');
//const firestore = appFirebase.firestore();
console.log('last');
/*console.log(appFirebase, 'appFirebase');
const appFirestore = appFirebase;
console.log(appFirestore, 'appFirestore');*/
export { auth, createUserWithEmailAndPassword };
