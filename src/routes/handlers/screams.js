const { db } = require('../../util/admin');

exports.getAllScreams = (request, response) => {
  console.log('we are getting screams');
  db.collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let screams = [];
      data.forEach((doc) => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage,
        });
      });
      return response.json(screams);
    })
    .catch((err) => console.error(err));
};

exports.postOneScream = (request, response) => {
  if (request.body.body.trim() === '') {
    return response.status(400).json({ error: 'Must not be empty' });
  }
  const newScream = {
    body: request.body.body,
    userHandle: request.user.handle,
    createdAt: new Date().toISOString(),
    userImage: request.user.imageUrl,
    likeCount: 0,
    commentCount: 0,
  };
  db.collection('screams')
    .add(newScream)
    .then((doc) => {
      const resScream = newScream;
      resScream.screamId = doc.id;
      response.json(resScream);
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json({ error: 'somehting went wrong' });
    });
};

exports.getScream = (request, response) => {
  let screamData = {};
  db.doc(`screams/${request.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return response.status(404).json({ error: 'Scream not found' });
      }
      screamData = doc.data();
      screamData.screamId = doc.id;
      return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('screamId', '==', request.params.screamId)
        .get();
    })
    .then((data) => {
      screamData.comments = [];
      data.forEach((doc) => {
        screamData.comments.push(doc.data());
      });
      return response.json(screamData);
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json({ error: err.code });
    });
};

exports.commentOnScream = (request, response) => {
  if (request.body.body.trim() === '') {
    return response.status(400).json({ error: 'Must not be empty' });
  }
  const newComment = {
    body: request.body.body,
    createdAt: new Date().toISOString(),
    screamId: request.params.screamId,
    userHandle: request.user.handle,
    userImage: request.user.imageUrl,
  };

  db.doc(`/screams/${request.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return response.status(404).json({ error: 'Scream not found' });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
      // return db.collection('comments').add(newComment)
    })
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    .then((commentDoc) => {
      return db
        .doc(`/screams/${newComment.screamId}`)
        .get()
        .then((screamDoc) => {
          if (
            screamDoc.exists &&
            screamDoc.data().userHandle !== request.user.handle
          ) {
            console.log(commentDoc.id);
            return db.doc(`/notifications/${commentDoc.id}`).set({
              createdAt: new Date().toISOString(),
              recipient: screamDoc.data().userHandle,
              sender: request.user.handle,
              type: 'comment',
              screamId: screamDoc.id,
              read: false /*,
                     commentId: snapshot.ref.id*/,
            });
          }
          return;
        })
        .then(() => {
          return response.json(newComment);
        })

        .catch((err) => {
          console.error;
        });
    })
    .catch((err) => {
      console.log(err);
      response.status(500).json({ error: 'Something went wrong' });
    });
};

exports.likeScream = (request, response) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', request.user.handle)
    .where('screamId', '==', request.params.screamId)
    .limit(1);

  const screamDocument = db.doc(`screams/${request.params.screamId}`);

  let screamData = {};

  screamDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        return response.status(404).json({ error: 'Scream not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            screamId: request.params.screamId,
            userHandle: request.user.handle,
          })
          .then((doc) => {
            console.log(doc.id);

            if (request.user.handle !== screamData.userHandle) {
              return db.doc(`/notifications/${doc.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: screamData.userHandle,
                sender: request.user.handle,
                type: 'like',
                screamId: screamData.screamId,
                read: false,
              });
            }
          })
          .then(() => {
            screamData.likeCount++;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return response.json(screamData);
          });
      } else {
        return response.status(400).json({ error: 'Scream already liked' });
      }
    })

    .catch((err) => {
      console.log(err);
      response.status(500).json({ err: err.code });
    });
};

exports.unlikeScream = (request, response) => {
  const likeDocument = db
    .collection('likes')
    .where('userHandle', '==', request.user.handle)
    .where('screamId', '==', request.params.screamId)
    .limit(1);

  const screamDocument = db.doc(`screams/${request.params.screamId}`);

  let screamData = {};

  screamDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        return response.status(404).json({ error: 'Scream not found' });
      }
    })
    .then((data) => {
      if (!data.empty) {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()

          .then((doc) => {
            console.log(doc, data.docs[0].id);
            return db.doc(`/notifications/${data.docs[0].id}`).delete();
          })
          .then(() => {
            screamData.likeCount--;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return response.json(screamData);
          });
      } else {
        return response
          .status(400)
          .json({ error: 'Scream has not been liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json({ err: err.code });
    });
};

exports.deleteScream = (request, response) => {
  const document = db.doc(`/screams/${request.params.screamId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return response.status(404).json({ error: 'Scream not found' });
      }

      if (doc.data().userHandle != request.user.handle) {
        return response.status(403).json({ error: 'Unauthorized' });
      } else {
        return document.delete().then(() => {
          const batch = db.batch();
          return db
            .collection('comments')
            .where('screamId', '==', request.params.screamId)
            .get()
            .then((data) => {
              data.forEach((doc) => {
                batch.delete(db.doc(`/comments/${doc.id}`));
              });
              console.log('comments deleted');
              return db
                .collection('likes')
                .where('screamId', '==', request.params.screamId)
                .get();
            })
            .then((data) => {
              data.forEach((doc) => {
                batch.delete(db.doc(`/likes/${doc.id}`));
              });
              console.log('likes deleted');
              return db
                .collection('notifications')
                .where('screamId', '==', request.params.screamId)
                .get();
            })
            .then((data) => {
              data.forEach((doc) => {
                batch.delete(db.doc(`/notifications/${doc.id}`));
              });
              console.log('notifications deleted');
              return batch.commit();
            })
            .catch((err) => console.error(err));
        });
      }
    })
    .then(() => {
      response.json({ message: 'Scream deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};
