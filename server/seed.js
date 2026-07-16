import fs from 'fs';
import { 
  MenuItem, CarouselSlide, RestaurantTable, Employee, GalleryImage, Chef 
} from './models/index.js';

export async function seedDatabaseIfEmpty() {
  try {
    const count = await MenuItem.countDocuments();
    if (count === 0) {
      console.log("Database is empty. Seeding initial data...");
      const rawData = fs.readFileSync(new URL('./seedData.json', import.meta.url), 'utf-8');
      const seedData = JSON.parse(rawData);

      await MenuItem.insertMany(seedData.menuItems);
      await CarouselSlide.insertMany(seedData.defaultCarouselSlides);
      await RestaurantTable.insertMany(seedData.defaultTables);
      await Employee.insertMany(seedData.defaultEmployees);
      await GalleryImage.insertMany(seedData.galleryImages);
      await Chef.insertMany(seedData.chefs);

      console.log("Database seeded successfully!");
    } else {
      console.log("Database already contains data. Skipping seed.");
    }
  } catch (err) {
    console.error("Error during database seeding:", err);
  }
}
