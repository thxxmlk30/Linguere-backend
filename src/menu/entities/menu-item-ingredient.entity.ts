import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MenuItem } from './menu-item.entity';
import { Ingredient } from '../../ingredients/entities/ingredient.entity';

// Ligne de "recette" : quantite d'un ingredient necessaire pour preparer un
// plat. Utilisee pour decrementer le stock automatiquement a la commande.
@Entity('menu_item_ingredients')
export class MenuItemIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MenuItem, (menuItem) => menuItem.recipe, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'menuItemId' })
  menuItem: MenuItem;

  @Column()
  menuItemId: string;

  @ManyToOne(() => Ingredient)
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Ingredient;

  @Column()
  ingredientId: string;

  @Column({ type: 'float' })
  quantityRequired: number;
}
