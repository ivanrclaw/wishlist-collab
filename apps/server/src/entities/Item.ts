import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Wishlist } from "./Wishlist";

@Entity("items")
export class Item {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200 })
  title!: string;

  @Column({ length: 2000 })
  url!: string;

  @Column({ length: 500, default: "" })
  imageUrl!: string;

  @Column({ length: 100, default: "" })
  price!: string;

  @Column({ default: false })
  purchased!: boolean;

  @Column()
  wishlistId!: number;

  @ManyToOne(() => Wishlist, (wishlist) => wishlist.items, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "wishlistId" })
  wishlist!: Wishlist;

  @CreateDateColumn()
  createdAt!: Date;
}
