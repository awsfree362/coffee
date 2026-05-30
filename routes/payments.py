from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database.db import execute_query
import os

bp = Blueprint('payments', __name__, url_prefix='/api/payments')

@bp.route('/methods', methods=['GET'])
def get_payment_methods():
    return jsonify({
        'methods': [
            {'id': 'stripe', 'name': 'Stripe', 'enabled': bool(os.getenv('STRIPE_SECRET_KEY'))},
            {'id': 'payfast', 'name': 'PayFast', 'enabled': bool(os.getenv('PAYFAST_MERCHANT_ID'))},
            {'id': 'yoco', 'name': 'Yoco', 'enabled': bool(os.getenv('YOCO_SECRET_KEY'))},
            {'id': 'manual', 'name': 'Bank Transfer', 'enabled': True}
        ]
    }), 200

@bp.route('/stripe/create-intent', methods=['POST'])
@jwt_required()
def create_stripe_payment():
    try:
        import stripe
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        
        user_id = get_jwt_identity()
        data = request.json
        
        amount = int(float(data['amount']) * 100)  # Convert to cents
        
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='zar',
            metadata={
                'user_id': user_id,
                'type': data.get('type', 'subscription')
            }
        )
        
        return jsonify({
            'client_secret': intent.client_secret,
            'payment_intent_id': intent.id
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stripe/webhook', methods=['POST'])
def stripe_webhook():
    try:
        import stripe
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        
        payload = request.data
        sig_header = request.headers.get('Stripe-Signature')
        
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
        
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            user_id = payment_intent['metadata']['user_id']
            
            # Process payment success
            # Update subscription or ticket status
            
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    
    transactions = execute_query(
        '''SELECT * FROM payment_transactions 
           WHERE user_id = %s 
           ORDER BY created_at DESC''',
        (user_id,),
        fetch=True
    )
    
    return jsonify({'transactions': transactions}), 200

@bp.route('/bank-details', methods=['GET'])
def get_bank_details():
    return jsonify({
        'bank_name': 'Your Bank Name',
        'account_name': 'Coffee Platform',
        'account_number': '1234567890',
        'branch_code': '123456',
        'reference_format': 'COFFEE-{user_id}-{timestamp}'
    }), 200
