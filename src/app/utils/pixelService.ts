// ─── Pixel & Analytics Tracking Service ───────────────────────────────────────
// Handles dynamic script injection and standard e-commerce event dispatching
// for Meta (Facebook) Pixel, Google Tag (GA4/GTM), and TikTok Pixel.

export interface PixelSettings {
  enabled: boolean;

  // Meta (Facebook) Pixel
  metaPixelId: string;
  metaPixelEnabled: boolean;
  metaTestEventCode?: string;
  metaAccessToken?: string; // Conversions API (CAPI) Access Token
  metaCapiEnabled?: boolean; // Server-side Conversions API toggle

  // Google Tag / GA4
  googleTagId?: string;
  googleTagEnabled?: boolean;

  // TikTok Pixel
  tiktokPixelId?: string;
  tiktokPixelEnabled?: boolean;

  // Granular Event Tracking Toggles
  trackPageView: boolean;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  trackLeadOrReservation: boolean;
  trackContact: boolean;

  // Custom scripts
  customHeadScript?: string;
}

export const DEFAULT_PIXEL_SETTINGS: PixelSettings = {
  enabled: true,
  metaPixelId: '',
  metaPixelEnabled: true,
  metaTestEventCode: '',
  metaAccessToken: '',
  metaCapiEnabled: true,
  googleTagId: 'G-0LZDNZQDYE',
  googleTagEnabled: true,
  tiktokPixelId: '',
  tiktokPixelEnabled: false,
  trackPageView: true,
  trackViewContent: true,
  trackAddToCart: true,
  trackInitiateCheckout: true,
  trackPurchase: true,
  trackLeadOrReservation: true,
  trackContact: true,
  customHeadScript: '',
};

export interface DiagnosticEventLog {
  id: string;
  timestamp: string;
  eventName: string;
  platform: 'Meta' | 'Google' | 'TikTok' | 'All';
  data: Record<string, any>;
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
}

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    ttq?: any;
  }
}

class PixelService {
  private settings: PixelSettings = DEFAULT_PIXEL_SETTINGS;
  private isMetaInitialized = false;
  private isGoogleInitialized = false;
  private isTikTokInitialized = false;
  private currentMetaId = '';
  private currentGoogleId = '';
  private currentTikTokId = '';
  private eventLogs: DiagnosticEventLog[] = [];
  private listeners: ((logs: DiagnosticEventLog[]) => void)[] = [];

  constructor() {
    // Load from local storage immediately if available
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pizzora_pixel_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.settings = { ...DEFAULT_PIXEL_SETTINGS, ...parsed };
          this.initFromSettings(this.settings);
        }
      } catch (e) {
        console.warn('[PixelService] Failed to load cached pixel settings:', e);
      }
    }
  }

  public getSettings(): PixelSettings {
    return this.settings;
  }

  public getEventLogs(): DiagnosticEventLog[] {
    return [...this.eventLogs];
  }

  public subscribeToLogs(cb: (logs: DiagnosticEventLog[]) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb([...this.eventLogs]);
      } catch (e) {
        console.error(e);
      }
    });
  }

  private addLog(
    eventName: string,
    platform: DiagnosticEventLog['platform'],
    data: Record<string, any>,
    status: DiagnosticEventLog['status'],
    reason?: string
  ) {
    const entry: DiagnosticEventLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString(),
      eventName,
      platform,
      data,
      status,
      reason,
    };
    this.eventLogs.unshift(entry);
    if (this.eventLogs.length > 50) {
      this.eventLogs.pop();
    }
    this.notifyListeners();
  }

  /**
   * Reconfigures pixels whenever settings are updated
   */
  public initFromSettings(newSettings: PixelSettings) {
    this.settings = { ...DEFAULT_PIXEL_SETTINGS, ...newSettings };
    if (typeof window === 'undefined') return;

    // Cache locally
    try {
      localStorage.setItem('pizzora_pixel_settings', JSON.stringify(this.settings));
    } catch (e) {
      // ignore
    }

    if (!this.settings.enabled) {
      // Pixels disabled globally
      return;
    }

    // 1. Meta Pixel initialization
    const metaId = (this.settings.metaPixelId || '').trim();
    if (this.settings.metaPixelEnabled && metaId) {
      if (!this.isMetaInitialized || this.currentMetaId !== metaId) {
        this.injectMetaPixel(metaId, this.settings.metaTestEventCode);
      }
    }

    // 2. Google Tag initialization
    const googleId = (this.settings.googleTagId || '').trim();
    if (this.settings.googleTagEnabled && googleId) {
      if (!this.isGoogleInitialized || this.currentGoogleId !== googleId) {
        this.injectGoogleTag(googleId);
      }
    }

    // 3. TikTok Pixel initialization
    const tiktokId = (this.settings.tiktokPixelId || '').trim();
    if (this.settings.tiktokPixelEnabled && tiktokId) {
      if (!this.isTikTokInitialized || this.currentTikTokId !== tiktokId) {
        this.injectTikTokPixel(tiktokId);
      }
    }

    // 4. Custom Manual Head Scripts / Verification Tags
    if (this.settings.customHeadScript && this.settings.customHeadScript.trim()) {
      this.injectCustomScript(this.settings.customHeadScript.trim());
    }
  }

  /**
   * Injects Custom Manual Head Code / Verification Tag safely
   */
  private injectCustomScript(scriptHtml: string) {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      let container = document.getElementById('pizzora-custom-pixel-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'pizzora-custom-pixel-container';
        container.style.display = 'none';
        document.head.appendChild(container);
      }
      container.innerHTML = '';
      const range = document.createRange();
      range.selectNode(container);
      const fragment = range.createContextualFragment(scriptHtml);
      container.appendChild(fragment);
      this.addLog('Custom Script', 'All', { length: scriptHtml.length }, 'sent');
    } catch (e: any) {
      console.error('[PixelService] Failed to inject custom script:', e);
      this.addLog('Custom Script', 'All', {}, 'failed', e?.message);
    }
  }

  /**
   * Injects Meta Pixel base code dynamically
   */
  private injectMetaPixel(pixelId: string, testEventCode?: string) {
    try {
      if (typeof window === 'undefined') return;

      if (!window.fbq) {
        /* eslint-disable */
        (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = true;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = true;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
      }

      if (window.fbq) {
        const initOptions: Record<string, any> = {};
        if (testEventCode && testEventCode.trim()) {
          initOptions.test_event_code = testEventCode.trim();
        }
        window.fbq('init', pixelId, initOptions);
        this.isMetaInitialized = true;
        this.currentMetaId = pixelId;
        console.log(`[PixelService] Meta Pixel initialized with ID: ${pixelId}`);
        this.addLog('Init', 'Meta', { pixelId, testEventCode }, 'sent');
      }
    } catch (err: any) {
      console.error('[PixelService] Failed to inject Meta Pixel:', err);
      this.addLog('Init', 'Meta', { pixelId }, 'failed', err?.message);
    }
  }

  /**
   * Injects Google Tag dynamically
   */
  private injectGoogleTag(tagId: string) {
    try {
      if (typeof window === 'undefined') return;

      if (!document.getElementById('google-tag-script')) {
        const script = document.createElement('script');
        script.id = 'google-tag-script';
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
        document.head.appendChild(script);
      }

      window.dataLayer = window.dataLayer || [];
      if (!window.gtag) {
        window.gtag = function () {
          window.dataLayer?.push(arguments);
        };
        window.gtag('js', new Date());
      }
      window.gtag('config', tagId);
      this.isGoogleInitialized = true;
      this.currentGoogleId = tagId;
      console.log(`[PixelService] Google Tag initialized with ID: ${tagId}`);
      this.addLog('Init', 'Google', { tagId }, 'sent');
    } catch (err: any) {
      console.error('[PixelService] Failed to inject Google Tag:', err);
      this.addLog('Init', 'Google', { tagId }, 'failed', err?.message);
    }
  }

  /**
   * Injects TikTok Pixel dynamically
   */
  private injectTikTokPixel(pixelId: string) {
    try {
      if (typeof window === 'undefined') return;

      if (!window.ttq) {
        /* eslint-disable */
        (function (w: any, d: any, t: any) {
          w.TiktokAnalyticsObject = t;
          var ttq = (w[t] = w[t] || []);
          ttq.methods = [
            'page',
            'track',
            'identify',
            'instances',
            'debug',
            'on',
            'off',
            'once',
            'ready',
            'alias',
            'group',
            'enableCookie',
            'disableCookie',
          ];
          ttq.setAndDefer = function (t: any, e: any) {
            t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            };
          };
          for (var i = 0; i < ttq.methods.length; i++) {
            ttq.setAndDefer(ttq, ttq.methods[i]);
          }
          ttq.instance = function (t: any) {
            for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) {
              ttq.setAndDefer(e, ttq.methods[n]);
            }
            return e;
          };
          ttq.load = function (e: any, n: any) {
            var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
            (ttq._i = ttq._i || {}),
              (ttq._i[e] = []),
              (ttq._i[e]._u = i),
              (ttq._t = ttq._t || {}),
              (ttq._t[e] = +new Date()),
              (ttq._o = ttq._o || {}),
              (ttq._o[e] = n || {});
            var o = document.createElement('script');
            (o.type = 'text/javascript'), (o.async = !0), (o.src = i + '?type=desktop&sdkid=' + e);
            var a = document.getElementsByTagName('script')[0];
            a.parentNode?.insertBefore(o, a);
          };
        })(window, document, 'ttq');
        /* eslint-enable */
      }

      if (window.ttq) {
        window.ttq.load(pixelId);
        window.ttq.page();
        this.isTikTokInitialized = true;
        this.currentTikTokId = pixelId;
        console.log(`[PixelService] TikTok Pixel initialized with ID: ${pixelId}`);
        this.addLog('Init', 'TikTok', { pixelId }, 'sent');
      }
    } catch (err: any) {
      console.error('[PixelService] Failed to inject TikTok Pixel:', err);
      this.addLog('Init', 'TikTok', { pixelId }, 'failed', err?.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT TRACKING METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * PageView Event
   */
  public trackPageView(url?: string, pageTitle?: string) {
    if (!this.settings.enabled || !this.settings.trackPageView) {
      this.addLog('PageView', 'All', { url }, 'skipped', 'PageView tracking disabled');
      return;
    }

    const payload = {
      page_path: url || (typeof window !== 'undefined' ? window.location.pathname : ''),
      page_title: pageTitle || (typeof document !== 'undefined' ? document.title : ''),
    };

    // 1. Meta Pixel
    if (this.settings.metaPixelEnabled && this.isMetaInitialized && window.fbq) {
      try {
        window.fbq('track', 'PageView');
        this.addLog('PageView', 'Meta', payload, 'sent');
      } catch (err: any) {
        this.addLog('PageView', 'Meta', payload, 'failed', err?.message);
      }
    }

    // 2. Google Tag
    if (this.settings.googleTagEnabled && this.isGoogleInitialized && window.gtag) {
      try {
        window.gtag('event', 'page_view', payload);
        this.addLog('page_view', 'Google', payload, 'sent');
      } catch (err: any) {
        this.addLog('page_view', 'Google', payload, 'failed', err?.message);
      }
    }

    // 3. TikTok Pixel
    if (this.settings.tiktokPixelEnabled && this.isTikTokInitialized && window.ttq) {
      try {
        window.ttq.page();
        this.addLog('PageView', 'TikTok', payload, 'sent');
      } catch (err: any) {
        this.addLog('PageView', 'TikTok', payload, 'failed', err?.message);
      }
    }
  }

  /**
   * ViewContent Event (when customer views a menu item / dish)
   */
  public trackViewContent(item: { id: string; name: string; category?: string; price: number }) {
    if (!this.settings.enabled || !this.settings.trackViewContent) {
      this.addLog('ViewContent', 'All', { name: item.name }, 'skipped', 'ViewContent tracking disabled');
      return;
    }

    const payload = {
      content_name: item.name,
      content_category: item.category || 'Menu',
      content_ids: [String(item.id)],
      content_type: 'product',
      value: Number(item.price),
      currency: 'BDT',
    };

    if (this.settings.metaPixelEnabled && this.isMetaInitialized && window.fbq) {
      try {
        window.fbq('track', 'ViewContent', payload);
        this.addLog('ViewContent', 'Meta', payload, 'sent');
      } catch (err: any) {
        this.addLog('ViewContent', 'Meta', payload, 'failed', err?.message);
      }
    }

    if (this.settings.googleTagEnabled && this.isGoogleInitialized && window.gtag) {
      try {
        window.gtag('event', 'view_item', {
          currency: 'BDT',
          value: Number(item.price),
          items: [{ item_id: String(item.id), item_name: item.name, item_category: item.category, price: item.price }],
        });
        this.addLog('view_item', 'Google', payload, 'sent');
      } catch (err: any) {
        this.addLog('view_item', 'Google', payload, 'failed', err?.message);
      }
    }

    if (this.settings.tiktokPixelEnabled && this.isTikTokInitialized && window.ttq) {
      try {
        window.ttq.track('ViewContent', {
          contents: [{ content_id: String(item.id), content_name: item.name, price: item.price }],
          value: Number(item.price),
          currency: 'BDT',
        });
        this.addLog('ViewContent', 'TikTok', payload, 'sent');
      } catch (err: any) {
        this.addLog('ViewContent', 'TikTok', payload, 'failed', err?.message);
      }
    }
  }

  /**
   * AddToCart Event
   */
  public trackAddToCart(item: { id: string; name: string; category?: string; price: number }, quantity: number = 1) {
    if (!this.settings.enabled || !this.settings.trackAddToCart) {
      this.addLog('AddToCart', 'All', { name: item.name, quantity }, 'skipped', 'AddToCart tracking disabled');
      return;
    }

    const value = Number(item.price) * quantity;
    const payload = {
      content_name: item.name,
      content_category: item.category || 'Menu',
      content_ids: [String(item.id)],
      content_type: 'product',
      value,
      currency: 'BDT',
      num_items: quantity,
    };

    if (this.settings.metaPixelEnabled && this.isMetaInitialized && window.fbq) {
      try {
        window.fbq('track', 'AddToCart', payload);
        this.addLog('AddToCart', 'Meta', payload, 'sent');
      } catch (err: any) {
        this.addLog('AddToCart', 'Meta', payload, 'failed', err?.message);
      }
    }

    if (this.settings.googleTagEnabled && this.isGoogleInitialized && window.gtag) {
      try {
        window.gtag('event', 'add_to_cart', {
          currency: 'BDT',
          value,
          items: [{ item_id: String(item.id), item_name: item.name, item_category: item.category, price: item.price, quantity }],
        });
        this.addLog('add_to_cart', 'Google', payload, 'sent');
      } catch (err: any) {
        this.addLog('add_to_cart', 'Google', payload, 'failed', err?.message);
      }
    }

    if (this.settings.tiktokPixelEnabled && this.isTikTokInitialized && window.ttq) {
      try {
        window.ttq.track('AddToCart', {
          contents: [{ content_id: String(item.id), content_name: item.name, price: item.price, quantity }],
          value,
          currency: 'BDT',
        });
        this.addLog('AddToCart', 'TikTok', payload, 'sent');
      } catch (err: any) {
        this.addLog('AddToCart', 'TikTok', payload, 'failed', err?.message);
      }
    }
  }

  /**
   * InitiateCheckout Event
   */
  public trackInitiateCheckout(cartItems: Array<{ item: { id: string; name: string; price: number }; quantity: number }>, total: number) {
    if (!this.settings.enabled || !this.settings.trackInitiateCheckout) {
      this.addLog('InitiateCheckout', 'All', { total, count: cartItems.length }, 'skipped', 'InitiateCheckout tracking disabled');
      return;
    }

    const payload = {
      content_ids: cartItems.map(c => String(c.item.id)),
      content_type: 'product',
      num_items: cartItems.reduce((acc, c) => acc + c.quantity, 0),
      value: Number(total),
      currency: 'BDT',
    };

    if (this.settings.metaPixelEnabled && this.isMetaInitialized && window.fbq) {
      try {
        window.fbq('track', 'InitiateCheckout', payload);
        this.addLog('InitiateCheckout', 'Meta', payload, 'sent');
      } catch (err: any) {
        this.addLog('InitiateCheckout', 'Meta', payload, 'failed', err?.message);
      }
    }

    if (this.settings.googleTagEnabled && this.isGoogleInitialized && window.gtag) {
      try {
        window.gtag('event', 'begin_checkout', {
          currency: 'BDT',
          value: Number(total),
          items: cartItems.map(c => ({
            item_id: String(c.item.id),
            item_name: c.item.name,
            price: c.item.price,
            quantity: c.quantity,
          })),
        });
        this.addLog('begin_checkout', 'Google', payload, 'sent');
      } catch (err: any) {
        this.addLog('begin_checkout', 'Google', payload, 'failed', err?.message);
      }
    }

    if (this.settings.tiktokPixelEnabled && this.isTikTokInitialized && window.ttq) {
      try {
        window.ttq.track('InitiateCheckout', {
          contents: cartItems.map(c => ({
            content_id: String(c.item.id),
            content_name: c.item.name,
            price: c.item.price,
            quantity: c.quantity,
          })),
          value: Number(total),
          currency: 'BDT',
        });
        this.addLog('InitiateCheckout', 'TikTok', payload, 'sent');
      } catch (err: any) {
        this.addLog('InitiateCheckout', 'TikTok', payload, 'failed', err?.message);
      }
    }
  }

  /**
   * Purchase Event (when order is placed)
   */
  public trackPurchase(order: {
    orderNumber?: string;
    id?: string;
    total: number;
    items?: Array<{ item: { id: string; name: string; price: number }; quantity: number }>;
    customerName?: string;
    phone?: string;
  }) {
    if (!this.settings.enabled || !this.settings.trackPurchase) {
      this.addLog('Purchase', 'All', { orderNumber: order.orderNumber, total: order.total }, 'skipped', 'Purchase tracking disabled');
      return;
    }

    const items = order.items || [];
    const payload = {
      content_ids: items.map(c => String(c.item.id)),
      content_type: 'product',
      contents: items.map(c => ({
        id: String(c.item.id),
        name: c.item.name,
        quantity: c.quantity,
        item_price: c.item.price,
      })),
      num_items: items.reduce((acc, c) => acc + c.quantity, 0),
      value: Number(order.total),
      currency: 'BDT',
      order_id: order.orderNumber || order.id || `ORDER-${Date.now()}`,
    };

    const eventId = order.orderNumber || order.id || `ord_${Date.now()}`;

    if (this.settings.metaPixelEnabled && this.isMetaInitialized && window.fbq) {
      try {
        window.fbq('track', 'Purchase', payload, { eventID: eventId });
        this.addLog('Purchase', 'Meta', { ...payload, eventId }, 'sent');
      } catch (err: any) {
        this.addLog('Purchase', 'Meta', { ...payload, eventId }, 'failed', err?.message);
      }
    }

    // Server-side Conversions API (CAPI) hybrid forwarding
    if (this.settings.enabled && this.settings.metaPixelEnabled && this.settings.metaCapiEnabled !== false) {
      try {
        fetch('/api/pixel/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'Purchase',
            payload,
            eventId,
            testEventCode: this.settings.metaTestEventCode,
          }),
        }).catch(() => {});
      } catch (e) {}
    }

    if (this.settings.googleTagEnabled && this.isGoogleInitialized && window.gtag) {
      try {
        window.gtag('event', 'purchase', {
          transaction_id: payload.order_id,
          value: Number(order.total),
          currency: 'BDT',
          items: items.map(c => ({
            item_id: String(c.item.id),
            item_name: c.item.name,
            price: c.item.price,
            quantity: c.quantity,
          })),
        });
        this.addLog('purchase', 'Google', payload, 'sent');
      } catch (err: any) {
        this.addLog('purchase', 'Google', payload, 'failed', err?.message);
      }
    }

    if (this.settings.tiktokPixelEnabled && this.isTikTokInitialized && window.ttq) {
      try {
        window.ttq.track('CompletePayment', {
          contents: items.map(c => ({
            content_id: String(c.item.id),
            content_name: c.item.name,
            price: c.item.price,
            quantity: c.quantity,
          })),
          value: Number(order.total),
          currency: 'BDT',
        });
        this.addLog('CompletePayment', 'TikTok', payload, 'sent');
      } catch (err: any) {
        this.addLog('CompletePayment', 'TikTok', payload, 'failed', err?.message);
      }
    }
  }

  /**
   * Lead / Table Reservation Event
   */
  public trackLead(data: { name: string; phone?: string; guests?: number; date?: string; type?: string }) {
    if (!this.settings.enabled || !this.settings.trackLeadOrReservation) {
      this.addLog('Lead', 'All', data, 'skipped', 'Lead tracking disabled');
      return;
    }

    const payload = {
      content_name: data.type || 'Table Reservation',
      content_category: 'Reservation',
      value: (data.guests || 2) * 300, // estimated lead value
      currency: 'BDT',
    };

    if (this.settings.metaPixelEnabled && this.isMetaInitialized && window.fbq) {
      try {
        window.fbq('track', 'Lead', payload);
        this.addLog('Lead', 'Meta', payload, 'sent');
      } catch (err: any) {
        this.addLog('Lead', 'Meta', payload, 'failed', err?.message);
      }
    }

    if (this.settings.googleTagEnabled && this.isGoogleInitialized && window.gtag) {
      try {
        window.gtag('event', 'generate_lead', payload);
        this.addLog('generate_lead', 'Google', payload, 'sent');
      } catch (err: any) {
        this.addLog('generate_lead', 'Google', payload, 'failed', err?.message);
      }
    }

    if (this.settings.tiktokPixelEnabled && this.isTikTokInitialized && window.ttq) {
      try {
        window.ttq.track('SubmitForm', payload);
        this.addLog('SubmitForm', 'TikTok', payload, 'sent');
      } catch (err: any) {
        this.addLog('SubmitForm', 'TikTok', payload, 'failed', err?.message);
      }
    }
  }

  /**
   * Contact Inquiry Event
   */
  public trackContact(data: { name: string; subject?: string }) {
    if (!this.settings.enabled || !this.settings.trackContact) {
      this.addLog('Contact', 'All', data, 'skipped', 'Contact tracking disabled');
      return;
    }

    const payload = {
      content_name: data.subject || 'Customer Contact Message',
      content_category: 'Support',
    };

    if (this.settings.metaPixelEnabled && this.isMetaInitialized && window.fbq) {
      try {
        window.fbq('track', 'Contact', payload);
        this.addLog('Contact', 'Meta', payload, 'sent');
      } catch (err: any) {
        this.addLog('Contact', 'Meta', payload, 'failed', err?.message);
      }
    }

    if (this.settings.googleTagEnabled && this.isGoogleInitialized && window.gtag) {
      try {
        window.gtag('event', 'contact', payload);
        this.addLog('contact', 'Google', payload, 'sent');
      } catch (err: any) {
        this.addLog('contact', 'Google', payload, 'failed', err?.message);
      }
    }
  }

  /**
   * Custom Event Dispatcher
   */
  public trackCustom(eventName: string, params: Record<string, any> = {}) {
    if (!this.settings.enabled) return;

    if (this.settings.metaPixelEnabled && this.isMetaInitialized && window.fbq) {
      try {
        window.fbq('trackCustom', eventName, params);
        this.addLog(eventName, 'Meta', params, 'sent');
      } catch (err: any) {
        this.addLog(eventName, 'Meta', params, 'failed', err?.message);
      }
    }

    if (this.settings.googleTagEnabled && this.isGoogleInitialized && window.gtag) {
      try {
        window.gtag('event', eventName, params);
        this.addLog(eventName, 'Google', params, 'sent');
      } catch (err: any) {
        this.addLog(eventName, 'Google', params, 'failed', err?.message);
      }
    }
  }

  /**
   * Interactive Test Fire for Admin diagnostic console
   */
  public testFire(eventName: 'PageView' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'Lead') {
    switch (eventName) {
      case 'PageView':
        this.trackPageView('/test-page', 'Test Page');
        break;
      case 'AddToCart':
        this.trackAddToCart(
          { id: 'test-pizza-1', name: 'BBQ Chicken Pizza (Test)', category: 'Pizza', price: 950 },
          1
        );
        break;
      case 'InitiateCheckout':
        this.trackInitiateCheckout(
          [{ item: { id: 'test-pizza-1', name: 'BBQ Chicken Pizza (Test)', price: 950 }, quantity: 1 }],
          950
        );
        break;
      case 'Purchase':
        this.trackPurchase({
          orderNumber: `TEST-ORD-${Date.now().toString().slice(-4)}`,
          total: 950,
          items: [{ item: { id: 'test-pizza-1', name: 'BBQ Chicken Pizza (Test)', price: 950 }, quantity: 1 }],
        });
        break;
      case 'Lead':
        this.trackLead({ name: 'Test Guest', guests: 4, date: 'Tonight 8:00 PM', type: 'Table Reservation' });
        break;
    }
  }

  /**
   * Run Hybrid Test (Simultaneously fires Browser Pixel + Server-Side Conversions API with deduplication event_id)
   */
  public async runHybridTest(testCode?: string): Promise<{
    browserSent: boolean;
    serverSent: boolean;
    eventId: string;
    serverMessage: string;
  }> {
    const eventId = `hybrid_test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const payload = {
      content_name: 'Hybrid Test Pizza (৳950)',
      content_type: 'product',
      value: 950,
      currency: 'BDT',
      test: true,
      event_id: eventId,
    };

    let browserSent = false;
    let serverSent = false;
    let serverMessage = '';

    // 1. Fire Browser Event with eventID
    if (this.isMetaInitialized && window.fbq) {
      try {
        window.fbq('track', 'Purchase', payload, { eventID: eventId });
        browserSent = true;
        this.addLog('Hybrid Purchase [Browser]', 'Meta', { ...payload, eventId }, 'sent');
      } catch (e: any) {
        this.addLog('Hybrid Purchase [Browser]', 'Meta', { ...payload, eventId }, 'failed', e?.message);
      }
    } else {
      this.addLog('Hybrid Purchase [Browser]', 'Meta', { reason: 'Browser fbq not yet initialized' }, 'skipped');
    }

    // 2. Fire Server-Side CAPI Event
    try {
      const res = await fetch('/api/pixel/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'Purchase',
          payload,
          eventId,
          testEventCode: testCode || this.settings.metaTestEventCode,
        }),
      });
      const data = await res.json();
      serverSent = Boolean(data.success);
      serverMessage = data.message || (data.success ? 'Server CAPI event received' : 'Server CAPI error');
      this.addLog('Hybrid Purchase [Server CAPI]', 'Meta', { ...payload, eventId, response: data }, serverSent ? 'sent' : 'failed');
    } catch (e: any) {
      serverMessage = e?.message || 'Server network error';
      this.addLog('Hybrid Purchase [Server CAPI]', 'Meta', { eventId, error: e?.message }, 'failed');
    }

    return { browserSent, serverSent, eventId, serverMessage };
  }
}

export const pixelService = new PixelService();
