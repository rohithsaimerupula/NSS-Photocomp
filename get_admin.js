const https = require('https');

https.get('https://bestphotocomp-default-rtdb.asia-southeast1.firebasedatabase.app/admin_config.json', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(data);
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
