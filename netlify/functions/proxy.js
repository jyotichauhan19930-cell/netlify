const SHOPIFY_DOMAIN = "jobshiring.fresherhiring.in";
const GOOGLE_VERIFICATION = "oOB4GFrNSNdykfLPFYsy8byFMtrbAiccGJfrX7_UcOU";
const DATE_POSTED = "2026-07-13";
const VALID_THROUGH = "2026-12-31";

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

      html = html.replace(
        "<head>",
        `<head>\n<meta name="google-site-verification" content="${GOOGLE_VERIFICATION}" />`
      );

      html = html.replace(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
        (match, json) => {
          try {
            const schema = JSON.parse(json);
            const update = (obj) => {
              if (!obj || typeof obj !== "object") return obj;
              if (Array.isArray(obj)) return obj.map(update);
              if (obj["@type"] === "JobPosting") {
                obj["datePosted"]   = DATE_POSTED;
                obj["validThrough"] = VALID_THROUGH;
              }
              for (const k of Object.keys(obj)) obj[k] = update(obj[k]);
              return obj;
            };
            return `<script type="application/ld+json">${JSON.stringify(update(schema))}</script>`;
          } catch { return match; }
        }
      );

      return {
        statusCode: response.status,
        headers: { ...responseHeaders, "content-type": "text/html; charset=utf-8" },
        body: html,
      };
    }

    // CSS
    if (contentType.includes("text/css")) {
      return {
        statusCode: response.status,
        headers: { ...responseHeaders, "content-type": "text/css" },
        body: rewriteText(await response.text()),
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
