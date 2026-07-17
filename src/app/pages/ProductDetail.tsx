import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Star, Minus, Plus, ShoppingCart, ChevronRight, Flame, Clock, Users, Leaf, ArrowLeft, Heart, ThumbsUp, Send, MessageSquare, Lock, CheckCircle, ShoppingBag } from 'lucide-react';
import { useApp, ItemReview } from '../context/AppContext';
import { SEO } from '../components/SEO';
import { optimizeCloudinaryUrl } from '../utils/image';

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= Math.floor(rating) ? '#F59E0B' : 'none'}
          color={i <= Math.floor(rating) ? '#F59E0B' : '#D1D5DB'}
        />
      ))}
    </div>
  );
}

export function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, addToCart } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'ingredients' | 'nutrition'>('description');
  const [specialRequest, setSpecialRequest] = useState('');
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // ── Review state ──
  const reviews = state.reviews.filter(r => r.slug === slug);
  const [newReview, setNewReview] = useState({ name: '', rating: 0, comment: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [helpedIds, setHelpedIds] = useState<string[]>([]);
  const [reviewedSlugs, setReviewedSlugs] = useState<string[]>([]);

  const item = state.menuItems.find(m => m.slug === slug);
  const related = state.menuItems.filter(m => m.category === item?.category && m.id !== item?.id && m.showOnWebsite !== false).slice(0, 3);

  // ── Check if this browser has ordered this item ──
  const [hasOrdered, setHasOrdered] = useState(false);
  useEffect(() => {
    if (item) {
      try {
        const stored = JSON.parse(localStorage.getItem('pizzora_purchased_items') || '[]');
        if (stored.includes(item.id)) {
          setHasOrdered(true);
        }
      } catch (e) {}
    }
  }, [item]);
  // Has this browser already reviewed this slug?
  const hasReviewed = reviewedSlugs.includes(slug ?? '');

  // Reset when slug changes
  useEffect(() => {
    setSelectedImage(null);
    setNewReview({ name: '', rating: 0, comment: '' });
    setShowReviewForm(false);
    setReviewSubmitted(false);
    setHoverRating(0);
    // Load reviewed slugs
    try {
      const stored = localStorage.getItem('pizzora_reviewed_items');
      setReviewedSlugs(stored ? JSON.parse(stored) : []);
    } catch { setReviewedSlugs([]); }
  }, [slug]);

  const handleSubmitReview = () => {
    if (!newReview.name.trim() || newReview.rating === 0 || !newReview.comment.trim()) return;
    if (!hasOrdered || hasReviewed) return;
    const review: ItemReview = {
      id: Date.now().toString(),
      slug: slug ?? '',
      name: newReview.name.trim(),
      rating: newReview.rating,
      comment: newReview.comment.trim(),
      date: new Date().toISOString().split('T')[0],
      helpful: 0,
    };
    dispatch({ type: 'ADD_REVIEW', payload: review });
    // Mark this slug as reviewed in localStorage
    const updated = [...reviewedSlugs, slug ?? ''];
    setReviewedSlugs(updated);
    localStorage.setItem('pizzora_reviewed_items', JSON.stringify(updated));
    setNewReview({ name: '', rating: 0, comment: '' });
    setHoverRating(0);
    setShowReviewForm(false);
    setReviewSubmitted(true);
  };

  const handleHelpful = (reviewId: string) => {
    if (helpedIds.includes(reviewId)) return;
    setHelpedIds(prev => [...prev, reviewId]);
    dispatch({ type: 'HELPFUL_REVIEW', payload: reviewId });
  };

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '80px' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '24px', color: '#111', marginBottom: '8px' }}>Dish Not Found</h2>
          <p style={{ color: '#6B7280', marginBottom: '20px' }}>This menu item doesn't exist or may have been removed.</p>
          <button
            onClick={() => navigate('/menu')}
            className="px-6 py-3 rounded-full text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  const spiceColors: Record<string, string> = { Mild: '#16A34A', Medium: '#D97706', Hot: '#DC2626', 'Extra Hot': '#7C3AED' };

  // Use the 4 images from the item if available, otherwise fallback to item.image + related items
  const galleryImages = (item.images && item.images.length > 0)
    ? item.images
    : [item.image, ...related.map(r => r.image)];
  const activeImage = selectedImage ?? galleryImages[0];

  const avgRating = reviews.length > 0
    ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
    : item.rating;
  const totalReviews = reviews.length > 0 ? reviews.length : item.reviewCount;

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.floor(r.rating) === star).length,
  }));

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: '#FEFCF8' }}>
      <SEO 
        title={`${item.name} | Pizzora Bangladesh`}
        description={item.description}
        url={`https://pizzora.bd/menu/${item.slug}`}
        image={optimizeCloudinaryUrl(item.image, 1200)}
        schema={{
          "@context": "https://schema.org",
          "@type": "MenuItem",
          "name": item.name,
          "description": item.description,
          "image": optimizeCloudinaryUrl(item.image, 1200),
          "offers": {
            "@type": "Offer",
            "price": item.price,
            "priceCurrency": "BDT",
            "availability": "https://schema.org/InStock",
            "url": `https://pizzora.bd/menu/${item.slug}`
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avgRating,
            "reviewCount": totalReviews,
            "bestRating": "5",
            "worstRating": "1"
          }
        }}
      />
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
          <Link to="/" className="hover:underline" style={{ color: '#6B7280' }}>Home</Link>
          <ChevronRight size={14} />
          <Link to="/menu" className="hover:underline" style={{ color: '#6B7280' }}>Menu</Link>
          <ChevronRight size={14} />
          <span style={{ color: '#F9002B', fontWeight: 600 }}>{item.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-2 gap-10 mb-16">
          {/* LEFT — Images */}
          <div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-4" style={{ height: '420px' }}>
              <img
                src={optimizeCloudinaryUrl(activeImage, 800)}
                alt={item.name}
                className="w-full h-full object-cover transition-all duration-300"
                style={{ objectFit: 'cover' }}
              />
              <div className="absolute top-4 left-4 flex gap-2">
                {item.isPopular && <span className="premium-badge">★ Popular</span>}
                {item.isVeg && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: '#16A34A' }}>
                    <Leaf size={10} className="inline mr-1" />Veg
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate(-1)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md"
                style={{ background: '#ffffff' }}
              >
                <ArrowLeft size={18} style={{ color: '#F9002B' }} />
              </button>
            </div>

            {/* Mini gallery */}
            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className="rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105"
                  style={{
                    height: '80px',
                    border: `2px solid ${activeImage === img ? '#F9002B' : 'transparent'}`,
                    boxShadow: activeImage === img ? '0 0 0 3px rgba(249,0,43,0.15)' : 'none',
                    opacity: activeImage === img ? 1 : 0.7,
                  }}
                >
                  <img src={optimizeCloudinaryUrl(img, 200)} alt={`Additional view of ${item.name}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Details */}
          <div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span style={{ color: '#F9002B', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                  {item.category}
                </span>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(26px, 4vw, 38px)', color: '#111', lineHeight: 1.2, marginTop: '4px' }}>
                  {item.name}
                </h1>
              </div>
              <button
                onClick={() => setWishlisted(w => !w)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: wishlisted ? '#FEE2E2' : '#F5F5F5' }}
              >
                <Heart size={18} fill={wishlisted ? '#DC2626' : 'none'} style={{ color: wishlisted ? '#DC2626' : '#6B7280' }} />
              </button>
            </div>

            {/* Rating & Stats */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <StarRating rating={item.rating} size={16} />
                <span style={{ fontWeight: 700, color: '#111', fontSize: '15px' }}>{item.rating}</span>
              </div>
              <span style={{ color: '#6B7280', fontSize: '14px' }}>({item.reviewCount} reviews)</span>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 mb-5">
              {[
                { icon: Clock, label: item.prepTime, color: '#2563EB' },
                { icon: Users, label: item.serves, color: '#7C3AED' },
                { icon: Flame, label: item.spiceLevel, color: spiceColors[item.spiceLevel] },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${color}10`, color, fontFamily: 'var(--font-heading)' }}>
                  <Icon size={12} /> {label}
                </div>
              ))}
              {item.isVeg && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#16A34A10', color: '#16A34A', fontFamily: 'var(--font-heading)' }}>
                  <Leaf size={12} /> Vegetarian
                </div>
              )}
            </div>

            {/* Price */}
            <div className="mb-6 py-4 px-5 rounded-2xl" style={{ backgroundColor: 'rgba(249,0,43,0.05)' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '36px', color: '#F9002B' }}>
                ৳{item.price}
              </span>
              <span style={{ color: '#6B7280', fontSize: '14px', marginLeft: '8px' }}>per {item.serves.includes('Persons') ? 'portion' : 'serving'}</span>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px', color: '#374151', display: 'block', marginBottom: '10px' }}>
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center gap-3 rounded-xl border"
                  style={{ borderColor: 'rgba(249,0,43,0.2)', padding: '8px 16px' }}
                >
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-gray-100"
                    style={{ color: '#F9002B' }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', color: '#111', minWidth: '24px', textAlign: 'center' }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-gray-100"
                    style={{ color: '#F9002B' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '20px', color: '#F9002B' }}>
                  = ৳{item.price * quantity}
                </span>
              </div>
            </div>

            {/* Special Request */}
            <div className="mb-6">
              <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px', color: '#374151', display: 'block', marginBottom: '8px' }}>
                Special Request (Optional)
              </label>
              <textarea
                placeholder="Any special instructions? (e.g., less spicy, extra sauce...)"
                value={specialRequest}
                onChange={e => setSpecialRequest(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border text-sm resize-none"
                style={{ borderColor: 'rgba(249,0,43,0.15)', fontFamily: 'var(--font-body)', outline: 'none' }}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { addToCart(item, quantity, specialRequest); }}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold border-2 transition-all hover:shadow-md"
                style={{ borderColor: '#F9002B', color: '#F9002B', fontFamily: 'var(--font-heading)' }}
              >
                <ShoppingCart size={18} />
                Add to Cart
              </button>
              <button
                onClick={() => { addToCart(item, quantity, specialRequest); navigate('/checkout'); }}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white transition-all hover:shadow-xl hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
              >
                Order Now
              </button>
            </div>
          </div>
        </div>

        {/* Info Tabs */}
        <div className="mb-12">
          <div className="flex border-b mb-6" style={{ borderColor: 'rgba(249,0,43,0.1)' }}>
            {(['description', 'ingredients', 'nutrition'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-6 py-3 font-semibold text-sm capitalize transition-all relative"
                style={{
                  color: activeTab === tab ? '#F9002B' : '#6B7280',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: 'linear-gradient(90deg, #F9002B, #F9002B)' }} />
                )}
              </button>
            ))}
          </div>

          <div className="rounded-2xl p-6" style={{ backgroundColor: '#F9F5F0' }}>
            {activeTab === 'description' && (
              <p style={{ color: '#374141', fontSize: '15px', lineHeight: '1.8' }}>{item.description}</p>
            )}
            {activeTab === 'ingredients' && (
              <div className="flex flex-wrap gap-2">
                {item.ingredients.map(ing => (
                  <span
                    key={ing}
                    className="px-4 py-2 rounded-full text-sm font-medium"
                    style={{ backgroundColor: 'white', color: '#374151', border: '1px solid rgba(249,0,43,0.12)', fontFamily: 'var(--font-heading)' }}
                  >
                    {ing}
                  </span>
                ))}
              </div>
            )}
            {activeTab === 'nutrition' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Calories', value: item.nutrition.calories, unit: 'kcal', color: '#DC2626' },
                  { label: 'Protein', value: item.nutrition.protein, unit: '', color: '#2563EB' },
                  { label: 'Carbs', value: item.nutrition.carbs, unit: '', color: '#D97706' },
                  { label: 'Fat', value: item.nutrition.fat, unit: '', color: '#16A34A' },
                ].map(n => (
                  <div key={n.label} className="text-center p-4 rounded-xl bg-white shadow-sm">
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '24px', color: n.color }}>
                      {n.value}{n.unit}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{n.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── REVIEWS SECTION ── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-line" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '22px', color: '#111' }}>
              Customer Reviews
            </h2>
          </div>

          <div className="grid lg:grid-cols-[300px_1fr] gap-8">
            {/* ── Left: Summary ── */}
            <div>
              <div
                className="rounded-2xl p-6 mb-4 text-center"
                style={{ background: 'white', border: '1px solid rgba(249,0,43,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
              >
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '56px', color: '#F9002B', lineHeight: 1 }}>
                  {avgRating.toFixed(1)}
                </div>
                <div className="flex justify-center my-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      size={20}
                      fill={i <= Math.round(avgRating) ? '#F9002B' : 'none'}
                      style={{ color: i <= Math.round(avgRating) ? '#F9002B' : '#D1D5DB' }}
                    />
                  ))}
                </div>
                <p style={{ color: '#6B7280', fontSize: '14px' }}>Based on {totalReviews} reviews</p>

                {/* Distribution bars */}
                <div className="mt-5 space-y-2 text-left">
                  {ratingDist.map(({ star, count }) => {
                    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : (star === 5 ? 70 : star === 4 ? 20 : 10);
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span style={{ fontSize: '12px', color: '#6B7280', width: '14px', textAlign: 'right' }}>{star}</span>
                        <Star size={11} fill="#F9002B" style={{ color: '#F9002B', flexShrink: 0 }} />
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F9002B, #C8001F)' }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: '#9CA3AF', width: '28px' }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Review CTA: conditional on order/reviewed status ── */}
              {!hasOrdered ? (
                /* NOT ordered — locked state */
                <div
                  className="rounded-2xl p-5 text-center"
                  style={{ background: 'rgba(249,0,43,0.04)', border: '1.5px dashed rgba(249,0,43,0.2)' }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(249,0,43,0.08)' }}
                  >
                    <Lock size={22} style={{ color: '#F9002B' }} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111', marginBottom: '6px' }}>
                    Verified Purchase Only
                  </p>
                  <p style={{ color: '#6B7280', fontSize: '13px', lineHeight: '1.6', marginBottom: '14px' }}>
                    Only customers who have received this dish can leave a review. Order it and enjoy first!
                  </p>
                  <button
                    onClick={() => { addToCart(item, 1); navigate('/checkout'); }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: '13px' }}
                  >
                    <ShoppingBag size={14} />
                    Order to Unlock Review
                  </button>
                </div>
              ) : hasReviewed ? (
                /* Already reviewed */
                <div
                  className="rounded-2xl p-5 text-center"
                  style={{ background: 'rgba(22,163,74,0.06)', border: '1.5px solid rgba(22,163,74,0.25)' }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(22,163,74,0.12)' }}
                  >
                    <CheckCircle size={24} style={{ color: '#16A34A' }} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#16A34A', marginBottom: '5px' }}>
                    Review Submitted!
                  </p>
                  <p style={{ color: '#6B7280', fontSize: '13px' }}>
                    You've already reviewed this dish. Thank you for your feedback!
                  </p>
                </div>
              ) : (
                /* Ordered, not yet reviewed — show Write Review button */
                <>
                  {/* Verified badge */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-3"
                    style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)' }}
                  >
                    <CheckCircle size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span style={{ color: '#16A34A', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                      Verified Purchase — you can review this dish
                    </span>
                  </div>
                  <button
                    onClick={() => { setShowReviewForm(f => !f); setReviewSubmitted(false); }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
                  >
                    <MessageSquare size={16} />
                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </button>
                </>
              )}

              {reviewSubmitted && (
                <div
                  className="mt-3 px-4 py-3 rounded-xl flex items-center gap-2"
                  style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}
                >
                  <CheckCircle size={14} style={{ color: '#16A34A' }} />
                  <span style={{ color: '#16A34A', fontSize: '13px', fontWeight: 600 }}>Thank you for your review!</span>
                </div>
              )}
            </div>

            {/* ── Right: Form + List ── */}
            <div>
              {/* Write Review Form */}
              {showReviewForm && hasOrdered && !hasReviewed && (
                <div
                  className="rounded-2xl p-6 mb-6"
                  style={{ background: 'white', border: '2px solid rgba(249,0,43,0.12)', boxShadow: '0 4px 20px rgba(249,0,43,0.08)' }}
                >
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', color: '#111', marginBottom: '16px' }}>
                    Share Your Experience
                  </h4>

                  {/* Star Picker */}
                  <div className="mb-4">
                    <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#6B7280', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Your Rating *
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setNewReview(r => ({ ...r, rating: star }))}
                          className="transition-transform hover:scale-125 active:scale-110"
                        >
                          <Star
                            size={32}
                            fill={(hoverRating || newReview.rating) >= star ? '#F9002B' : 'none'}
                            style={{ color: (hoverRating || newReview.rating) >= star ? '#F9002B' : '#D1D5DB', transition: 'all 0.15s' }}
                          />
                        </button>
                      ))}
                      {newReview.rating > 0 && (
                        <span style={{ alignSelf: 'center', marginLeft: '8px', color: '#F9002B', fontWeight: 700, fontSize: '14px', fontFamily: 'var(--font-heading)' }}>
                          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][newReview.rating]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="mb-4">
                    <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#6B7280', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Your Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={newReview.name}
                      onChange={e => setNewReview(r => ({ ...r, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: 'rgba(249,0,43,0.15)', fontFamily: 'var(--font-body)', color: '#111' }}
                    />
                  </div>

                  {/* Comment */}
                  <div className="mb-5">
                    <label style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '13px', color: '#6B7280', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Your Review *
                    </label>
                    <textarea
                      placeholder="Tell others about your experience with this dish..."
                      value={newReview.comment}
                      onChange={e => setNewReview(r => ({ ...r, comment: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border text-sm resize-none outline-none"
                      style={{ borderColor: 'rgba(249,0,43,0.15)', fontFamily: 'var(--font-body)', color: '#111' }}
                    />
                  </div>

                  <button
                    onClick={handleSubmitReview}
                    disabled={!newReview.name.trim() || newReview.rating === 0 || !newReview.comment.trim()}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
                  >
                    <Send size={15} />
                    Submit Review
                  </button>
                </div>
              )}

              {/* Review List */}
              {reviews.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{ background: '#F9F5F0', border: '1px dashed rgba(249,0,43,0.15)' }}
                >
                  <MessageSquare size={40} style={{ color: '#F9002B', margin: '0 auto 12px' }} />
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '16px', color: '#111', marginBottom: '6px' }}>
                    No reviews yet
                  </p>
                  <p style={{ color: '#6B7280', fontSize: '14px' }}>Be the first to review this dish!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div
                      key={review.id}
                      className="rounded-2xl p-5"
                      style={{ background: 'white', border: '1px solid rgba(249,0,43,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)', fontSize: '15px' }}
                          >
                            {review.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', color: '#111' }}>
                              {review.name}
                            </p>
                            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                              {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              size={14}
                              fill={i <= review.rating ? '#F9002B' : 'none'}
                              style={{ color: i <= review.rating ? '#F9002B' : '#D1D5DB' }}
                            />
                          ))}
                        </div>
                      </div>

                      <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.7', marginBottom: '12px' }}>
                        "{review.comment}"
                      </p>

                      <button
                        onClick={() => handleHelpful(review.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-50"
                        style={{
                          border: '1px solid rgba(249,0,43,0.1)',
                          color: helpedIds.includes(review.id) ? '#F9002B' : '#9CA3AF',
                          background: helpedIds.includes(review.id) ? 'rgba(249,0,43,0.05)' : 'transparent',
                          fontSize: '12px',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 600,
                        }}
                        disabled={helpedIds.includes(review.id)}
                      >
                        <ThumbsUp size={12} />
                        Helpful ({review.helpful})
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Items */}
        {related.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="section-line" />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '22px', color: '#111' }}>
                You May Also Like
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map(r => (
                <Link
                  key={r.id}
                  to={`/menu/${r.slug}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover"
                  style={{ border: '1px solid rgba(249,0,43,0.06)' }}
                >
                  <img src={r.image} alt={`Photo of ${r.name}`} className="w-full h-36 object-cover" />
                  <div className="p-3">
                    <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px', color: '#111', marginBottom: '4px' }}>{r.name}</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star size={12} fill="#F9002B" style={{ color: '#F9002B' }} />
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{r.rating}</span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#F9002B', fontFamily: 'var(--font-heading)' }}>৳{r.price}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}