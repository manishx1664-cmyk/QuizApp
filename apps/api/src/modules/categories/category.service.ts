import { v4 as uuidv4 } from 'uuid';
import { Category } from '@quizforge/shared';
import { db } from '../../db/client';

export class CategoryService {
  public static async getAllCategories(): Promise<Category[]> {
    const sql = `
      SELECT c.*, 
             COUNT(DISTINCT q.id) as quiz_count,
             COUNT(DISTINCT qn.id) as question_count
      FROM categories c
      LEFT JOIN quizzes q ON q.category_id = c.id
      LEFT JOIN questions qn ON qn.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    const res = await db.query(sql);
    return res.rows.map(this.mapCategoryRow);
  }

  public static async createCategory(name: string, description?: string): Promise<Category> {
    const id = uuidv4();
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const res = await db.query(
      `INSERT INTO categories (id, name, slug, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, name.trim(), slug, description || '']
    );
    return this.mapCategoryRow(res.rows[0]);
  }

  public static async deleteCategory(id: string): Promise<void> {
    await db.query(`DELETE FROM categories WHERE id = $1`, [id]);
  }

  private static mapCategoryRow(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      quizCount: parseInt(row.quiz_count || '0', 10),
      questionCount: parseInt(row.question_count || '0', 10),
      createdAt: row.created_at
    };
  }
}
