// Node.js script to create products
// Run with: node src/test/create-products.js

const dotenv = require('dotenv');

// IMPORTANT: correct .env path
dotenv.config({ path: '../../.env' });

const API_URL = 'http://localhost:5000/api';
let TOKEN = '';

// Function to login and get token
async function login() {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
      })
    });

    const data = await response.json();

    if (data.success) {
      TOKEN = data.data.token;
      console.log('✅ Login successful! Token obtained.');
      return true;
    } else {
      console.error('❌ Login failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

// Function to create a product
async function createProduct(productData) {
  try {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Created: ${productData.name}`);
      return data.data;
    } else {
      console.log(`❌ Failed: ${productData.name} - ${data.message}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating ${productData.name}:`, error.message);
    return null;
  }
}

// Product data
const products = [
  {
    name: "iPhone 15 Pro Max",
    description: "A17 Pro chip, titanium design.",
    price: 1199.99,
    stock: 50,
    category: "Smartphones",
    featured: true,
    images: [
      { url: "https://via.placeholder.com/500x500.png?text=iPhone+15" }
    ]
  },
  {
    name: "MacBook Pro M3",
    description: "High performance laptop.",
    price: 2499.99,
    stock: 25,
    category: "Laptops",
    featured: true,
    images: [
      { url: "https://via.placeholder.com/500x500.png?text=MacBook+Pro" }
    ]
  },
  {
    name: "Sony WH-1000XM5",
    description: "Noise canceling headphones.",
    price: 399.99,
    stock: 100,
    category: "Audio",
    featured: true,
    images: [
      { url: "https://via.placeholder.com/500x500.png?text=Sony+WH-1000XM5" }
    ]
  }
];

// Main function
async function main() {
  console.log('🚀 Starting product creation script...\n');

  const loggedIn = await login();

  if (!loggedIn) {
    console.log('❌ Cannot proceed without authentication.');
    process.exit(1);
  }

  console.log(`📦 Creating ${products.length} products...\n`);

  let successCount = 0;

  for (const product of products) {
    const result = await createProduct(product);
    if (result) successCount++;

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Summary:');
  console.log(`Created: ${successCount}`);
  console.log(`Failed: ${products.length - successCount}`);
}

main().catch(console.error);