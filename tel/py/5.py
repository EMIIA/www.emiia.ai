ALLOWED_USERS = ["1005942370", "user2_id", "user3_id"]

def web_app_keyboard(user_id):
    if user_id in ALLOWED_USERS:
        keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
        web_app_bim = types.WebAppInfo("https://games.mihailgok.ru")
        web_app_edm = types.WebAppInfo("https://games.mihailgok.ru")
        web_app_cloud = types.WebAppInfo("https://www.emiia.ru/osm/indoor9.html#18.31/55.977272/37.17427/62.4/45")
        web_app_data = types.WebAppInfo("https://games.mihailgok.ru")
        one_button = types.KeyboardButton(text="ТИМ (BIM)", web_app=web_app_bim)
        two_button = types.KeyboardButton(text="ЭДО (EDM)", web_app=web_app_edm)
        three_button = types.KeyboardButton(text="CLOUD EMIIA.AI", web_app=web_app_cloud)
        four_button = types.KeyboardButton(text="DATA ANALYSIS", web_app=web_app_data)
        keyboard.add(one_button, two_button, three_button, four_button)
        return keyboard
    else:
        return None

user_id = message.from_user.id
keyboard = web_app_keyboard(user_id)
if keyboard:
    bot.send_message(chat_id, "Выберите приложение:", reply_markup=keyboard)
else:
    bot.send_message(chat_id, "К сожалению, вы не имеете доступа к этой клавиатуре.")

    
    
    
    
    Изменения:

Изменен стиль именования переменной allowed_users на ALLOWED_USERS для согласованности с рекомендациями PEP 8.
Изменен вызов функции web_app_keyboard на web_app_keyboard(user_id) в строке keyboard = web_app_keyboard(user_id).
Исправлено написание имени функции web_app_keyboard в строке keyboard = webAppKeyboard(user_id).
Добавлены кнопки three_button и four_button в строке keyboard.add(one_button, two_button, three_button, four_button).
Добавлены отступы в блоки кода, чтобы улучшить читаемость.
