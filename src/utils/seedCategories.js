const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../models/Category');
const User = require('../models/User');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

const seedCategories = async () => {
  try {
    // Get admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin user found. Please run seedAdmin.js first.'.red);
      process.exit();
    }

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories'.yellow);

    // Create main categories
    const electronics = await Category.create({
      name: 'Electronics',
      description: 'Latest electronic gadgets, devices, and accessories for tech enthusiasts',
      featured: true,
      order: 1,
      createdBy: admin._id
    });

    const fashion = await Category.create({
      name: 'Fashion',
      description: 'Trendy clothing, footwear, and accessories for men and women',
      featured: true,
      order: 2,
      createdBy: admin._id
    });

    const home = await Category.create({
      name: 'Home & Living',
      description: 'Beautiful home decor, furniture, and kitchen essentials',
      featured: true,
      order: 3,
      createdBy: admin._id
    });

    const sports = await Category.create({
      name: 'Sports & Outdoors',
      description: 'Equipment and gear for sports, fitness, and outdoor activities',
      featured: true,
      order: 4,
      createdBy: admin._id
    });

    const books = await Category.create({
      name: 'Books & Media',
      description: 'Books, movies, music, and entertainment',
      featured: false,
      order: 5,
      createdBy: admin._id
    });

    // Create subcategories for Electronics
    await Category.create([
      {
        name: 'Smartphones',
        description: 'Latest smartphones from top brands like Apple, Samsung, Google',
        parentCategory: electronics._id,
        featured: true,
        order: 1,
        createdBy: admin._id
      },
      {
        name: 'Laptops',
        description: 'High-performance laptops for work, gaming, and creativity',
        parentCategory: electronics._id,
        featured: true,
        order: 2,
        createdBy: admin._id
      },
      {
        name: 'Audio',
        description: 'Headphones, speakers, and audio equipment',
        parentCategory: electronics._id,
        featured: true,
        order: 3,
        createdBy: admin._id
      },
      {
        name: 'Televisions',
        description: '4K, OLED, and QLED TVs for the ultimate viewing experience',
        parentCategory: electronics._id,
        featured: false,
        order: 4,
        createdBy: admin._id
      },
      {
        name: 'Gaming',
        description: 'Consoles, games, and gaming accessories',
        parentCategory: electronics._id,
        featured: true,
        order: 5,
        createdBy: admin._id
      }
    ]);

    // Create subcategories for Fashion
    await Category.create([
      {
        name: "Men's Clothing",
        description: 'Shirts, pants, jackets, and more for men',
        parentCategory: fashion._id,
        featured: true,
        order: 1,
        createdBy: admin._id
      },
      {
        name: "Women's Clothing",
        description: 'Dresses, tops, skirts, and more for women',
        parentCategory: fashion._id,
        featured: true,
        order: 2,
        createdBy: admin._id
      },
      {
        name: 'Footwear',
        description: 'Shoes, sneakers, boots for all occasions',
        parentCategory: fashion._id,
        featured: true,
        order: 3,
        createdBy: admin._id
      },
      {
        name: 'Accessories',
        description: 'Watches, jewelry, bags, and more',
        parentCategory: fashion._id,
        featured: false,
        order: 4,
        createdBy: admin._id
      }
    ]);

    // Create subcategories for Home & Living
    await Category.create([
      {
        name: 'Furniture',
        description: 'Sofas, beds, tables, and chairs',
        parentCategory: home._id,
        featured: true,
        order: 1,
        createdBy: admin._id
      },
      {
        name: 'Kitchen',
        description: 'Cookware, appliances, and utensils',
        parentCategory: home._id,
        featured: true,
        order: 2,
        createdBy: admin._id
      },
      {
        name: 'Decor',
        description: 'Wall art, lighting, and decorative items',
        parentCategory: home._id,
        featured: false,
        order: 3,
        createdBy: admin._id
      },
      {
        name: 'Bedding',
        description: 'Sheets, comforters, pillows, and more',
        parentCategory: home._id,
        featured: false,
        order: 4,
        createdBy: admin._id
      }
    ]);

    console.log('✅ Categories seeded successfully!'.green);
    console.log('\n📊 Categories created:'.cyan);
    console.log('- Electronics (with 5 subcategories)');
    console.log('- Fashion (with 4 subcategories)');
    console.log('- Home & Living (with 4 subcategories)');
    console.log('- Sports & Outdoors');
    console.log('- Books & Media');

    process.exit();
  } catch (error) {
    console.error('❌ Error seeding categories:'.red, error);
    process.exit(1);
  }
};

seedCategories();