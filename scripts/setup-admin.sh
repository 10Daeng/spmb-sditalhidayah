#!/bin/bash
# =============================================
# Setup Admin Script
# Jalankan dari root project
# =============================================

echo "Creating admin user..."

curl -X POST http://localhost:4321/api/admin/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "penelitian.mitra@gmail.com",
    "password": "#Rahasia25++",
    "full_name": "Super Admin",
    "role": "super_admin"
  }'

echo ""
echo "Done!"
