import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { Search, MapPin, Phone, Mail, Clock, Star, Play, Award, Leaf, ChevronRight, CheckCircle2, ChevronLeft, ArrowRight, Instagram, Twitter, Facebook, Shield, Smile, Flame, Users, Calendar, ShoppingCart, Eye, ChevronDown, Quote, Pizza, Coffee, UtensilsCrossed, Wine, CakeSlice, Salad, Sandwich, Gift, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { optimizeCloudinaryUrl } from '../utils/image';
import { MenuCardSkeleton, ChefCardSkeleton, HeroSkeleton } from '../components/Skeletons';
import { SEO } from '../components/SEO';

const BurgerIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Top Bun */}
    <path d="M4.5 10C4.5 6.5 8 4 12 4s7.5 2.5 7.5 6" />
    {/* Lettuce / Cheese */}
    <path d="M2.5 12h19" />
    {/* Meat */}
    <path d="M3.5 15h17" />
    {/* Bottom Bun */}
    <path d="M5.5 15a4 4 0 0 0 4 4h5a4 4 0 0 0 4-4" />
  </svg>
);

// Hardcoded heroSlides removed - now using dynamic state.carouselSlides from AppContext

const whyChooseUs = [
  { icon: Leaf, title: 'Fresh Ingredients', desc: 'We use only the freshest, locally-sourced ingredients in every dish we prepare.', color: '#16A34A' },
  { icon: Award, title: 'Experienced Chefs', desc: 'Our culinary team brings 30+ combined years of expertise from top restaurants worldwide.', color: '#F9002B' },
  { icon: Clock, title: 'Fast Service', desc: 'We respect your time. Expect prompt, attentive service from the moment you arrive.', color: '#2563EB' },
  { icon: Shield, title: 'Clean Environment', desc: 'Pristine, hygienic premises that exceed all health and safety standards.', color: '#7C3AED' },
  { icon: Smile, title: 'Affordable Price', desc: 'Premium dining experience without the premium price tag. Value for every taka.', color: '#F9002B' },
  { icon: Flame, title: 'Premium Taste', desc: 'Every dish is a masterpiece — crafted to deliver an extraordinary taste experience.', color: '#EA580C' },
];

const stats = [
  { value: '1+', label: 'Years of Excellence', icon: Award },
  { value: '1500+', label: 'Happy Customers', icon: Users },
  { value: '120+', label: 'Menu Items', icon: Flame },
  { value: '10+', label: 'Expert Chefs', icon: Award },
];

function StarRating({ rating, size = 16, color = '#F59E0B' }: { rating: number; size?: number; color?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= Math.floor(rating) ? color : 'none'}
          stroke={i <= Math.floor(rating) ? color : (color === '#ffffff' ? 'rgba(255,255,255,0.5)' : '#D1D5DB')}
          color={i <= Math.floor(rating) ? color : (color === '#ffffff' ? 'rgba(255,255,255,0.5)' : '#D1D5DB')}
        />
      ))}
    </div>
  );
}

export function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentReview, setCurrentReview] = useState(0);
  const [reviewTransitioning, setReviewTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reviewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { state, addToCart } = useApp();
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const popularItems = state.menuItems.filter(item => item.isPopular && item.showOnWebsite !== false).slice(0, 8);

  const goToSlide = (index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const totalSlides = state.carouselSlides.length;

  const nextSlide = () => {
    if (totalSlides === 0) return;
    goToSlide((currentSlide + 1) % totalSlides);
  };
  const prevSlide = () => {
    if (totalSlides === 0) return;
    goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
  };

  const goToReview = (index: number) => {
    if (reviewTransitioning) return;
    setReviewTransitioning(true);
    setTimeout(() => {
      setCurrentReview(index);
      setReviewTransitioning(false);
    }, 300);
  };

  const nextReview = () => { if (state.reviews.length > 0) goToReview((currentReview + 1) % state.reviews.length); };
  const prevReview = () => { if (state.reviews.length > 0) goToReview((currentReview - 1 + state.reviews.length) % state.reviews.length); };

  useEffect(() => {
    intervalRef.current = setInterval(nextSlide, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [currentSlide]);

  useEffect(() => {
    reviewIntervalRef.current = setInterval(nextReview, 4500);
    return () => { if (reviewIntervalRef.current) clearInterval(reviewIntervalRef.current); };
  }, [currentReview]);

  return (
    <div>
      <SEO 
        title="Pizzora | The Official Pizzora Restaurant in Bangladesh"
        description="Welcome to the official Pizzora. Experience the best authentic pizza and dining at Pizzora. Order online for delivery, book a table, or explore our menu."
        schema={{
          "@context": "https://schema.org",
          "@type": "Restaurant",
          "name": "Pizzora",
          "url": "https://pizzora.bd",
          "logo": "https://pizzora.bd/logo.png",
          "image": "https://pizzora.bd/restaurant.jpg",
          "telephone": "+8801620026649",
          "servesCuisine": "Pizza",
          "priceRange": "$$",
          "sameAs": [
            "https://www.instagram.com/pizzoraofficial/",
            "https://www.threads.com/@pizzoraofficial",
            "https://www.pinterest.com/pizzoraofficial/",
            "https://www.facebook.com/pizzoraofficials/",
            "https://x.com/pizzoraofficial",
            "https://www.tiktok.com/@pizzoraofficial",
            "https://www.youtube.com/@Pizzoraofficial",
            "https://wa.me/8801620026649"
          ]
        }}
        type="restaurant"
      />
      <h1 className="sr-only">Pizzora - The Official Pizzora Restaurant & Freshly Baked Pizza in Bangladesh</h1>
      
      <section className="relative pt-24 md:pt-28 pb-4 md:pb-16 px-4 sm:px-6 lg:px-8 bg-[#FEFCF8]">
        <div className="max-w-[1200px] mx-auto relative rounded-xl overflow-hidden shadow-2xl w-full bg-gray-900" style={{ height: 'clamp(240px, 45vw, 600px)' }}>
          {state.isInitialLoading ? (
            <HeroSkeleton />
          ) : (
            <>
              {state.carouselSlides.map((slide, index) => {
                const hasLink = slide.link && slide.link.trim().length > 0;
                const Tag = hasLink ? 'a' : 'div';
                const linkProps = hasLink
                  ? { href: slide.link, target: '_blank', rel: 'noopener noreferrer' }
                  : {};
                return (
                  <Tag
                    key={index}
                    {...linkProps}
                    className={`absolute inset-0 transition-opacity duration-1000 ${
                      currentSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    } ${hasLink ? 'cursor-pointer' : ''}`}
                    style={{ display: 'block' }}
                  >
                    <img
                      src={optimizeCloudinaryUrl(slide.url, 1200)}
                      alt={slide.title || `Slide ${index + 1}`}
                      title={slide.title || `Slide ${index + 1}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      fetchpriority={index === 0 ? 'high' : 'low'}
                      className={`w-full h-full object-cover transition-transform duration-[10000ms] ease-linear ${
                        isMounted && currentSlide === index ? 'scale-110' : 'scale-100'
                      }`}
                    />
                  </Tag>
                );
              })}

              {/* Carousel Indicators */}
              {totalSlides > 1 && (
                <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
                  {state.carouselSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i)}
                      className={`transition-all rounded-full ${
                        currentSlide === i 
                          ? 'w-4 sm:w-8 h-1.5 sm:h-2 bg-[#F9002B]' 
                          : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/50 hover:bg-white'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      {/* QUICK ACTION CATEGORIES (Mobile App Style) */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} className="relative z-20 px-4 pb-8 overflow-hidden bg-[#FEFCF8]">
        <div className="flex gap-4 md:gap-8 overflow-x-auto snap-x hide-scrollbar pb-2 pt-2 max-w-5xl -mx-4 md:mx-auto px-4 md:px-0">
          {[
            { name: 'Pizza', category: 'Pizza', icon: <Pizza size={32} className="text-[#F9002B]" /> },
            { name: 'Burgers', category: 'Burger', icon: <BurgerIcon size={32} className="text-orange-500" /> },
            { name: 'Pasta', category: 'Pasta', icon: <UtensilsCrossed size={32} className="text-amber-500" /> },
            { name: 'Salads', category: 'Salad', icon: <Salad size={32} className="text-green-500" /> },
            { name: 'Sandwich', category: 'Sub', icon: <Sandwich size={32} className="text-yellow-600" /> },
            { name: 'Drinks', category: 'Lassi', icon: <Wine size={32} className="text-purple-500" /> },
            { name: 'Coffee', category: 'Cold Coffee', icon: <Coffee size={32} className="text-stone-600" /> },
            { name: 'Desserts', category: 'Dessert', icon: <CakeSlice size={32} className="text-pink-500" /> },
            { name: 'Offers', category: 'Combo', icon: <Gift size={32} className="text-blue-500" /> },
          ].map((cat, i) => (
            <Link key={i} to={`/menu?category=${encodeURIComponent(cat.category)}`} className="snap-start flex flex-col items-center gap-2 min-w-[72px] md:min-w-[100px] hover:-translate-y-1 transition-transform">
              <div className="w-[68px] h-[68px] md:w-[80px] md:h-[80px] rounded-2xl bg-white shadow-sm border border-red-50 flex items-center justify-center transition-all hover:shadow-md active:scale-95" style={{ boxShadow: '0 4px 12px rgba(249,0,43,0.04)' }}>
                {cat.icon}
              </div>
              <span className="text-[11px] md:text-[13px] font-bold text-gray-700 tracking-wide">{cat.name}</span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* PREMIUM ABOUT SECTION */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ backgroundColor: '#FDFBF7', marginTop: '-120px', paddingTop: '180px' }}>
        {/* Subtle Background Elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(249,0,43,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-1/3 h-full opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 0% 100%, rgba(0,0,0,0.05) 0%, transparent 70%)' }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            
            {/* Elegant Dual Image Layout */}
            <div className="relative pl-2 lg:pl-6 pr-2 lg:pr-8">
              <div className="relative z-10 rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden shadow-2xl mr-4 lg:mr-12 h-[400px] lg:h-[540px]">
                <img
                  src={state.galleryImages.filter(g => g.category === 'Restaurant')[0]?.url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200"}
                  alt="Restaurant Interior"
                  title="Pizzora Restaurant Interior"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/10" />
              </div>
              
              {/* Secondary Overlapping Image */}
              <div className="absolute -bottom-6 right-0 lg:-bottom-8 lg:-right-4 z-20 rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.3)] lg:shadow-[0_30px_60px_rgba(0,0,0,0.4)] border-[4px] lg:border-[8px] border-[#FDFBF7] w-[65%] lg:w-[60%] h-[220px] lg:h-[320px]">
                <img
                  src={state.galleryImages.filter(g => g.category === 'Food')[0]?.url || "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&q=80&w=800"}
                  alt="Signature Dish"
                  title="Pizzora Signature Dish"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Minimalist Award Badge */}
              <div className="absolute top-4 -left-2 lg:top-8 lg:-left-6 z-30 bg-white p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-xl flex items-center gap-3 lg:gap-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-red-50 text-[#F9002B]">
                  <Award size={20} className="lg:w-6 lg:h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 leading-tight" style={{ fontFamily: 'var(--font-heading)', fontSize: '16px' }}>Top Rated</p>
                  <p className="text-gray-500 text-[10px] lg:text-xs uppercase tracking-wider font-semibold">In Sylhet</p>
                </div>
              </div>
            </div>

            {/* Typography & Content */}
            <div className="pt-8 lg:pt-0">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[2px] w-12" style={{ backgroundColor: '#F9002B' }} />
                <span style={{ color: '#F9002B', fontSize: '13px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
                  A Legacy of Taste
                </span>
              </div>
              
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(36px, 5vw, 56px)', color: '#1F2937', lineHeight: 1.1, marginBottom: '24px' }}>
                Where Every Bite Tells a <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #F9002B, #990012)' }}>Story.</span>
              </h2>

              <div className="mb-8 p-5 md:p-6 rounded-2xl w-full" style={{ background: 'linear-gradient(135deg, #111111 0%, #1a1a1a 100%)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', borderLeft: '4px solid #F9002B' }}>
                <p className="text-xl md:text-2xl text-white/95 text-center md:text-left" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '1px', fontWeight: 700 }}>
                  "Cancel Plans. Call PIZZORA."
                </p>
              </div>
              
              <div className="relative pl-6 mb-8 border-l-2 border-[#F9002B]/20">
                <p style={{ color: '#4B5563', fontSize: '17px', lineHeight: 1.8, marginBottom: '16px' }}>
                  Pizzora Restaurant is Sylhet's premier dining destination, harmonizing rich culinary traditions with modern elegance. Since 2018, we have been crafting unforgettable experiences through impeccable service and authentic flavors.
                </p>
                <p style={{ color: '#4B5563', fontSize: '17px', lineHeight: 1.8 }}>
                  Our award-winning chefs source only the finest, freshest ingredients to create masterpieces that delight the senses and bring people together.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-10">
                {['Artisan Ingredients', 'Master Chefs', 'Luxury Ambiance', 'Curated Menu'].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F9002B' }}>
                      <Check size={12} style={{ color: '#fff' }} />
                    </div>
                    <span style={{ fontSize: '15px', color: '#374151', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <Link
                  to="/about"
                  className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-white shadow-lg transition-transform hover:-translate-y-1"
                  style={{ backgroundColor: '#F9002B', fontFamily: 'var(--font-heading)' }}
                >
                  <span className="relative z-10 tracking-wide">Discover Our Story</span>
                  <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                {/* Signature or CEO Name */}
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm font-medium">Founder & Owner</span>
                  <span className="text-2xl" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontWeight: 700, color: '#1F2937' }}>
                    Muhammad Ahmad Ullah
                  </span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </motion.section>

      {/* POPULAR MENU */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9F5F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#F9002B', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
                Crowd Favorites
              </span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: '#111', marginBottom: '12px' }}>
              Popular Menu Items
            </h2>
            <p style={{ color: '#6B7280', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Discover our most-loved dishes, crafted to perfection by our expert culinary team.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {state.isInitialLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <MenuCardSkeleton key={i} />
              ))
            ) : popularItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover group"
                style={{ border: '1px solid rgba(249,0,43,0.06)' }}
              >
                <div className="relative overflow-hidden" style={{ height: 'clamp(110px, 30vw, 192px)' }}>
                  <img
                    src={optimizeCloudinaryUrl(item.image, 600)}
                    alt={item.name}
                    title={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {item.isPopular && (
                      <span className="premium-badge" style={{ fontSize: '9px', padding: '1px 6px' }}>Popular</span>
                    )}
                    {item.isVeg && (
                      <span className="px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#16A34A', fontSize: '9px', fontWeight: 600 }}>
                        Veg
                      </span>
                    )}
                  </div>
                  {/* Quick view button */}
                  <div className="absolute inset-x-0 bottom-2 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <button
                      onClick={() => navigate(`/menu/${item.slug}`)}
                      className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-semibold card-glass-btn"
                    >
                      <Eye size={12} /> Quick View
                    </button>
                  </div>
                </div>

                <div className="p-2.5 sm:p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="flex-1 pr-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(11px, 3vw, 15px)', color: '#111', lineHeight: 1.3 }}>
                      {item.name}
                    </h3>
                    <span style={{ fontWeight: 700, fontSize: 'clamp(11px, 3vw, 15px)', color: '#F9002B', fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap', marginLeft: '4px' }}>
                      ৳{item.price}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-2">
                    <StarRating rating={item.rating} size={10} />
                    <span style={{ fontSize: '10px', color: '#6B7280' }}>({item.reviewCount})</span>
                  </div>

                  <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5', marginBottom: '10px' }} className="line-clamp-2 hidden sm:block">
                    {item.description.substring(0, 72)}...
                  </p>

                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      onClick={() => navigate(`/menu/${item.slug}`)}
                      className="flex-1 rounded-lg font-semibold border transition-all hover:shadow-sm"
                      style={{ borderColor: '#F9002B', color: '#F9002B', fontFamily: 'var(--font-heading)', fontSize: 'clamp(9px, 2.5vw, 12px)', padding: 'clamp(5px, 1.5vw, 8px) 4px' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => addToCart(item)}
                      className="flex-1 rounded-lg font-semibold text-white transition-all hover:shadow-md hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: 'clamp(9px, 2.5vw, 12px)', padding: 'clamp(5px, 1.5vw, 8px) 4px' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-white transition-all hover:shadow-xl hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
            >
              Explore Full Menu
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </motion.section>


      {/* ONLINE ORDER / DELIVERY SECTION */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F9002B]/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#F9002B]/[0.03] rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-4 lg:space-y-6">
              <h3 className="text-[#F9002B] font-bold text-xl tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                We Guarantee
              </h3>
              <h2 className="text-4xl lg:text-[44px] font-black text-[#111] leading-[1.15]" style={{ fontFamily: 'var(--font-heading)' }}>
                30 Minutes <br className="hidden lg:block"/> Delivery!
              </h2>
              <p className="text-[#6B7280] leading-relaxed text-[15px] lg:max-w-xs mx-auto lg:mx-0">
                Experience the fastest delivery in Sylhet. We ensure your food arrives piping hot and perfectly packaged within 30 minutes, or your next meal is on us.
              </p>
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-4">
                <div className="w-16 h-16 rounded-full bg-[#F9002B] flex items-center justify-center shadow-[0_8px_16px_rgba(249,0,43,0.25)] transition-transform hover:scale-105">
                  <Phone className="text-white" size={26} />
                </div>
                <div className="text-left">
                  <p className="text-xs text-[#6B7280] font-bold tracking-wider uppercase mb-1">Call Us Free :</p>
                  <p className="text-xl font-black text-[#111]" style={{ fontFamily: 'var(--font-heading)' }}>+880 1620-026649</p>
                </div>
              </div>
            </div>

            {/* Middle Image/Composition */}
            <div className="relative flex justify-center items-center py-12 lg:py-0">
              {/* Outer Dashed Ring */}
              <div className="w-72 h-72 md:w-[340px] md:h-[340px] rounded-full border border-dashed border-[#F9002B]/40 absolute animate-[spin_40s_linear_infinite]" />
              
              {/* Delivery Image */}
              <div className="relative z-10 w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden shadow-2xl border-[12px] border-white bg-white flex items-center justify-center">
                <img src="/food delivery.jpg" alt="Fast Delivery" title="Fast Delivery" className="w-[90%] h-[90%] object-contain scale-[1.1]" />
              </div>

              {/* Floating Icons */}
              <div className="absolute top-8 right-10 md:right-10 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.06)] flex items-center justify-center z-20 animate-[bounce_3s_infinite]" style={{ animationDelay: '0ms' }}>
                <MapPin className="text-[#F9002B]" size={18} />
              </div>
              <div className="absolute bottom-16 left-6 md:left-4 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.06)] flex items-center justify-center z-20 animate-[bounce_3s_infinite]" style={{ animationDelay: '1000ms' }}>
                <ShoppingCart className="text-[#F9002B]" size={18} />
              </div>
              <div className="absolute top-1/2 -right-2 md:-right-6 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.06)] flex items-center justify-center z-20 animate-[bounce_3s_infinite]" style={{ animationDelay: '500ms' }}>
                <Star className="text-[#F59E0B]" size={18} />
              </div>
              <div className="absolute top-20 left-6 md:left-6 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.06)] flex items-center justify-center z-20 animate-[bounce_3s_infinite]" style={{ animationDelay: '1500ms' }}>
                <Clock className="text-[#F9002B]" size={18} />
              </div>
            </div>

            {/* Right Content */}
            <div className="text-center lg:text-left space-y-5">
              <h2 className="text-3xl md:text-4xl lg:text-[40px] font-black text-[#111] leading-[1.15]" style={{ fontFamily: 'var(--font-heading)' }}>
                Choose what you want, <br className="hidden xl:block"/> select a pick up time
              </h2>
              <p className="text-[#6B7280] leading-relaxed text-[15px] lg:max-w-[340px] mx-auto lg:mx-0">
                Browse our extensive menu, customize your order exactly how you like it, and schedule your delivery or pickup at your convenience.
              </p>
              <div className="pt-3 flex justify-center lg:justify-start">
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white transition-all shadow-[0_10px_20px_rgba(249,0,43,0.3)] hover:shadow-[0_15px_30px_rgba(249,0,43,0.4)] hover:-translate-y-1 bg-[#F9002B]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Order Now
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
            
          </div>
        </div>
      </motion.section>

      {/* CHEFS SECTION */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9F5F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#F9002B', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
                The Culinary Team
              </span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: '#111', marginBottom: '12px' }}>
              Meet Our <span style={{ color: '#F9002B' }}>Expert Chefs</span>
            </h2>
            <p style={{ color: '#6B7280', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              The talented artists behind every dish — passionate, skilled, and dedicated to culinary excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {state.isInitialLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <ChefCardSkeleton key={i} />
              ))
            ) : state.chefs.map(chef => (
              <div key={chef.id} className="text-center group">
                <div className="relative inline-block mb-5">
                  <div
                    className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden mx-auto shadow-xl border-4 transition-all duration-300 group-hover:shadow-2xl"
                    style={{ borderColor: 'rgba(249,0,43,0.4)' }}
                  >
                    <img
                      src={chef.image}
                      alt={chef.name}
                      title={chef.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div
                    className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
                  >
                    <Award size={16} style={{ color: '#111' }} />
                  </div>
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '20px', color: '#111', marginBottom: '4px' }}>
                  {chef.name}
                </h3>
                <p style={{ color: '#F9002B', fontWeight: 600, fontSize: '14px', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
                  {chef.position}
                </p>
                <p style={{ color: '#F9002B', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                  {chef.experience} • {chef.speciality}
                </p>
                <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6', maxWidth: '280px', margin: '0 auto' }}>
                  {chef.bio.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* GALLERY PREVIEW */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="section-line" />
                <span style={{ color: '#F9002B', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
                  Visual Journey
                </span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: '#111' }}>
                Our <span style={{ color: '#F9002B' }}>Gallery</span>
              </h2>
            </div>
            <Link
              to="/gallery"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold transition-all hover:-translate-x-1"
              style={{ color: '#F9002B', fontFamily: 'var(--font-heading)' }}
            >
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {state.galleryImages.slice(0, 5).map((img, i) => (
              <Link
                key={img.id || i}
                to="/gallery"
                className={`relative overflow-hidden rounded-2xl group ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                style={{ height: i === 0 ? '320px' : '150px' }}
              >
                <img src={img.url} alt={img.title} title={img.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-end p-4">
                  <span
                    className="text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {img.title}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8 sm:hidden">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: '#F9002B', fontFamily: 'var(--font-heading)' }}
            >
              View All Gallery <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* REVIEWS */}
      {state.reviews.length > 0 && (
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #F9002B 0%, #C8001F 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div style={{ width: '60px', height: '3px', background: 'linear-gradient(90deg, #ffffff, rgba(255,255,255,0.3))', borderRadius: '2px' }} />
              <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
                Testimonials
              </span>
              <div style={{ width: '60px', height: '3px', background: 'linear-gradient(270deg, #ffffff, rgba(255,255,255,0.3))', borderRadius: '2px' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: '#ffffff', marginBottom: '8px' }}>
              What Our Guests Say
            </h2>
            <div className="flex items-center justify-center gap-2 mt-3">
              <StarRating rating={5} size={18} color="#ffffff" />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px' }}>4.9/5 from 1,200+ reviews</span>
            </div>
          </div>

          {/* Carousel */}
          <div className="relative">
            {/* Card */}
            <div
              className="p-8 sm:p-10 rounded-3xl relative overflow-hidden testimonial-card"
              style={{
                boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                opacity: reviewTransitioning ? 0 : 1,
                transform: reviewTransitioning ? 'translateY(10px)' : 'translateY(0)',
              }}
            >
              {/* Big quote */}
              <Quote
                size={64}
                className="absolute top-6 right-8 opacity-10"
                style={{ color: '#ffffff' }}
              />

              {/* Content */}
              <div className="mb-8 relative z-10">
                <StarRating rating={state.reviews[currentReview]?.rating || 5} size={20} color="#ffffff" />
              </div>

              <p style={{
                color: '#ffffff',
                fontSize: 'clamp(18px, 3vw, 24px)',
                lineHeight: '1.5',
                fontWeight: 500,
                marginBottom: '40px',
                position: 'relative',
                zIndex: 10,
                minHeight: '90px',
              }}>
                "{state.reviews[currentReview]?.comment}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-[#F9002B] bg-white text-xl font-bold flex-shrink-0 shadow-lg"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {state.reviews[currentReview]?.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '16px', fontFamily: 'var(--font-heading)' }}>
                      {state.reviews[currentReview]?.name}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '2px' }}>
                      Customer
                    </p>
                  </div>
                </div>

                {/* Counter */}
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                  {currentReview + 1} / {state.reviews.length}
                </span>
              </div>
            </div>

            {/* Arrows Removed */}
          </div>

          {/* Dot Indicators */}
          <div className="flex items-center justify-center gap-2.5 mt-8">
            {state.reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (reviewIntervalRef.current) clearInterval(reviewIntervalRef.current); goToReview(i); }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentReview ? '28px' : '8px',
                  height: '8px',
                  background: i === currentReview ? '#ffffff' : 'rgba(255,255,255,0.25)',
                }}
                aria-label={`Go to review ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </motion.section>
      )}

      {/* RESERVATION SECTION */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} id="reservation" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#F9002B', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
                Book Your Table
              </span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: '#111', marginBottom: '12px' }}>
              Reserve Your <span style={{ color: '#F9002B' }}>Experience</span>
            </h2>
            <p style={{ color: '#6B7280', fontSize: '16px', maxWidth: '460px', margin: '0 auto' }}>
              Book your table now and we'll prepare an unforgettable experience just for you.
            </p>
          </div>

          <div
            className="p-8 sm:p-10 rounded-3xl shadow-xl"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
          >
            <QuickReservationForm />
          </div>
        </div>
      </motion.section>

      {/* MAP SECTION */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9F5F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#F9002B', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
                Find Us
              </span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)', color: '#111' }}>
              Visit Us in <span style={{ color: '#F9002B' }}>Sylhet</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-xl" style={{ height: '380px' }}>
              <iframe
                src="https://maps.google.com/maps?q=WV4P%2B3H,%20Sylhet&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Pizzora Restaurant Location"
              />
            </div>

            <div className="space-y-4">
              {[
                { icon: MapPin, title: 'Address', content: 'WV4P+3H, Subidbazar, Sylhet, Bangladesh' },
                { icon: Phone, title: 'Phone', content: '+880 1620-026649' },
                { icon: Clock, title: 'Opening Hours', content: 'All Week: 11AM – 11PM' },
              ].map(({ icon: Icon, title, content }) => (
                <div
                  key={title}
                  className="p-5 rounded-2xl flex gap-4"
                  style={{ backgroundColor: '#fff', border: '1px solid rgba(249,0,43,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(249,0,43,0.08)' }}>
                    <Icon size={18} style={{ color: '#F9002B' }} />
                  </div>
                  <div>
                    <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111', marginBottom: '4px' }}>{title}</h4>
                    <p style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'pre-line', lineHeight: '1.6' }}>{content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA SECTION */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: "easeOut" }} className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #F9002B 0px, #F9002B 1px, transparent 1px, transparent 50px)',
          }}
        />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="mb-4 flex justify-center">
            <span className="px-4 py-1.5 rounded-full text-sm font-semibold" style={{ backgroundColor: 'rgba(249,0,43,0.08)', color: '#F9002B', fontFamily: 'var(--font-heading)' }}>
              ★ Limited Slots Available
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 5vw, 52px)', color: '#111', lineHeight: 1.15, marginBottom: '16px' }}>
            Ready for an <span style={{ color: '#F9002B' }}>Extraordinary</span> <br />Dining Experience?
          </h2>
          <p style={{ color: '#6B7280', fontSize: '17px', maxWidth: '500px', margin: '0 auto 32px', lineHeight: '1.7' }}>
            Join thousands of satisfied guests who have made Pizzora their favorite dining destination in Sylhet.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/reservation"
              className="flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-white transition-all hover:shadow-xl hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
            >
              <Calendar size={20} />
              Book a Table
            </Link>
            <Link
              to="/menu"
              className="flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:shadow-lg hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', color: '#111', fontFamily: 'var(--font-heading)' }}
            >
              <ShoppingCart size={20} />
              Order Online
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function QuickReservationForm() {
  const { dispatch, showNotification } = useApp();
  const [form, setForm] = useState({ name: '', phone: '', date: '', time: '', guests: '2' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const reservation = {
        id: Date.now().toString(),
        ...form,
        email: '',
        guests: parseInt(form.guests),
        specialRequest: '',
        status: 'Pending' as const,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_RESERVATION', payload: reservation });
      showNotification('Table booked successfully! We\'ll confirm shortly.', 'success');
      setForm({ name: '', phone: '', date: '', time: '', guests: '2' });
      setLoading(false);
    }, 1200);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    colorScheme: 'dark',
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
            Full Name *
          </label>
          <input
            type="text"
            required
            placeholder="Your name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
            Phone Number *
          </label>
          <input
            type="tel"
            required
            placeholder="+880 1XXXXXXXXX"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
            Date *
          </label>
          <input
            type="date"
            required
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={inputStyle}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
            Time *
          </label>
          <select
            required
            value={form.time}
            onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="" style={{ background: '#2d0808' }}>Select time</option>
            {['11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'].map(t => (
              <option key={t} value={t} style={{ background: '#2d0808' }}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
          Number of Guests
        </label>
        <div className="flex gap-2 flex-wrap">
          {['1', '2', '3', '4', '5', '6', '8', '10+'].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setForm(f => ({ ...f, guests: n }))}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: form.guests === n ? '#ffffff' : 'rgba(255,255,255,0.1)',
                color: form.guests === n ? '#F9002B' : 'rgba(255,255,255,0.8)',
                border: '1px solid',
                borderColor: form.guests === n ? 'transparent' : 'rgba(255,255,255,0.2)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-full font-bold text-base transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70"
        style={{ background: '#ffffff', color: '#F9002B', fontFamily: 'var(--font-heading)' }}
      >
        {loading ? 'Booking...' : '✦ Confirm Reservation'}
      </button>
    </form>
  );
}