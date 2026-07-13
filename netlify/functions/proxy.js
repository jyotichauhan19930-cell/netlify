const SHOPIFY_DOMAIN = "jobshiring.fresherhiring.in";
const GOOGLE_VERIFICATION = "NaG55JVeQf6dZsuu1utZcMGxwAXgKLlZ_CEBfgaD5H8";
const APPLY_URL = "https://ruwmqs-uq.myshopify.com/pages/apply";

// Job Portal Configuration
const JOB_PORTAL_CONFIG = {
  siteName: "JobFounder",
  tagline: "Your Dream Career Starts Here",
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
        <meta name="description" content="Find your first job with JobFounder - The ultimate job portal for fresh graduates">
        <meta property="og:title" content="JobFounder - Your Dream Career Starts Here">
        <meta property="og:description" content="Find your first job with JobFounder - The ultimate job portal for fresh graduates">
        <meta property="og:type" content="website">
        <meta name="robots" content="index, follow">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
          
          /* Job Portal Styles - Modern Design */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            line-height: 1.6;
          }
          
          .job-portal-wrapper {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px 24px;
          }
          
          /* Navigation */
          .navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 0;
            margin-bottom: 40px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .navbar .logo {
            font-size: 1.5rem;
            font-weight: 800;
            color: #0f172a;
            text-decoration: none;
          }
          
          .navbar .logo span {
            color: #2563eb;
          }
          
          .navbar .nav-links {
            display: flex;
            gap: 32px;
            align-items: center;
          }
          
          .navbar .nav-links a {
            color: #475569;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
          }
          
          .navbar .nav-links a:hover {
            color: #2563eb;
          }
          
          .navbar .nav-apply-btn {
            background: #2563eb;
            color: white !important;
            padding: 10px 24px;
            border-radius: 50px;
            font-weight: 600;
            transition: all 0.3s ease;
          }
          
          .navbar .nav-apply-btn:hover {
            background: #1e40af;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          }
          
          /* Hero Section */
          .hero-section {
            text-align: center;
            padding: 60px 20px 80px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 24px;
            margin-bottom: 60px;
            position: relative;
            overflow: hidden;
          }
          
          .hero-section::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -30%;
            width: 60%;
            height: 200%;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%);
            transform: rotate(15deg);
          }
          
          .hero-section .badge {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 6px 20px;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
          }
          
          .hero-section h1 {
            font-size: 4rem;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 16px;
            position: relative;
            z-index: 1;
            line-height: 1.2;
          }
          
          .hero-section h1 span {
            color: #2563eb;
          }
          
          .hero-section p {
            font-size: 1.25rem;
            color: #475569;
            max-width: 600px;
            margin: 0 auto 32px;
            position: relative;
            z-index: 1;
          }
          
          .hero-section .hero-buttons {
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
            position: relative;
            z-index: 1;
          }
          
          .apply-now-btn {
            display: inline-block;
            background: #2563eb;
            color: white !important;
            padding: 14px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            font-size: 1.05rem;
            transition: all 0.3s ease;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
          }
          
          .apply-now-btn:hover {
            background: #1e40af;
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4);
          }
          
          .apply-now-btn-outline {
            display: inline-block;
            background: transparent;
            color: #2563eb !important;
            padding: 14px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            font-size: 1.05rem;
            border: 2px solid #2563eb;
            transition: all 0.3s ease;
          }
          
          .apply-now-btn-outline:hover {
            background: #2563eb;
            color: white !important;
            transform: translateY(-3px);
          }
          
          /* Statistics */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 40px;
            max-width: 700px;
            margin: 40px auto 0;
            position: relative;
            z-index: 1;
          }
          
          .stats-grid .stat-item {
            text-align: center;
          }
          
          .stats-grid .stat-number {
            font-size: 2.5rem;
            font-weight: 800;
            color: #0f172a;
            display: block;
          }
          
          .stats-grid .stat-label {
            font-size: 0.95rem;
            color: #64748b;
            font-weight: 500;
          }
          
          /* Section Styles */
          .section-title {
            font-size: 2.25rem;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 12px;
            text-align: center;
          }
          
          .section-title span {
            color: #2563eb;
          }
          
          .section-subtitle {
            text-align: center;
            color: #64748b;
            margin-bottom: 40px;
            font-size: 1.1rem;
          }
          
          /* Featured Jobs */
          .job-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 24px;
            margin-bottom: 60px;
          }
          
          .job-card {
            background: white;
            border-radius: 16px;
            padding: 28px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
            border: 1px solid #e2e8f0;
          }
          
          .job-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.08);
            border-color: #2563eb;
          }
          
          .job-card .job-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 6px;
          }
          
          .job-card .company {
            color: #2563eb;
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .job-card .location {
            color: #64748b;
            font-size: 0.9rem;
            margin-bottom: 12px;
          }
          
          .job-card .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 16px;
          }
          
          .job-card .tag {
            background: #f1f5f9;
            color: #475569;
            padding: 4px 14px;
            border-radius: 50px;
            font-size: 0.75rem;
            font-weight: 500;
          }
          
          .job-card .apply-btn {
            display: inline-block;
            background: #2563eb;
            color: white !important;
            padding: 8px 28px;
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
          
          /* Insights / Blog Section */
          .insights-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 24px;
            margin: 40px 0 60px;
          }
          
          .insight-card {
            background: white;
            border-radius: 16px;
            padding: 28px;
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
          }
          
          .insight-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.06);
          }
          
          .insight-card h3 {
            font-size: 1.1rem;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 8px;
          }
          
          .insight-card p {
            color: #64748b;
            font-size: 0.95rem;
            margin-bottom: 12px;
          }
          
          .insight-card .read-more {
            color: #2563eb;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
          }
          
          .insight-card .read-more:hover {
            text-decoration: underline;
          }
          
          /* Quick Apply CTA */
          .cta-section {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-radius: 24px;
            padding: 60px 40px;
            text-align: center;
            color: white;
            margin: 40px 0 20px;
          }
          
          .cta-section h2 {
            font-size: 2.25rem;
            font-weight: 700;
            margin-bottom: 12px;
          }
          
          .cta-section p {
            color: #94a3b8;
            font-size: 1.1rem;
            margin-bottom: 28px;
          }
          
          .cta-section .apply-now-btn {
            background: white;
            color: #0f172a !important;
            box-shadow: none;
          }
          
          .cta-section .apply-now-btn:hover {
            background: #e2e8f0;
            color: #0f172a !important;
          }
          
          /* Footer */
          .footer {
            text-align: center;
            padding: 40px 0 20px;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 0.9rem;
            margin-top: 40px;
          }
          
          .footer .footer-links {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 16px;
          }
          
          .footer .footer-links a {
            color: #64748b;
            text-decoration: none;
            transition: color 0.3s ease;
          }
          
          .footer .footer-links a:hover {
            color: #2563eb;
          }
          
          /* Remove Shopify's original product elements */
          .product-form, .product__price, .quantity-selector, 
          .product-form__submit, .shopify-payment-button,
          [class*="product-form"], [class*="add-to-cart"] {
            display: none !important;
          }
          
          @media (max-width: 768px) {
            .navbar {
              flex-direction: column;
              gap: 16px;
            }
            .navbar .nav-links {
              flex-wrap: wrap;
              justify-content: center;
              gap: 16px;
            }
            .hero-section {
              padding: 40px 16px 60px;
            }
            .hero-section h1 {
              font-size: 2.5rem;
            }
            .stats-grid {
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .job-grid {
              grid-template-columns: 1fr;
            }
            .insights-grid {
              grid-template-columns: 1fr;
            }
            .cta-section {
              padding: 40px 20px;
            }
            .cta-section h2 {
              font-size: 1.75rem;
            }
          }
          
          @media (max-width: 480px) {
            .stats-grid {
              grid-template-columns: 1fr;
              gap: 12px;
            }
            .hero-section .hero-buttons {
              flex-direction: column;
              align-items: center;
            }
          }
        </style>`
      );

      // COMPLETE HOMEPAGE REDESIGN - Matching Reference Design
      if (path === "/" || path === "") {
        const jobPortalHTML = `
          <div class="job-portal-wrapper">
            <!-- Navigation -->
            <nav class="navbar">
              <a href="/" class="logo">Job<span>Founder</span></a>
              <div class="nav-links">
                <a href="/">Home</a>
                <a href="/collections/all">Jobs</a>
                <a href="/pages/about">About</a>
                <a href="/pages/contact">Contact</a>
                <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="nav-apply-btn">Apply Now</a>
              </div>
            </nav>

            <!-- Hero Section -->
            <section class="hero-section">
              <div class="badge">🚀 Your Dream Career Starts Here</div>
              <h1>Your Dream Career<br><span>Starts Here</span></h1>
              <p>Discover thousands of opportunities from top companies. Find the perfect job that matches your skills and passion.</p>
              <div class="hero-buttons">
                <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-now-btn">Apply Now →</a>
                <a href="/collections/all" class="apply-now-btn-outline">Browse Jobs</a>
              </div>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-number">10K+</span>
                  <span class="stat-label">Active Jobs</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">5K+</span>
                  <span class="stat-label">Companies</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">50K+</span>
                  <span class="stat-label">Happy Candidates</span>
                </div>
              </div>
            </section>

            <!-- Featured Jobs -->
            <h2 class="section-title">Featured <span>Jobs</span></h2>
            <p class="section-subtitle">Explore top opportunities from leading companies</p>
            <div class="job-grid">
              <div class="job-card">
                <div class="job-title">Software Engineer</div>
                <div class="company">Tech Corp Inc.</div>
                <div class="location">📍 San Francisco, CA</div>
                <div class="tags">
                  <span class="tag">Full-time</span>
                  <span class="tag">Remote</span>
                </div>
                <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-btn">Apply Now</a>
              </div>
              <div class="job-card">
                <div class="job-title">Product Manager</div>
                <div class="company">Innovation Labs</div>
                <div class="location">📍 New York, NY</div>
                <div class="tags">
                  <span class="tag">Full-time</span>
                  <span class="tag">Remote</span>
                </div>
                <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-btn">Apply Now</a>
              </div>
              <div class="job-card">
                <div class="job-title">Data Scientist</div>
                <div class="company">AI Solutions</div>
                <div class="location">📍 Austin, TX</div>
                <div class="tags">
                  <span class="tag">Full-time</span>
                  <span class="tag">Hybrid</span>
                </div>
                <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-btn">Apply Now</a>
              </div>
            </div>

            <!-- Insights / Blog -->
            <h2 class="section-title">Latest <span>Insights</span></h2>
            <p class="section-subtitle">Stay updated with career advice and industry trends</p>
            <div class="insights-grid">
              <div class="insight-card">
                <h3>How to Ace Your Next Interview</h3>
                <p>Tips and strategies to impress employers and land your dream job.</p>
                <a href="#" class="read-more">Read More →</a>
              </div>
              <div class="insight-card">
                <h3>Top Skills for 2026</h3>
                <p>Discover the most in-demand skills that employers are looking for.</p>
                <a href="#" class="read-more">Read More →</a>
              </div>
              <div class="insight-card">
                <h3>Remote Work Trends</h3>
                <p>How the workplace is evolving and what it means for job seekers.</p>
                <a href="#" class="read-more">Read More →</a>
              </div>
            </div>

            <!-- CTA Section -->
            <section class="cta-section">
              <h2>Ready to Take the Next Step?</h2>
              <p>Apply now and start your journey towards a brighter future</p>
              <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-now-btn">Apply Now →</a>
            </section>

            <!-- Footer -->
            <footer class="footer">
              <div class="footer-links">
                <a href="/">Home</a>
                <a href="/pages/about">About</a>
                <a href="/pages/contact">Contact</a>
                <a href="/pages/privacy-policy">Privacy Policy</a>
              </div>
              <p>&copy; ${new Date().getFullYear()} JobFounder. All rights reserved.</p>
            </footer>
          </div>
        `;

        // Replace existing body content
        html = html.replace(
          /<body[^>]*>[\s\S]*?<\/body>/i,
          `<body>${jobPortalHTML}</body>`
        );
      } 
      else {
        // INNER PAGES - Remove old apply button and add new one
        html = html.replace(
          /<img[^>]*src="[^"]*Apply_Now_Button_Dps_430x\.png[^"]*"[^>]*>/gi,
          ''
        );
        html = html.replace(
          /<a[^>]*href="[^"]*"[^>]*>[\s\S]*?<img[^>]*Apply_Now_Button[^>]*>[\s\S]*?<\/a>/gi,
          ''
        );

        // Add modern apply button to inner pages
        const innerApplyButton = `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${JOB_PORTAL_CONFIG.applyUrl}" 
               class="apply-now-btn" 
               style="display: inline-block; background: #2563eb; color: white !important; 
                      padding: 14px 40px; border-radius: 50px; text-decoration: none; 
                      font-weight: 600; font-size: 1rem; transition: all 0.3s ease;
                      border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(37,99,235,0.3);">
              Apply Now →
            </a>
          </div>
        `;

        html = html.replace(
          /<h1[^>]*class="[^"]*product__title[^"]*"[^>]*>[\s\S]*?<\/h1>/i,
          (match) => `${match}${innerApplyButton}`
        );

        html = html.replace(
          /<main[^>]*>/i,
          (match) => `${match}${innerApplyButton}`
        );
      }

      // Remove all AdSense code globally
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
                console.log('Apply button clicked:', this.href);
                // Add analytics tracking here if needed
              });
            });

            // Remove any remaining ads
            const removeAds = () => {
              document.querySelectorAll('[class*="ad-"], [id*="ad-"], .adsbygoogle, [data-ad-]').forEach(el => {
                el.remove();
              });
            };
            
            removeAds();
            
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
        
        div:empty, section:empty, aside:empty {
          display: none !important;
        }
        
        .product-form, .product__price, .quantity-selector,
        .product-form__submit, .shopify-payment-button {
          display: none !important;
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
