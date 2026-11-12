FROM nginx:1.27-alpine

RUN rm -f /usr/share/nginx/html/index.html
COPY site/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Fingerprint app assets so cache busting survives CDN edge caching.
RUN set -eu; cd /usr/share/nginx/html; \
    for f in assets/css/styles.css assets/js/content.js assets/js/app.js; do \
        h="$(sha256sum "$f" | cut -c1-10)"; \
        sed -i "s|\"$f\"|\"$f?v=$h\"|g" index.html; \
    done; \
    grep -c '?v=' index.html

EXPOSE 80
