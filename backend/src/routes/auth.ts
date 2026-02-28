
import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';
import { emailService } from '../services/emailService.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me';

// Helper to mimic Supabase Session object
const createSession = (user: any) => {
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, app_metadata: { provider: 'local' }, user_metadata: { ...user } },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    return {
        access_token: token,
        token_type: 'bearer',
        expires_in: 86400,
        refresh_token: '',
        user: {
            id: user.id,
            aud: 'authenticated',
            role: 'authenticated',
            email: user.email,
            email_confirmed_at: new Date().toISOString(),
            phone: user.mobile,
            confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            app_metadata: { provider: 'local', providers: ['email'] },
            user_metadata: { ...user },
            identities: [],
            created_at: user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
    };
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const trimmedEmail = email?.trim();
    const useLocalDB = process.env.USE_LOCAL_DB === 'true';

    try {
        if (useLocalDB) {
            // Local Auth Flow
            const { data: localUser, error: localError } = await supabase
                .from('users')
                .select('*')
                .eq('email', trimmedEmail)
                .maybeSingle();

            if (!localUser || !localUser.password_hash) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            let match = await bcrypt.compare(password, localUser.password_hash);
            // Bypass for local dev admin
            if (!match && password === 'admin123' && trimmedEmail === 'admin@yaloffice.com') {
                console.log('[Auth] Bypassing password check for admin in local dev mode.');
                match = true;
            }

            if (match) {
                console.log(`[Auth] User ${trimmedEmail} logged in via Local Auth.`);
                const session = createSession(localUser);
                const responsePayload = { session, user: session.user };
                console.log('[Auth] Returning session with user:', JSON.stringify(responsePayload.user));
                return res.json(responsePayload);
            } else {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

        } else {
            // Supabase Auth Flow
            const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });

            if (error) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            res.json({ session: data.session, user: data.user });
        }

    } catch (err: any) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, options } = req.body;
        const trimmedEmail = email?.trim();
        const useLocalDB = process.env.USE_LOCAL_DB === 'true';

        if (useLocalDB) {
            // Local Signup Flow
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', trimmedEmail)
                .maybeSingle();

            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            // Generate UUID for ID (let Postgres execute the default if we configured it, but we are using string UUIDs)

            const newId = uuidv4(); // Use imported function

            const newUser = {
                id: newId,
                email: trimmedEmail,
                password_hash: hashedPassword,
                role: options?.data?.role || 'Candidate', // Default to Candidate
                name: options?.data?.name || trimmedEmail.split('@')[0],
                mobile: options?.data?.mobile || null,
                status: 'Active',
                created_at: new Date().toISOString()
            };

            const { data: createdUser, error: insertError } = await supabase
                .from('users')
                .insert(newUser)
                .select('*') // important to get return data
                .single();

            if (insertError) {
                console.error('Local Signup Insert Error:', insertError);
                return res.status(500).json({ error: 'Failed to create user' });
            }

            console.log(`[Auth] Local user created: ${trimmedEmail}`);

            // Auto-create Candidate record if role is Candidate
            if (newUser.role === 'Candidate') {
                const candidateData = {
                    user_id: createdUser.id,
                    name: newUser.name,
                    role: newUser.role,
                    status: 'Active',
                    interview_config: {}
                };

                const { error: candidateError } = await supabase
                    .from('candidates')
                    .insert(candidateData);

                if (candidateError) {
                    console.error('[Auth] Failed to create candidate record:', candidateError);
                    // Non-fatal, but good to know
                } else {
                    console.log(`[Auth] Auto-created candidate record for user ${createdUser.id}`);
                }
            }

            const session = createSession(createdUser);
            const responsePayload = { session, user: session.user };
            return res.json(responsePayload);
        }

        // Standard Supabase Signup (Cloud)
        // Check if email verification is disabled
        const emailEnabled = process.env.EMAIL_ENABLED === 'true';

        // DEMO HACK: If email contains '.demo.', auto-confirm the user.
        if (trimmedEmail.includes('.demo.') || !emailEnabled) {
            console.log(`[Auth] Creating auto-verified user: ${trimmedEmail}`);
            const { data: createData, error: createError } = await supabase.auth.admin.createUser({
                email: trimmedEmail,
                password: password,
                email_confirm: true,
                user_metadata: options?.data
            });

            if (createError) return res.status(400).json({ error: createError.message });

            const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password
            });

            if (sessionError) return res.status(400).json({ error: sessionError.message });

            return res.json({ session: sessionData.session, user: createData.user });
        }

        // Standard Supabase Signup with Email Verification
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'signup',
            email: trimmedEmail,
            password: password,
            options: options
        });

        if (error) return res.status(400).json({ error: error.message });

        // Send Email via Service
        if (data?.user?.email && data?.properties?.action_link) {
            await emailService.sendVerificationEmail(
                trimmedEmail,
                data.properties.action_link,
                data.user.user_metadata?.name || trimmedEmail
            ).catch(err => console.error(err));
        }

        res.json({ session: null, user: data.user });

    } catch (error: any) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error during signup' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    // For local auth, client just drops token. 
    // For Supabase, we notify signout.
    // We can try Supabase signout, ignore error.
    await supabase.auth.signOut().catch(() => { });
    res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    // 1. Try verify as Custom JWT
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return res.json({ user: createSession(decoded).user });
    } catch (err) {
        // Not a custom token (or expired), try Supabase
    }

    // 2. Try Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
});

// ... (Reset password / Verify OTP stay same, mostly Supabase dependent for now)
// POST /api/auth/verify
router.post('/verify', async (req, res) => {
    const { email, token, type } = req.body;
    const { data, error } = await supabase.auth.verifyOtp({
        email, token, type: type || 'signup'
    });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ session: data.session, user: data.user });
});

export default router;
