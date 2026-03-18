require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User.model');
const Design = require('./models/Design.model');
const Order = require('./models/Order.model');

const MONGO_URI = process.env.MONGODB_URI;

const uniqueDesigns = [
    {
        title: 'Premium Solid Mahogany Door (DXF)',
        description: 'A beautiful CNC carved solid wooden door with intricate floral patterns. Prepared for deep 3D relief routing on dense woods.',
        price: 999,
        category: 'routers',
        previewImages: ['/images/wood_door_1.png'],
        fileKey: 'mahogany_door_v1.dxf'
    },
    {
        title: 'Modern Geometric Oak Door (DXF)',
        description: 'Clean lines and grooved angular patterns. Ideal for flat-bed CNC routing on MDF or light oak panels.',
        price: 499,
        category: 'routers',
        previewImages: ['/images/wood_door_2.png'],
        fileKey: 'geometric_door_modern.dxf'
    },
    {
        title: 'Traditional Arched Vine Door (STL)',
        description: 'A traditional arched wooden door featuring a deep 3D carving of creeping vines. Highly realistic texture maps included.',
        price: 1499,
        category: 'carvings',
        previewImages: ['/images/wood_door_3.png'],
        fileKey: 'arched_vine_door.stl'
    },
    {
        title: 'Standard Cabinet Panel Door (DXF)',
        description: 'A parametric cabinet door design for quickly batching kitchen panels.',
        price: 0, // Free
        category: 'furniture',
        previewImages: ['/images/wood_door.png'],
        fileKey: 'shaker_cabinet_door.dxf'
    },
    {
        title: 'Decorative Tracery Window Screen (DXF)',
        description: 'A precise window frame with ornate mullions and decorative tracery. Scaled for 18mm plywood.',
        price: 299,
        category: 'carvings',
        previewImages: ['/images/wood_window_1.png'],
        fileKey: 'tracery_window_screen.dxf'
    },
    {
        title: 'Parametric Slat Table Plan (DXF)',
        description: 'A modern wooden slat coffee table cut from single sheet plywood. Flat-pack assembly ready.',
        price: 199,
        category: 'furniture',
        previewImages: ['/images/wood_table.png'],
        fileKey: 'slat_coffee_table.dxf'
    },
    {
        title: 'Parametric Plywood Chair (DXF)',
        description: 'An ergonomic, high-strength plywood chair cut plan. Requires zero screws or glue (friction fit).',
        price: 149,
        category: 'furniture',
        previewImages: ['/images/wood_furniture.png'],
        fileKey: 'friction_fit_chair.dxf'
    },
    {
        title: 'Geometric V-Bit Coaster Set (SVG)',
        description: 'A set of 6 wooden coasters with sharp geometric patterns optimized for a 60-degree V-bit.',
        price: 0, // Free
        category: 'v-bits',
        previewImages: ['/images/wood_coaster.png'],
        fileKey: 'geometric_coasters.svg'
    },
    {
        title: 'Majestic Lion Head Relief (STL)',
        description: 'A highly detailed 3D carving of a lion face. Extremely dense mesh requires a fine tapered ball nose bit.',
        price: 499,
        category: 'reliefs',
        previewImages: ['/images/wood_lion.png'],
        fileKey: 'lion_face_relief_highres.stl'
    },
    {
        title: 'Intricate Mahogany Mandala (STL)',
        description: 'An expansive 3D bas relief floral mandala. Intensely detailed, great for wall art or clock faces.',
        price: 199,
        category: 'reliefs',
        previewImages: ['/images/wood_mandala.png'],
        fileKey: 'floral_mandala.stl'
    },
    {
        title: 'Classic Floral Relief Panel (STL)',
        description: 'A decorative wall panel with natural floral sweeping motifs. Beautiful for wainscoting.',
        price: 299,
        category: 'carvings',
        previewImages: ['/images/wood_relief.png'],
        fileKey: 'classic_floral_panel.stl'
    },
    {
        title: 'Rustic V-Bit Engraved Signage (SVG)',
        description: 'A clean, crisp vector set for carving custom rustic wooden signs and welcome plaques.',
        price: 99,
        category: 'v-bits',
        previewImages: ['/images/wood_vbit.png'],
        fileKey: 'rustic_signage_pack.svg'
    },
    {
        title: 'Circular Maple Wood Rosette (STL)',
        description: 'A beautifully machined traditional circular rosette carving. Very fast cut time.',
        price: 0, // Free
        category: 'spindles',
        previewImages: ['/images/wood_rosette.png'],
        fileKey: 'maple_rosette.stl'
    }
];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        console.log('Clearing existing data...');
        await Design.deleteMany();
        await Order.deleteMany();

        // Ensure users exist
        const usersToCreate = [
            { name: 'Admin One', email: 'admin1@cnc.com', password: 'password123', role: 'admin' },
            { name: 'Admin Two', email: 'admin2@cnc.com', password: 'password123', role: 'admin' },
            { name: 'Aaditya', email: 'aaditya@example.com', password: 'password123', role: 'admin' },
            { name: 'User One', email: 'user1@cnc.com', password: 'password123', role: 'user' },
            { name: 'User Two', email: 'user2@cnc.com', password: 'password123', role: 'user' },
            { name: 'User Three', email: 'user3@cnc.com', password: 'password123', role: 'user' },
        ];

        const userDocs = [];
        for (const u of usersToCreate) {
            let user = await User.findOne({ email: u.email });
            if (!user) {
                user = await User.create(u);
                console.log(`Created user ${u.email}`);
            }
            userDocs.push(user);
        }

        console.log(`Generating ${uniqueDesigns.length} 100% unique CNC designs...`);

        // Map unique designs to random users and attach active status
        const finalDesigns = uniqueDesigns.map(design => ({
            ...design,
            uploadedBy: getRandom(userDocs)._id,
            isActive: true
        }));

        console.log('Inserting into database in block...');
        await Design.insertMany(finalDesigns);

        console.log('SUCCESS: Generated pristine boutique storefront!');
        process.exit();
    } catch (error) {
        console.error('Error seeding DB:', error);
        process.exit(1);
    }
};

seedDB();
