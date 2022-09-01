const { use } = require('../../api');
const { db, admin } = require('../../util/admin');
const { auth, createUserWithEmailAndPassword } = require('../../util/config');

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require('../../util/validators');

exports.signup = (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle,
  };
  // TODO validate data

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) {
    return response.status(400).json(errors);
  }

  const noImg = 'blank-profile-picture-973460_1280.png';
  let token, userId;

  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return response.status(400).json({
          handle: 'this handle is already taken ',
        });
      } else {
        console.log('before auth', newUser);
        return createUserWithEmailAndPassword(
          auth,
          newUser.email,
          newUser.password
        );
      }
    })
    .then((data) => {
      console.log('after auth');
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId,
      };

      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
      return response.status(201).json({ token });
    })
    .then(() => {
      return response.status(201).json({ token });
    })

    .catch((err) => {
      if (err.code === 'auth/email-already-in-use') {
        return response.status(400).json({ email: 'Email is already in use' });
      } else {
        console.log(err.message);
        return response
          .status(500)
          .json({ general: 'Something went wrong,please try again' });
      }
    });
};

exports.login = (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password,
  };

  const { valid, errors } = validateLoginData(user);
  if (!valid) {
    return response.status(400).json(errors);
  }

  auth
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return response.json({ token });
    })
    .catch((err) => {
      console.error(err);
      if ((err.code = 'auth/wrong-password')) {
        return response
          .status(403)
          .json({ general: 'Wrong credentials, please try again' });
      } else {
        return response.status(500).json({ error: err.code });
      }
    });
};

exports.addUserDetails = (request, response) => {
  let userDetails = reduceUserDetails(request.body);

  db.doc(`/users/${request.user.handle}`)
    .update(userDetails)
    .then(() => {
      return response.json({ message: 'Details added successfully' });
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

exports.getAuthenticatedUser = (request, response) => {
  let userData = {};

  db.doc(`/users/${request.user.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection('likes')
          .where('userHandle', '==', request.user.handle)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });

      return db
        .collection('notifications')
        .where('recipient', '==', request.user.handle)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        notificationData = doc.data();
        notificationData.notificationId = doc.id;
        userData.notifications.push(notificationData);
      });
      return response.json(userData);
    })

    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

exports.uploadImage = (request, response) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');
  const busboy = new BusBoy({ headers: request.headers });

  let imageFileName;
  let imageToBeUploaded;
  console.dir(request.headers['content-type']);
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    console.log('starting i guress');
    if (mimetype != 'image/jpeg' && mimetype != 'image/png') {
      return response.status(400).json({ error: 'Wrong file type submitted' });
    }

    const imageExtension = filename.split('.')[filename.split('.').length - 1];
    imageFileName = `${Math.round(
      Math.random() * 100000000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);

    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', () => {
    console.log('finished i guress', imageToBeUploaded);
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db
          .doc(`/users/${request.user.handle}`)
          .update({ imageUrl })
          .then(() => {
            console.log('image has changed');

            let batch = db.batch();
            return db
              .collection('screams')
              .where('userHandle', '==', request.user.handle)
              .get()

              .then((data) => {
                data.forEach((doc) => {
                  const scream = db.doc(`/screams/${doc.id}`);
                  batch.update(scream, { userImage: imageUrl });
                });
                console.log('loop has ended');
                return batch.commit();
              });
          });
      })
      .then(() => {
        return response.json({
          message: 'Image uploaded successfully',
        });
      })
      .catch((err) => {
        console.error(err);
        return response.status(500).json({ error: err.code });
      });
  });
  request.pipe(busboy);
  //busboy.end(request.rawBody)
};

exports.getUserDetails = (request, response) => {
  let userData = {};
  db.doc(`/users/${request.params.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection('screams')
          .where('userHandle', '==', request.params.handle)
          .orderBy('createdAt', 'desc')
          .get();
      } else {
        return response.status(404).json({ error: 'User not found' });
      }
    })
    .then((data) => {
      userData.screams = [];
      data.forEach((doc) => {
        userData.screams.push({
          body: doc.data().body,
          commentCount: doc.data().commentCount,
          createdAt: doc.data().createdAt,
          likeCount: doc.data().likeCount,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          screamId: doc.id,
        });
      });
      return response.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

exports.markNotificationsRead = (request, response) => {
  let batch = db.batch();
  request.body.forEach((notificationId) => {
    notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return response.json({ message: 'Notifications marked as read' });
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};

/*const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "sis"
});

con.connect((err) => {
  if (err) throw err;
  console.log("Connected!");
});*/

/*
exports.signup = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: "password",
        userType: request.body.userType,
        name: request.body.name,
        surname: request.body.surname,
        gender: request.body.gender,
        DOB: request.body.DOB,
        kinEmail: request.body.parentEmail
    }
    

    // validate user input
    const {valid, errors} = validateSignupData(newUser)
    if (!valid) {
      return response.status(400).json(errors)
    }
    

    let token, userId, handle

    // determine if user exists
    const userCountSql =  `CALL UserCount('${newUser.email}')`
    con.query(userCountSql, function (err, result) {
      if (err) throw err;

      // if user exist write down return message that user exists
      if (result[0][0].userCount === 1){
        return response.status(201).json({message: "User Exists"})
      }
      

      // if user does not exist signup up user
      const signupSql = `CALL SignupUser('${newUser.email}',
                                         '${newUser.userType}',
                                         '${newUser.name}',
                                         '${newUser.surname}',
                                         '${newUser.DOB}',
                                         '${newUser.gender}'

                                         )`
      con.query(signupSql, function (err, result) {
        // we insert user in Mysql database and return 
              handle = result[0][0].ID.toString()
              
              if (err) throw err;
              defaultProject
              .auth()
              .createUserWithEmailAndPassword(newUser.email, newUser.password)
              .then(data => {

                
                userId = data.user.uid
                return data.user.getIdToken();
              })
              
              .then((idToken) => {
                const noImg = 'blank-profile-picture-973460_1280.png'
                token = idToken
                //user credentials that are going to be inserted into firebase
                const userCredentials = {
                    handle,
                    email: newUser.email,
                    createdAt: new Date().toISOString(),
                    imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
                    userId
        
                }
               
                
                db.doc(`/users/${handle}`).set(userCredentials)
                //return response.status(201).json({token})
                
              
              })
              .then (() => {
                // add user to homepage site participants
                addUserToHome(handle)
                //if successful return token
                return response.status(201).json({token})
              })
             
              .catch(err => {
                    if (err.code === 'auth/email-already-in-use'){
                        return response.status(400).json({email: 'Email is already in use'})
                    }
                    else{
                        return response.status(500).json({general: 'Something went wrong,please try again'})
                    }
              })
       
          });
    });
    
    

    
    
    // TODO validate data
  
    
  
}

*/
