const sequelize = require('../config/db');
const Student = require('./Student');
const Transaction = require('./Transaction');
const RebateRequest = require('./Rebate');
const Feedback = require('./Feedback');
const ExtraItem = require('./ExtraItem');

// ==========================================
// STUDENT FUNCTIONS
// ==========================================

/**
 * 1. Purchase Extra Item (Transactional)
 * Deducts stock from inventory AND creates a transaction record[cite: 2544].
 */
const buyExtraItem = async (rollNo, extraItemId, quantityToBuy) => {
  // Start a managed transaction
  const t = await sequelize.transaction();

  try {
    // 1. Check if item exists and has enough stock
    const item = await ExtraItem.findByPk(extraItemId, { transaction: t });
    
    if (!item || !item.isAvailable) {
      throw new Error('Item is currently not available in the menu.');
    }
    if (item.stockQuantity < quantityToBuy) {
      throw new Error(`Insufficient stock. Only ${item.stockQuantity} left.`);
    }

    // 2. Deduct the stock quantity
    item.stockQuantity -= quantityToBuy;
    if (item.stockQuantity === 0) {
      item.isAvailable = false; // Auto-disable if out of stock
    }
    await item.save({ transaction: t });

    // 3. Create the billing transaction
    const totalCost = item.price * quantityToBuy;
    const purchase = await Transaction.create({
      studentRollNo: rollNo,
      amount: totalCost,
      type: 'Extra Item',
      status: 'Completed',
      date: new Date()
    }, { transaction: t });

    // Commit the transaction if BOTH steps succeeded
    await t.commit();
    return purchase;

  } catch (error) {
    // If anything fails, roll back the entire process so stock isn't lost
    await t.rollback();
    throw error;
  }
};

/**
 * 2. Get Student's Monthly Bill
 * Calculates the total bill (Monthly Base Fee + Extras - Rebates)[cite: 2559].
 */
const getMonthlyBill = async (rollNo) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const totalBill = await Transaction.sum('amount', {
    where: {
      studentRollNo: rollNo,
      status: 'Completed',
      [sequelize.Op.and]: [
        sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM "date"')), currentMonth),
        sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM "date"')), currentYear)
      ]
    }
  });
  
  return totalBill || 0; 
};

/**
 * 3. Submit Rebate Request
 */
const submitRebate = async (rollNo, startDate, endDate, reason) => {
  const newRebate = await RebateRequest.create({
    studentRollNo: rollNo,
    startDate,
    endDate,
    reason,
    status: 'Pending'
  });
  return newRebate;
};

/**
 * 4. Submit Feedback
 */
const submitFeedback = async (rollNo, rating, category, comment) => {
  const feedback = await Feedback.create({
    studentRollNo: rollNo,
    rating,
    category,
    comment
  });
  return feedback;
};


// ==========================================
// MANAGER FUNCTIONS
// ==========================================

/**
 * 5. Process Rebate Request (Transactional)
 * If approved, updates request status AND applies a negative transaction credit to the student's bill[cite: 2549, 2576].
 */
const processRebate = async (requestId, managerDecision, rebateAmountPerDay = 150) => {
  const t = await sequelize.transaction();

  try {
    const request = await RebateRequest.findByPk(requestId, { transaction: t });
    if (!request) throw new Error('Rebate request not found.');

    // 1. Update the status
    request.status = managerDecision; // 'Approved' or 'Rejected'
    await request.save({ transaction: t });

    // 2. If approved, calculate the credit and apply it to the ledger
    if (managerDecision === 'Approved') {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1; // Inclusive days
      
      const totalCredit = -(days * rebateAmountPerDay); // Negative amount for credit

      await Transaction.create({
        studentRollNo: request.studentRollNo,
        amount: totalCredit, 
        type: 'Rebate',
        status: 'Completed',
        date: new Date()
      }, { transaction: t });
    }

    await t.commit();
    return request;

  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * 6. Approve New Student Registration
 * Changes a student's mess card status so they can use the system[cite: 2581].
 */
const approveStudent = async (rollNo) => {
  const student = await Student.findByPk(rollNo);
  if (!student) throw new Error('Student not found.');

  student.messCardStatus = 'Active';
  await student.save();
  return student;
};

/**
 * 7. Get Manager Dashboard Stats
 * Fires off parallel queries for maximum speed[cite: 2066].
 */
const getManagerDashboardStats = async () => {
  const [totalActiveStudents, pendingRebates] = await Promise.all([
    Student.count({ where: { messCardStatus: 'Active' } }),
    RebateRequest.count({ where: { status: 'Pending' } })
  ]);
  
  return { totalActiveStudents, pendingRebates };
};

/**
 * 8. Feedback Analytics
 * Groups feedback by category and averages the rating[cite: 2592].
 */
const getFeedbackAnalytics = async () => {
  const analytics = await Feedback.findAll({
    attributes: [
      'category',
      [sequelize.fn('COUNT', sequelize.col('feedbackId')), 'totalReviews'],
      [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('rating')), 1), 'averageRating']
    ],
    group: ['category'],
    order: [[sequelize.literal('"averageRating"'), 'DESC']]
  });
  return analytics;
};

// Export all the commands so the routing team can use them
module.exports = {
  buyExtraItem,
  getMonthlyBill,
  submitRebate,
  submitFeedback,
  processRebate,
  approveStudent,
  getManagerDashboardStats,
  getFeedbackAnalytics
};
