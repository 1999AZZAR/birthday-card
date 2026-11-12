FROM node:22-alpine AS build
WORKDIR /src
COPY scripts/ scripts/
COPY site/ site/
RUN node scripts/build.mjs

FROM nginx:1.27-alpine
RUN rm -f /usr/share/nginx/html/index.html
COPY --from=build /src/build/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
