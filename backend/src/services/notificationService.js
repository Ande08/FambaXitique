// This service will later integrate with Baileys or similar for WhatsApp notifications
exports.notifyAdminNewPayment = async (adminId, groupName, payerName) => {
  console.log(`[Notification] Admin ${adminId}: New payment in ${groupName} by ${payerName}`);
  // Future: WhatsApp message logic here
};

exports.notifyMemberPaymentStatus = async (memberId, status) => {
  console.log(`[Notification] Member ${memberId}: Your payment was ${status}`);
  // Future: WhatsApp message logic here
};
