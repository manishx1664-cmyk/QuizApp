import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, AuthResponse } from '@quizforge/shared';
import { db } from '../../db/client';
import { config } from '../../config';

export class AuthService {
  public static async register(
    name: string,
    email: string,
    password: string,
    role: UserRole = 'learner'
  ): Promise<AuthResponse> {
    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      throw new Error('An account with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = uuidv4();

    const res = await db.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, created_at`,
      [id, name.trim(), email.toLowerCase().trim(), passwordHash, role]
    );

    const user: User = {
      id: res.rows[0].id,
      name: res.rows[0].name,
      email: res.rows[0].email,
      role: res.rows[0].role as UserRole,
      createdAt: res.rows[0].created_at
    };

    const token = this.generateToken(user);

    return { token, user };
  }

  public static async login(email: string, password: string): Promise<AuthResponse> {
    const res = await db.query(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (res.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const row = res.rows[0];
    const isMatch = await bcrypt.compare(password, row.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as UserRole,
      createdAt: row.created_at
    };

    const token = this.generateToken(user);

    return { token, user };
  }

  public static async getUserById(id: string): Promise<User | null> {
    const res = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as UserRole,
      createdAt: row.created_at
    };
  }

  private static generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
  }
}
