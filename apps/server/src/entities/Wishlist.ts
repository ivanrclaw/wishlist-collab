import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Item } from "./Item";

@Entity("wishlists")
export class Wishlist {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200 })
  title!: string;

  @Column({ length: 500, default: "" })
  description!: string;

  @Column({ length: 32, unique: true })
  slug!: string;

  @Column({ length: 32, unique: true })
  editSlug!: string;

  @Column()
  userId!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @OneToMany(() => Item, (item) => item.wishlist)
  items!: Item[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
