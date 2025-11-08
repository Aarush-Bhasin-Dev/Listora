// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
  import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyC4NhgL-O7qxR5_MNh01_2G1kt0C7CEAhc",
    authDomain: "listora-7548c.firebaseapp.com",
    projectId: "listora-7548c",
    storageBucket: "listora-7548c.firebasestorage.app",
    messagingSenderId: "819578298903",
    appId: "1:819578298903:web:85fb730ba00e332092b252",
    measurementId: "G-RF4KB9QER8"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  // Sign-up form:

  const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupSubmit = document.getElementById('signupSubmit');   


submit.addEventListener("click",function(event){
 event.preventDefault()
 ;
 signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Signed up 
    const user = userCredential.user;
    alert("User Registered Successfully");
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    // ..
  });

})
  
