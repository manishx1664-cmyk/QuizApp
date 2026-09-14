import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { authenticateToken } from './auth.middleware';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'learner';
    const result = await AuthService.register(name, email, password, assignedRole);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await AuthService.login(email, password);
    return res.json(result);
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Login failed.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await AuthService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
});
