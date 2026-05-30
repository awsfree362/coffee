from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query
from datetime import datetime, timedelta
from utils.helpers import save_file, add_months

bp = Blueprint('subscriptions', __name__, url_prefix='/api/subscriptions')

def get_subscription_price(user_type):
    prices = {
        'escort': 49.99,
        'visitor': 49.99,
        'venue': 99.99
    }
    return prices.get(user_type, 0)

def check_active_subscription(user_id):
    subscription = execute_query(
        '''SELECT * FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE AND end_date > NOW()
           ORDER BY end_date DESC LIMIT 1''',
        (user_id,),
        fetch_one=True
    )
    return subscription is not None

@bp.route('/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    user_id = get_jwt_identity()
    
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    subscription = execute_query(
        '''SELECT * FROM subscriptions 
           WHERE user_id = %s AND is_active = TRUE AND payment_verified = TRUE AND end_date > NOW()
           ORDER BY end_date DESC LIMIT 1''',
        (user_id,),
        fetch_one=True
    )
    
    monthly_fee = get_subscription_price(user['user_type'])
    
    return jsonify({
        'has_active_subscription': subscription is not None,
        'subscription': subscription,
        'monthly_fee': monthly_fee,
        'end_date': subscription['end_date'] if subscription else None
    }), 200

@bp.route('/create', methods=['POST'])
@jwt_required()
def create_subscription():
    user_id = get_jwt_identity()
    data = request.form
    files = request.files
    
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    
    amount = get_subscription_price(user['user_type'])
    payment_reference = data.get('payment_reference')
    
    # Handle payment proof upload
    payment_proof_url = None
    if 'payment_proof' in files:
        payment_proof_url = save_file(files['payment_proof'], 'payments')
    
    start_date = datetime.now()
    end_date = add_months(start_date, 1)
    
    subscription_id = execute_query(
        '''INSERT INTO subscriptions (user_id, subscription_type, amount, start_date, end_date, 
           payment_reference, payment_proof_url, payment_verified) 
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
        (user_id, user['user_type'], amount, start_date, end_date, payment_reference, 
         payment_proof_url, False)
    )
    
    # Create payment transaction
    execute_query(
        '''INSERT INTO payment_transactions (user_id, transaction_type, amount, payment_method, 
           payment_reference, payment_proof_url, status, related_id) 
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
        (user_id, 'subscription', amount, 'manual', payment_reference, payment_proof_url, 
         'pending', subscription_id)
    )
    
    return jsonify({
        'message': 'Subscription created, awaiting verification',
        'subscription_id': subscription_id,
        'payment_reference': payment_reference
    }), 201

@bp.route('/verify/<int:subscription_id>', methods=['POST'])
@jwt_required()
def verify_subscription(subscription_id):
    # This would be called by admin or automated OCR system
    user_id = get_jwt_identity()
    
    subscription = execute_query(
        'SELECT * FROM subscriptions WHERE id = %s',
        (subscription_id,),
        fetch_one=True
    )
    
    if not subscription:
        return jsonify({'error': 'Subscription not found'}), 404
    
    # Update subscription status
    execute_query(
        'UPDATE subscriptions SET payment_verified = TRUE, is_active = TRUE WHERE id = %s',
        (subscription_id,)
    )
    
    # Update payment transaction
    execute_query(
        '''UPDATE payment_transactions SET status = %s 
           WHERE related_id = %s AND transaction_type = %s''',
        ('verified', subscription_id, 'subscription')
    )
    
    # Process affiliate commission if referred
    user = execute_query('SELECT referred_by FROM users WHERE id = %s', (subscription['user_id'],), fetch_one=True)
    if user and user['referred_by']:
        commission_amount = subscription['amount'] * 0.20
        execute_query(
            '''INSERT INTO affiliate_earnings (affiliate_user_id, referred_user_id, subscription_id, 
               commission_amount, commission_percentage) 
               VALUES (%s, %s, %s, %s, %s)''',
            (user['referred_by'], subscription['user_id'], subscription_id, commission_amount, 20.00)
        )
    
    return jsonify({'message': 'Subscription verified successfully'}), 200

@bp.route('/use-affiliate-earnings', methods=['POST'])
@jwt_required()
def use_affiliate_earnings():
    user_id = get_jwt_identity()
    
    # Get total available earnings
    earnings = execute_query(
        '''SELECT SUM(commission_amount) as total FROM affiliate_earnings 
           WHERE affiliate_user_id = %s AND is_paid = FALSE AND is_used_for_subscription = FALSE''',
        (user_id,),
        fetch_one=True
    )
    
    total_earnings = float(earnings['total'] or 0)
    
    user = execute_query('SELECT user_type FROM users WHERE id = %s', (user_id,), fetch_one=True)
    required_amount = get_subscription_price(user['user_type'])
    
    if total_earnings < required_amount:
        return jsonify({'error': f'Insufficient earnings. Have R{total_earnings}, need R{required_amount}'}), 400
    
    # Mark earnings as used
    execute_query(
        '''UPDATE affiliate_earnings SET is_used_for_subscription = TRUE 
           WHERE affiliate_user_id = %s AND is_paid = FALSE AND is_used_for_subscription = FALSE''',
        (user_id,)
    )
    
    # Create subscription
    start_date = datetime.now()
    end_date = add_months(start_date, 1)
    
    subscription_id = execute_query(
        '''INSERT INTO subscriptions (user_id, subscription_type, amount, start_date, end_date, 
           payment_reference, payment_verified, is_active) 
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
        (user_id, user['user_type'], required_amount, start_date, end_date, 
         'AFFILIATE_EARNINGS', True, True)
    )
    
    return jsonify({
        'message': 'Subscription activated using affiliate earnings',
        'subscription_id': subscription_id
    }), 201

@bp.route('/my-subscriptions', methods=['GET'])
@jwt_required()
def get_my_subscriptions():
    user_id = get_jwt_identity()
    
    subscriptions = execute_query(
        'SELECT * FROM subscriptions WHERE user_id = %s ORDER BY created_at DESC',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'subscriptions': subscriptions}), 200
