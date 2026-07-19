import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, Filter, Star, ShoppingCart, Eye, Flame, Leaf, ChevronDown, Clock, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MenuCardSkeleton } from '../components/Skeletons';
import { SEO } from '../components/SEO';
import { optimizeCloudinaryUrl } from '../utils/image';

const spiceLevels = ['All', 'Mild', 'Medium', 'Hot', 'Extra Hot'];

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= Math.floor(rating) ? '#F59E0B' : 'none'} color={i <= Math.floor(rating) ? '#F59E0B' : '#D1D5DB'} />
      ))}
    </div>
  );
}

export function Menu() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get('category') || 'All';
  const [activeCategory, setActiveCategory] = useState(initialCat);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && cat !== activeCategory) {
      setActiveCategory(cat);
    } else if (!cat && activeCategory !== 'All') {
      setActiveCategory('All');
    }
  }, [searchParams]);
  const [search, setSearch] = useState('');
  const [spiceFilter, setSpiceFilter] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [spicyOnly, setSpicyOnly] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [maxPrice, setMaxPrice] = useState(1000);
  const [showFilters, setShowFilters] = useState(false);
  const { state, addToCart } = useApp();
  const navigate = useNavigate();

  const categories = useMemo(() => {
    const uniqueCats = Array.from(new Set(state.menuItems.map(item => item.category))).filter(Boolean).sort();
    return ['All', ...uniqueCats];
  }, [state.menuItems]);

  const filtered = useMemo(() => {
    let items = state.menuItems.filter(i => i.showOnWebsite !== false);

    if (activeCategory !== 'All') items = items.filter(i => i.category === activeCategory);
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()));
    if (spiceFilter !== 'All') items = items.filter(i => i.spiceLevel === spiceFilter);
    if (vegOnly) items = items.filter(i => i.isVeg);
    if (spicyOnly) items = items.filter(i => i.isSpicy);
    items = items.filter(i => i.price <= maxPrice);

    switch (sortBy) {
      case 'popular': items.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)); break;
      case 'rating': items.sort((a, b) => b.rating - a.rating); break;
      case 'price-low': items.sort((a, b) => a.price - b.price); break;
      case 'price-high': items.sort((a, b) => b.price - a.price); break;
    }

    return items;
  }, [state.menuItems, activeCategory, search, spiceFilter, vegOnly, spicyOnly, maxPrice, sortBy]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    if (cat !== 'All') setSearchParams({ category: cat });
    else setSearchParams({});
  };

  const spiceColors: Record<string, string> = {
    Mild: '#16A34A',
    Medium: '#D97706',
    Hot: '#DC2626',
    'Extra Hot': '#7C3AED',
  };

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: '#FEFCF8' }}>
      <SEO 
        title="Pizzora Menu | The Official Pizzora Restaurant Menu"
        description="Browse the official Pizzora menu featuring freshly baked Pizzora pizzas, delicious sides, and more. Order online from Pizzora Restaurant today."
        url="https://pizzora.bd/menu"
      />
      {/* Header */}
      <div
        className="py-16 px-4 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #ffffff 0%, transparent 50%)' }} />
        <div className="relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
            <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
              Explore
            </span>
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 56px)', color: '#fff', marginBottom: '12px' }}>
            Our Menu
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '16px', maxWidth: '420px', margin: '0 auto' }}>
            Discover our complete collection of premium dishes crafted with passion and expertise.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              type="text"
              placeholder="Search dishes, ingredients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border"
              style={{ borderColor: 'rgba(249,0,43,0.15)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }}
            />
          </div>
          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-4 py-3 rounded-xl border"
              style={{ borderColor: 'rgba(249,0,43,0.15)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none', color: '#111' }}
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Top Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <button
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm"
              style={{
                borderColor: showFilters ? '#F9002B' : 'rgba(249,0,43,0.15)',
                color: showFilters ? '#F9002B' : '#374151',
                backgroundColor: showFilters ? 'rgba(249,0,43,0.05)' : 'transparent',
                fontFamily: 'var(--font-heading)',
              }}
            >
              <Filter size={16} /> Filters
              <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-5 mb-6 rounded-2xl border" style={{ borderColor: 'rgba(249,0,43,0.12)', backgroundColor: '#FDF8F3' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '10px' }}>
                  Spice Level
                </label>
                <div className="flex flex-wrap gap-2">
                  {spiceLevels.map(level => (
                    <button
                      key={level}
                      onClick={() => setSpiceFilter(level)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: spiceFilter === level ? '#F9002B' : 'white',
                        color: spiceFilter === level ? 'white' : '#6B7280',
                        border: '1px solid',
                        borderColor: spiceFilter === level ? '#F9002B' : 'rgba(249,0,43,0.15)',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '10px' }}>
                  Dietary
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setVegOnly(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: vegOnly ? '#16A34A' : 'white',
                      color: vegOnly ? 'white' : '#6B7280',
                      border: `1px solid ${vegOnly ? '#16A34A' : 'rgba(249,0,43,0.15)'}`,
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    <Leaf size={12} /> Veg Only
                  </button>
                  <button
                    onClick={() => setSpicyOnly(s => !s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: spicyOnly ? '#DC2626' : 'white',
                      color: spicyOnly ? 'white' : '#6B7280',
                      border: `1px solid ${spicyOnly ? '#DC2626' : 'rgba(249,0,43,0.15)'}`,
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    <Flame size={12} /> Spicy
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#374151', display: 'block', marginBottom: '10px' }}>
                  Max Price: ৳{maxPrice}
                </label>
                <input
                  type="range"
                  min={80}
                  max={1000}
                  step={20}
                  value={maxPrice}
                  onChange={e => setMaxPrice(+e.target.value)}
                  className="w-full"
                  style={{ accentColor: '#F9002B' }}
                />
                <div className="flex justify-between text-xs" style={{ color: '#9CA3AF', marginTop: '4px' }}>
                  <span>৳80</span><span>৳1000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
              style={{
                background: activeCategory === cat ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'white',
                color: activeCategory === cat ? 'white' : '#6B7280',
                border: '1px solid',
                borderColor: activeCategory === cat ? 'transparent' : 'rgba(249,0,43,0.15)',
                fontFamily: 'var(--font-heading)',
                flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            Showing <span style={{ color: '#F9002B', fontWeight: 700 }}>{filtered.length}</span> item{filtered.length !== 1 ? 's' : ''}
            {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
          </p>
        </div>

        {/* Menu Grid */}
        {state.isInitialLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <MenuCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🍽️</div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
              No dishes found
            </h3>
            <p style={{ color: '#6B7280', fontSize: '15px' }}>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {filtered.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/menu/${item.slug}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover group cursor-pointer"
                style={{ border: '1px solid rgba(249,0,43,0.06)' }}
              >
                <div className="relative overflow-hidden" style={{ height: 'clamp(110px, 30vw, 192px)' }}>
                  <img
                    src={optimizeCloudinaryUrl(item.image, 600)}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 left-2 flex gap-1">
                    {item.isPopular && <span className="premium-badge" style={{ fontSize: '9px', padding: '1px 6px' }}>Popular</span>}
                    {item.isVeg && (
                      <span className="px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#16A34A', fontSize: '9px', fontWeight: 600 }}>
                        Veg
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full hidden sm:block"
                    style={{ backgroundColor: `${spiceColors[item.spiceLevel] || '#6B7280'}20`, color: spiceColors[item.spiceLevel] || '#6B7280', border: `1px solid ${spiceColors[item.spiceLevel] || '#6B7280'}40`, fontSize: '10px', fontWeight: 600 }}
                  >
                    {item.spiceLevel}
                  </div>
                  <div className="absolute inset-x-0 bottom-2 flex justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                    <span
                      className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-semibold card-glass-btn"
                    >
                      <Eye size={12} /> View Details
                    </span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="flex-1 pr-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(11px, 3vw, 15px)', color: '#111', lineHeight: 1.3 }}>
                      {item.name}
                    </h3>
                    <span style={{ fontWeight: 700, fontSize: 'clamp(11px, 3vw, 15px)', color: '#F9002B', fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap' }}>
                      ৳{item.price}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-2">
                    <StarRating rating={item.rating} size={10} />
                    <span style={{ fontSize: '10px', color: '#6B7280' }}>({item.reviewCount})</span>
                  </div>

                  <p className="line-clamp-2 mb-2 hidden sm:block" style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                    {item.description.substring(0, 75)}...
                  </p>

                  <div className="hidden sm:flex items-center justify-between mb-3" style={{ color: '#9CA3AF' }}>
                    <span className="flex items-center gap-1" style={{ fontSize: '11px' }}>
                      <Clock size={11} style={{ color: '#6B7280' }} /> {item.prepTime}
                    </span>
                    <span className="flex items-center gap-1" style={{ fontSize: '11px' }}>
                      <Users size={11} style={{ color: '#6B7280' }} /> {item.serves}
                    </span>
                  </div>

                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/menu/${item.slug}`); }}
                      className="flex items-center justify-center gap-1 flex-1 rounded-lg font-semibold border transition-all"
                      style={{ borderColor: '#F9002B', color: '#F9002B', fontFamily: 'var(--font-heading)', fontSize: 'clamp(9px, 2.5vw, 12px)', padding: 'clamp(5px, 1.5vw, 8px) 4px' }}
                    >
                      <Eye size={10} /> <span className="hidden xs:inline">Details</span><span className="xs:hidden">View</span>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); addToCart(item); }}
                      className="flex items-center justify-center gap-1 flex-1 rounded-lg font-semibold text-white transition-all hover:shadow-md"
                      style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: 'clamp(9px, 2.5vw, 12px)', padding: 'clamp(5px, 1.5vw, 8px) 4px' }}
                    >
                      <ShoppingCart size={10} /> <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}