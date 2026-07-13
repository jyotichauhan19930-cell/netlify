const SHOPIFY_DOMAIN = "jobshiring.fresherhiring.in";
const GOOGLE_VERIFICATION = "oOB4GFrNSNdykfLPFYsy8byFMtrbAiccGJfrX7_UcOU";
const APPLY_URL = "https://ruwmqs-uq.myshopify.com/pages/apply";

// Job Portal Configuration
const JOB_PORTAL_CONFIG = {
  siteName: "Fresher Hiring",
  tagline: "Your Gateway to First Job",
  primaryColor: "#2563eb",
  secondaryColor: "#1e40af",
  applyUrl: APPLY_URL,
  removeDisclaimer: true,
};

exports.handler = async (event) => {
  const proxyHost = event.headers.host;
  const path = event.path.replace("/.netlify/functions/proxy", "") || "/";
  const queryString = event.rawQuery ? `?${event.rawQuery}` : "";

  let fetchURL = `https://${SHOPIFY_DOMAIN}${path}${queryString}`;

  try {
    const bodyAllowed = !["GET", "HEAD"].includes(event.httpMethod);
    const body = bodyAllowed && event.body
      ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8")
      : null;

    const forwardHeaders = {
      ...event.headers,
      host: SHOPIFY_DOMAIN,
      "X-Forwarded-Host": proxyHost,
      "X-Forwarded-Proto": "https",
    };

    delete forwardHeaders["content-length"];
    delete forwardHeaders["connection"];

    let response;
    let redirectCount = 0;

    while (redirectCount < 5) {
      response = await fetch(fetchURL, {
        method: event.httpMethod,
        headers: forwardHeaders,
        body: body || null,
        redirect: "manual",
      });

      if (response.status >= 300 && response.status < 400) {
        let location = response.headers.get("location") || "";

        if (location.includes(SHOPIFY_DOMAIN)) {
          location = location
            .replace(`https://${SHOPIFY_DOMAIN}`, `https://${proxyHost}`)
            .replace(`http://${SHOPIFY_DOMAIN}`, `https://${proxyHost}`);
          return { statusCode: response.status, headers: { location }, body: "" };
        }

        if (location.includes(proxyHost)) {
          return { statusCode: response.status, headers: { location }, body: "" };
        }

        fetchURL = location.startsWith("http")
          ? location
          : `https://${SHOPIFY_DOMAIN}${location}`;
        redirectCount++;
        continue;
      }

      break;
    }

    const skipHeaders = new Set([
      "content-encoding", "transfer-encoding",
      "content-length", "connection",
    ]);

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      if (skipHeaders.has(key)) return;
      if (key === "set-cookie") {
        responseHeaders[key] = value.replace(/Domain=[^;]+;?\s*/gi, "");
        return;
      }
      responseHeaders[key] = value;
    });

    const contentType = response.headers.get("content-type") || "";

    const rewriteText = (text) =>
      text
        .split(`https://${SHOPIFY_DOMAIN}`).join(`https://${proxyHost}`)
        .split(`http://${SHOPIFY_DOMAIN}`).join(`https://${proxyHost}`);

    // HTML
    if (contentType.includes("text/html")) {
      let html = rewriteText(await response.text());

      // REMOVE ALL ADS (Google AdSense)
      html = html.replace(/<ins[^>]*class="adsbygoogle"[^>]*>[\s\S]*?<\/ins>/gi, '');
      html = html.replace(/<script[^>]*async[^>]*src="[^"]*pagead2\.googlesyndication\.com[^"]*"[^>]*>[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<script[^>]*>[\s\S]*?adsbygoogle[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<!--\s*ads\s*-->[\s\S]*?<!--\s*\/ads\s*-->/gi, '');
      html = html.replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
      html = html.replace(/<div[^>]*id="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
      
      // Remove any empty divs that might be left from ad removal
      html = html.replace(/<div[^>]*>\s*<\/div>/gi, '');

      // Remove disclaimer
      if (JOB_PORTAL_CONFIG.removeDisclaimer) {
        html = html.replace(
          /<div[^>]*class="[^"]*disclaimer[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
          ""
        );
        html = html.replace(
          /<!--\s*Disclaimer[\s\S]*?-->/gi,
          ""
        );
      }

      // Remove specific apply button image
      html = html.replace(
        /<img[^>]*src="[^"]*Apply_Now_Button_Dps_430x\.png[^"]*"[^>]*>/gi,
        ''
      );
      html = html.replace(
        /<a[^>]*href="[^"]*"[^>]*>[\s\S]*?<img[^>]*Apply_Now_Button[^>]*>[\s\S]*?<\/a>/gi,
        ''
      );

      // Add job portal meta tags and styling
      html = html.replace(
        "<head>",
        `<head>
        <meta name="google-site-verification" content="${GOOGLE_VERIFICATION}" />
        <meta name="description" content="Find your first job with Fresher Hiring - The ultimate job portal for fresh graduates">
        <meta property="og:title" content="Fresher Hiring - Your First Job Awaits">
        <meta property="og:description" content="Find your first job with Fresher Hiring - The ultimate job portal for fresh graduates">
        <meta property="og:type" content="website">
        <meta name="robots" content="index, follow">
        <style>
          /* Remove all ads */
          .adsbygoogle, .ad-container, [class*="ad-"], [id*="ad-"] {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            visibility: hidden !important;
            opacity: 0 !important;
            position: absolute !important;
            pointer-events: none !important;
          }
          
          /* Job Portal Styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f8fafc;
            color: #1f2937;
          }
          
          .job-portal-wrapper {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          /* Hero Section */
          .hero-section {
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            border-radius: 20px;
            padding: 60px 40px;
            text-align: center;
            color: white;
            margin-bottom: 40px;
            position: relative;
            overflow: hidden;
          }
          
          .hero-section::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            transform: rotate(45deg);
          }
          
          .hero-section h1 {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
          }
          
          .hero-section p {
            font-size: 1.25rem;
            opacity: 0.95;
            margin-bottom: 30px;
            position: relative;
            z-index: 1;
          }
          
          .hero-stats {
            display: flex;
            justify-content: center;
            gap: 50px;
            margin-top: 30px;
            position: relative;
            z-index: 1;
          }
          
          .hero-stats div {
            text-align: center;
          }
          
          .hero-stats .number {
            font-size: 2rem;
            font-weight: 700;
          }
          
          .hero-stats .label {
            font-size: 0.9rem;
            opacity: 0.8;
          }
          
          .apply-now-btn {
            display: inline-block;
            background: white;
            color: #2563eb !important;
            padding: 15px 45px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            position: relative;
            z-index: 1;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }
          
          .apply-now-btn:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            color: #1e40af !important;
          }
          
          /* Featured Jobs */
          .section-title {
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 30px;
            text-align: center;
          }
          
          .section-title span {
            color: #2563eb;
          }
          
          .job-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
          }
          
          .job-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
            border: 1px solid #e5e7eb;
          }
          
          .job-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(37, 99, 235, 0.1);
            border-color: #2563eb;
          }
          
          .job-card .job-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
          }
          
          .job-card .company {
            color: #2563eb;
            font-weight: 500;
            margin-bottom: 5px;
          }
          
          .job-card .location {
            color: #6b7280;
            font-size: 0.9rem;
            margin-bottom: 10px;
          }
          
          .job-card .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 15px;
          }
          
          .job-card .tag {
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 500;
          }
          
          .job-card .apply-btn {
            display: inline-block;
            background: #2563eb;
            color: white !important;
            padding: 8px 25px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.3s ease;
          }
          
          .job-card .apply-btn:hover {
            background: #1e40af;
            transform: scale(1.05);
          }
          
          /* Categories */
          .categories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          
          .category-card {
            background: white;
            padding: 25px;
            text-align: center;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            transition: all 0.3s ease;
            cursor: pointer;
          }
          
          .category-card:hover {
            border-color: #2563eb;
            transform: translateY(-3px);
            box-shadow: 0 5px 20px rgba(37, 99, 235, 0.1);
          }
          
          .category-card .icon {
            font-size: 2.5rem;
            margin-bottom: 10px;
          }
          
          .category-card .name {
            font-weight: 600;
            color: #1f2937;
          }
          
          .category-card .count {
            font-size: 0.85rem;
            color: #6b7280;
            margin-top: 5px;
          }
          
          /* Quick Apply Section */
          .quick-apply-section {
            background: #f1f5f9;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            margin: 40px 0;
          }
          
          .quick-apply-section h2 {
            font-size: 1.75rem;
            color: #1f2937;
            margin-bottom: 10px;
          }
          
          .quick-apply-section p {
            color: #6b7280;
            margin-bottom: 20px;
          }
          
          /* Remove Shopify's original product elements */
          .product-form, .product__price, .quantity-selector, 
          .product-form__submit, .shopify-payment-button,
          [class*="product-form"], [class*="add-to-cart"] {
            display: none !important;
          }
          
          @media (max-width: 768px) {
            .hero-section {
              padding: 40px 20px;
            }
            .hero-section h1 {
              font-size: 2rem;
            }
            .hero-stats {
              flex-direction: column;
              gap: 15px;
            }
            .job-grid {
              grid-template-columns: 1fr;
            }
            .categories-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        </style>`
      );

      // COMPLETE HOMEPAGE REDESIGN
      if (path === "/" || path === "") {
        // Remove original content and replace with job portal
        const jobPortalHTML = `
          <div class="job-portal-wrapper">
            <!-- Hero Section -->
            <section class="hero-section">
              <h1>🚀 Launch Your Career</h1>
              <p>Find your first job with India's leading fresher hiring platform</p>
              <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-now-btn">Apply Now →</a>
              <div class="hero-stats">
                <div>
                  <div class="number">500+</div>
                  <div class="label">Active Jobs</div>
                </div>
                <div>
                  <div class="number">50+</div>
                  <div class="label">Companies</div>
                </div>
                <div>
                  <div class="number">1000+</div>
                  <div class="label">Hired</div>
                </div>
              </div>
            </section>

            <!-- Categories -->
            <h2 class="section-title">Popular <span>Categories</span></h2>
            <div class="categories-grid">
              <div class="category-card">
                <div class="icon">💻</div>
                <div class="name">IT & Software</div>
                <div class="count">120+ jobs</div>
              </div>
              <div class="category-card">
                <div class="icon">📊</div>
                <div class="name">Finance</div>
                <div class="count">80+ jobs</div>
              </div>
              <div class="category-card">
                <div class="icon">📈</div>
                <div class="name">Marketing</div>
                <div class="count">60+ jobs</div>
              </div>
              <div class="category-card">
                <div class="icon">🏢</div>
                <div class="name">HR & Admin</div>
                <div class="count">40+ jobs</div>
              </div>
              <div class="category-card">
                <div class="icon">🔧</div>
                <div class="name">Engineering</div>
                <div class="count">90+ jobs</div>
              </div>
              <div class="category-card">
                <div class="icon">🛒</div>
                <div class="name">Retail</div>
                <div class="count">50+ jobs</div>
              </div>
            </div>

            <!-- Featured Jobs -->
            <h2 class="section-title">Featured <span>Jobs</span></h2>
            <div class="job-grid">
              <div class="job-card">
                <div class="job-title">Software Developer</div>
                <div class="company">Tech Solutions Pvt Ltd</div>
                <div class="location">📍 Mumbai, India</div>
                <div class="tags">
                  <span class="tag">Full Time</span>
                  <span class="tag">Fresher</span>
                  <span class="tag">Remote</span>
                </div>
                <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-btn">Apply Now</a>
              </div>
              <div class="job-card">
                <div class="job-title">Marketing Executive</div>
                <div class="company">Brand Innovations</div>
                <div class="location">📍 Bangalore, India</div>
                <div class="tags">
                  <span class="tag">Full Time</span>
                  <span class="tag">Fresher</span>
                </div>
                <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-btn">Apply Now</a>
              </div>
              <div class="job-card">
                <div class="job-title">Financial Analyst</div>
                <div class="company">Global Finance Corp</div>
                <div class="location">📍 Delhi, India</div>
                <div class="tags">
                  <span class="tag">Full Time</span>
                  <span class="tag">Fresher</span>
                </div>
                <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-btn">Apply Now</a>
              </div>
            </div>

            <!-- Quick Apply Section -->
            <section class="quick-apply-section">
              <h2>Ready to Start Your Career?</h2>
              <p>Submit your application now and get matched with your dream job</p>
              <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-now-btn">Apply Now</a>
            </section>
          </div>
        `;

        // Remove existing body content and replace with job portal
        html = html.replace(
          /<body[^>]*>[\s\S]*?<\/body>/i,
          `<body>${jobPortalHTML}</body>`
        );
      } 
      else {
        // INNER PAGES - Remove apply button image and add new apply button
        // Remove the old apply button image
        html = html.replace(
          /<img[^>]*src="[^"]*Apply_Now_Button_Dps_430x\.png[^"]*"[^>]*>/gi,
          ''
        );
        
        // Remove links containing the apply button image
        html = html.replace(
          /<a[^>]*href="[^"]*"[^>]*>[\s\S]*?<img[^>]*Apply_Now_Button[^>]*>[\s\S]*?<\/a>/gi,
          ''
        );

        // Add new apply button to inner pages
        const innerApplyButton = `
          <div style="margin: 20px 0; text-align: center;">
            <a href="${JOB_PORTAL_CONFIG.applyUrl}" 
               class="apply-now-btn" 
               style="display: inline-block; background: #2563eb; color: white !important; 
                      padding: 14px 40px; border-radius: 50px; text-decoration: none; 
                      font-weight: 700; font-size: 1rem; transition: all 0.3s ease;
                      border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(37,99,235,0.3);">
              📝 Apply Now
            </a>
          </div>
        `;

        // Insert the new apply button after the product title or in a strategic location
        html = html.replace(
          /<h1[^>]*class="[^"]*product__title[^"]*"[^>]*>[\s\S]*?<\/h1>/i,
          (match) => `${match}${innerApplyButton}`
        );

        // If product title not found, insert after main content
        html = html.replace(
          /<main[^>]*>/i,
          (match) => `${match}${innerApplyButton}`
        );
      }

      // Remove all AdSense and ad-related code globally
      html = html.replace(
        /<script[^>]*>[\s\S]*?google_ad_client[\s\S]*?<\/script>/gi,
        ''
      );
      html = html.replace(
        /<script[^>]*>[\s\S]*?googletag[\s\S]*?<\/script>/gi,
        ''
      );
      html = html.replace(
        /<script[^>]*src="[^"]*googletagmanager[^"]*"[^>]*>[\s\S]*?<\/script>/gi,
        ''
      );

      // Add job portal JavaScript
      const jobPortalScript = `
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            // Track all apply button clicks
            document.querySelectorAll('.apply-now-btn, .apply-btn, [href*="apply"]').forEach(btn => {
              btn.addEventListener('click', function(e) {
                // Google Analytics tracking can be added here
                console.log('Apply button clicked:', this.href);
              });
            });

            // Remove any remaining ads
            const removeAds = () => {
              document.querySelectorAll('[class*="ad-"], [id*="ad-"], .adsbygoogle, [data-ad-]').forEach(el => {
                el.remove();
              });
            };
            
            // Run immediately and after any DOM changes
            removeAds();
            
            // Observe for dynamically added ads
            const observer = new MutationObserver(removeAds);
            observer.observe(document.body, { childList: true, subtree: true });
          });
        </script>
      `;
      
      html = html.replace("</body>", `${jobPortalScript}</body>`);

      return {
        statusCode: response.status,
        headers: { ...responseHeaders, "content-type": "text/html; charset=utf-8" },
        body: html,
      };
    }

    // CSS
    if (contentType.includes("text/css")) {
      let css = await response.text();
      
      // Remove AdSense styles and add job portal overrides
      const jobPortalCSS = `
        /* Remove ads and empty spaces */
        .adsbygoogle, .ad-container, [class*="ad-"], [id*="ad-"], 
        .google-auto-placed, .google-ad, .advertisement {
          display: none !important;
          height: 0 !important;
          width: 0 !important;
          min-height: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          position: absolute !important;
          pointer-events: none !important;
        }
        
        /* Remove any empty containers */
        div:empty, section:empty, aside:empty {
          display: none !important;
        }
        
        /* Product page customizations */
        .product-form, .product__price, .quantity-selector,
        .product-form__submit, .shopify-payment-button {
          display: none !important;
        }
        
        /* Apply button styles */
        .apply-now-btn {
          background: #2563eb !important;
          color: white !important;
          padding: 14px 40px !important;
          border-radius: 50px !important;
          text-decoration: none !important;
          font-weight: 700 !important;
          transition: all 0.3s ease !important;
        }
        
        .apply-now-btn:hover {
          background: #1e40af !important;
          transform: scale(1.05) !important;
        }
      `;
      
      css += jobPortalCSS;
      
      return {
        statusCode: response.status,
        headers: { ...responseHeaders, "content-type": "text/css" },
        body: rewriteText(css),
      };
    }

    // Sitemap / XML
    if (path.includes("sitemap") || contentType.includes("xml")) {
      return {
        statusCode: response.status,
        headers: { ...responseHeaders, "content-type": "application/xml; charset=utf-8" },
        body: rewriteText(await response.text()),
      };
    }

    // JavaScript
    if (contentType.includes("javascript")) {
      let js = await response.text();
      
      // Remove AdSense code from JavaScript
      js = js.replace(/google_ad_client[^;]*;/gi, '');
      js = js.replace(/adsbygoogle[^;]*;/gi, '');
      js = js.replace(/googletag[^;]*;/gi, '');
      
      return {
        statusCode: response.status,
        headers: { ...responseHeaders, "content-type": contentType },
        body: rewriteText(js),
      };
    }

    // Binary passthrough
    const arrayBuffer = await response.arrayBuffer();
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: Buffer.from(arrayBuffer).toString("base64"),
      isBase64Encoded: true,
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: "Proxy error: " + error.message,
    };
  }
};
