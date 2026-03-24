const RebateRequest = require('../models/RebateRequest');
const Transaction = require('../models/Transaction');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

/**
 * 1. (Student) - Apply for Rebate
 * Creates a new request with 'Pending' status.
 */
exports.submitRebate = async (req, res) => {
    try {
        const { studentRollNo, startDate, endDate, reason } = req.body;

        // Validation: Ensure the date range is logical
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ error: "Start date cannot be after end date." });
        }

        const rebate = await RebateRequest.create({
            studentRollNo,
            startDate,
            endDate,
            reason
            // status defaults to 'Pending' in your model
        });

        res.status(201).json({ message: "Rebate application submitted.", rebate });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * 2. (Manager) - Show Rebate Request Lists
 * Dynamic filtering for 'Pending', 'Approved', or 'Rejected' lists.
 */
exports.getRebateList = async (req, res) => {
    try {
        const { status } = req.query; // e.g., ?status=Pending or ?status=Approved
        
        const filter = status ? { status } : {};
        const requests = await RebateRequest.findAll({ 
            where: filter,
            order: [['createdAt', 'DESC']] 
        });

        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 3. (Manager) - Process Request (Approve/Decline)
 * Handles status updates and automated financial credits via Transactions.
 */
exports.processRebate = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { requestId, managerDecision, rebateAmountPerDay = 150 } = req.body;

        // Safety check for your ENUM values
        if (!['Approved', 'Rejected'].includes(managerDecision)) {
            return res.status(400).json({ error: "Decision must be 'Approved' or 'Rejected'." });
        }

        const request = await RebateRequest.findByPk(requestId, { transaction: t });
        if (!request) throw new Error('Rebate request not found.');

        // Update the request status
        request.status = managerDecision;
        await request.save({ transaction: t });

        // IF APPROVED: Calculate credit and update student ledger
        if (managerDecision === 'Approved') {
            const start = new Date(request.startDate);
            const end = new Date(request.endDate);
            
            // Inclusive day calculation: (End - Start) / msPerDay + 1
            const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            const totalCredit = -(diffDays * rebateAmountPerDay);

            await Transaction.create({
                studentRollNo: request.studentRollNo,
                amount: totalCredit, // Negative value reduces the total bill
                type: 'Rebate',
                status: 'Completed',
                date: new Date()
            }, { transaction: t });
        }

        await t.commit();
        res.status(200).json({ message: `Rebate ${managerDecision} successfully.`, request });

    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};
