let functions = require('firebase-functions');
let admin = require('firebase-admin');
let axios = require('axios');
admin.initializeApp(functions.config().firebase);


function identify(image_url) {
  console.log(image_url)
  return axios.post('https://westus.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false', {
    url: image_url
  }, {
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': '4ce5a34a72554c00b504ae5324caa91a',
      }
    }).then(function (results) {
      console.log(results.data)
      return results.data[0].faceId;
    });
}

function findMatch(faceId) {
  console.log(faceId)
  return axios.post(`https://westus.api.cognitive.microsoft.com/face/v1.0/identify`, {
    faceIds: [faceId],
    personGroupId: 'mydd17',
    maxNumOfCandidatesReturned: 1,
    confidenceThreshold: 0.5,
  }, {
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': '4ce5a34a72554c00b504ae5324caa91a',
      }
    }).then(function (results) {
      console.log(results)
      if (results.data[0].candidates.length) {
        return results.data[0].candidates[0];
      }
      return 'Unknown';
    });
}

exports.sendPush = functions.database.ref('/requests/{requestId}').onCreate(event => {
  console.log(event.data.val().room);
  return identify(event.data.val().image_url).then(findMatch).then(function (pid) {
    console.log(pid);
    return admin
      .database()
      .ref(`requests/${event.data.val().room}/pid`)
      .set(pid)
      .then(() => {
        // if owner then do not need to start web video chat
        if (
          pid.confidence > 0.6 &&
          (
            // adrian
            pid.personId == 'b8ed853f-d18f-4a70-bc80-c982f9ff488d' ||
            // hafiz
            pid.personId == '83897224-1aec-4fdd-be67-778054cdde7b'
          )
        ) {
          console.log('is either adrian or dr hafiz');
          return 'no-action';
        }
        console.log('not either');
        let tokens = ['cr_mPjC0Okk:APA91bGqdQKBWJjfsiQ2SkV2QrslUauBjCpCpoZid9ykFE7odRbtz1F2TeOcCyCgg0PkAHTTA1cTMIPLh0lmPsOSGpOd7kvdg1HJEcLqWFezdAkkDYDCYnKdBlAx2vpgJpavEnbTMYJ3'];
        let payload = {
          notification: {
            title: 'Kuunch Alert!',
            body: 'You have a visitor.',
            sound: 'default'
          },
          data: event.data.val()
        };
        return admin.messaging().sendToDevice(tokens, payload);
      });
  })
});

exports.ownerResponse = functions.https.onRequest((req, res) => {
  if (req.body.room) {
    admin.database().ref(`/requests/${req.body.room}/code`).set(62735812);
    admin.database().ref(`/requests/${req.body.room}/authorized`).set(req.body.authorized);
  }
  res.send(200);
});