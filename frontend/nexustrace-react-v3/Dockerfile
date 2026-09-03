# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build

# Production Stage with Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Custom nginx configuration for SPA routing and API proxying.
# Written as a *template* (not straight into conf.d) so the backend target
# is resolved at container START time, not build time -- the official nginx
# image's entrypoint runs envsubst on every file under /etc/nginx/templates/
# and writes the result to /etc/nginx/conf.d/ automatically, no extra
# install needed. This lets the SAME image work both in docker-compose
# (BACKEND_URL defaults to the "backend" service name below) and on a host
# like Render where backend+frontend are separate services with their own
# public URLs -- there you just set BACKEND_URL to the backend service's
# real URL as an env var, no rebuild required.
RUN printf 'server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /api/ {\n\
        proxy_pass ${BACKEND_URL}/;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
}\n' > /etc/nginx/templates/default.conf.template

# Default matches the docker-compose service name "backend" on port 8000 --
# override with a real backend URL (e.g. https://nexustrace-backend.onrender.com,
# no trailing slash) when deploying frontend and backend as separate services.
ENV BACKEND_URL=http://backend:8000

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
