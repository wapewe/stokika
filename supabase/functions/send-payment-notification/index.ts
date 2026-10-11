// send-payment-notification Edge Function
// Sends payment notifications via UI, email, and SMS

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  payment_id: string;
  notification_type: 'timeout_detected' | 'payment_completed' | 'manual_payment_instructions' | 'manual_payment_approved' | 'manual_payment_rejected';
  user_email?: string;
  user_phone?: string;
  transaction_id?: string;
  amount?: number;
  account_number?: string;
  rejection_reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { payment_id, notification_type, user_email, user_phone, transaction_id, amount, account_number, rejection_reason } = await req.json() as NotificationRequest;

    if (!payment_id || !notification_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'payment_id and notification_type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notifications = {
      ui_sent: false,
      email_sent: false,
      sms_sent: false,
      errors: [] as string[]
    };

    // Generate notification content based on type
    const content = generateNotificationContent(notification_type, {
      transaction_id,
      amount,
      account_number,
      rejection_reason
    });

    // Store notification record in database
    const { error: dbError } = await supabaseClient
      .from('payment_notifications')
      .insert({
        payment_id,
        notification_type,
        ui_message: content.ui_message,
        email_subject: content.email_subject,
        email_body: content.email_body,
        sms_message: content.sms_message,
        sent_at: new Date().toISOString(),
        delivery_status: 'pending'
      });

    if (dbError) {
      console.error('Database insert error:', dbError);
      notifications.errors.push(`Database: ${dbError.message}`);
    } else {
      notifications.ui_sent = true;
    }

    // Send email if email address provided
    if (user_email && content.email_subject && content.email_body) {
      try {
        const emailResult = await sendEmail(user_email, content.email_subject, content.email_body);
        notifications.email_sent = emailResult.success;
        if (!emailResult.success) {
          notifications.errors.push(`Email: ${emailResult.error || 'Failed to send'}`);
        }
      } catch (error) {
        notifications.errors.push(`Email: ${error.message}`);
      }
    }

    // Send SMS if phone provided
    if (user_phone && content.sms_message) {
      try {
        const smsResult = await sendSMS(user_phone, content.sms_message);
        notifications.sms_sent = smsResult.success;
        if (!smsResult.success) {
          notifications.errors.push(`SMS: ${smsResult.error || 'Failed to send'}`);
        }
      } catch (error) {
        notifications.errors.push(`SMS: ${error.message}`);
      }
    }

    // Update delivery status
    if (!dbError) {
      await supabaseClient
        .from('payment_notifications')
        .update({
          delivery_status: notifications.errors.length === 0 ? 'delivered' : 'partial',
          email_sent: notifications.email_sent,
          sms_sent: notifications.sms_sent,
          error_log: notifications.errors.length > 0 ? JSON.stringify(notifications.errors) : null
        })
        .eq('payment_id', payment_id)
        .eq('notification_type', notification_type)
        .order('sent_at', { ascending: false })
        .limit(1);
    }

    // Log notification attempt
    await supabaseClient
      .from('payment_metrics')
      .insert({
        metric_type: 'notification_sent',
        payment_id,
        flow_type: 'kit_payment',
        metadata: {
          notification_type,
          ui_sent: notifications.ui_sent,
          email_sent: notifications.email_sent,
          sms_sent: notifications.sms_sent,
          errors: notifications.errors
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications,
        message: 'Notification processing complete'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification service error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateNotificationContent(type: string, data: any) {
  const paybillNumber = '4109726';
  
  switch (type) {
    case 'timeout_detected':
      return {
        ui_message: 'Payment timeout detected. Checking payment status...',
        email_subject: 'Stokika Payment - Status Update',
        email_body: `Dear Customer,\n\nWe noticed your payment (Transaction ID: ${data.transaction_id || 'N/A'}) is taking longer than expected. We are automatically checking the status with M-Pesa.\n\nPlease wait a moment while we verify your payment.\n\nThank you,\nStokika Support Team`,
        sms_message: `Stokika: Your payment is being verified. Transaction ID: ${data.transaction_id || 'N/A'}. Please wait.`
      };

    case 'payment_completed':
      return {
        ui_message: 'Payment successful! Your transaction has been completed.',
        email_subject: 'Stokika Payment Confirmation',
        email_body: `Dear Customer,\n\nYour payment has been successfully completed!\n\nTransaction ID: ${data.transaction_id || 'N/A'}\nAmount: KES ${data.amount || '0'}\n\nThank you for your payment.\n\nStokika Support Team`,
        sms_message: `Stokika: Payment successful! Amount: KES ${data.amount || '0'}. Transaction ID: ${data.transaction_id || 'N/A'}.`
      };

    case 'manual_payment_instructions':
      return {
        ui_message: `Please complete your payment manually using M-Pesa Paybill.\n\nPaybill: ${paybillNumber}\nAccount: ${data.account_number || 'N/A'}\nAmount: KES ${data.amount || '0'}`,
        email_subject: 'Stokika - Manual Payment Instructions',
        email_body: `Dear Customer,\n\nPlease complete your payment using the following details:\n\nPaybill Number: ${paybillNumber}\nAccount Number: ${data.account_number || 'N/A'}\nAmount: KES ${data.amount || '0'}\n\nTransaction ID: ${data.transaction_id || 'N/A'}\n\nAfter completing payment, click "I've Completed Payment" on the payment page. Your payment will be verified within 30 minutes.\n\nKeep your M-Pesa confirmation message for reference.\n\nStokika Support Team`,
        sms_message: `Stokika: Pay via M-Pesa Paybill ${paybillNumber}, Account ${data.account_number || 'N/A'}, Amount KES ${data.amount || '0'}. Trans ID: ${data.transaction_id || 'N/A'}`
      };

    case 'manual_payment_approved':
      return {
        ui_message: 'Your manual payment has been verified and approved!',
        email_subject: 'Stokika Payment Approved',
        email_body: `Dear Customer,\n\nGreat news! Your manual payment has been verified and approved.\n\nTransaction ID: ${data.transaction_id || 'N/A'}\nAmount: KES ${data.amount || '0'}\n\nYour account has been activated. You can now access all Stokika features.\n\nThank you,\nStokika Support Team`,
        sms_message: `Stokika: Your payment of KES ${data.amount || '0'} has been approved! Transaction ID: ${data.transaction_id || 'N/A'}. Welcome to Stokika!`
      };

    case 'manual_payment_rejected':
      return {
        ui_message: `Your payment verification was unsuccessful. ${data.rejection_reason || 'Please try again or contact support.'}`,
        email_subject: 'Stokika Payment - Action Required',
        email_body: `Dear Customer,\n\nWe were unable to verify your payment.\n\nTransaction ID: ${data.transaction_id || 'N/A'}\nReason: ${data.rejection_reason || 'Not specified'}\n\nPlease contact our support team at support@stokika.com or try again.\n\nStokika Support Team`,
        sms_message: `Stokika: Payment verification unsuccessful. Transaction ID: ${data.transaction_id || 'N/A'}. Please contact support.`
      };

    default:
      return {
        ui_message: 'Payment status update',
        email_subject: 'Stokika Payment Update',
        email_body: 'Your payment status has been updated.',
        sms_message: 'Stokika: Payment status updated.'
      };
  }
}

async function sendEmail(to: string, subject: string, body: string) {
  // Email sending logic - integrate with your email service
  // For now, log it (replace with actual email service like SendGrid, AWS SES, etc.)
  console.log('Email would be sent:', { to, subject, body });
  
  // Placeholder for actual email service integration
  // const response = await fetch('https://api.sendgrid.com/v3/mail/send', { ... });
  
  return { 
    success: true,  // Set to false if email fails
    error: null 
  };
}

async function sendSMS(phone: string, message: string) {
  // SMS sending logic - integrate with SMS gateway (Africa's Talking, Twilio, etc.)
  console.log('SMS would be sent:', { phone, message });
  
  // Placeholder for actual SMS service integration
  // const response = await fetch('https://api.africastalking.com/version1/messaging', { ... });
  
  return { 
    success: true,  // Set to false if SMS fails
    error: null 
  };
}
