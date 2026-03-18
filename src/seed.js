const sequelize = require('./config/db');
const Student = require('./models/student');
const MessManager = require('./models/messmanager');
const Menu = require('./models/menu');
const Feedback = require('./models/feedback');
const Transaction = require('./models/transaction');
// Assuming your partner named the exported models this way:
const RebateRequest = require('./models/rebaterequest'); 
const ExtraItem = require('./models/extraitem');

const seedData = async () => {
  try {
    await sequelize.sync({ force: true }); // Resets database

    console.log('⏳ Seeding Managers & Students...');
    await MessManager.bulkCreate([
      { adminId: 'ADMIN01', name: 'Ujjwal Kajal', password: 'hashedpassword1', role: 'Admin' }
    ]);

    await Student.bulkCreate([
      { rollNo: '240252', name: 'B Mahath', email: 'bmahath24@iitk.ac.in', password: 'pwd', roomNo: 'A-101', messCardStatus: 'Active' },
      { rollNo: '240804', name: 'Priyanshi Meena', email: 'priyanshim24@iitk.ac.in', password: 'pwd', roomNo: 'B-205', messCardStatus: 'Active' },
      { rollNo: '240484', name: 'Rishith Jalagam', email: 'rishithjs24@iitk.ac.in', password: 'pwd', roomNo: 'C-301', messCardStatus: 'Suspended' }
    ]);

    console.log('⏳ Seeding Menu & Extras...');
    await Menu.bulkCreate([
      { date: '2026-03-20', mealType: 'Breakfast', items: 'Poha, Sambar, Idli (4 pcs), Tea/Coffee', voteCount: 45 },
      { date: '2026-03-20', mealType: 'Dinner', items: 'Roti, Rice, Rajma Masala, Aloo Gobi', voteCount: 89 }
    ]);

    await ExtraItem.bulkCreate([
      { itemName: 'Paneer Curry', price: 50.00, isAvailable: true },
      { itemName: 'Ice Cream', price: 30.00, isAvailable: true }
    ]);

    console.log('⏳ Seeding Transactions, Rebates & Feedback...');
    await Transaction.bulkCreate([
      { studentRollNo: '240252', amount: 4500.00, type: 'Monthly Fee', status: 'Completed' },
      { studentRollNo: '240252', amount: 50.00, type: 'Extra Item', status: 'Completed' }
    ]);

    await RebateRequest.bulkCreate([
      { studentRollNo: '240484', startDate: '2026-03-25', endDate: '2026-03-30', reason: 'Going home', status: 'Pending' }
    ]);

    await Feedback.bulkCreate([
      { studentRollNo: '240252', rating: 4, category: 'Food Quality', comment: 'Paneer was great.' }
    ]);

    console.log('✅ Database successfully seeded!');
    process.exit();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
