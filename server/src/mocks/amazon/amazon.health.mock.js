const amazonAccountHealth = {
  healthStatus: 'NORMAL',
  performanceMetrics: [
    { name: 'Order Defect Rate',         value: 0.52,  threshold: 1.0,  status: 'NORMAL',   unit: 'PERCENT' },
    { name: 'Cancellation Rate',         value: 1.80,  threshold: 2.5,  status: 'NORMAL',   unit: 'PERCENT' },
    { name: 'Late Shipment Rate',        value: 3.10,  threshold: 4.0,  status: 'AT_RISK',  unit: 'PERCENT' },
    { name: 'Valid Tracking Rate',       value: 97.40, threshold: 95.0, status: 'NORMAL',   unit: 'PERCENT' },
    { name: 'On-Time Delivery Score',    value: 94.20, threshold: 90.0, status: 'NORMAL',   unit: 'PERCENT' },
    { name: 'Return Dissatisfaction Rate', value: 0.80, threshold: 10.0, status: 'NORMAL',  unit: 'PERCENT' },
  ],
  negativeReviewCount: 3,
  aToZGuaranteeClaims: { received: 1, granted: 0, underReview: 0 },
  chargebackClaims: { received: 0, granted: 0 },
  policyViolations: [],
  suspensions: [],
  buyBoxPercentage: 87.4,
  feedbackRating: 4.7,
  feedbackCount: 214,
};

module.exports = { amazonAccountHealth };
