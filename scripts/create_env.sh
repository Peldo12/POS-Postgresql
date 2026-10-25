cat > .env.test <<EOF
DB_HOST=${{ secrets.DB_HOST }}
DB_USER=${{ secrets.DB_USER }}
DB_PASSWORD=${{ secrets.DB_PASSWORD }}
DB_NAME=${{ secrets.DB_NAME }}
REDIS_URL=${{ secrets.REDIS_URL }}
SUPER_NAME=${{ secrets.SUPER_NAME }}
SUPER_EMAIL=${{ secrets.SUPER_EMAIL }}
SUPER_PASS=${{ secrets.SUPER_PASS }}
EOF