from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query

bp = Blueprint('affiliates', __name__, url_prefix='/api/affiliates')

@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_affiliate_stats():
    user_id = get_jwt_identity()
    
    # Get affiliate code
    user = execute_query(
        'SELECT affiliate_code FROM users WHERE id = %s',
        (user_id,),
        fetch_one=True
    )
    
    # Get total referrals
    referrals = execute_query(
        'SELECT COUNT(*) as count FROM users WHERE referred_by = %s',
        (user_id,),
        fetch_one=True
    )
    
    # Get total earnings
    earnings = execute_query(
        '''SELECT 
           SUM(commission_amount) as total_earned,
           SUM(CASE WHEN is_paid = FALSE AND is_used_for_subscription = FALSE THEN commission_amount ELSE 0 END) as available,
           SUM(CASE WHEN is_paid = TRUE THEN commission_amount ELSE 0 END) as paid_out,
           SUM(CASE WHEN is_used_for_subscription = TRUE THEN commission_amount ELSE 0 END) as used_for_subscription
           FROM affiliate_earnings 
           WHERE affiliate_user_id = %s''',
        (user_id,),
        fetch_one=True
    )
    
    # Get recent referrals
    recent_referrals = execute_query(
        '''SELECT u.username, u.created_at, u.user_type
           FROM users u
           WHERE u.referred_by = %s
           ORDER BY u.created_at DESC
           LIMIT 10''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({
        'affiliate_code': user['affiliate_code'],
        'total_referrals': referrals['count'],
        'total_earned': float(earnings['total_earned'] or 0),
        'available_balance': float(earnings['available'] or 0),
        'paid_out': float(earnings['paid_out'] or 0),
        'used_for_subscription': float(earnings['used_for_subscription'] or 0),
        'recent_referrals': recent_referrals,
        'min_payout': 100.00
    }), 200

@bp.route('/earnings', methods=['GET'])
@jwt_required()
def get_earnings_history():
    user_id = get_jwt_identity()
    
    earnings = execute_query(
        '''SELECT ae.*, u.username as referred_username, s.amount as subscription_amount
           FROM affiliate_earnings ae
           JOIN users u ON ae.referred_user_id = u.id
           JOIN subscriptions s ON ae.subscription_id = s.id
           WHERE ae.affiliate_user_id = %s
           ORDER BY ae.created_at DESC''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'earnings': earnings}), 200

@bp.route('/request-payout', methods=['POST'])
@jwt_required()
def request_payout():
    user_id = get_jwt_identity()
    
    # Get available balance
    earnings = execute_query(
        '''SELECT SUM(commission_amount) as available
           FROM affiliate_earnings 
           WHERE affiliate_user_id = %s AND is_paid = FALSE AND is_used_for_subscription = FALSE''',
        (user_id,),
        fetch_one=True
    )
    
    available = float(earnings['available'] or 0)
    
    if available < 100:
        return jsonify({'error': f'Minimum payout is R100. Current balance: R{available}'}), 400
    
    # Mark earnings as paid
    execute_query(
        '''UPDATE affiliate_earnings SET is_paid = TRUE 
           WHERE affiliate_user_id = %s AND is_paid = FALSE AND is_used_for_subscription = FALSE''',
        (user_id,)
    )
    
    # Create payout transaction
    transaction_id = execute_query(
        '''INSERT INTO payment_transactions (user_id, transaction_type, amount, payment_method, status) 
           VALUES (%s, %s, %s, %s, %s)''',
        (user_id, 'affiliate_payout', available, 'manual', 'pending')
    )
    
    return jsonify({
        'message': 'Payout request submitted',
        'amount': available,
        'transaction_id': transaction_id
    }), 201

@bp.route('/validate-code/<code>', methods=['GET'])
def validate_affiliate_code(code):
    user = execute_query(
        'SELECT id, username, user_type FROM users WHERE affiliate_code = %s',
        (code,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'valid': False, 'error': 'Invalid affiliate code'}), 404
    
    return jsonify({
        'valid': True,
        'affiliate': {
            'username': user['username'],
            'user_type': user['user_type']
        }
    }), 200
