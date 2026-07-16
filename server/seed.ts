import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MenuItem, GalleryImage, Chef } from './models/index.js';
import { menuItems, galleryImages, chefs } from '../src/app/data/restaurantData';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    console.log("Clearing existing seed collections...");
    await MenuItem.deleteMany({});
    await GalleryImage.deleteMany({});
    await Chef.deleteMany({});

    console.log("Inserting Menu Items...");
    await MenuItem.insertMany(menuItems);

    console.log("Inserting Gallery Images...");
    await GalleryImage.insertMany(galleryImages);

    console.log("Inserting Chefs...");
    await Chef.insertMany(chefs);

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();
