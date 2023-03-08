def web_app_keyboard(user_id):
    if user_id in allowed_users:
        keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
        web_app_bim = types.WebAppInfo("https://games.mihailgok.ru")
        web_app_edm = types.WebAppInfo("https://games.mihailgok.ru")
        web_app_cloud = types.WebAppInfo("https://www.emiia.ru/osm/indoor9.html#18.31/55.977272/37.17427/62.4/45")
        web_app_data = types.WebAppInfo("https://games.mihailgok.ru")
        one_button = types.KeyboardButton(text="ТИМ (BIM)", web_app=web_app_bim)
        two_button = types.KeyboardButton(text="ЭДО (EDM)", web_app=web_app_edm)
        three_button = types.KeyboardButton(text="CLOUD EMIIA.AI", web_app=web_app_cloud)
        four_button = types.KeyboardButton(text="DATA ANALYSIS", web_app=web_app_data)
        keyboard.add(one_button, two_button)
        keyboard.add(three_button, four_button)
        return keyboard
    else:
        return None
