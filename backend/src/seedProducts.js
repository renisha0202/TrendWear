import "dotenv/config";
import mongoose from "mongoose";
import { products, collections } from "../../frontend/src/products.js";
import { connectDatabase } from "./config/db.js";
import { Category } from "./models/Category.js";
import { Product } from "./models/Product.js";

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function seed() {
  await connectDatabase();
  for (const product of products) {
    const slug = slugify(product.name);
    await Product.updateOne(
      { slug },
      {
        $set: {
          legacyId: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          image: product.image,
          rating: Number(product.rating),
          badge: product.badge,
          collections: product.collections,
          active: true,
        },
        $setOnInsert: { stock: 25 },
      },
      { upsert: true, runValidators: true }
    );
    await Category.updateOne(
      { kind: "category", slug: slugify(product.category) },
      { $set: { name: product.category, kind: "category" } },
      { upsert: true, runValidators: true }
    );
  }

  for (const collection of collections) {
    await Category.updateOne(
      { kind: "collection", slug: collection.id },
      {
        $set: {
          name: collection.name,
          description: collection.description,
          image: collection.image,
          kind: "collection",
        },
      },
      { upsert: true, runValidators: true }
    );
  }

  console.log(`Seeded ${products.length} products and ${collections.length} collections.`);
}

seed()
  .catch((error) => {
    console.error(`Catalog seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
