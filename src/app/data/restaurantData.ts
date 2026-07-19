// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  cost?: number;
  image: string;
  images?: string[];
  description: string;
  ingredients: string[];
  nutrition: { calories: number; protein: string; carbs: string; fat: string };
  spiceLevel: 'Mild' | 'Medium' | 'Hot' | 'Extra Hot';
  rating: number;
  reviewCount: number;
  isVeg: boolean;
  isSpicy: boolean;
  isPopular: boolean;
  prepTime: string;
  serves: string;
  variants?: { name: string; price: number }[];
  badge?: string;
  showOnWebsite?: boolean;
}

export interface Chef {
  id: string; name: string; position: string;
  experience: string; speciality: string; image: string; bio: string;
}

export interface Review {
  id: string; name: string; rating: number;
  comment: string; date: string; location: string;
}

export interface GalleryImage {
  id: string; url: string;
  category: 'Restaurant' | 'Food' | 'Events' | 'Kitchen'; title: string;
}

// Kept so Catering.tsx continues to compile without errors
export interface CateringPackage {
  id: string; name: string; price: string; serves: string;
  features: string[]; popular: boolean; color: string;
}

export const menuCategories = [
  'Pizza','Fried Corner','Wings','Meatbox','Burger',
  'Sub','Shawarma','Momo','Combo','Wonton','Soup',
  'Chawomen','Seafood','Pasta','Salad','Rich Bowl',
  'Curry','Sizzling','Platter','Ramen','Naan',
  'Cold Coffee','Hot Coffee','Lassi','Dessert','Biryani','Couple',
] as const;

const I = {
  pizza:  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
  pizza2: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
  pizza3: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600&q=80',
  pizza4: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80',
  wings:  'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80',
  wings2: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  burger2:'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80',
  fry:    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&q=80',
  fry2:   'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  fries:  'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
  pasta:  'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80',
  pasta2: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80',
  shawar: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&q=80',
  shawr2: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80',
  momo:   'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80',
  biryan: 'https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?w=600&q=80',
  biryn2: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
  coffe2: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80',
  icecr:  'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80',
  dessrt: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80',
  soup:   'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  curry:  'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=600&q=80',
  chowm:  'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
  seafd:  'https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=600&q=80',
  salad:  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  ramen:  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
  sandwch:'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  combo:  'https://images.unsplash.com/photo-1561897270-ded74ee19b77?w=600&q=80',
  sizzle: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600&q=80',
  naan:   'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80',
  lassi:  'https://images.unsplash.com/photo-1571066811602-716837d681de?w=600&q=80',
  wonton: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=600&q=80',
  richbwl:'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  couple: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  meatbx: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600&q=80',
  hotcof: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80',
};


// ─── Supporting Data ──────────────────────────────────────────────────────────

export const chefs: Chef[] = [
  { id:'c1', name:'Md. Marjan Ahmed', position:'Head Chef', experience:'9 Years', speciality:'Mexican, Thai & Chinese Cuisine', image:'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&q=80', bio:'Chef Md. Marjan Ahmed is an experienced culinary professional with over nine years of expertise in Mexican, Thai, and Chinese cuisine. His passion for quality ingredients, authentic flavors, and creative presentation ensures every dish served at PIZZORA meets the highest standards of taste and consistency.' },
  { id:'c2', name:'Rabbi Hasan', position:'Assistant Chef', experience:'4 Years', speciality:'Thai Cuisine, Chinese Cuisine & Barista', image:'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=400&q=80', bio:'Rabbi Hasan is a skilled assistant chef specializing in Thai and Chinese cuisine with additional expertise in specialty beverages. His dedication to food preparation and attention to detail help maintain the premium quality and consistency that PIZZORA customers expect.' },
  { id:'c3', name:'Anisur Rahman', position:'Restaurant Manager', experience:'5 Years', speciality:'Restaurant Operations & Customer Service', image:'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&q=80', bio:'Anisur Rahman is responsible for the daily operations of PIZZORA, ensuring excellent customer service, efficient staff management, and smooth restaurant operations. His leadership and commitment to quality help create a welcoming dining experience for every guest.' },
];

export const reviews: Review[] = [
  { id:'r1', name:'Farhan Hossain', rating:5, comment:'The Pepperoni Pizza here is absolutely incredible! Crispy crust, generous toppings and perfect cheese pull. Best pizza in Sylhet without a doubt.', date:'2024-12-15', location:'Sylhet' },
  { id:'r2', name:'Nusrat Jahan', rating:5, comment:'Came for the BBQ Wings and stayed for everything else! Sticky, smoky and absolutely addictive. Great atmosphere too.', date:'2025-01-08', location:'Sylhet' },
  { id:'r3', name:'Rahul Chowdhury', rating:5, comment:'Special Yummy Burger is a game-changer. Double patty, double cheese, incredible sauce. Worth every taka!', date:'2025-02-20', location:'Dhaka' },
  { id:'r4', name:'Tasnia Akter', rating:4, comment:'The Couple Pasta deal is amazing value for a date night. Romantic ambiance, delicious food and attentive service.', date:'2025-03-12', location:'Sylhet' },
  { id:'r5', name:'Mahbub Rahman', rating:5, comment:'Tried the Special Cold Coffee — literally the best I\'ve had anywhere in Bangladesh. World-class barista section!', date:'2025-04-05', location:'Sylhet' },
  { id:'r6', name:'Sadia Islam', rating:5, comment:'As a pizza fanatic, Pizzora\'s King Alfredo is perfection. Creamy Alfredo base with juicy chicken — absolutely heavenly.', date:'2025-05-18', location:'Sylhet' },
];

export const galleryImages: GalleryImage[] = [
  { id:'g1', url:'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80', category:'Food', title:'Signature Pepperoni Pizza' },
  { id:'g2', url:'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80', category:'Food', title:'Crispy BBQ Wings' },
  { id:'g3', url:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', category:'Food', title:'Special Yummy Burger' },
  { id:'g4', url:'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80', category:'Food', title:'Oven Baked Pasta' },
  { id:'g5', url:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80', category:'Restaurant', title:'Pizzora Dining Hall' },
  { id:'g6', url:'https://images.unsplash.com/photo-1552566626-52f8b828329f?w=600&q=80', category:'Restaurant', title:'Premium Ambiance' },
  { id:'g7', url:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', category:'Food', title:'Signature Cold Coffee' },
  { id:'g8', url:'https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?w=600&q=80', category:'Food', title:'Chicken Biryani' },
  { id:'g9', url:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80', category:'Food', title:'King Alfredo Pizza' },
  { id:'g10', url:'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&q=80', category:'Kitchen', title:'Fresh Fried Chicken' },
  { id:'g11', url:'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80', category:'Food', title:'Special Shawarma' },
  { id:'g12', url:'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80', category:'Food', title:'Cheese Momo' },
];

// Kept so Catering.tsx continues to compile without errors
export const cateringPackages: CateringPackage[] = [
  { id:'c1', name:'Basic Package', price:'৳15,000', serves:'20-30 Guests', features:['Pizza & Wings Buffet','Cold Drinks','Setup & Cleanup','3 Hours Service'], popular:false, color:'#6B7280' },
  { id:'c2', name:'Premium Package', price:'৳35,000', serves:'50-80 Guests', features:['Full Menu Buffet','Live Cooking Station','Dedicated Staff','5 Hours Service'], popular:true, color:'#F9002B' },
  { id:'c3', name:'Elite Package', price:'৳65,000', serves:'100-150 Guests', features:['Premium Full Menu','Live Cooking Stations','VIP Service','8 Hours'], popular:false, color:'#111111' },
];
export const menuItems: MenuItem[] = [];
