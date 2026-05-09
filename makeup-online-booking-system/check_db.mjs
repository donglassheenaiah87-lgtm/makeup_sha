import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAlos4rj_yaO84h7CrgZpqRiKejTiQrUmQ",
  authDomain: "my-makeupservice-project.firebaseapp.com",
  projectId: "my-makeupservice-project",
  storageBucket: "my-makeupservice-project.firebasestorage.app",
  messagingSenderId: "1048905694112",
  appId: "1:1048905694112:web:e71199d03533d8909e82c5",
  measurementId: "G-QQP0V023EZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("Fetching users...");
  try {
    const snap = await getDocs(collection(db, "users"));
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log("Total users found:", users.length);
    console.log("Users:");
    users.forEach(u => console.log(JSON.stringify(u, null, 2)));

    const artistsSnap = await getDocs(collection(db, "artists"));
    console.log("Total artists collection found:", artistsSnap.docs.length);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

check();
