import { useState } from 'react';
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SEO } from '../components/SEO';

const categories = ['All', 'Restaurant', 'Food', 'Events', 'Kitchen'];

export function Gallery() {
  const { state } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = activeCategory === 'All'
    ? state.galleryImages
    : state.galleryImages.filter(g => g.category === activeCategory);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex(i => i === null ? null : (i - 1 + filtered.length) % filtered.length);
  const nextImage = () => setLightboxIndex(i => i === null ? null : (i + 1) % filtered.length);

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh' }}>
      <SEO 
        title="Pizzora Gallery | Fresh Pizza & Restaurant Photos"
        description="Explore the Pizzora gallery and discover our delicious pizzas, restaurant atmosphere and happy customers."
        url="https://pizzora.bd/gallery"
      />
      {/* Header */}
      <div className="py-16 px-4 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 50%)' }} />
        <div className="relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
            <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Visual</span>
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 56px)', color: '#fff', marginBottom: '12px' }}>Our Gallery</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '16px', maxWidth: '400px', margin: '0 auto' }}>
            A visual journey through Pizzora — our spaces, food, and unforgettable moments.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 justify-center flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
              style={{
                background: activeCategory === cat ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'white',
                color: activeCategory === cat ? 'white' : '#6B7280',
                border: '1px solid',
                borderColor: activeCategory === cat ? 'transparent' : 'rgba(249,0,43,0.15)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: '#6B7280', fontSize: '16px' }}>No images in this category yet.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {filtered.map((img, index) => (
              <div
                key={img.id}
                className="break-inside-avoid cursor-pointer group relative rounded-2xl overflow-hidden shadow-sm"
                onClick={() => openLightbox(index)}
                style={{ border: '1px solid rgba(249,0,43,0.06)', marginBottom: '16px' }}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex flex-col items-center justify-center gap-2">
                  <ZoomIn
                    size={28}
                    className="text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100"
                  />
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-center px-4">
                    <p className="text-white text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{img.title}</p>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs mt-1"
                      style={{ backgroundColor: 'rgba(249,0,43,0.3)', color: '#F9002B', border: '1px solid rgba(249,0,43,0.5)' }}
                    >
                      {img.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)' }}
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/20"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 10 }}
            onClick={closeLightbox}
          >
            <X size={24} className="text-white" />
          </button>

          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/20"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 10 }}
            onClick={e => { e.stopPropagation(); prevImage(); }}
          >
            <ChevronLeft size={24} className="text-white" />
          </button>

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/20"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 10 }}
            onClick={e => { e.stopPropagation(); nextImage(); }}
          >
            <ChevronRight size={24} className="text-white" />
          </button>

          <div className="max-w-4xl max-h-screen p-8 relative" onClick={e => e.stopPropagation()}>
            <img
              src={filtered[lightboxIndex].url}
              alt={filtered[lightboxIndex].title}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl mx-auto block"
            />
            <div className="text-center mt-4">
              <h3 className="text-white font-semibold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                {filtered[lightboxIndex].title}
              </h3>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm mt-2"
                style={{ backgroundColor: 'rgba(249,0,43,0.2)', color: '#F9002B', border: '1px solid rgba(249,0,43,0.4)' }}
              >
                {filtered[lightboxIndex].category}
              </span>
              <p className="text-white/50 text-sm mt-2">{lightboxIndex + 1} / {filtered.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
