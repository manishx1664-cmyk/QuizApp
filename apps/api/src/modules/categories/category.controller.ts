import { Router, Request, Response } from 'express';
import { CategoryService } from './category.service';
import { authenticateToken, requireRole } from '../auth/auth.middleware';

export const categoryRouter = Router();

// GET /api/categories (Public/Learner/Admin)
categoryRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await CategoryService.getAllCategories();
    return res.json({ categories });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/categories (Admin only)
categoryRouter.post('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const category = await CategoryService.createCategory(name, description);
    return res.status(201).json({ category });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// DELETE /api/categories/:id (Admin only)
categoryRouter.delete('/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await CategoryService.deleteCategory(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
