#!/bin/bash

echo "🚀 Installing Grome Backend Dependencies..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing npm packages..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Copy env.example to .env: cp env.example .env"
    echo "2. Configure your environment variables in .env"
    echo "3. Start MongoDB and Redis services"
    echo "4. Run the application: npm run start:dev"
    echo ""
    echo "📚 API Documentation will be available at: http://localhost:3000/api/docs"
    echo "🎉 Happy coding!"
else
    echo "❌ Installation failed. Please check the error messages above."
    exit 1
fi

