import fs from 'fs';
import { menuItems, galleryImages, chefs } from './src/app/data/restaurantData.ts';

const defaultCarouselSlides = [
  {
    id: 'cs1',
    url: 'https://images.unsplash.com/photo-1768697358705-c1b60333da35?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjByZXN0YXVyYW50JTIwaW50ZXJpb3IlMjBlbGVnYW50JTIwZGluaW5nfGVufDF8fHx8MTc3NTA1MzEzNHww&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'PIZZORA RESTAURANT',
    subtitle: 'Premium Dining Experience',
    description: 'The favourite pizza & fast food in Sylhet — where extraordinary flavors meet unmatched elegance.',
    badge: '★ Best Restaurant in Sylhet',
  },
  {
    id: 'cs2',
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80',
    title: 'Authentic Taste',
    subtitle: "Nature's Best Ingredients",
    description: 'We source only the freshest, highest-quality ingredients to craft dishes that tell a story of passion.',
    badge: '✦ 100% Fresh & Natural',
  },
  {
    id: 'cs3',
    url: 'https://images.unsplash.com/photo-1552566626-52f8b828329f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80',
    title: 'Perfect Place for Family',
    subtitle: 'For Every Occasion',
    description: 'Create unforgettable memories with the people you love, surrounded by warm hospitality.',
    badge: '❤ Family Friendly',
  },
];

const defaultEmployees = [
  { id: 'emp1', name: 'Md. Marjan Ahmed', role: 'Head Chef', basicSalary: 35000, joinDate: new Date().toISOString(), shift: 'Morning' },
  { id: 'emp2', name: 'Rabbi Hasan', role: 'Assistant Chef', basicSalary: 20000, joinDate: new Date().toISOString(), shift: 'Morning' },
  { id: 'emp3', name: 'Anisur Rahman', role: 'Manager', basicSalary: 25000, joinDate: new Date().toISOString(), shift: 'Morning' },
  { id: 'emp4', name: 'Suhel Ahmed', role: 'Waiter', basicSalary: 8000, joinDate: new Date().toISOString(), shift: 'Evening' },
  { id: 'emp5', name: 'Emon', role: 'Waiter', basicSalary: 8000, joinDate: new Date().toISOString(), shift: 'Evening' },
];

const defaultTables = [
  { id: 'T01', tableNumber: 'T01', seats: 4, area: 'Dining', status: 'Available' },
  { id: 'T02', tableNumber: 'T02', seats: 4, area: 'Dining', status: 'Available' },
  { id: 'T03', tableNumber: 'T03', seats: 6, area: 'Dining', status: 'Available' },
  { id: 'T04', tableNumber: 'T04', seats: 4, area: 'Dining', status: 'Available' },
  { id: 'T05', tableNumber: 'T05', seats: 2, area: 'Dining', status: 'Available' },
  { id: 'T06', tableNumber: 'T06', seats: 4, area: 'Dining', status: 'Available' },
  { id: 'V01', tableNumber: 'V01', seats: 8, area: 'VIP', status: 'Available' },
  { id: 'V02', tableNumber: 'V02', seats: 6, area: 'VIP', status: 'Available' },
  { id: 'O01', tableNumber: 'O01', seats: 4, area: 'Outdoor', status: 'Available' },
  { id: 'O02', tableNumber: 'O02', seats: 4, area: 'Outdoor', status: 'Available' },
];

fs.writeFileSync('server/seedData.json', JSON.stringify({
  menuItems, galleryImages, chefs, defaultCarouselSlides, defaultEmployees, defaultTables
}, null, 2));

console.log("Seeding data dumped!");
