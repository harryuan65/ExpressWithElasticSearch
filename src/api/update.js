console.log("Fetching http://localhost:3000/api/me")
const fetch = require('node-fetch');
fetch("http://localhost:3000/api/me", {
      "method": "PUT",
      "headers": {
            "Content-Type": "application/json",
            "Cookie": "request_method=PUT"
      },
      "body": {
            "app_version": "1.56.1",
            "device_system_name": "iOS",
            "birthday": "1992-02-01",
            "picture_array": [
                  "202851",
                  "175983"
            ],
            "intro": "fix all the stuff",
            "token": "my-token-1",
            "name": "小小大大",
            "profile_picture_id": null
      }
})
.then((res) => res.text())
.then(console.log.bind(console))
.catch(console.error.bind(console));

