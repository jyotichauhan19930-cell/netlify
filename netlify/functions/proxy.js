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

      // Remove disclaimer if enabled
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

      // Add job portal meta tags and styling
      html = html.replace(
        "<head>",
        `<head>
        <meta name="google-site-verification" content="${GOOGLE_VERIFICATION}" />
        <meta name="description" content="Find your first job with Fresher Hiring - The ultimate job portal for fresh graduates">
        <meta property="og:title" content="Fresher Hiring - Your First Job Awaits">
        <meta property="og:description" content="Find your first job with Fresher Hiring - The ultimate job portal for fresh graduates">
        <meta property="og:type" content="website">
        <style>
          /* Job Portal Custom Styles */
          .job-portal-banner {
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            border-radius: 8px;
            margin: 1rem 0;
          }
          .job-portal-banner h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
          }
          .job-portal-banner p {
            font-size: 1.2rem;
            opacity: 0.9;
          }
          .apply-now-btn {
            display: inline-block;
            background: #2563eb;
            color: white !important;
            padding: 12px 30px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            transition: all 0.3s ease;
            border: 2px solid white;
          }
          .apply-now-btn:hover {
            background: white;
            color: #2563eb !important;
            transform: scale(1.05);
          }
          .job-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
            transition: all 0.3s ease;
          }
          .job-card:hover {
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            transform: translateY(-2px);
          }
          .job-title {
            color: #1e40af;
            font-size: 1.25rem;
            font-weight: 600;
          }
          .job-meta {
            color: #6b7280;
            font-size: 0.875rem;
            margin: 0.5rem 0;
          }
          .job-tag {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            margin: 0 0.25rem;
          }
          .quick-apply-btn {
            display: inline-block;
            background: #2563eb;
            color: white !important;
            padding: 8px 20px;
            border-radius: 50px;
            text-decoration: none;
            font-size: 0.875rem;
            transition: all 0.3s ease;
          }
          .quick-apply-btn:hover {
            background: #1e40af;
            transform: scale(1.05);
          }
          @media (max-width: 768px) {
            .job-portal-banner h1 {
              font-size: 1.8rem;
            }
            .job-portal-banner p {
              font-size: 1rem;
            }
          }
        </style>`
      );

      // Add job portal banner to homepage
      if (path === "/" || path === "") {
        const bannerHTML = `
          <div class="job-portal-banner">
            <h1>🚀 Find Your First Job Today!</h1>
            <p>Fresh graduates, your career starts here. Apply now and land your dream job.</p>
            <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-now-btn">Apply Now →</a>
          </div>
        `;
        html = html.replace(
          /<main[^>]*>|<!--\s*Main\s*Content\s*-->/i,
          (match) => `${match}${bannerHTML}`
        );
      }

      // Replace ALL "Add to Cart" or "Buy Now" buttons with Apply Now
      const applyButtonHTML = `<a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-now-btn" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;border-radius:50px;text-decoration:none;font-weight:bold;transition:all 0.3s ease;border:2px solid white;">Apply Now</a>`;
      
      // Replace various button patterns
      html = html.replace(
        /<button[^>]*class="[^"]*btn[^"]*"[^>]*>[\s\S]*?<\/button>/gi,
        (match) => {
          // Don't replace if it's already an apply button
          if (match.includes("Apply Now") || match.includes("apply-now")) {
            return match;
          }
          return applyButtonHTML;
        }
      );

      html = html.replace(
        /<a[^>]*href="[^"]*"[^>]*class="[^"]*btn[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
        (match) => {
          if (match.includes("Apply Now") || match.includes("apply-now")) {
            return match;
          }
          return applyButtonHTML;
        }
      );

      // Replace specific Shopify button classes
      html = html.replace(
        /<a[^>]*class="[^"]*shopify-payment-button[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
        applyButtonHTML
      );

      html = html.replace(
        /<input[^>]*type="submit"[^>]*>/gi,
        `<a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-now-btn" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;border-radius:50px;text-decoration:none;font-weight:bold;border:2px solid white;cursor:pointer;">Apply Now</a>`
      );

      // Add apply now button to product pages (job listings)
      if (path.includes("/products/")) {
        const productApplyHTML = `
          <div style="margin: 2rem 0; padding: 1.5rem; background: #f3f4f6; border-radius: 8px; text-align: center;">
            <h3 style="color: #1e40af; margin-bottom: 1rem;">Ready to Apply?</h3>
            <a href="${JOB_PORTAL_CONFIG.applyUrl}" class="apply-now-btn" style="display:inline-block;background:#2563eb;color:white;padding:15px 40px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:1.1rem;transition:all 0.3s ease;border:2px solid white;">Apply Now</a>
          </div>
        `;
        
        html = html.replace(
          /<div[^>]*class="[^"]*product[^"]*"[^>]*>/i,
          (match) => `${match}${productApplyHTML}`
        );
      }

      // Update JSON-LD for job postings
      html = html.replace(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
        (match, json) => {
          try {
            const schema = JSON.parse(json);
            const updateJobPosting = (obj) => {
              if (!obj || typeof obj !== "object") return obj;
              if (Array.isArray(obj)) return obj.map(updateJobPosting);
              if (obj["@type"] === "JobPosting") {
                obj["datePosted"] = new Date().toISOString().split('T')[0];
                obj["validThrough"] = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                obj["employmentType"] = "FULL_TIME";
                obj["hiringOrganization"] = {
                  "@type": "Organization",
                  "name": "Fresher Hiring",
                  "sameAs": `https://${proxyHost}`
                };
                obj["jobLocation"] = {
                  "@type": "Place",
                  "address": {
                    "@type": "PostalAddress",
                    "addressCountry": "IN"
                  }
                };
              }
              for (const k of Object.keys(obj)) obj[k] = updateJobPosting(obj[k]);
              return obj;
            };
            return `<script type="application/ld+json">${JSON.stringify(updateJobPosting(schema))}</script>`;
          } catch { return match; }
        }
      );

      // Add job portal JavaScript for enhanced functionality
      const jobPortalScript = `
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            // Track Apply Now clicks
            document.querySelectorAll('.apply-now-btn, .quick-apply-btn').forEach(btn => {
              btn.addEventListener('click', function(e) {
                // Add analytics tracking if needed
                console.log('Apply Now clicked:', this.href);
              });
            });

            // Add job search functionality
            const searchBox = document.getElementById('search-jobs');
            if (searchBox) {
              searchBox.addEventListener('input', function(e) {
                const query = this.value.toLowerCase();
                document.querySelectorAll('.job-card').forEach(card => {
                  const title = card.querySelector('.job-title')?.textContent?.toLowerCase() || '';
                  card.style.display = title.includes(query) ? 'block' : 'none';
                });
              });
            }

            // Highlight apply buttons
            const style = document.createElement('style');
            style.textContent = \`
              .apply-now-btn, .quick-apply-btn {
                animation: pulse 2s infinite;
              }
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
                100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
              }
            \`;
            document.head.appendChild(style);
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

    // CSS with job portal styles
    if (contentType.includes("text/css")) {
      let css = await response.text();
      
      // Add job portal CSS overrides
      const jobPortalCSS = `
        /* Job Portal Styles */
        .product-form__submit, .btn--secondary, .button--primary {
          background: #2563eb !important;
          color: white !important;
        }
        .product-form__submit:hover, .btn--secondary:hover, .button--primary:hover {
          background: #1e40af !important;
        }
        .shopify-payment-button__button {
          background: #2563eb !important;
          color: white !important;
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
      return {
        statusCode: response.status,
        headers: { ...responseHeaders, "content-type": contentType },
        body: rewriteText(await response.text()),
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
