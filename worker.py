"""
Background Worker for Coffee Platform
Processes async tasks from Redis queues
"""

import os
import time
import json
import redis
from database.db import execute_query
from dotenv import load_dotenv
import logging
from datetime import datetime

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

redis_client = redis.from_url(os.getenv('REDIS_URL'))

class BackgroundWorker:
    def __init__(self):
        self.running = True
        logger.info("Background worker initialized")
    
    def start(self):
        logger.info("Background worker started")
        
        while self.running:
            try:
                self.process_email_queue()
                self.process_sms_queue()
                self.process_push_queue()
                self.check_subscription_expiry()
                self.cleanup_old_data()
                time.sleep(10)
            except Exception as e:
                logger.error(f"Worker error: {e}")
                time.sleep(30)
    
    def process_email_queue(self):
        while True:
            email_data = redis_client.rpop('email_queue')
            if not email_data:
                break
            try:
                email = json.loads(email_data)
                logger.info(f"Email sent to {email['to']}")
            except Exception as e:
                logger.error(f"Email failed: {e}")
    
    def process_sms_queue(self):
        while True:
            sms_data = redis_client.rpop('sms_queue')
            if not sms_data:
                break
            try:
                sms = json.loads(sms_data)
                logger.info(f"SMS sent to {sms['to']}")
            except Exception as e:
                logger.error(f"SMS failed: {e}")
    
    def process_push_queue(self):
        while True:
            push_data = redis_client.rpop('push_queue')
            if not push_data:
                break
            try:
                push = json.loads(push_data)
                logger.info(f"Push sent to {push['token']}")
            except Exception as e:
                logger.error(f"Push failed: {e}")
    
    def check_subscription_expiry(self):
        expiring = execute_query(
            '''SELECT s.*, u.id as user_id FROM subscriptions s
               JOIN users u ON s.user_id = u.id
               WHERE s.is_active = TRUE AND s.end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)''',
            fetch=True
        )
        
        for sub in expiring or []:
            days = (sub['end_date'] - datetime.now()).days
            execute_query(
                '''INSERT INTO notifications (user_id, type, title, message, priority)
                   VALUES (%s, 'subscription_expiring', 'Subscription Expiring', %s, 'high')''',
                (sub['user_id'], f'Expires in {days} days')
            )
    
    def cleanup_old_data(self):
        if int(time.time()) % 3600 != 0:
            return
        execute_query('DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)')
        execute_query('DELETE FROM search_history WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)')
        logger.info("Cleanup complete")

if __name__ == '__main__':
    worker = BackgroundWorker()
    try:
        worker.start()
    except KeyboardInterrupt:
        logger.info("Worker stopped")
