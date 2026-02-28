
import fetch from 'node-fetch';

const API_URL = 'http://localhost:8000/api/auth/login';

async function testLogin() {
    try {
        console.log('Attempting login...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'candidate103@yaloffice.com',
                password: 'password123'
            })
        });

        const data = await response.json();
        console.log('Login Status:', response.status);

        if (data.session) {
            console.log('Session returned: YES');
            console.log('Session User exists:', !!data.session.user);
            if (data.session.user) {
                console.log('Session User:', JSON.stringify(data.session.user, null, 2));
            }

            if (!data.session.user) {
                console.log('ISSUE DETECTED: session.user is MISSING in backend response.');
                console.log('Root Level User exists:', !!data.user);
                if (data.user) {
                    console.log('Root Level User:', JSON.stringify(data.user, null, 2));
                }
            }
        } else {
            console.log('No session returned. Error:', data.error);
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testLogin();
