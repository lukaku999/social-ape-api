const admin = require('firebase-admin')

//const firebase = require('firebase')
const serviceAccount = require('../socialapp-4276f-firebase-adminsdk-td1l2-4a9e9bccb0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "socialapp-4276f.appspot.com"
});

const db = admin.firestore()
module.exports = {admin, db}

///https://console.firebase.google.com/u/0/project/socialappv2-53f6e/settings/serviceaccounts/adminsdk