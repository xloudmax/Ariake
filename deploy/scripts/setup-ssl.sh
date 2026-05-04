#!/bin/bash
# 生成自签名SSL证书（用于Cloudflare Full模式）

echo "生成自签名SSL证书..."

# 创建SSL目录
sudo mkdir -p /etc/nginx/ssl

# 生成自签名证书（有效期10年）
sudo openssl req -x509 -nodes -days 3650 \
  -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/xloudmax.key \
  -out /etc/nginx/ssl/xloudmax.crt \
  -subj "/C=CN/ST=HK/L=HongKong/O=Blog/CN=xloudmax.cc"

echo "✅ SSL证书已生成"
ls -lh /etc/nginx/ssl/

# 创建支持HTTPS的nginx配置
cat > /tmp/blog-ssl.conf << 'EOF'
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name xloudmax.cc www.xloudmax.cc;
    return 301 https://$server_name$request_uri;
}

# HTTPS配置
server {
    listen 443 ssl http2;
    server_name xloudmax.cc www.xloudmax.cc;

    # SSL证书
    ssl_certificate /etc/nginx/ssl/xloudmax.crt;
    ssl_certificate_key /etc/nginx/ssl/xloudmax.key;

    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Cloudflare真实IP
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 文件上传大小限制
    client_max_body_size 10M;

    # 前端静态文件
    location / {
        root /var/www/blog/dist;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端API代理
    location /graphql {
        proxy_pass http://localhost:11451;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 上传文件访问
    location /uploads/ {
        alias /var/www/blog/apps/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # 健康检查
    location /health/ {
        proxy_pass http://localhost:11451;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        access_log off;
    }

    # 日志配置
    access_log /var/log/nginx/blog_access.log;
    error_log /var/log/nginx/blog_error.log;
}
EOF

echo "✅ Nginx配置已生成: /tmp/blog-ssl.conf"
echo ""
echo "⚠️  下一步："
echo "   1. 检查配置: cat /tmp/blog-ssl.conf"
echo "   2. 部署配置: sudo cp /tmp/blog-ssl.conf /etc/nginx/sites-available/blog"
echo "   3. 测试配置: sudo nginx -t"
echo "   4. 重启nginx: sudo systemctl reload nginx"
echo "   5. 在Cloudflare设置SSL/TLS为'完全(Full)'模式"
echo "   6. 在AWS安全组开放443端口"
