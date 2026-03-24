const express = require('express');
const router = express.Router();
const rebateController = require('../controllers/RebateController');

/**
 * FEATURE: (Student) - Apply for Rebate
 * Requirement: Allow student to submit application with dates and reason.
 * Method: POST
 * URL: /api/rebates/apply
 */
router.post('/apply', rebateController.submitRebate);

/**
 * FEATURE: (Manager) - Show Rebate Request Lists
 * Requirement: Show Pending list AND Show Approved list.
 * Method: GET
 * URL: /api/rebates/list?status=Pending OR /api/rebates/list?status=Approved
 */
router.get('/list', rebateController.getRebateList);

/**
 * FEATURE: (Manager) - Approve/Decline Request
 * Requirement: Change status and update student ledger if approved.
 * Method: POST
 * URL: /api/rebates/process
 */
router.post('/process', rebateController.processRebate);

module.exports = router;
