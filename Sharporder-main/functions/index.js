const {onRequest} = require('firebase-functions/v2/https');
const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// ============================================
// HELPER FUNCTION - Send Notification
// ============================================
async function sendNotification(userId, title, body, data = {}) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found:', userId);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];

    if (tokens.length === 0) {
      console.log('⚠️ No FCM tokens for user:', userId);
      return { success: false, error: 'No tokens' };
    }

    console.log('📱 Sending notification to', tokens.length, 'device(s)');

    const sendPromises = tokens.map(token => {
      const message = {
        notification: { title, body },
        data: data,
        token: token,
      };

      return admin.messaging().send(message)
        .then(() => ({ success: true, token }))
        .catch(error => ({ success: false, token, error }));
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log('✅ Sent:', successCount, 'succeeded,', failureCount, 'failed');

    // Remove invalid tokens
    if (failureCount > 0) {
      const tokensToRemove = results.filter(r => !r.success).map(r => r.token);
      await admin.firestore().collection('users').doc(userId).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
    }

    return { success: true, successCount, failureCount };
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// TEST FUNCTION
// ============================================
exports.testFunction = onRequest((request, response) => {
  response.send('Hello from Firebase Cloud Functions! 🚀');
});

// ============================================
// SHIPPER NOTIFICATIONS
// ============================================

// 1. Order Confirmation (Load Created)
exports.onLoadCreated = onDocumentCreated('loads/{loadId}', async event => {
  const snap = event.data;
  if (!snap) return;

  const load = snap.data();
  const loadId = event.params.loadId;
  const shipperId = load.shipperId || load.userId;

  console.log('📦 New load created:', loadId);

  await sendNotification(
    shipperId,
    'Order Placed Successfully! ✅',
    `We've received your request for Order #${loadId.substring(0, 8)}. We are looking for a nearby driver now.`,
    {
      type: 'load_created',
      loadId: loadId,
    }
  );
});

// 2. Driver Assigned (Bid Accepted)
exports.onBidAccepted = onDocumentUpdated('bids/{bidId}', async event => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const bidId = event.params.bidId;

  // Only trigger when status changes to 'accepted'
  if (beforeData.status !== 'accepted' && afterData.status === 'accepted') {
    console.log('✅ Bid accepted:', bidId);

    const loadDoc = await admin.firestore().collection('loads').doc(afterData.loadId).get();
    const load = loadDoc.data();
    const shipperId = load.shipperId || load.userId;

    const driverDoc = await admin.firestore().collection('users').doc(afterData.driverId).get();
    const driverName = driverDoc.data()?.name || driverDoc.data()?.displayName || 'A driver';

    await sendNotification(
      shipperId,
      'Driver Assigned 🚚',
      `Good news! ${driverName} has accepted your order and will arrive for pickup soon.`,
      {
        type: 'driver_assigned',
        loadId: afterData.loadId,
        driverId: afterData.driverId,
        bidId: bidId,
      }
    );
  }
});

// 3. Driver at Pickup
exports.onDriverAtPickup = onDocumentUpdated('loads/{loadId}', async event => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const loadId = event.params.loadId;

  if (beforeData.status !== 'at_pickup' && afterData.status === 'at_pickup') {
    const shipperId = afterData.shipperId || afterData.userId;
    const driverDoc = await admin.firestore().collection('users').doc(afterData.assignedDriverId).get();
    const driverName = driverDoc.data()?.name || 'Your driver';

    await sendNotification(
      shipperId,
      'Your Driver has Arrived!',
      `${driverName} is at the pickup location. Please ensure the package is ready to hand over.`,
      {
        type: 'driver_at_pickup',
        loadId: loadId,
      }
    );
  }
});

// 4. Load in Transit
exports.onLoadInTransit = onDocumentUpdated('loads/{loadId}', async event => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const loadId = event.params.loadId;

  if (beforeData.status !== 'in_transit' && afterData.status === 'in_transit') {
    const shipperId = afterData.shipperId || afterData.userId;
    const driverDoc = await admin.firestore().collection('users').doc(afterData.assignedDriverId).get();
    const driverName = driverDoc.data()?.name || 'Your driver';

    await sendNotification(
      shipperId,
      'On the Move 💨',
      `Your order is safely in transit. Track ${driverName}'s real-time location in the app.`,
      {
        type: 'in_transit',
        loadId: loadId,
      }
    );
  }
});

// 5. Driver Approaching Drop-off
exports.onDriverApproaching = onDocumentUpdated('loads/{loadId}', async event => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const loadId = event.params.loadId;

  if (beforeData.status !== 'approaching_dropoff' && afterData.status === 'approaching_dropoff') {
    const shipperId = afterData.shipperId || afterData.userId;

    await sendNotification(
      shipperId,
      'Arriving Soon',
      'The driver is 5 minutes away from the destination. Please notify the receiver.',
      {
        type: 'approaching_dropoff',
        loadId: loadId,
      }
    );
  }
});

// 6. Delivery Successful
exports.onDeliveryComplete = onDocumentUpdated('loads/{loadId}', async event => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const loadId = event.params.loadId;

  if (beforeData.status !== 'delivered' && afterData.status === 'delivered') {
    const shipperId = afterData.shipperId || afterData.userId;

    await sendNotification(
      shipperId,
      'Delivered! 📦',
      `Order #${loadId.substring(0, 8)} has been successfully delivered. Tap to view the proof of delivery and rate your driver.`,
      {
        type: 'delivered',
        loadId: loadId,
      }
    );
  }
});

// 7. Order Cancelled
exports.onOrderCancelled = onDocumentUpdated('loads/{loadId}', async event => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const loadId = event.params.loadId;

  if (beforeData.status !== 'cancelled' && afterData.status === 'cancelled') {
    const shipperId = afterData.shipperId || afterData.userId;

    await sendNotification(
      shipperId,
      'Order Update',
      "We're sorry, but the driver had to cancel. We are automatically searching for a new driver for you.",
      {
        type: 'order_cancelled',
        loadId: loadId,
      }
    );
  }
});

// ============================================
// DRIVER NOTIFICATIONS
// ============================================

// 1. New Bid Received (Driver submits bid)
exports.onBidCreated = onDocumentCreated('bids/{bidId}', async event => {
  const snap = event.data;
  if (!snap) return;

  const bid = snap.data();
  const bidId = event.params.bidId;

  console.log('🎯 New bid created:', bidId);

  const loadDoc = await admin.firestore().collection('loads').doc(bid.loadId).get();
  if (!loadDoc.exists) return;

  const load = loadDoc.data();
  const shipperId = load.shipperId || load.userId;

  const driverDoc = await admin.firestore().collection('users').doc(bid.driverId).get();
  const driverName = driverDoc.data()?.name || driverDoc.data()?.displayName || 'A driver';

  const bidAmount = bid.offerAmount || bid.fareOffer || bid.amount || 0;
  const formattedAmount = `NGN ${bidAmount.toLocaleString()}`;

  await sendNotification(
    shipperId,
    '🚛 New Bid Received!',
    `${driverName} placed a bid of ${formattedAmount} for your load.`,
    {
      type: 'new_bid',
      bidId: bidId,
      loadId: bid.loadId,
      driverId: bid.driverId,
      offerAmount: String(bidAmount),
    }
  );
});

// 2. Assignment Confirmed (to Driver)
exports.notifyDriverAssignment = onDocumentUpdated('bids/{bidId}', async event => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const bidId = event.params.bidId;

  if (beforeData.status !== 'accepted' && afterData.status === 'accepted') {
    const loadDoc = await admin.firestore().collection('loads').doc(afterData.loadId).get();
    const load = loadDoc.data();
    const pickupAddress = load.pickupLocation?.address || 'the pickup location';

    await sendNotification(
      afterData.driverId,
      'You got the job! 🎉',
      `Load #${afterData.loadId.substring(0, 8)} is yours. Proceed to ${pickupAddress}.`,
      {
        type: 'assignment_confirmed',
        loadId: afterData.loadId,
        bidId: bidId,
      }
    );
  }
});

// 3. Order Cancelled (Notify Driver)
exports.notifyDriverCancellation = onDocumentUpdated('loads/{loadId}', async event => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const loadId = event.params.loadId;

  if (beforeData.status !== 'cancelled' && afterData.status === 'cancelled' && afterData.assignedDriverId) {
    await sendNotification(
      afterData.assignedDriverId,
      '⚠️ Order Cancelled',
      `The shipper cancelled Order #${loadId.substring(0, 8)}.`,
      {
        type: 'order_cancelled_driver',
        loadId: loadId,
      }
    );
  }
});

// ============================================
// PAYMENT & MESSAGING NOTIFICATIONS
// ============================================

// Payment Receipt
exports.onPaymentComplete = onDocumentCreated('payments/{paymentId}', async event => {
  const payment = event.data.data();
  const paymentId = event.params.paymentId;

  await sendNotification(
    payment.userId,
    'Payment Successful 💳',
    `We've processed your payment of NGN ${payment.amount.toLocaleString()} for Order #${payment.loadId?.substring(0, 8)}. Invoice is available in your history.`,
    {
      type: 'payment_success',
      paymentId: paymentId,
      loadId: payment.loadId,
    }
  );
});

// New Message Notification
exports.onNewMessage = onDocumentCreated('chats/{chatId}/messages/{messageId}', async event => {
  const message = event.data.data();
  const chatId = event.params.chatId;

  // Don't send notification to the sender
  const recipientId = message.receiverId;
  const senderDoc = await admin.firestore().collection('users').doc(message.senderId).get();
  const senderName = senderDoc.data()?.name || 'Someone';

  await sendNotification(
    recipientId,
    `New Message from ${senderName}`,
    `"${message.text}" — Tap to reply.`,
    {
      type: 'new_message',
      chatId: chatId,
      senderId: message.senderId,
    }
  );
});