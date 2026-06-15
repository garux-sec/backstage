#!/bin/bash
# MP-Backstage Setup Script
set -e

echo "=== MP-Backstage Setup ==="

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" != "20" ]; then
  echo "⚠️  Warning: Node.js v${NODE_VERSION} detected. Required: v20"
  echo "   Run: nvm install 20 && nvm use 20"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Check yarn
if ! command -v yarn &> /dev/null; then
  echo "Installing yarn..."
  npm install -g yarn
fi
echo "✅ Yarn $(yarn -v)"

# Check .env
if [ ! -f ".env" ]; then
  echo ""
  echo "❌ .env file not found!"
  echo "   Copy the template and fill in your values:"
  echo "   cp .env.example .env"
  exit 1
fi
echo "✅ .env found"

# Install dependencies
echo ""
echo "Installing dependencies..."
yarn install

# Check mkdocs
if ! command -v mkdocs &> /dev/null; then
  echo ""
  echo "⚠️  mkdocs not found (required for TechDocs)"
  echo "   Run: pip install mkdocs-techdocs-core"
else
  echo "✅ mkdocs $(mkdocs --version)"
fi

echo ""
echo "=== Setup complete! ==="
echo "Run: yarn start"
