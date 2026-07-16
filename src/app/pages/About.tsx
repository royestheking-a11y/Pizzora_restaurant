import { Link } from 'react-router';
import { Award, Users, Flame, Star, Check, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SEO } from '../components/SEO';

export function About() {
  const { state } = useApp();
  const milestones = [
    { year: '2018', title: 'Grand Opening', desc: 'Pizzora Restaurant opened its doors in Sylhet with a vision for premium dining.' },
    { year: '2019', title: 'First Award', desc: 'Won "Best New Restaurant in Sylhet" at the Regional Food Excellence Awards.' },
    { year: '2021', title: 'Expansion', desc: 'Expanded our kitchen and added a dedicated catering wing to serve larger events.' },
    { year: '2023', title: 'Online Ordering', desc: 'Launched our full online ordering platform with delivery to all of Sylhet.' },
    { year: '2024', title: 'Premium Status', desc: 'Recognized as the #1 premium restaurant in Sylhet by 10,000+ customer reviews.' },
    { year: '2025', title: 'New Menu', desc: 'Launched our international fusion menu bringing global flavors to Sylhet.' },
  ];

  const values = [
    { icon: Flame, title: 'Passion for Food', desc: 'Every dish is prepared with genuine love and dedication to culinary excellence.' },
    { icon: Star, title: 'Uncompromising Quality', desc: 'We never compromise on the quality of our ingredients or preparation methods.' },
    { icon: Users, title: 'Guest Experience', desc: 'Your satisfaction and comfort are at the heart of everything we do.' },
    { icon: Award, title: 'Continuous Innovation', desc: 'We constantly evolve our menu to bring you exciting new culinary experiences.' },
  ];

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh' }}>
      <SEO 
        title="About Pizzora | The Official Pizzora Restaurant Story"
        description="Learn about Pizzora Restaurant, the official Pizzora in Bangladesh. Discover our passion for handcrafted Pizzora pizzas and unforgettable dining experiences."
        url="https://pizzora.bd/about"
      />
      {/* Hero */}
      <div className="relative py-24 px-4 text-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, #F9002B 0%, transparent 50%), radial-gradient(circle at 70% 30%, #F9002B 0%, transparent 50%)' }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
            <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Our Story</span>
            <div style={{ width: '40px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(36px, 5vw, 60px)', color: '#fff', marginBottom: '16px', lineHeight: 1.1 }}>
            About <span style={{ color: '#ffffff' }}>Pizzora</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '17px', lineHeight: '1.7' }}>
            A story of passion, excellence, and an unwavering commitment to delivering the finest dining experience in Sylhet.
          </p>
        </div>
      </div>

      {/* Story Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1713375094006-5a0d705a2c8a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwYWJvdXQlMjBlbGVnYW50JTIwaW50ZXJpb3IlMjB3YXJtJTIwbGlnaHRpbmd8ZW58MXx8fHwxNzc1MDU4NDI4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Pizzora Restaurant Interior"
                className="w-full rounded-3xl object-cover shadow-2xl"
                style={{ height: '520px' }}
              />
              <div
                className="absolute -bottom-8 right-8 p-6 rounded-2xl shadow-xl text-center"
                style={{ background: '#ffffff', color: '#F9002B' }}
              >
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '42px', lineHeight: 1 }}>8+</div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>Years of Excellence</div>
              </div>
            </div>

            <div className="pt-8 lg:pt-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="section-line" />
                <span style={{ color: '#F9002B', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Who We Are</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: '#111', lineHeight: 1.2, marginBottom: '20px' }}>
                Sylhet's Premier <span style={{ color: '#F9002B' }}>Dining Experience</span>
              </h2>
              <div className="space-y-4" style={{ color: '#6B7280', fontSize: '15px', lineHeight: '1.8' }}>
                <p>
                  At PIZZORA, we believe great food brings people together. From handcrafted pizzas and juicy burgers to sizzling platters, pasta, wings, coffee, and desserts, every meal is prepared with premium ingredients and exceptional care. Our mission is to deliver unforgettable taste, outstanding service, and a welcoming dining experience for every customer. Whether you're dining in, ordering online, or celebrating with friends and family, PIZZORA is committed to serving fresh flavors that make every visit memorable.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', color: '#111' }}>Special Offers & Loyalty</h3>
                <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '8px' }}>
                  Customers who register with their phone number will automatically become eligible for loyalty rewards:
                </p>
                {['Register with mobile number', 'Earn points on every purchase', 'Receive 10% discount after reaching required points', 'Birthday offers', 'Exclusive member promotions', 'SMS promotional campaigns'].map(point => (
                  <div key={point} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F9002B, #F9002B)' }}>
                      <Check size={12} className="text-white" />
                    </div>
                    <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9F5F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#F9002B', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>What Drives Us</span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 40px)', color: '#111' }}>
              Our Core <span style={{ color: '#F9002B' }}>Values</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-7 bg-white rounded-2xl shadow-sm card-hover" style={{ border: '1px solid rgba(249,0,43,0.06)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(249,0,43,0.1), rgba(249,0,43,0.1))' }}>
                  <Icon size={26} style={{ color: '#F9002B' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '17px', color: '#111', marginBottom: '8px' }}>{title}</h3>
                <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline / Milestones */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#F9002B', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Our Journey</span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 40px)', color: '#111' }}>
              Milestones & <span style={{ color: '#F9002B' }}>Achievements</span>
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5" style={{ background: 'linear-gradient(180deg, #F9002B, #F9002B, #F9002B)' }} />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <div key={m.year} className="flex gap-8 items-start">
                  <div
                    className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg"
                    style={{ background: i % 2 === 0 ? 'linear-gradient(135deg, #F9002B, #C8001F)' : 'linear-gradient(135deg, #F9002B, #C8001F)' }}
                  >
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '11px', color: '#ffffff' }}>{m.year}</span>
                  </div>
                  <div className="flex-1 py-2">
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', color: '#111', marginBottom: '6px' }}>{m.title}</h3>
                    <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Chefs */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9F5F0' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="section-line" />
              <span style={{ color: '#F9002B', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>The Team</span>
              <div className="section-line" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 40px)', color: '#111' }}>
              Our Expert <span style={{ color: '#F9002B' }}>Chefs</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {state.chefs.map(chef => (
              <div key={chef.id} className="bg-white rounded-3xl overflow-hidden shadow-sm card-hover" style={{ border: '1px solid rgba(249,0,43,0.06)' }}>
                <div className="h-64 overflow-hidden">
                  <img src={chef.image} alt={chef.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-6">
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '20px', color: '#111', marginBottom: '4px' }}>{chef.name}</h3>
                  <p style={{ color: '#F9002B', fontWeight: 600, fontSize: '14px', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>{chef.position}</p>
                  <p style={{ color: '#F9002B', fontSize: '13px', marginBottom: '12px' }}>{chef.experience} • {chef.speciality}</p>
                  <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>{chef.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center" style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)' }}>
        <div className="max-w-2xl mx-auto">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: '#fff', marginBottom: '16px' }}>
            Experience Pizzora <span style={{ color: '#ffffff' }}>Today</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '16px', marginBottom: '28px', lineHeight: '1.7' }}>
            Join thousands of satisfied guests and discover why Pizzora is Sylhet's most loved restaurant.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/reservation"
              className="flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: '#ffffff', color: '#F9002B', fontFamily: 'var(--font-heading)' }}
            >
              Book a Table <ArrowRight size={18} />
            </Link>
            <Link
              to="/menu"
              className="flex items-center gap-2 px-8 py-4 rounded-full font-semibold border-2 transition-all hover:-translate-y-0.5"
              style={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white', fontFamily: 'var(--font-heading)' }}
            >
              View Our Menu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
