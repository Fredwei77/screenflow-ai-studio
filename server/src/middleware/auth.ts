import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { serverConfig } from '../config.js';
import { prisma } from '../prisma.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, serverConfig.jwtSecret) as { userId: string };
    req.userId = decoded.userId;
    // Look up user role
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } });
    req.userRole = user?.role || 'STUDENT';
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
