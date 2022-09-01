const cookieParser = require('cookie-parser');
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const serverless = require('serverless-http');
console.log('before before alksdlaks');
app.use(cors());
app.use(express.json());
console.log('before alksdlaks');
const {
  getAllScreams,
  postOneScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream,
} = require('./routes/handlers/screams');
console.log('after sdanaskjdkh');
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require('./routes/handlers/users');
console.log('after after sdanaskjdkh');
const FBAuth = require('./util/FBAuth');
console.log('after after after sdanaskjdkh');
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/scream/:screamId', getScream);
app.post('/scream/:screamId/comment', FBAuth, commentOnScream);
app.get('/scream/:screamId/like', FBAuth, likeScream);
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);
app.delete('/scream/:screamId', FBAuth, deleteScream);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);
// catch 404 and forward to error handler
const status = 'prod';

if (status === 'dev') {
  app.use(logger('dev'));

  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/screams', getAllScreams);
  app.post('/scream', FBAuth, postOneScream);
  app.post('/signup', signup);
  app.post('/login', login);
  app.post('/user/image', FBAuth, uploadImage);
  app.post('/user', FBAuth, addUserDetails);
  app.get('/user', FBAuth, getAuthenticatedUser);
  app.get('/scream/:screamId', getScream);
  app.post('/scream/:screamId/comment', FBAuth, commentOnScream);
  app.get('/scream/:screamId/like', FBAuth, likeScream);
  app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);
  app.delete('/scream/:screamId', FBAuth, deleteScream);
  app.get('/user/:handle', getUserDetails);
  app.post('/notifications', FBAuth, markNotificationsRead);

  module.exports = app;
} else if (status === 'prod') {
  const router = express.Router();

  const netlifyPath = '/.netlify/functions/api';
  router.get('/screams', getAllScreams);
  router.post('/scream', FBAuth, postOneScream);
  router.post('/signup', signup);
  router.post('/login', login);
  router.post('/user/image', FBAuth, uploadImage);
  router.post('/user', FBAuth, addUserDetails);
  router.get('/user', FBAuth, getAuthenticatedUser);
  router.get('/scream/:screamId', getScream);
  router.post('/scream/:screamId/comment', FBAuth, commentOnScream);
  router.get('/scream/:screamId/like', FBAuth, likeScream);
  router.get('/scream/:screamId/unlike', FBAuth, unlikeScream);
  router.delete('/scream/:screamId', FBAuth, deleteScream);
  router.get('/user/:handle', getUserDetails);
  router.post('/notifications', FBAuth, markNotificationsRead);

  app.use(netlifyPath, router);

  module.exports.handler = serverless(app);
}
