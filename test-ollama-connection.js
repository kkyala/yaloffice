const http = require('http');

const url = 'http://ollama-deepseek:11434/api/version';

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('SUCCESS:', data);
        process.exit(0);
    });
}).on('error', (err) => {
    console.error('ERROR:', err.message);
    process.exit(1);
});
