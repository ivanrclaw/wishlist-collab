import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Wishlist } from "../entities/Wishlist";
import { Item } from "../entities/Item";
import path from "path";

const dbPath = process.env.DB_PATH || path.join(__dirname, "../../data/wishlist.db");

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: dbPath,
  synchronize: true,
  logging: false,
  entities: [User, Wishlist, Item],
});
