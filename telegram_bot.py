# -*- coding: utf-8 -*-
"""
TELEGRAM BOT TỰ ĐỘNG CHUYỂN ĐỔI LINK SHOPEE AFFILIATE HÀNG LOẠT (PYTHON VERSION)
Chạy trực tiếp trên OpenClaw / Python Environment

Yêu cầu cài đặt thư viện:
pip install pyTelegramBotAPI requests
"""

import re
import requests
import telebot

# ================= CẤU HÌNH HỆ THỐNG =================
TELEGRAM_BOT_TOKEN = 'ĐIỀN_TOKEN_BOT_TELEGRAM_CỦA_BẠN_VÀO_ĐÂY'
PISHARE_SUB_ID = 'tubean'  # Username nhận hoa hồng affiliate mặc định
PISHARE_API_URL = 'https://pishare.site/api/public/shorten'  # API rút gọn link của bạn
# ====================================================

# Khởi tạo Bot Telegram
bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)

# Biểu thức chính quy (Regex) bắt mọi định dạng link Shopee
SHOPEE_LINK_REGEX = r"https?://(?:[a-zA-Z0-9-]+\.)?(?:shopee\.vn|shope\.ee|s\.shopee\.vn)/[^\s\"'\)\],;]+"

print("🤖 Bot Telegram (Python) đã khởi chạy thành công và đang lắng nghe tin nhắn...")

# Hàm gọi API xử lý hàng loạt của PiShare (1 request cho tất cả các link)
def call_pishare_bulk_api(shopee_links, sub_id):
    payload = {
        "links": shopee_links,
        "subId": sub_id
    }
    try:
        response = requests.post(PISHARE_API_URL, json=payload, timeout=20)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                return data.get("results", {})
        print(f"⚠️ API phản hồi lỗi (Mã: {response.status_code}): {response.text}")
    except Exception as e:
        print(f"❌ Lỗi kết nối API PiShare: {str(e)}")
    return None

# Lắng nghe lệnh khởi động /start
@bot.message_handler(commands=['start'])
def send_welcome(message):
    welcome_text = (
        "👋 Chào mừng bạn! Hãy gửi cho tôi bất kỳ bài viết nào chứa link Shopee, "
        "tôi sẽ tự động chuyển đổi toàn bộ chúng sang link rút gọn PiShare "
        "chứa ID Affiliate của bạn trong nháy mắt!"
    )
    bot.reply_to(message, welcome_text)

# Lắng nghe và xử lý mọi tin nhắn văn bản (text) gửi tới Bot
@bot.message_handler(func=lambda message: True)
def handle_message(message):
    text = message.text
    chat_id = message.chat.id

    if not text:
        return

    # 1. Trích xuất toàn bộ link Shopee trong bài viết
    matches = re.findall(SHOPEE_LINK_REGEX, text)
    unique_links = list(set(matches))  # Loại bỏ các link trùng lặp

    # Nếu bài viết không chứa link Shopee nào
    if len(unique_links) == 0:
        bot.send_message(chat_id, "ℹ Bài viết của bạn không chứa bất kỳ liên kết Shopee nào để chuyển đổi.")
        return

    # Hiển thị trạng thái "đang gõ chữ..." cho sinh động
    bot.send_chat_action(chat_id, 'typing')

    # 2. Gọi duy nhất 1 request xử lý hàng loạt lên Server PiShare
    results = call_pishare_bulk_api(unique_links, PISHARE_SUB_ID)

    if not results:
        bot.send_message(chat_id, "❌ Đã xảy ra lỗi hệ thống trong quá trình kết nối với server PiShare. Vui lòng thử lại sau.")
        return

    # 3. Thực hiện thay thế các link thành công vào văn bản gốc
    converted_text = text
    success_count = 0

    for original, converted in results.items():
        if converted and converted != original:
            success_count += 1
            converted_text = converted_text.replace(original, converted)

    # 4. Phản hồi bài viết hoàn chỉnh đã chuyển đổi cho người dùng
    if success_count > 0:
        bot.send_message(chat_id, converted_text)
    else:
        bot.send_message(chat_id, "ℹ Không có liên kết Shopee nào chuyển đổi thành công. Vui lòng kiểm tra lại liên kết của bạn.")

# Khởi chạy bot liên tục (Long Polling)
if __name__ == '__main__':
    bot.infinity_polling()
