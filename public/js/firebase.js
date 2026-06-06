// Firebase - Rita Oliveira Manicure
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  set,
  get,
  child,
  onValue,
  update,
  remove,
  query,
  orderByChild,
  equalTo
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAbeSCtc8Dszdce8HLKLs0_2et-iJhRn9I",
  authDomain: "rita-oliveira-manicure.firebaseapp.com",
  databaseURL: "https://rita-oliveira-manicure-default-rtdb.firebaseio.com",
  projectId: "rita-oliveira-manicure",
  storageBucket: "rita-oliveira-manicure.firebasestorage.app",
  messagingSenderId: "967331970592",
  appId: "1:967331970592:web:c94fa851c14a52e5558645",
  measurementId: "G-X4ML1W320E"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export {
  db,
  ref,
  push,
  set,
  get,
  child,
  onValue,
  update,
  remove,
  query,
  orderByChild,
  equalTo
};